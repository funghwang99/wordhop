"""Build WordHop with relative asset URLs for GitHub Pages project sites."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'dist'
OUTPUT = ROOT / '_site'
PREFIX = 'window.WQ_CATALOG = '


def relative_asset(value, folder):
    relative = value.removeprefix('/')
    path = PurePosixPath(relative)
    if path.is_absolute() or '..' in path.parts or not relative.startswith(folder + '/'):
        raise ValueError(f'Unexpected {folder} path: {value}')
    if not (SOURCE / relative).is_file():
        raise FileNotFoundError(relative)
    return relative


def build():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    shutil.copytree(SOURCE, OUTPUT)
    catalog = json.loads((SOURCE / 'data.js').read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    retained_files = set()
    word_count = 0
    for unit in catalog['units']:
        source_path = relative_asset(unit['dataFile'], 'units')
        data = json.loads((SOURCE / source_path).read_text())
        assert data['id'] == unit['id']
        assert len(data['words']) == unit['wordCount']
        assert [word['id'] for word in data['words']] == unit['wordIds']
        for word in data['words']:
            if word.get('image'):
                word['image'] = relative_asset(word['image'], 'assets')
        content = (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        filename = unit['id'] + '.' + hashlib.sha256(content).hexdigest()[:12] + '.json'
        (OUTPUT / 'units' / filename).write_bytes(content)
        retained_files.add(filename)
        unit['dataFile'] = 'units/' + filename
        word_count += len(data['words'])
    for file in (OUTPUT / 'units').glob('*.json'):
        if file.name not in retained_files:
            file.unlink()
    (OUTPUT / 'data.js').write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    index = (OUTPUT / 'index.html').read_text()
    for asset in ['data.js', 'app.js', 'reading.js', 'listening.js', 'styles.css']:
        version = hashlib.sha256((OUTPUT / asset).read_bytes()).hexdigest()[:12]
        index, count = re.subn(re.escape(asset) + r'\?v=[a-f0-9]+', asset + '?v=' + version, index)
        assert count == 1
    (OUTPUT / 'index.html').write_text(index)
    (OUTPUT / '.nojekyll').touch()
    print(f'Built {len(catalog["books"])} books, {len(catalog["units"])} units/tests and {word_count} words in {OUTPUT}')


if __name__ == '__main__':
    build()
