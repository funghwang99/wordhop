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
    if unit['bookId'] in ['simply-pet', 'authentic-1', 'trainer']:
        visible = [w for w in before['words'] if w['id'] in unit['wordIds']]
        assert len(after['words']) == unit['wordCount'] == len(unit['wordIds'])
        assert [w['id'] for w in after['words']] == unit['wordIds']
        assert len(after['words']) <= len(before['words'])
    else:
        visible = before['words']
        assert len(after['words']) == len(before['words'])
    assert hashlib.sha256(after_path.read_bytes()).hexdigest()[:12] in after_path.name
    for old, new in zip(visible, after['words']):
        assert {k: v for k, v in new.items() if k != 'image'} == {k: v for k, v in old.items() if k != 'image'}
        if old.get('image'):
            assert new['image'] == old['image'].lstrip('/')
            assert (ROOT / '_site' / new['image']).read_bytes() == (ROOT / 'dist' / old['image'].lstrip('/')).read_bytes()
            assert not new['image'].startswith('/')
        assert new['cloze'].replace('________', new['answer']) == new.get('clozeExample', new['example'])
    for base in ['https://example.github.io/', 'https://example.github.io/wordhop/', 'https://example.github.io/a/nested/project/']:
        resources = [unit['dataFile']] + [w['image'] for w in after['words'] if w.get('image')]
        for resource in resources:
            resolved = urljoin(base, resource)
            assert resolved.startswith(base), (base, resource, resolved)
            relative = urlsplit(resolved).path[len(urlsplit(base).path):]
            assert (ROOT / '_site' / relative).is_file(), resolved
pet_books = ['simply-pet', 'authentic-1', 'trainer']
pet_original = sum(len(json.loads((ROOT/'dist'/u['dataFile'].lstrip('/')).read_text())['words'])
                   for u in source['units'] if u['bookId'] in pet_books)
pet_published = sum(u['wordCount'] for u in built['units'] if u['bookId'] in pet_books)
assert pet_original == 637 and pet_published == 467
print(f'PASS: PET B1+ filter publishes {pet_published}/{pet_original} vocabulary items; 170 basic items physically absent from published JSON.')
# Six standalone PET arcade games have their own embedded banks.
# Verify they display exactly the same B1+ words as the published Flashcards/Practice JSON.
pet_game_units = {
    'authentic-1-test-1': 'pet-authentic-test1-park-builder.html',
    'authentic-1-test-2': 'pet-authentic-test2-skyport.html',
    'authentic-1-test-3': 'pet-authentic-test3-castle-guard.html',
    'authentic-1-test-4': 'pet-authentic-test4-reel-quest.html',
    'trainer-test-1': 'pet-trainer-test1-express.html',
    'trainer-test-2': 'pet-trainer-test2-cliff-quest.html'
}
for unit_id, game_file in pet_game_units.items():
    unit = next(u for u in built['units'] if u['id'] == unit_id)
    published = json.loads((ROOT / '_site' / unit['dataFile']).read_text())['words']
    game_html = (ROOT / '_site' / 'games' / game_file).read_text()
    match = re.search(r'<script id="(?:wordbank|vocab)" type="application/json">(\[.*?\])</script>', game_html, re.S)
    if match is None:  # Castle Guard defines its original word deck as a JS array.
        match = re.search(r'const WORDS=(\[.*?\]);\s*', game_html, re.S)
    assert match is not None, 'Missing PET game bank: ' + game_file
    game = json.loads(match.group(1))
    assert len(game) == unit['wordCount']
    assert [w['term'] for w in game] == [w['term'] for w in published], 'B1+ PET game and Flashcards differ: ' + game_file
print('PASS: 6 PET arcade game banks match the curated B1+ Flashcards and Practice decks exactly.')

html = (ROOT / '_site/index.html').read_text()
for asset in ['data.js', 'app.js', 'reading.js', 'listening.js', 'student.js', 'writing.js', 'styles.css', 'trainer.js', 'trainer.css', 'cambridge.js', 'cambridge-keys.js', 'cambridge13-keys.js', 'cambridge14-keys.js', 'cambridge15-keys.js', 'cambridge16-keys.js', 'cambridge17-keys.js', 'cambridge18-keys.js', 'cambridge19-keys.js', 'cambridge20-keys.js', 'cambridge21-keys.js', 'cambridge.css']:
    assert asset + '?v=' + hashlib.sha256((ROOT / '_site' / asset).read_bytes()).hexdigest()[:12] in html
cambridge = next(v for v in built['volumes'] if v['id'] == 'cambridge-ielts-academic-21')
media = cambridge.get('mediaRoot')
archives = [ROOT / 'cambridge_21_media_tests_5_6.zip', ROOT / 'cambridge_21_media_tests_7_8.zip']
if all(bundle.exists() for bundle in archives):
    assert media == 'media/cambridge-ielts-academic-21'
    pages = [f'{media}/pages/page-{i:03d}.webp' for i in range(10, 95)]
    audios = [f'{media}/audio/test-{t}-section-{s}.m4a' for t in range(5, 9) for s in range(1, 5)]
    assert all((ROOT / '_site' / item).is_file() for item in pages + audios)
    for test in cambridge['tests']:
        assert len(test['audio']) == 4
        assert all((ROOT / '_site' / item).is_file() for item in test['audio'])
    print('PASS: Cambridge IELTS Academic source pages (85) and Listening recordings (16) uploaded and published.')
else:
    assert media is None and all(not test.get('audio') for test in cambridge['tests'])
    print('Cambridge IELTS source media still pending external upload; site shows clear placeholders.')

cambridge13 = next(v for v in built['volumes'] if v['id'] == 'cambridge-ielts-academic-13')
assert cambridge13['title'] == 'Cambridge IELTS Academic 13'
assert [t['id'] for t in cambridge13['tests']] == ['test-1','test-2','test-3','test-4']
cm13bundles = [ROOT / f'cambridge_13_media_test_{t}.zip' for t in range(1,5)]
if all(p.exists() for p in cm13bundles):
    assert cambridge13.get('mediaRoot') == 'media/cambridge-ielts-academic-13'
    images = [f"{cambridge13['mediaRoot']}/pages/page-{n:03d}.webp" for n in range(10,97)]
    audio = [f"{cambridge13['mediaRoot']}/audio/test-{t}-section-{s}.mp3" for t in range(1,5) for s in range(1,5)]
    assert len(images)==87 and len(audio)==16
    assert all((ROOT / '_site' / p).is_file() for p in images+audio)
    assert all(len(test.get('audio',[]))==4 for test in cambridge13['tests'])
    print('PASS: Cambridge IELTS 13 87 source pages and 16 audio tracks are published.')
else:
    assert cambridge13.get('mediaRoot') is None
    assert all('audio' not in exam for exam in cambridge13['tests'])
    print('Cambridge 13 media bundles not yet all uploaded: source pages and audio are pending.')
cambridge14 = next(v for v in built['volumes'] if v['id'] == 'cambridge-ielts-academic-14')
assert cambridge14['title'] == 'Cambridge IELTS Academic 14'
assert [e['id'] for e in cambridge14['tests']] == ['test-1','test-2','test-3','test-4']
archives14 = [ROOT / f'cambridge_14_media_test_{t}.zip' for t in range(1,5)]
if all(p.is_file() for p in archives14):
    assert cambridge14['mediaRoot'] == 'media/cambridge-ielts-academic-14'
    images14 = [f"{cambridge14['mediaRoot']}/pages/page-{n:03d}.webp" for n in range(10,97)]
    audio14 = [f"{cambridge14['mediaRoot']}/audio/test-{t}-section-{s}.mp3" for t in range(1,5) for s in range(1,5)]
    assert len(images14) == 87 and len(audio14) == 16
    assert all((ROOT / '_site' / p).is_file() for p in images14+audio14)
    assert all(len(exam.get('audio',[]))==4 for exam in cambridge14['tests'])
    print('PASS: Cambridge IELTS 14 all 87 original pages and 16 MP3 audio sections published.')
else:
    assert not cambridge14.get('mediaRoot')
    assert all(not exam.get('audio') for exam in cambridge14['tests'])
    print('Cambridge IELTS 14 media awaiting all four ZIP uploads; no broken image/audio links.')

cambridge15 = next(v for v in built['volumes'] if v['id'] == 'cambridge-ielts-academic-15')
assert cambridge15['title'] == 'Cambridge IELTS Academic 15'
assert [test['id'] for test in cambridge15['tests']] == ['test-1','test-2','test-3','test-4']
archives15 = [ROOT / f'cambridge_15_media_test_{test}.zip' for test in range(1,5)]
if all(archive.is_file() for archive in archives15):
    assert cambridge15.get('mediaRoot') == 'media/cambridge-ielts-academic-15'
    images15 = [f"{cambridge15['mediaRoot']}/pages/page-{n:03d}.webp" for n in range(10,96)]
    tracks15 = [f"{cambridge15['mediaRoot']}/audio/test-{n}-section-{part}.m4a" for n in range(1,5) for part in range(1,5)]
    assert len(images15) == 86 and len(tracks15) == 16
    assert all((ROOT / '_site' / p).is_file() for p in images15+tracks15)
    assert all(len(test.get('audio',[]))==4 for test in cambridge15['tests'])
    print('PASS: Cambridge IELTS 15 all 86 original pages and 16 audio sections published.')
else:
    assert cambridge15.get('mediaRoot') is None
    assert all(not test.get('audio') for test in cambridge15['tests'])
    print('Cambridge IELTS 15 media awaits four verified ZIP uploads; placeholders remain in place.')

cambridge16 = next(v for v in built['volumes'] if v['id']=='cambridge-ielts-academic-16')
assert cambridge16['title'] == 'Cambridge IELTS Academic 16'
assert [t['id'] for t in cambridge16['tests']] == ['test-1','test-2','test-3','test-4']
bundles16 = [ROOT / f'cambridge_16_media_test_{t}.zip' for t in range(1,5)]
if all(p.is_file() for p in bundles16):
    assert cambridge16['mediaRoot'] == 'media/cambridge-ielts-academic-16'
    image_paths = [f"{cambridge16['mediaRoot']}/pages/page-{n:03d}.webp" for n in range(10,98)]
    audio_paths = [f"{cambridge16['mediaRoot']}/audio/test-{t}-section-{s}.m4a" for t in range(1,5) for s in range(1,5)]
    assert len(image_paths) == 88 and len(audio_paths) == 16
    assert all((ROOT/'_site'/p).is_file() for p in image_paths+audio_paths)
    assert all(len(t.get('audio',[]))==4 for t in cambridge16['tests'])
    print('PASS: Cambridge IELTS Academic 16 all 88 source page images and 16 audio sections published.')
else:
    assert not cambridge16.get('mediaRoot')
    assert all(not t.get('audio') for t in cambridge16['tests'])
    print('Cambridge IELTS 16 waits for four verified media ZIPs; website shows placeholders.')

cambridge17 = next(v for v in built['volumes'] if v['id']=='cambridge-ielts-academic-17')
assert cambridge17['title'] == 'Cambridge IELTS Academic 17'
assert [e['id'] for e in cambridge17['tests']] == ['test-1','test-2','test-3','test-4']
packages17 = [ROOT / f'cambridge_17_media_test_{t}.zip' for t in range(1,4)]
full4 = (ROOT / 'cambridge_17_media_test_4.zip').is_file()
split4 = all((ROOT / f'cambridge_17_media_test_4_{suffix}.zip').is_file()
             for suffix in ('pages','audio_1_2','audio_3_4'))
if all(p.is_file() for p in packages17) and (full4 or split4):
    prefix17 = cambridge17['mediaRoot']
    assert prefix17 == 'media/cambridge-ielts-academic-17'
    image_paths17 = [f'{prefix17}/pages/page-{n:03d}.webp' for n in range(10,96)]
    track_paths17 = [f'{prefix17}/audio/test-{t}-section-{s}.mp3'
                     for t in range(1,5) for s in range(1,5)]
    assert len(image_paths17)==86 and len(track_paths17)==16
    assert all((ROOT/'_site'/p).is_file() for p in image_paths17+track_paths17)
    for t,exam in enumerate(cambridge17['tests'],1):
        expected = [f'{prefix17}/audio/test-{t}-section-{s}.mp3' for s in range(1,5)]
        assert exam.get('audio')==expected, f'Test {t} must have four correct audio tracks'
    print('PASS: Cambridge IELTS 17 86 original pages and all 16 provided Listening recordings published.')
else:
    assert not cambridge17.get('mediaRoot')
    assert all(not e.get('audio') for e in cambridge17['tests'])
    print('Cambridge IELTS 17 awaits Test 1–3 and either the full Test 4 ZIP or three small Test 4 ZIPs.')

cambridge18 = next(v for v in built['volumes'] if v['id']=='cambridge-ielts-academic-18')
assert cambridge18['title'] == 'Cambridge IELTS Academic 18'
assert [test['id'] for test in cambridge18['tests']]==['test-1','test-2','test-3','test-4']
bundles18 = [ROOT / f'cambridge_18_media_test_{t}.zip' for t in range(1,5)]
if all(p.is_file() for p in bundles18):
    prefix = cambridge18['mediaRoot']
    assert prefix == 'media/cambridge-ielts-academic-18'
    pages = [f'{prefix}/pages/page-{n:03d}.webp' for n in range(10,99)]
    audio = [f'{prefix}/audio/test-{t}-section-{s}.mp3' for t in range(1,5) for s in range(1,5)]
    assert len(pages)==89 and len(audio)==16
    assert all((ROOT/'_site'/x).is_file() for x in pages+audio)
    for t,exam in enumerate(cambridge18['tests'],1):
        expected=[f'{prefix}/audio/test-{t}-section-{s}.mp3' for s in range(1,5)]
        assert exam.get('audio')==expected, 'All four test audio sections must be correctly mapped'
    print('PASS: Cambridge IELTS 18 89 original book pages and all 16 Listening sections published.')
else:
    assert not cambridge18.get('mediaRoot')
    assert all(not test.get('audio') for test in cambridge18['tests'])
    print('Cambridge IELTS 18 waits for all four media ZIPs; source placeholders stay visible.')

cambridge19 = next(v for v in built['volumes'] if v['id']=='cambridge-ielts-academic-19')
assert cambridge19['title']=='Cambridge IELTS Academic 19'
assert [t['id'] for t in cambridge19['tests']]==['test-1','test-2','test-3','test-4']
bundles19=[ROOT/f'cambridge_19_media_test_{t}.zip' for t in range(1,5)]
if all(p.is_file() for p in bundles19):
    prefix=cambridge19['mediaRoot']
    assert prefix=='media/cambridge-ielts-academic-19'
    pages=[f'{prefix}/pages/page-{p:03d}.webp' for p in range(10,99)]
    tracks=[f'{prefix}/audio/test-{t}-section-{s}.mp3' for t in range(1,5) for s in range(1,5)]
    assert len(pages)==89 and len(tracks)==16
    assert all((ROOT/'_site'/x).is_file() for x in pages+tracks)
    for t,test in enumerate(cambridge19['tests'],1):
        assert test.get('audio')==[f'{prefix}/audio/test-{t}-section-{s}.mp3' for s in range(1,5)]
    print('PASS: Cambridge IELTS 19 all 89 original pages and 16 Listening audio sections deployed.')
else:
    assert not cambridge19.get('mediaRoot')
    assert all(not t.get('audio') for t in cambridge19['tests'])
    print('Cambridge IELTS 19 media pending four ZIP uploads: source placeholders available.')

cambridge20 = next(v for v in built['volumes'] if v['id']=='cambridge-ielts-academic-20')
assert cambridge20['title']=='Cambridge IELTS Academic 20'
assert [t['id'] for t in cambridge20['tests']]==['test-1','test-2','test-3','test-4']
page_archives20=[ROOT/f'cambridge_20_pages_test_{t}.zip' for t in range(1,5)]
if all(p.is_file() for p in page_archives20):
    prefix=cambridge20['mediaRoot']
    assert prefix=='media/cambridge-ielts-academic-20'
    pages=[f'{prefix}/pages/page-{p:03d}.webp' for p in range(1,79)]
    assert len(pages)==78 and all((ROOT/'_site'/x).is_file() for x in pages)
    audio_count=0
    for n,exam in enumerate(cambridge20['tests'],1):
        archive=ROOT/f'cambridge_20_audio_test_{n}.zip'
        expected=[f'{prefix}/audio/test-{n}-section-{s}.mp3' for s in range(1,5)]
        if archive.is_file():
            assert exam.get('audio')==expected
            assert all((ROOT/'_site'/track).is_file() for track in expected)
            audio_count+=4
        else:
            assert exam.get('audio')==[None,None,None,None], 'Never use dummy/metadata files as recordings'
    print(f'PASS: Cambridge IELTS 20 78 book images and {audio_count}/16 verified audio tracks published.')
else:
    assert not cambridge20.get('mediaRoot')
    assert all(not e.get('audio') for e in cambridge20['tests'])
    print('Cambridge IELTS 20 page scans awaiting four page-only ZIPs; audio will be added separately.')

cambridge21 = next(v for v in built['volumes'] if v['id']=='cambridge-ielts-academic-21-2026')
assert cambridge21['title']=='Cambridge IELTS Academic 21'
assert [t['id'] for t in cambridge21['tests']]==['test-1','test-2','test-3','test-4']
old_cam12 = next(v for v in built['volumes'] if v['id']=='cambridge-ielts-academic-21')
assert old_cam12['title']=='Cambridge IELTS Academic 12'
assert [t['id'] for t in old_cam12['tests']]==['test-5','test-6','test-7','test-8']
archives21=[ROOT/f'cambridge_21_media_test_{t}.zip' for t in range(1,5)]
if all(p.is_file() for p in archives21):
    prefix=cambridge21['mediaRoot']
    assert prefix=='media/cambridge-ielts-academic-21-2026'
    page_paths=[f'{prefix}/pages/page-{p:03d}.webp' for p in range(10,97)]
    audio_paths=[f'{prefix}/audio/test-{t}-section-{sec}.mp3' for t in range(1,5) for sec in range(1,5)]
    assert len(page_paths)==87 and len(audio_paths)==16
    assert all((ROOT/'_site'/path).is_file() for path in page_paths+audio_paths)
    for t,exam in enumerate(cambridge21['tests'],1):
        assert exam.get('audio')==[f'{prefix}/audio/test-{t}-section-{sec}.mp3' for sec in range(1,5)]
    print('PASS: Cambridge IELTS Academic 21 all 87 original pages and 16 Listening sections published.')
else:
    assert not cambridge21.get('mediaRoot')
    assert all(not exam.get('audio') for exam in cambridge21['tests'])
    print('Cambridge IELTS 21 media awaiting four ZIP uploads; no broken page/audio paths.')

assert (ROOT / '_site/trainer.js').is_file()
assert (ROOT / '_site/trainer.css').is_file()
for n in (1, 2):
    for part in (1, 2, 3):
        assert (ROOT / '_site/trainer' / f'test-{n}-reading-part-{part}.json').is_file()
trainer_audio = json.loads((ROOT / '_site/trainer/audio-manifest.json').read_text())
assert len(trainer_audio['tracks']) == 24
audio_published = []
for item in trainer_audio['tracks']:
    bundle = next(b for b in trainer_audio['bundles'] if item['test'] in b['tests'])
    path = ROOT / '_site' / item['src']
    expected = (ROOT / bundle['file']).is_file()
    assert path.is_file() == expected, item['src']
    if expected:
        assert path.stat().st_size > 10000
        audio_published.append(item['src'])
assert len(audio_published) in (0, 8, 16, 24)
print(f'PASS: Trainer Exam Practice audio: {len(audio_published)}/24 files, no Training recordings')
assert 'trainer.js' in html and 'trainer.css' in html
manifest_path = ROOT / '_site/trainer/exam-pages.json'
assert manifest_path.is_file()
assert len(json.loads(manifest_path.read_text())['tests']) == 6
trainer_manifest = json.loads(manifest_path.read_text())
trainer_image_paths = {page['image'] for test in trainer_manifest['tests']
                       for parts in test['skills'].values() for part in parts
                       for page in part['pages']}
assert len(trainer_image_paths) == 114
if (ROOT / 'trainer-original-page-images.zip').exists():
    assert all((ROOT / '_site' / name).is_file() for name in trainer_image_paths)
    print('PASS: all 114 original Trainer exam images rendered as local website assets.')
else:
    assert not any((ROOT / '_site' / name).exists() for name in trainer_image_paths)
    print('Trainer source image archive not yet uploaded; website displays an honest pending state.')
# A direct game link returns to its unit, and embedded games keep their original content.
for game_path in ['games/word-ninja-unit11.html', 'games/word-invaders-unit12.html', 'games/word-cannon-unit13.html', 'games/word-hopper-unit14.html', 'games/word-courier-unit15.html', 'games/word-circuit-unit16.html', 'games/word-rescue-unit4.html']:
    game_html = (ROOT / '_site' / game_path).read_text()
    game_guard = re.search(r'<script id="wordhop-game-entry">.*?</script>', game_html)
    assert game_guard
    number = re.search(r'-unit([0-9]+)\.html$', game_path)[1]
    assert f'location.replace("../#/ielts/ielts-35-40/basic-ielts-reading/bir-unit-{number}/practice")' in game_guard[0]
    assert 'window.parent.WordHopStudent?.current()' in game_guard[0]
    assert game_html.replace(game_guard[0], '', 1) == (ROOT / 'dist' / game_path).read_text()
    for base in ['https://example.github.io/', 'https://example.github.io/wordhop/', 'https://example.github.io/a/nested/project/']:
        resolved = urljoin(base, game_path)
        assert resolved.startswith(base)
        assert (ROOT / '_site' / urlsplit(resolved).path[len(urlsplit(base).path):]).is_file()

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
    assert len(data['parts']) == (6 if unit['bookId'] in ['simply-pet', 'authentic-1'] else 2)
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
assert reading_parts == 98 and reading_questions == 862
print('PASS: all reading tests, original pages and keys resolve inside GitHub Pages project paths.')

writing_tests = writing_parts = writing_prompts = 0
writing_pages = set()
for unit in built['units']:
    if not unit.get('writingFile'):
        continue
    writing_tests += 1
    writing_path = ROOT / '_site' / unit['writingFile']
    data = json.loads(writing_path.read_text())
    assert data == json.loads((ROOT / 'dist' / unit['writingFile']).read_text())
    assert hashlib.sha256(writing_path.read_bytes()).hexdigest()[:12] in writing_path.name
    for part in data['parts']:
        writing_parts += 1
        writing_prompts += len(part['questions'])
        for page in part['pages']:
            image = page['image']
            writing_pages.add(image)
            assert (ROOT / '_site' / image).read_bytes() == (ROOT / 'dist' / image).read_bytes()
            for base in ['https://example.github.io/', 'https://example.github.io/wordhop/', 'https://example.github.io/a/nested/project/']:
                for resource in [unit['writingFile'], image]:
                    resolved = urljoin(base, resource)
                    assert resolved.startswith(base)
                    assert (ROOT / '_site' / urlsplit(resolved).path[len(urlsplit(base).path):]).is_file()
assert (writing_tests, writing_parts, writing_prompts, len(writing_pages)) == (12, 24, 36, 24)
print('PASS: all 12 Writing tests, 36 prompts and 24 original pages resolve at every supported project path.')

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
assert audio_count == 48
print('PASS: all 48 listening tracks resolve inside root, /wordhop/ and deeper project paths.')

listening_parts = listening_questions = 0
listening_pages = set()
for unit in built['units']:
    if not unit.get('listeningFile'):
        continue
    data_path = ROOT / '_site' / unit['listeningFile']
    data = json.loads(data_path.read_text())
    assert data['id'] == unit['id']
    assert data == json.loads((ROOT / 'dist' / unit['listeningFile']).read_text())
    assert hashlib.sha256(data_path.read_bytes()).hexdigest()[:12] in data_path.name
    for part in data['parts']:
        listening_parts += 1
        listening_questions += len(part['questions'])
        images = [page['image'] for page in part['pages']]
        listening_pages.update(images)
        for image in images:
            assert (ROOT / '_site' / image).read_bytes() == (ROOT / 'dist' / image).read_bytes()
        for base in ['https://example.github.io/', 'https://example.github.io/wordhop/', 'https://example.github.io/a/nested/project/']:
            for resource in [unit['listeningFile'], *images]:
                resolved = urljoin(base, resource)
                assert resolved.startswith(base)
                assert (ROOT / '_site' / urlsplit(resolved).path[len(urlsplit(base).path):]).is_file()
assert (listening_parts, listening_questions, len(listening_pages)) == (48, 300, 56)
print('PASS: all Listening questions, original pages, keys and explanations resolve at every supported project path.')
