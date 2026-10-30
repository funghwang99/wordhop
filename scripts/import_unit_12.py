"""Import Unit 12 vocabulary and matching pictures from the supplied PPTX."""
import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

from lxml import etree

from import_basic_reading_units import NS, PREFIX, ROOT, illustration, make_cloze, slide_list, slug


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python -B scripts/import_unit_12.py /absolute/source.pptx')
    path = Path(sys.argv[1]).resolve()
    words, provenance = [], []
    with ZipFile(path) as archive:
        slides = slide_list(archive)
        assert len(slides) == 36
        for slide_number, slide_path in enumerate(slides, 1):
            slide = etree.fromstring(archive.read(slide_path))
            texts = []
            for shape in slide.findall('./p:cSld/p:spTree/p:sp', NS):
                paragraphs = [''.join(p.xpath('.//a:t/text()', namespaces=NS)).strip()
                              for p in shape.findall('.//a:p', NS)]
                text = '\n'.join(p for p in paragraphs if p)
                if text:
                    texts.append(text)
            if slide_number == 1:
                assert 'UNIT 12' in texts and not slide.findall('.//p:pic', NS)
                continue
            matches = [m for text in texts if (m := re.fullmatch(r'(.+?)\s*\((.+)\):\s*(.+)', text))]
            assert len(matches) == 1, (slide_number, texts)
            term, pos, definition = matches[0].groups()
            examples = [text[3:].strip() for text in texts if text.startswith('Ex:')]
            assert len(examples) == 1
            example = examples[0]
            labels = [m for text in texts if (m := re.fullmatch(r'UNIT 12\s+•\s+PASSAGE ([12])', text))]
            assert len(labels) == 1
            passage = int(labels[0][1])
            cloze, answer, accepted = make_cloze(term, example)
            if term in ['drop-in', 'self-access', 'sub-part']:
                accepted.append(answer.replace('-', ' '))
            word = {'id': 'bir-u12-' + slug(term), 'term': term, 'pos': pos,
                    'definition': definition, 'example': example, 'cloze': cloze,
                    'answer': answer, 'accepted': list(dict.fromkeys(accepted))}
            images, image_metadata = illustration(archive, slide_path, slide, 12, term)
            assert images.get('image') and image_metadata
            assert len(slide.findall('.//p:pic', NS)) == 1
            word.update(images)
            assert cloze.count('________') == 1 and cloze.replace('________', answer) == example
            words.append(word)
            provenance.append({'id': word['id'], 'slide': slide_number, 'passage': passage,
                               'source': path.name,
                               'original': {'term': term, 'pos': pos, 'definition': definition, 'example': example},
                               'image': image_metadata})
    assert len({w['id'] for w in words}) == len(words) == 35
    assert len({w['definition'] for w in words}) == len(words)
    assert [sum(p['passage'] == n for p in provenance) for n in [1, 2]] == [19, 16]
    unit_id = 'bir-unit-12'
    content = (json.dumps({'id': unit_id, 'words': words}, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    filename = unit_id + '.' + hashlib.sha256(content).hexdigest()[:12] + '.json'
    (ROOT / 'dist/units' / filename).write_bytes(content)
    catalog_path = ROOT / 'dist/data.js'
    catalog = json.loads(catalog_path.read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    previous = next((u for u in catalog['units'] if u['id'] == unit_id), {})
    unit = {**previous, 'id': unit_id, 'bookId': 'basic-ielts-reading', 'title': 'Unit 12',
            'source': path.name, 'wordCount': len(words), 'wordIds': [w['id'] for w in words],
            'dataFile': '/units/' + filename}
    units = [u for u in catalog['units'] if u['id'] != unit_id]
    index = max(i for i, u in enumerate(units) if u['bookId'] == unit['bookId']) + 1
    units.insert(index, unit)
    catalog['units'] = units
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    source = ROOT / 'source-assets/unit-12'
    source.mkdir(exist_ok=True)
    (source / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
    report = {'source': path.name, 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
              'words': len(words), 'passageCounts': [19, 16], 'imageCards': len(provenance),
              'originalImageBytes': sum(p['image']['originalBytes'] for p in provenance),
              'publishedImageBytes': sum(p['image']['publishedBytes'] for p in provenance),
              'unitDataBytes': len(content)}
    (ROOT / 'qa/unit-12-import.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
