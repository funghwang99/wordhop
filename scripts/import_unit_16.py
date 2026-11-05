"""Import all 44 Unit 16 vocabulary entries and their 44 supplied pictures."""
import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

from lxml import etree

from import_basic_reading_units import NS, PREFIX, ROOT, candidates, illustration, make_cloze, slide_list, slug


# Keep original flashcard examples. Separate game sentences avoid answer clues.
GAME_EXAMPLES = {
    'claim': 'The company made a claim about the purity of its water.',
    'label': 'Read the label on the bottle before choosing a drink.',
}


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python -B scripts/import_unit_16.py /absolute/source.pptx')
    path = Path(sys.argv[1]).resolve()
    words, provenance = [], []
    with ZipFile(path) as archive:
        slides = slide_list(archive)
        assert len(slides) == 45
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
                assert 'UNIT 16' in texts and not slide.findall('.//p:pic', NS)
                assert '44 WORDS & PHRASES  |  2 READING PASSAGES' in texts
                continue
            matches = [m for text in texts if not text.startswith(('UNIT ', 'Ex:'))
                       and (m := re.fullmatch(r'(.+?)\s*\(([^)]+)\):\s*(.+)', text))]
            assert len(matches) == 1, (slide_number, texts)
            term, pos, definition = matches[0].groups()
            examples = [text[3:].strip() for text in texts if text.startswith('Ex:')]
            assert len(examples) == 1
            example = examples[0]
            labels = [m for text in texts if (m := re.fullmatch(r'UNIT 16\s+•\s+PASSAGE ([12])', text))]
            assert len(labels) == 1
            passage = int(labels[0][1])
            game_example = GAME_EXAMPLES.get(term, example)
            cloze, answer, accepted = make_cloze(term, game_example)
            variant = {'distil': 'distill'}.get(term)
            if variant:
                accepted.append(variant)
            word = {'id': 'bir-u16-' + slug(term), 'term': term, 'pos': pos,
                    'definition': definition, 'example': example, 'cloze': cloze,
                    'answer': answer, 'accepted': list(dict.fromkeys(accepted))}
            images, image_metadata = illustration(archive, slide_path, slide, 16, term)
            picture_count = len(slide.findall('.//p:pic', NS))
            assert picture_count == 1 and images.get('image') and image_metadata
            word.update(images)
            if game_example != example:
                word['clozeExample'] = game_example
            assert cloze.count('________') == 1 and cloze.replace('________', answer) == game_example
            assert not any(re.search(r'(?<!\w)' + re.escape(a) + r'(?!\w)', cloze, re.I) for a in candidates(term))
            words.append(word)
            provenance.append({'id': word['id'], 'slide': slide_number, 'passage': passage,
                               'source': path.name,
                               'original': {'term': term, 'pos': pos, 'definition': definition, 'example': example},
                               'gameExample': game_example, 'image': image_metadata})
    assert len({w['id'] for w in words}) == len(words) == 44
    assert len({w['definition'] for w in words}) == len(words)
    passage_counts = [sum(p['passage'] == n for p in provenance) for n in [1, 2]]
    assert passage_counts == [22, 22]
    unit_id = 'bir-unit-16'
    content = (json.dumps({'id': unit_id, 'words': words}, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    filename = unit_id + '.' + hashlib.sha256(content).hexdigest()[:12] + '.json'
    (ROOT / 'dist/units' / filename).write_bytes(content)
    catalog_path = ROOT / 'dist/data.js'
    catalog = json.loads(catalog_path.read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    previous = next((u for u in catalog['units'] if u['id'] == unit_id), {})
    unit = {**previous, 'id': unit_id, 'bookId': 'basic-ielts-reading', 'title': 'Unit 16',
            'source': path.name, 'wordCount': len(words), 'wordIds': [w['id'] for w in words],
            'dataFile': '/units/' + filename}
    units = [u for u in catalog['units'] if u['id'] != unit_id]
    index = max(i for i, u in enumerate(units) if u['bookId'] == unit['bookId']) + 1
    units.insert(index, unit)
    catalog['units'] = units
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    source = ROOT / 'source-assets/unit-16'
    source.mkdir(exist_ok=True)
    (source / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
    pictures = [p['image'] for p in provenance if p['image']]
    report = {'source': path.name, 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
              'slideCount': len(slides), 'declaredCoverWords': 44,
              'words': len(words), 'passageCounts': passage_counts, 'imageCards': len(pictures),
              'textOnlyWords': [w['term'] for w in words if not w.get('image')],
              'gameExamples': GAME_EXAMPLES,
              'originalImageBytes': sum(p['originalBytes'] for p in pictures),
              'publishedImageBytes': sum(p['publishedBytes'] for p in pictures),
              'unitDataBytes': len(content)}
    (ROOT / 'qa/unit-16-import.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
