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


def gate_game_pages(catalog):
    books = {book['id']: book for book in catalog['books']}
    units = {unit['id']: unit for unit in catalog['units']}
    for page in (OUTPUT / 'games').glob('*.html'):
        destination = '../'
        match = re.search(r'-unit([0-9]+)\.html$', page.name)
        unit = units.get('bir-unit-' + match[1]) if match else None
        if unit:
            book = books[unit['bookId']]
            route = [book['trackId'], book.get('levelId'), book['id'], unit['id'], 'practice']
            destination += '#/' + '/'.join(part for part in route if part)
        guard = ('<script id="wordhop-game-entry">(() => {'
                 'try { if (window.parent !== window && window.parent.WordHopStudent?.current()) return; } catch {}'
                 'document.documentElement.style.visibility = "hidden";'
                 f'location.replace({json.dumps(destination)});'
                 '})();</script>')
        html, count = re.subn(r'<head>', '<head>' + guard, page.read_text(), count=1, flags=re.IGNORECASE)
        assert count == 1, page
        page.write_text(html)



def build():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    # Publish Trainer Exam Practice; original audio is added only when verified.
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
    gate_game_pages(catalog)
    index = (OUTPUT / 'index.html').read_text()
    for asset in ['data.js', 'app.js', 'reading.js', 'listening.js', 'student.js', 'writing.js', 'styles.css', 'flappy.js', 'flappy.css', 'trainer.js', 'trainer.css']:
        version = hashlib.sha256((OUTPUT / asset).read_bytes()).hexdigest()[:12]
        index, count = re.subn(re.escape(asset) + r'\?v=[a-f0-9]+', asset + '?v=' + version, index)
        assert count == 1
    (OUTPUT / 'index.html').write_text(index)
    (OUTPUT / '.nojekyll').touch()
    print(f'Built {len(catalog["books"])} books, {len(catalog["units"])} units/tests and {word_count} words in {OUTPUT}')


if __name__ == '__main__':
    build()
