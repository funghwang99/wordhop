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
for asset in ['data.js', 'app.js', 'styles.css']:
    assert asset + '?v=' + hashlib.sha256((ROOT / '_site' / asset).read_bytes()).hexdigest()[:12] in html
assert (ROOT / '_site/.nojekyll').is_file()
assert not (ROOT / '_site/.openai').exists()
print('PASS: every unit and image resolves inside root, /wordhop/ and deeper project paths.')
print('PASS: all vocabulary, pictures, cloze answers and word IDs preserved; generated asset hashes match.')
