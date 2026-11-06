"""Import all Writing pages and task choices from the two supplied PET books."""
import argparse
import hashlib
import io
import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-assets/pet-writing'
DIST = ROOT / 'dist'
PREFIX = 'window.WQ_CATALOG = '


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('simply_pdf', type=Path)
    parser.add_argument('authentic_pdf', type=Path)
    args = parser.parse_args()
    catalog = json.loads((DIST / 'data.js').read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    units = {u['id']: u for u in catalog['units']}
    manifest = {'tests': 0, 'parts': 0, 'prompts': 0, 'uniqueOriginalPages': 0, 'books': []}
    (DIST / 'assets/writing').mkdir(exist_ok=True)
    (DIST / 'writings').mkdir(exist_ok=True)
    for book_id, path, test_count, offset in [('simply-pet', args.simply_pdf, 8, 1), ('authentic-1', args.authentic_pdf, 4, 2)]:
        research = json.loads((SOURCE / (book_id + '.json')).read_text())
        assert research['bookId'] == book_id and len(research['tests']) == test_count
        source = research['source']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == source['sha256']
        doc, pages = fitz.open(path), {}
        expected = list(range(1, test_count + 1))
        assert [int(t['id'].split('-')[-1]) for t in research['tests']] == expected
        for number in sorted({n for t in research['tests'] for p in t['parts'] for n in p['pdfPages']}):
            page = doc[number - 1]
            pix = page.get_pixmap(matrix=fitz.Matrix(1350 / page.rect.width, 1350 / page.rect.width), alpha=False)
            image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            buffer = io.BytesIO()
            image.save(buffer, format='WEBP', quality=88, method=6)
            content = buffer.getvalue()
            filename = f'{book_id}-page-{number}.{hashlib.sha256(content).hexdigest()[:12]}.webp'
            relative = 'assets/writing/' + filename
            (DIST / relative).write_bytes(content)
            pages[number] = {'pdfPage': number, 'printedPage': number - offset, 'image': relative,
                             'width': image.width, 'height': image.height}
        for test in research['tests']:
            assert test['id'] in units and units[test['id']]['bookId'] == book_id
            assert [p['id'] for p in test['parts']] == ['part-1', 'part-2']
            assert [[q['number'] for q in p['questions']] for p in test['parts']] == [[1], [2, 3]]
            assert all(p['requiredQuestions'] == 1 for p in test['parts'])
            parts = [{k: v for k, v in part.items() if k != 'pdfPages'} |
                     {'pages': [pages[n] for n in part['pdfPages']]} for part in test['parts']]
            data = {'id': test['id'], 'source': source, 'parts': parts}
            content = (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
            filename = f"{test['id']}.{hashlib.sha256(content).hexdigest()[:12]}.json"
            (DIST / 'writings' / filename).write_bytes(content)
            units[test['id']]['writingFile'] = 'writings/' + filename
        manifest['books'].append({'bookId': book_id, 'source': source, 'tests': test_count,
                                  'parts': test_count * 2, 'prompts': test_count * 3,
                                  'pages': [p | {'bytes': (DIST / p['image']).stat().st_size} for p in pages.values()]})
        manifest['tests'] += test_count
        manifest['parts'] += test_count * 2
        manifest['prompts'] += test_count * 3
        manifest['uniqueOriginalPages'] += len(pages)
    assert [manifest[k] for k in ['tests', 'parts', 'prompts', 'uniqueOriginalPages']] == [12, 24, 36, 24]
    (DIST / 'data.js').write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    save(SOURCE / 'source-manifest.json', manifest)
    print('Imported PET Writing: 12 tests, 24 parts, 36 original prompts and 24 book pages.')


if __name__ == '__main__':
    main()
