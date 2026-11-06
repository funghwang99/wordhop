"""Apply reviewed Vietnamese PET support without changing English learning data."""
import copy
import hashlib
import json
from pathlib import Path
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
SOURCE = ROOT / 'source-assets/locales/pet-vi'
PREFIX = 'window.WQ_CATALOG = '
BOOKS = {'simply-pet', 'authentic-1'}
VI_FIELDS = {'definitionVi', 'explanationVi', 'reviewNoteVi'}


def read(path):
    return json.loads(path.read_text())


def without_vietnamese(value):
    if isinstance(value, dict):
        return {key: without_vietnamese(v) for key, v in value.items() if key not in VI_FIELDS}
    if isinstance(value, list):
        return [without_vietnamese(v) for v in value]
    return value


def english_digest(value):
    content = json.dumps(without_vietnamese(value), ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()
    return hashlib.sha256(content).hexdigest()


def checked_text(value):
    assert isinstance(value, str) and value.strip() == value and value
    assert '<' not in value and '>' not in value
    return unicodedata.normalize('NFC', value)


def main():
    catalog_path = DIST / 'data.js'
    catalog = json.loads(catalog_path.read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    anchors = {(r['unitId'], r['kind']): r['englishSha256'] for r in read(SOURCE / 'source-anchors.json')['records']}
    words, questions, used_words, used_questions = {}, {}, set(), set()
    for path in sorted(SOURCE.glob('vocabulary-*.json')):
        data = read(path)
        assert data['language'] == 'vi'
        for word in data['words']:
            assert word['id'] not in words
            words[word['id']] = checked_text(word['definitionVi'])
    for pattern in ['reading-*.json', 'listening-*.json', 'explanations-*.json']:
        for path in sorted(SOURCE.glob(pattern)):
            data = read(path)
            assert data['language'] == 'vi'
            for q in data['items']:
                key = (q['unitId'], q['skill'], q['partId'], q['number'])
                assert key not in questions
                questions[key] = {field: checked_text(q[field]) for field in ['explanationVi', 'reviewNoteVi'] if field in q}
                assert questions[key].get('explanationVi')
    assert len(words) == 493 and len(questions) == 684
    report = {'language': 'vi', 'books': [], 'words': 0, 'readingExplanations': 0,
              'listeningExplanations': 0, 'sourceReviewNotes': 0, 'payloads': []}
    for book_id in ['simply-pet', 'authentic-1']:
        units = [u for u in catalog['units'] if u['bookId'] == book_id]
        book = {'bookId': book_id, 'tests': len(units), 'words': 0, 'readingExplanations': 0, 'listeningExplanations': 0}
        for unit in units:
            for kind, field in [('vocabulary', 'dataFile'), ('reading', 'readingFile'), ('listening', 'listeningFile')]:
                current = unit[field]
                relative = Path(current.lstrip('/'))
                data = read(DIST / relative)
                before = copy.deepcopy(data)
                assert english_digest(data) == anchors[(unit['id'], kind)], f'English source changed; review its translations: {unit["id"]} {kind}'
                if kind == 'vocabulary':
                    for word in data['words']:
                        word['definitionVi'] = words[word['id']]
                        used_words.add(word['id'])
                    meanings = [w['definitionVi'].casefold() for w in data['words']]
                    assert len(meanings) == len(set(meanings)), f'Ambiguous translated meanings: {unit["id"]}'
                    book['words'] += len(data['words'])
                else:
                    for part in data['parts']:
                        for q in part['questions']:
                            key = (unit['id'], kind, part['id'], q['number'])
                            q.update(questions[key])
                            used_questions.add(key)
                            assert bool(q.get('reviewNote')) == bool(q.get('reviewNoteVi'))
                            report['sourceReviewNotes'] += int(bool(q.get('reviewNoteVi')))
                            book[kind + 'Explanations'] += 1
                assert without_vietnamese(before) == without_vietnamese(data)
                content = (json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
                filename = unit['id'] + '.' + hashlib.sha256(content).hexdigest()[:12] + '.json'
                target = relative.parent / filename
                (DIST / target).write_bytes(content)
                unit[field] = ('/' if current.startswith('/') else '') + target.as_posix()
                report['payloads'].append({'unitId': unit['id'], 'kind': kind, 'englishSha256': anchors[(unit['id'], kind)],
                                           'file': target.as_posix(), 'bytes': len(content)})
        report['books'].append(book)
        for field in ['words', 'readingExplanations', 'listeningExplanations']:
            report[field] += book[field]
    assert used_words == set(words) and used_questions == set(questions)
    assert [report[k] for k in ['words', 'readingExplanations', 'listeningExplanations', 'sourceReviewNotes']] == [493, 384, 300, 2]
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    (SOURCE / 'translation-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('Applied Vietnamese PET support: 493 definitions, 384 Reading and 300 Listening explanations.')


if __name__ == '__main__':
    main()
