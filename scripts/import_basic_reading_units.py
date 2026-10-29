"""Import the six supplied vocabulary decks without modifying the PPTX files."""
from collections import Counter
from io import BytesIO
import hashlib
import json
from pathlib import Path
import posixpath
import re
import sys
from zipfile import ZipFile

from lxml import etree
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
UPLOAD = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'upload'
FILES = {
    4: 'Unit 4.pptx', 5: 'Unit 5.pptx', 6: 'Unit 6 Vocabulary(3).pptx',
    7: 'Unit 7 Vocabulary(2).pptx', 8: 'Unit 8 Vocabulary(2).pptx', 9: 'Unit 9 Vocabulary(3).pptx',
}
NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
PREFIX = 'window.WQ_CATALOG = '


def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def candidates(term):
    values = {term}
    last = term.split()[-1]
    prefix = term[:-len(last)]
    values.update(prefix + x for x in [last + 's', last + 'es', last + 'ed', last + 'ing'])
    if last.endswith('y'):
        values.update(prefix + last[:-1] + suffix for suffix in ['ies', 'ied'])
    if last.endswith('e'):
        values.update(prefix + last[:-1] + suffix for suffix in ['ed', 'ing'])
    if len(last) > 2 and last[-1] not in 'aeiouwxy' and last[-2] in 'aeiou' and last[-3] not in 'aeiou':
        values.update([prefix + last + last[-1] + 'ed', prefix + last + last[-1] + 'ing'])
    values.update({'withhold': ['withheld']}.get(term, []))
    if term.endswith(' something'):
        values.add(term.removesuffix(' something'))
    return sorted(values, key=lambda item: (-len(item), item))


def make_cloze(term, example):
    for candidate in candidates(term):
        # A component of a hyphenated compound can be tested, e.g. Mature-age.
        match = re.search(r'(?<!\w)' + re.escape(candidate) + r'(?!\w)', example, re.I)
        if match:
            answer = match[0]
            accepted = [answer]
            american = answer.replace('utilis', 'utiliz').replace('Utilis', 'Utiliz').replace('civilis', 'civiliz').replace('fossilis', 'fossiliz').replace('enrolment', 'enrollment').replace('fibre', 'fiber').replace('Honours', 'Honors')
            if american != answer:
                accepted.append(american)
            if answer.lower() in ['by-product', 'coin-operated']:
                accepted.append(answer.replace('-', ' '))
            if answer.lower() == 'by-product':
                accepted.append(answer.replace('-', ''))
            return example[:match.start()] + '________' + example[match.end():], answer, accepted
    raise ValueError(f'No answer for {term!r} in {example!r}')


def slide_list(archive):
    presentation = etree.fromstring(archive.read('ppt/presentation.xml'))
    rels = etree.fromstring(archive.read('ppt/_rels/presentation.xml.rels'))
    by_id = {r.get('Id'): r.get('Target') for r in rels}
    return [posixpath.normpath(posixpath.join('ppt', by_id[s.get('{' + NS['r'] + '}id')]))
            for s in presentation.findall('.//p:sldId', NS)]


def illustration(archive, slide_path, slide, unit_number, term):
    rel_path = posixpath.join(posixpath.dirname(slide_path), '_rels', posixpath.basename(slide_path) + '.rels')
    by_id = {r.get('Id'): r.get('Target') for r in etree.fromstring(archive.read(rel_path))}
    pictures = []
    for pic in slide.findall('.//p:pic', NS):
        blip = pic.find('.//a:blip', NS)
        if blip is None:
            continue
        extent = pic.find('./p:spPr/a:xfrm/a:ext', NS)
        area = int(extent.get('cx', '0')) * int(extent.get('cy', '0')) if extent is not None else 0
        target = by_id[blip.get('{' + NS['r'] + '}embed')]
        path = posixpath.normpath(posixpath.join(posixpath.dirname(slide_path), target))
        pictures.append((area, pic, path))
    if not pictures:
        native = ROOT / 'source-assets/basic-reading-units-4-9/native' / (slug(term) + '.webp')
        if unit_number == 6 and native.is_file():
            content = native.read_bytes()
            name = slug(term) + '.' + hashlib.sha256(content).hexdigest()[:12] + '.webp'
            relative = Path('assets') / 'unit-6' / name
            output = ROOT / 'dist' / relative
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(content)
            with Image.open(native) as image:
                metadata = {'media': slide_path, 'kind': 'native-slide-render',
                            'originalSha256': hashlib.sha256(archive.read(slide_path)).hexdigest(),
                            'width': image.width, 'height': image.height,
                            'originalBytes': 0, 'publishedBytes': len(content), 'image': '/' + relative.as_posix()}
            return {'image': metadata['image'], 'imageAlt': 'Illustration of ' + term}, metadata
        return {}, None
    # Unit 4's greed slide has an additional tiny decorative image near its title.
    # Select the dominant illustration, which is the vocabulary picture.
    _, pic, source_path = max(pictures, key=lambda item: item[0])
    original = archive.read(source_path)
    crop_node = pic.find('./p:blipFill/a:srcRect', NS)
    crop = {side: int(crop_node.get(side, '0')) / 100000 if crop_node is not None else 0
            for side in ['l', 't', 'r', 'b']}
    with Image.open(BytesIO(original)) as image:
        image = ImageOps.exif_transpose(image)
        if any(crop.values()):
            width, height = image.size
            image = image.crop((round(width * crop['l']), round(height * crop['t']),
                                round(width * (1 - crop['r'])), round(height * (1 - crop['b']))))
        image.thumbnail((680, 360), Image.Resampling.LANCZOS)
        if image.mode not in ['RGB', 'RGBA']:
            image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
        stream = BytesIO()
        image.save(stream, format='WEBP', quality=84, method=6)
        content = stream.getvalue()
        name = slug(term) + '.' + hashlib.sha256(content).hexdigest()[:12] + '.webp'
        relative = Path('assets') / f'unit-{unit_number}' / name
        output = ROOT / 'dist' / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(content)
        metadata = {'media': source_path, 'originalSha256': hashlib.sha256(original).hexdigest(),
                    'crop': crop, 'width': image.width, 'height': image.height,
                    'originalBytes': len(original), 'publishedBytes': len(content), 'image': '/' + relative.as_posix()}
    return {'image': metadata['image'], 'imageAlt': 'Illustration of ' + term}, metadata


def main():
    catalog_path = ROOT / 'dist/data.js'
    catalog = json.loads(catalog_path.read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    units = [u for u in catalog['units'] if u['id'] not in {f'bir-unit-{n}' for n in FILES}]
    provenance = []
    corrections = []
    for unit_number, filename in FILES.items():
        words = []
        with ZipFile(UPLOAD / filename) as archive:
            for number, path in enumerate(slide_list(archive), 1):
                slide = etree.fromstring(archive.read(path))
                texts = []
                for shape in slide.findall('./p:cSld/p:spTree/p:sp', NS):
                    paragraphs = [''.join(t.text or '' for t in paragraph.findall('.//a:t', NS)).strip()
                                  for paragraph in shape.findall('.//a:p', NS)]
                    text = '\n'.join(p for p in paragraphs if p)
                    if text:
                        texts.append(text)
                line = next(t for t in texts if re.match(r'.+?\s*\([^)]+\)', t) and not t.startswith('Ex:'))
                match = re.fullmatch(r'(.+?)\s*\(([^)]+)\)\s*(?::\s*(.*))?', line)
                term, pos, definition = match.groups()
                definition = definition or ''
                example = next(t[3:].strip() for t in texts if t.startswith('Ex:'))
                original_fields = {'term': term, 'pos': pos, 'definition': definition, 'example': example}
                changes = {}
                if unit_number == 4 and term == 'tuna':
                    changes['definition'] = 'a large sea fish commonly eaten as food'
                if unit_number == 6 and term == 'greenhouse effect':
                    changes['definition'] = "the process in which gases in the atmosphere trap heat near the Earth's surface"
                if unit_number == 7 and term == 'injection':
                    changes['example'] = 'The nurse gave the patient an injection.'
                for field, value in changes.items():
                    corrections.append({'unit': unit_number, 'term': term, 'field': field,
                                        'before': original_fields[field], 'after': value})
                definition = changes.get('definition', definition)
                example = changes.get('example', example)
                cloze, answer, accepted = make_cloze(term, example)
                word = {'id': f'bir-u{unit_number}-' + slug(term), 'term': term, 'pos': pos,
                        'definition': definition, 'example': example,
                        'cloze': cloze, 'answer': answer, 'accepted': accepted}
                image_fields, image_metadata = illustration(archive, path, slide, unit_number, term)
                word.update(image_fields)
                extra_text = [t for t in texts if t not in ['VOCABULARY', line] and not t.startswith('Ex:')]
                if extra_text:
                    word['illustration'] = ' '.join(extra_text)
                if image_metadata and image_metadata.get('kind') == 'native-slide-render':
                    word.pop('illustration', None)
                if unit_number == 6 and term == 'top' and not word.get('image'):
                    # This slide uses a text box and native up-arrow shape.
                    word['illustration'] = '90° ↑'
                words.append(word)
                provenance.append({'unit': unit_number, 'slide': number, 'source': filename,
                                   'id': word['id'], 'original': original_fields,
                                   'illustration': word.get('illustration'), 'image': image_metadata})
        assert len({w['id'] for w in words}) == len(words)
        assert len({w['definition'] for w in words}) == len(words), 'Duplicate meanings need review'
        units.append({'id': f'bir-unit-{unit_number}', 'bookId': 'basic-ielts-reading',
                      'title': f'Unit {unit_number}', 'source': filename, 'words': words})
    units.sort(key=lambda unit: int(unit['title'].split()[-1]))
    data_directory = ROOT / 'dist/units'
    data_directory.mkdir(exist_ok=True)
    for unit in units:
        if 'words' in unit:
            words = unit.pop('words')
        else:
            words = json.loads((ROOT / 'dist' / unit['dataFile'].lstrip('/')).read_text())['words']
        content = (json.dumps({'id': unit['id'], 'words': words}, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        name = unit['id'] + '.' + hashlib.sha256(content).hexdigest()[:12] + '.json'
        (data_directory / name).write_bytes(content)
        unit['wordCount'] = len(words)
        unit['wordIds'] = [w['id'] for w in words]
        unit['dataFile'] = '/units/' + name
    catalog['units'] = units
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    source_directory = ROOT / 'source-assets/basic-reading-units-4-9'
    source_directory.mkdir(exist_ok=True)
    (source_directory / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
    (source_directory / 'corrections.json').write_text(json.dumps(corrections, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'units': [{'title': u['title'], 'words': u['wordCount']} for u in units],
                      'addedWords': len(provenance), 'imageCards': sum(p['image'] is not None for p in provenance),
                      'textIllustrations': sum(bool(p['illustration']) for p in provenance),
                      'imageOriginalBytes': sum(p['image']['originalBytes'] for p in provenance if p['image']),
                      'imagePublishedBytes': sum(p['image']['publishedBytes'] for p in provenance if p['image']),
                      'catalogBytes': catalog_path.stat().st_size, 'corrections': corrections}, indent=2))


if __name__ == '__main__':
    main()
