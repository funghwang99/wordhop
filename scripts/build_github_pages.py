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





def activate_trainer_exam_audio():
    """Publish only SHA-256 verified Exam Practice recordings from uploaded ZIPs."""
    manifest = json.loads((SOURCE / 'trainer/audio-manifest.json').read_text())
    if manifest['book'] != 'trainer' or manifest['mode'] != 'exam':
        raise ValueError('Trainer audio manifest is not Exam Practice')
    expected = {item['src']: item for item in manifest['tracks']}
    if len(expected) != 24 or len({item['track'] for item in expected.values()}) != 24:
        raise ValueError('Expected 24 distinct Listening Exam Practice recordings')
    if any(item['skill'] != 'listening' for item in expected.values()):
        raise ValueError('Only actual exam Listening recordings may be published')
    prohibited = set(manifest['excludedTrainingTracks'])
    if len(prohibited) != 33 or any(item['track'] in prohibited for item in expected.values()):
        raise ValueError('Guided Training audio cannot be published')
    count = 0
    for bundle in manifest['bundles']:
        archive_path = ROOT / bundle['file']
        if not archive_path.is_file():
            print('Trainer audio pending: ' + bundle['file'])
            continue
        subset = {name: item for name, item in expected.items() if item['test'] in bundle['tests']}
        with zipfile.ZipFile(archive_path) as archive:
            package = json.loads(archive.read('trainer-audio-package.json'))
            members = set(archive.namelist())
            if package.get('package') != archive_path.name or package.get('book') != 'trainer' or package.get('mode') != 'exam':
                raise ValueError('Invalid Trainer audio package identity')
            if set(package.get('files', {})) != set(subset) or members != set(subset) | {'trainer-audio-package.json'}:
                raise ValueError('Missing/extra Trainer audio files: ' + archive_path.name)
            if set(package.get('tracks', [])) != {item['track'] for item in subset.values()}:
                raise ValueError('Unlisted or Training source track: ' + archive_path.name)
            for rel, digest in package['files'].items():
                if not re.fullmatch(r'audio/trainer/test-[1-6]/listening-part-[1-4][.]mp3', rel):
                    raise ValueError('Unexpected Trainer audio path: ' + rel)
                blob = archive.read(rel)
                if hashlib.sha256(blob).hexdigest() != digest:
                    raise ValueError('Corrupted Trainer audio file: ' + rel)
                dest = OUTPUT / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(blob)
                count += 1
        print('Published verified Trainer Exam Practice bundle: ' + archive_path.name)
    print(f'Published {count}/24 Trainer Exam Practice Listening audio tracks; 33 Training files excluded')



def activate_cambridge13_media(catalog):
    """Deploy only fully verified media for all four Cambridge IELTS 13 tests."""
    root = 'media/cambridge-ielts-academic-13'
    archives = [ROOT / f'cambridge_13_media_test_{n}.zip' for n in range(1, 5)]
    missing = [p.name for p in archives if not p.is_file()]
    if missing:
        print('Cambridge IELTS Academic 13 media pending: ' + ', '.join(missing))
        return
    expected = {
        *(f'{root}/pages/page-{n:03d}.webp' for n in range(10, 97)),
        *(f'{root}/audio/test-{t}-section-{sec}.mp3' for t in range(1, 5) for sec in range(1, 5))
    }
    seen = set()
    for i, archive_path in enumerate(archives, 1):
        with zipfile.ZipFile(archive_path) as archive:
            manifest = json.loads(archive.read('cambridge_media_manifest.json'))
            files = manifest['paths']
            if manifest.get('bundle') != archive_path.name or manifest.get('source') != 'Cambridge IELTS Academic 13':
                raise ValueError('Wrong Cambridge 13 media archive identity: ' + archive_path.name)
            if set(archive.namelist()) != set(files) | {'cambridge_media_manifest.json'}:
                raise ValueError('Missing or unexpected Cambridge 13 files in ' + archive_path.name)
            start = 10+(i-1)*22
            stop = 96 if i == 4 else start+21
            subset = {
                *(f'{root}/pages/page-{n:03d}.webp' for n in range(start, stop+1)),
                *(f'{root}/audio/test-{i}-section-{sec}.mp3' for sec in range(1, 5))
            }
            if set(files) != subset:
                raise ValueError('Cambridge 13 test '+str(i)+' media does not match expected source pages and audio')
            for rel, sha in files.items():
                payload = archive.read(rel)
                if hashlib.sha256(payload).hexdigest() != sha:
                    raise ValueError('Corrupted Cambridge IELTS 13 media: ' + rel)
                dest = OUTPUT / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(payload)
                seen.add(rel)
    if seen != expected:
        raise ValueError('Cambridge 13 media asset coverage incomplete')
    volume = next(v for v in catalog['volumes'] if v['id'] == 'cambridge-ielts-academic-13')
    volume['mediaRoot'] = root
    for exam in volume['tests']:
        number = int(exam['id'].split('-')[1])
        exam['audio'] = [f'{root}/audio/test-{number}-section-{section}.mp3' for section in range(1, 5)]
    print('Published Cambridge IELTS Academic 13: 87 original book pages and 16 audio tracks')




def activate_cambridge14_media(catalog):
    """Publish original Cambridge IELTS 14 pages and recordings after all four verified ZIPs are uploaded."""
    prefix = 'media/cambridge-ielts-academic-14'
    archives = [ROOT / f'cambridge_14_media_test_{n}.zip' for n in range(1, 5)]
    missing = [p.name for p in archives if not p.is_file()]
    if missing:
        print('Cambridge IELTS Academic 14 media pending: ' + ', '.join(missing))
        return
    page_ranges = {1:(10,31), 2:(32,52), 3:(53,74), 4:(75,96)}
    expected = {
        *(f'{prefix}/pages/page-{n:03d}.webp' for n in range(10, 97)),
        *(f'{prefix}/audio/test-{t}-section-{sec}.mp3' for t in range(1, 5) for sec in range(1, 5)),
    }
    seen = set()
    for test, archive_path in enumerate(archives, 1):
        with zipfile.ZipFile(archive_path) as archive:
            if archive.testzip() is not None:
                raise ValueError('Corrupted ZIP: '+archive_path.name)
            manifest = json.loads(archive.read('cambridge_media_manifest.json'))
            files = manifest['paths']
            lo,hi = page_ranges[test]
            subset = {
                *(f'{prefix}/pages/page-{n:03d}.webp' for n in range(lo, hi+1)),
                *(f'{prefix}/audio/test-{test}-section-{sec}.mp3' for sec in range(1,5)),
            }
            if manifest.get('bundle') != archive_path.name or manifest.get('source') != 'Cambridge IELTS Academic 14' or manifest.get('test') != test or manifest.get('printedPages') != [lo,hi]:
                raise ValueError('Invalid Cambridge 14 package identity: '+archive_path.name)
            if set(files) != subset or set(archive.namelist()) != subset | {'cambridge_media_manifest.json'}:
                raise ValueError('Missing or unexpected Cambridge 14 pages/audio in: '+archive_path.name)
            for rel, expected_hash in files.items():
                if rel in seen or rel not in expected:
                    raise ValueError('Unexpected or repeated Cambridge 14 media path: '+rel)
                payload = archive.read(rel)
                if hashlib.sha256(payload).hexdigest() != expected_hash:
                    raise ValueError('Cambridge IELTS 14 media checksum mismatch: '+rel)
                dest = OUTPUT / rel
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(payload)
                seen.add(rel)
    if seen != expected:
        raise ValueError('Cambridge IELTS 14 media asset coverage incomplete')
    volume = next(v for v in catalog['volumes'] if v['id'] == 'cambridge-ielts-academic-14')
    volume['mediaRoot'] = prefix
    for exam in volume['tests']:
        test = int(exam['id'].split('-')[1])
        exam['audio'] = [f'{prefix}/audio/test-{test}-section-{section}.mp3' for section in range(1, 5)]
    print('Published Cambridge IELTS Academic 14: 87 book page images and all 16 original audio tracks')




def activate_cambridge15_media(catalog):
    """Publish Cam 15 media only if all four teacher-provided ZIPs match their SHA256 manifests."""
    root = 'media/cambridge-ielts-academic-15'
    archives = [ROOT / f'cambridge_15_media_test_{test}.zip' for test in range(1,5)]
    absent = [archive.name for archive in archives if not archive.exists()]
    if absent:
        print('Cambridge IELTS Academic 15 media pending: ' + ', '.join(absent))
        return
    printed_ranges = {1:(10,30),2:(31,51),3:(52,73),4:(74,95)}
    expected = {
        *(f'{root}/pages/page-{page:03d}.webp' for page in range(10,96)),
        *(f'{root}/audio/test-{test}-section-{section}.m4a' for test in range(1,5) for section in range(1,5))
    }
    seen = set()
    for test, path in enumerate(archives,1):
        with zipfile.ZipFile(path) as bundle:
            bad = bundle.testzip()
            if bad:
                raise ValueError('Cambridge IELTS 15 ZIP integrity error: ' + bad)
            manifest = json.loads(bundle.read('cambridge_media_manifest.json'))
            lo,hi = printed_ranges[test]
            subset = {
                *(f'{root}/pages/page-{n:03d}.webp' for n in range(lo,hi+1)),
                *(f'{root}/audio/test-{test}-section-{section}.m4a' for section in range(1,5))
            }
            files = manifest['paths']
            if (manifest.get('bundle') != path.name or manifest.get('source') != 'Cambridge IELTS Academic 15'
                or manifest.get('test') != test or manifest.get('printedPages') != [lo,hi]):
                raise ValueError('Wrong Cambridge IELTS 15 package identity: ' + path.name)
            if set(files) != subset or set(bundle.namelist()) != subset | {'cambridge_media_manifest.json'}:
                raise ValueError('Cambridge IELTS 15 files do not match the test source pages: ' + path.name)
            for rel, expected_digest in files.items():
                if rel in seen or rel not in expected:
                    raise ValueError('Unexpected/duplicated Cambridge IELTS 15 media: ' + rel)
                payload = bundle.read(rel)
                if hashlib.sha256(payload).hexdigest() != expected_digest:
                    raise ValueError('Cambridge IELTS 15 media checksum mismatch: ' + rel)
                out = OUTPUT / rel
                out.parent.mkdir(parents=True,exist_ok=True)
                out.write_bytes(payload)
                seen.add(rel)
    if seen != expected:
        raise ValueError('Cambridge IELTS 15 missing original pages or audio files')
    volume = next(v for v in catalog['volumes'] if v['id']=='cambridge-ielts-academic-15')
    volume['mediaRoot'] = root
    for test in volume['tests']:
        n = int(test['id'].split('-')[1])
        test['audio'] = [f'{root}/audio/test-{n}-section-{s}.m4a' for s in range(1,5)]
    print('Published Cambridge IELTS Academic 15: 86 source pages and 16 audio sections')



def activate_cambridge16_media(catalog):
    """Include Cambridge 16 source pages and audio after all four signed manifests validate."""
    prefix = 'media/cambridge-ielts-academic-16'
    bundles = [ROOT / f'cambridge_16_media_test_{n}.zip' for n in range(1,5)]
    missing = [p.name for p in bundles if not p.is_file()]
    if missing:
        print('Cambridge IELTS Academic 16 media pending: ' + ', '.join(missing))
        return
    printed_ranges = {1:(10,31),2:(32,54),3:(55,75),4:(76,97)}
    all_expected = {
        *(f'{prefix}/pages/page-{n:03d}.webp' for n in range(10,98)),
        *(f'{prefix}/audio/test-{n}-section-{s}.m4a' for n in range(1,5) for s in range(1,5))
    }
    seen = set()
    for test, bundle_path in enumerate(bundles,1):
        with zipfile.ZipFile(bundle_path) as z:
            if z.testzip() is not None:
                raise ValueError('Corrupted Cambridge 16 ZIP: ' + bundle_path.name)
            manifest = json.loads(z.read('cambridge_media_manifest.json'))
            lo, hi = printed_ranges[test]
            expected = {
                *(f'{prefix}/pages/page-{n:03d}.webp' for n in range(lo,hi+1)),
                *(f'{prefix}/audio/test-{test}-section-{s}.m4a' for s in range(1,5))
            }
            hashes = manifest['paths']
            if (manifest.get('bundle') != bundle_path.name or
                manifest.get('source') != 'Cambridge IELTS Academic 16' or
                manifest.get('test') != test or
                manifest.get('printedPages') != [lo,hi]):
                raise ValueError('Wrong Cambridge 16 package metadata: ' + bundle_path.name)
            if set(hashes) != expected or set(z.namelist()) != expected | {'cambridge_media_manifest.json'}:
                raise ValueError('Missing or unexpected Cambridge 16 media assets in: ' + bundle_path.name)
            for rel, sha in hashes.items():
                if rel in seen or rel not in all_expected:
                    raise ValueError('Invalid or repeated Cambridge 16 path: ' + rel)
                payload = z.read(rel)
                if hashlib.sha256(payload).hexdigest() != sha:
                    raise ValueError('Cambridge 16 media integrity mismatch: ' + rel)
                out = OUTPUT / rel
                out.parent.mkdir(parents=True,exist_ok=True)
                out.write_bytes(payload)
                seen.add(rel)
    if seen != all_expected:
        raise ValueError('Cambridge 16 media completeness check failed')
    book = next(v for v in catalog['volumes'] if v['id']=='cambridge-ielts-academic-16')
    book['mediaRoot'] = prefix
    for exam in book['tests']:
        n = int(exam['id'].split('-')[1])
        exam['audio'] = [f'{prefix}/audio/test-{n}-section-{s}.m4a' for s in range(1,5)]
    print('Published Cambridge IELTS Academic 16: 88 original book pages and all 16 listening sections')


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
    activate_cambridge13_media(catalog)
    activate_cambridge14_media(catalog)
    activate_cambridge15_media(catalog)
    activate_cambridge16_media(catalog)
    activate_trainer_exam_audio()
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
    for asset in ['data.js', 'app.js', 'reading.js', 'listening.js', 'student.js', 'writing.js', 'styles.css', 'flappy.js', 'flappy.css', 'trainer.js', 'trainer.css', 'cambridge.js', 'cambridge-keys.js', 'cambridge13-keys.js', 'cambridge14-keys.js', 'cambridge15-keys.js', 'cambridge16-keys.js', 'cambridge.css']:
        version = hashlib.sha256((OUTPUT / asset).read_bytes()).hexdigest()[:12]
        index, count = re.subn(re.escape(asset) + r'\?v=[^"\s<>]+', asset + '?v=' + version, index)
        assert count == 1
    (OUTPUT / 'index.html').write_text(index)
    (OUTPUT / '.nojekyll').touch()
    print(f'Built {len(catalog["books"])} books, {len(catalog["units"])} units/tests and {word_count} words in {OUTPUT}')


if __name__ == '__main__':
    build()
