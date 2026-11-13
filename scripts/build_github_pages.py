"""Build WordHop with relative asset URLs for GitHub Pages project sites."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import zipfile

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




def activate_cambridge_media(catalog):
    """Add source pages and listening audio only after both verified archive uploads exist."""
    bundles = [
        ROOT / 'cambridge_21_media_tests_5_6.zip',
        ROOT / 'cambridge_21_media_tests_7_8.zip',
    ]
    present = [p.is_file() for p in bundles]
    if not all(present):
        if any(present):
            print('Cambridge media incomplete: upload BOTH Cambridge media ZIPs to the repository root')
        else:
            print('Cambridge media pending: 2 media bundles still need upload')
        return

    root = 'media/cambridge-ielts-academic-21'
    expected = {
        *(f'{root}/pages/page-{n:03d}.webp' for n in range(10, 95)),
        *(f'{root}/audio/test-{t}-section-{s}.m4a' for t in range(5, 9) for s in range(1, 5)),
    }
    seen = set()
    for bundle in bundles:
        with zipfile.ZipFile(bundle) as archive:
            entries = set(archive.namelist())
            manifest = json.loads(archive.read('cambridge_media_manifest.json'))
            hashes = manifest['paths']
            if entries != set(hashes) | {'cambridge_media_manifest.json'}:
                raise ValueError('Cambridge media ZIP file list does not match its manifest: ' + bundle.name)
            if manifest.get('bundle') != bundle.name:
                raise ValueError('Unexpected Cambridge media bundle name')
            for path, digest in hashes.items():
                if path not in expected or path in seen:
                    raise ValueError('Unexpected or duplicate Cambridge media file: ' + path)
                if not re.fullmatch(r'media/cambridge-ielts-academic-21/(pages/page-\d{3}\.webp|audio/test-[5-8]-section-[1-4]\.m4a)', path):
                    raise ValueError('Invalid Cambridge media path: ' + path)
                contents = archive.read(path)
                if hashlib.sha256(contents).hexdigest() != digest:
                    raise ValueError('Media integrity mismatch for ' + path)
                target = OUTPUT / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(contents)
                seen.add(path)
    if seen != expected:
        raise ValueError(f'Cambridge media missing {len(expected-seen)} required assets')
    volume = next(v for v in catalog.get('volumes', []) if v['id'] == 'cambridge-ielts-academic-21')
    volume['mediaRoot'] = root
    for exam in volume['tests']:
        test = int(exam['id'].split('-')[-1])
        exam['audio'] = [f'{root}/audio/test-{test}-section-{n}.m4a' for n in range(1, 5)]
    print('Published Cambridge IELTS: 85 original source page images and 16 audio tracks')



def build():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    # Publish Trainer Exam Practice; original audio is added only when verified.
    shutil.copytree(SOURCE, OUTPUT)
    # The user-provided source images are packaged as one small GitHub web upload.
    # Extract only the verified Trainer page scans, not the original PDF or training pages.
    trainer_archive = ROOT / 'trainer-original-page-images.zip'
    if trainer_archive.exists():
        manifest = json.loads((SOURCE / 'trainer/exam-pages.json').read_text())
        paths = {page['image'] for test in manifest['tests']
                 for parts in test['skills'].values() for part in parts
                 for page in part['pages']}
        if len(paths) != 114:
            raise ValueError('Expected 114 unique Trainer exam images')
        with zipfile.ZipFile(trainer_archive) as package:
            source_manifest = json.loads(package.read('dist/trainer/exam-pages.json'))
            expected = {page['image']: page['sha256'] for test in source_manifest['tests']
                        for parts in test['skills'].values() for part in parts
                        for page in part['pages']}
            if set(expected) != paths:
                raise ValueError('Trainer image package does not match the exam manifest')
            for rel in sorted(paths):
                if not re.fullmatch(r'assets/(reading|writing|listening|speaking)/trainer-t[1-6]-[a-z]+-p[1-6]-page[12]\.webp', rel):
                    raise ValueError('Invalid Trainer asset path: ' + rel)
                content = package.read('dist/' + rel)
                if hashlib.sha256(content).hexdigest() != expected[rel]:
                    raise ValueError('Corrupted Trainer image: ' + rel)
                target = OUTPUT / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(content)
        print('Published 114 verified original Trainer exam page images')
    else:
        print('Trainer exam pages not published: upload trainer-original-page-images.zip')
    catalog = json.loads((SOURCE / 'data.js').read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    activate_cambridge_media(catalog)
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
    for asset in ['data.js', 'app.js', 'reading.js', 'listening.js', 'student.js', 'writing.js', 'styles.css', 'flappy.js', 'flappy.css', 'trainer.js', 'trainer.css', 'cambridge.js', 'cambridge-keys.js', 'cambridge.css']:
        version = hashlib.sha256((OUTPUT / asset).read_bytes()).hexdigest()[:12]
        index, count = re.subn(re.escape(asset) + r'\?v=[^"\s<>]+', asset + '?v=' + version, index)
        assert count == 1
    (OUTPUT / 'index.html').write_text(index)
    (OUTPUT / '.nojekyll').touch()
    print(f'Built {len(catalog["books"])} books, {len(catalog["units"])} units/tests and {word_count} words in {OUTPUT}')


if __name__ == '__main__':
    build()
