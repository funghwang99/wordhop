"""Check complete Vietnamese PET support and unchanged reviewed English data."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-assets/locales/pet-vi'
read = lambda p: json.loads(p.read_text())
catalog = json.loads((ROOT / 'dist/data.js').read_text().removeprefix('window.WQ_CATALOG = ').strip().removesuffix(';'))
anchors = {(r['unitId'], r['kind']): r['englishSha256'] for r in read(SOURCE / 'source-anchors.json')['records']}
word_map, question_map = {}, {}
for path in SOURCE.glob('vocabulary-*.json'):
    for word in read(path)['words']:
        assert word['id'] not in word_map
        word_map[word['id']] = word['definitionVi']
for pattern in ['reading-*.json', 'listening-*.json', 'explanations-*.json']:
    for path in SOURCE.glob(pattern):
        for q in read(path)['items']:
            key = q['unitId'], q['skill'], q['partId'], q['number']
            assert key not in question_map
            question_map[key] = q


def english(value):
    if isinstance(value, list):
        return [english(v) for v in value]
    if isinstance(value, dict):
        return {k: english(v) for k, v in value.items() if k not in ['definitionVi', 'explanationVi', 'reviewNoteVi']}
    return value


counts, seen_words, seen_questions = Counter(), set(), set()
for unit in catalog['units']:
    pet = unit['bookId'] in ['simply-pet', 'authentic-1']
    for kind, field in [('vocabulary', 'dataFile'), ('reading', 'readingFile'), ('listening', 'listeningFile')]:
        if field not in unit:
            continue
        path = ROOT / 'dist' / unit[field].lstrip('/')
        raw, data = path.read_bytes(), read(path)
        if unit['bookId'] == 'trainer':
            assert kind == 'vocabulary'
            assert path.name == f'{unit["id"]}.json'
            assert data['id'] == unit['id']
            assert len(data['words']) == unit['wordCount'] == 24
            assert [w['id'] for w in data['words']] == unit['wordIds']
            assert all(w.get('definitionVi') and w.get('definition') and w['definitionVi'] != w['definition'] for w in data['words'])
            continue
        assert hashlib.sha256(raw).hexdigest()[:12] in path.name
        if not pet:
            assert data == english(data), 'Vietnamese support must not change IELTS content'
            continue
        canonical = json.dumps(english(data), ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
        assert hashlib.sha256(canonical).hexdigest() == anchors[(unit['id'], kind)], f'Changed English data: {unit["id"]} {kind}'
        if kind == 'vocabulary':
            meanings = set()
            for word in data['words']:
                vi = word.get('definitionVi')
                assert vi == unicodedata.normalize('NFC', word_map[word['id']])
                assert vi and vi != word['definition'] and vi == vi.strip()
                assert vi.casefold() not in meanings, f'Duplicate matching meaning: {unit["id"]}'
                meanings.add(vi.casefold())
                counts[unit['bookId'], kind] += 1
                seen_words.add(word['id'])
        else:
            for part in data['parts']:
                for q in part['questions']:
                    key = unit['id'], kind, part['id'], q['number']
                    vi = q.get('explanationVi')
                    assert vi == unicodedata.normalize('NFC', question_map[key]['explanationVi'])
                    assert vi != q['explanation'] and len(vi) >= 15 and re.search(r'[ăâđêôơưàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ]', vi.lower())
                    if q.get('reviewNote'):
                        assert q['reviewNoteVi'] == question_map[key]['reviewNoteVi']
                        assert 'không tính điểm' in q['reviewNoteVi'].lower()
                    counts[unit['bookId'], kind] += 1
                    seen_questions.add(key)
assert counts == {('simply-pet', 'vocabulary'): 250, ('authentic-1', 'vocabulary'): 243,
                  ('simply-pet', 'reading'): 256, ('authentic-1', 'reading'): 128,
                  ('simply-pet', 'listening'): 200, ('authentic-1', 'listening'): 100}
assert seen_words == set(word_map) and seen_questions == set(question_map)
assert len(anchors) == 36
print('PASS: all 493 PET meanings and 684 question explanations are Vietnamese; every English field, key, page, audio cue and stable ID matches its reviewed source.')
