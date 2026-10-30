"""Check the generated site at both root and nested GitHub Pages URLs."""
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'window.WQ_CATALOG = '


def catalog(folder):
    return json.loads((folder / 'data.js').read_text().removeprefix(PREFIX).strip().removesuffix(';'))


source = catalog(ROOT / 'dist')
built = catalog(ROOT / '_site')
assert all(built[key] == source[key] for key in ['tracks', 'levels', 'books'])
source_units = {unit['id']: unit for unit in source['units']}
assert len(source_units) == len(built['units'])
for unit in built['units']:
    original = source_units[unit['id']]
    assert {k: v for k, v in unit.items() if k != 'dataFile'} == {k: v for k, v in original.items() if k != 'dataFile'}
    before = json.loads((ROOT / 'dist' / original['dataFile'].lstrip('/')).read_text())
    after_path = ROOT / '_site' / unit['dataFile']
    after = json.loads(after_path.read_text())
    assert after['id'] == before['id']
    assert len(after['words']) == len(before['words'])
    assert hashlib.sha256(after_path.read_bytes()).hexdigest()[:12] in after_path.name
    for old, new in zip(before['words'], after['words']):
        assert {k: v for k, v in new.items() if k != 'image'} == {k: v for k, v in old.items() if k != 'image'}
        if old.get('image'):
            assert new['image'] == old['image'].lstrip('/')
            assert (ROOT / '_site' / new['image']).read_bytes() == (ROOT / 'dist' / old['image'].lstrip('/')).read_bytes()
            assert not new['image'].startswith('/')
        assert new['cloze'].replace('________', new['answer']) == new['example']
    for base in ['https://example.github.io/', 'https://example.github.io/wordhop/', 'https://example.github.io/a/nested/project/']:
        resources = [unit['dataFile']] + [w['image'] for w in after['words'] if w.get('image')]
        for resource in resources:
            resolved = urljoin(base, resource)
            assert resolved.startswith(base), (base, resource, resolved)
            relative = urlsplit(resolved).path[len(urlsplit(base).path):]
            assert (ROOT / '_site' / relative).is_file(), resolved
html = (ROOT / '_site/index.html').read_text()
for asset in ['data.js', 'app.js', 'reading.js', 'listening.js', 'styles.css']:
    assert asset + '?v=' + hashlib.sha256((ROOT / '_site' / asset).read_bytes()).hexdigest()[:12] in html
assert (ROOT / '_site/.nojekyll').is_file()
assert not (ROOT / '_site/.openai').exists()
print('PASS: every unit and image resolves inside root, /wordhop/ and deeper project paths.')
print('PASS: all vocabulary, pictures, cloze answers and word IDs preserved; generated asset hashes match.')

reading_parts = reading_questions = 0
for unit in built['units']:
    if not unit.get('readingFile'):
        continue
    reading_path = ROOT / '_site' / unit['readingFile']
    data = json.loads(reading_path.read_text())
    assert data['id'] == unit['id']
    assert data == json.loads((ROOT / 'dist' / unit['readingFile']).read_text())
    assert hashlib.sha256(reading_path.read_bytes()).hexdigest()[:12] in reading_path.name
    assert len(data['parts']) == (6 if unit['bookId'] == 'simply-pet' else 2)
    for part in data['parts']:
        reading_parts += 1
        reading_questions += len(part['questions'])
        images = [page['image'] for page in part.get('pages', [part])]
        for image in images:
            assert (ROOT / '_site' / image).read_bytes() == (ROOT / 'dist' / image).read_bytes()
        for base in ['https://example.github.io/', 'https://example.github.io/wordhop/', 'https://example.github.io/a/nested/project/']:
            for resource in [unit['readingFile'], *images]:
                resolved = urljoin(base,resource)
                assert resolved.startswith(base)
                assert (ROOT / '_site' / urlsplit(resolved).path[len(urlsplit(base).path):]).is_file()
assert reading_parts == 66 and reading_questions == 575
print('PASS: all reading tests, original pages and keys resolve inside GitHub Pages project paths.')

audio_count = 0
for unit in built['units']:
    for track in unit.get('listening', []):
        audio_count += 1
        resource = track['src']
        audio = (ROOT / '_site' / resource).read_bytes()
        assert audio == (ROOT / 'dist' / resource).read_bytes()
        assert hashlib.sha256(audio).hexdigest()[:12] in resource
        for base in ['https://example.github.io/', 'https://example.github.io/wordhop/', 'https://example.github.io/a/nested/project/']:
            resolved = urljoin(base, resource)
            assert resolved.startswith(base)
            assert (ROOT / '_site' / urlsplit(resolved).path[len(urlsplit(base).path):]).is_file()
assert audio_count == 32
print('PASS: all 32 original listening tracks resolve inside root, /wordhop/ and deeper project paths.')
