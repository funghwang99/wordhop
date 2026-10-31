"""Render original Simply PET Listening pages and combine recording-based keys."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-assets/simply-pet-listening'
PREFIX = 'window.WQ_CATALOG = '


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('book_pdf', type=Path)
    args = parser.parse_args()
    questions = json.loads((SOURCE / 'questions.json').read_text())
    keys = json.loads((SOURCE / 'answer-key.json').read_text())
    assert not keys.get('needsReview'), 'Resolve recording review items before importing'
    assert [t['test'] for t in questions['tests']] == list(range(1, 9))
    assert [t['test'] for t in keys['tests']] == list(range(1, 9))
    source = {'title': 'Simply B1 Preliminary for Schools: 8 Complete Practice Tests',
        'publisher': 'GLOBAL ELT, 2019 (revised 2020 exam)',
        'pdfSha256': hashlib.sha256(args.book_pdf.read_bytes()).hexdigest(),
        'questions': 'Original student-book pages supplied by the user.',
        'answerKey': 'WordHop-authored answer key and English explanations based on the supplied recordings; not a publisher key.'}
    doc = fitz.open(args.book_pdf)
    assert len(doc) == 176
    pages = sorted({p for test in questions['tests'] for part in test['parts'] for p in part['pdfPages']})
    assert len(pages) == 32
    image_dir = ROOT / 'dist/assets/listening'
    data_dir = ROOT / 'dist/listening'
    image_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    rendered = {}
    for number in pages:
        page = doc[number - 1]
        scale = 1350 / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        buffer = io.BytesIO()
        img.save(buffer, format='WEBP', quality=88, method=6)
        content = buffer.getvalue()
        filename = f'simply-pet-page-{number}.{hashlib.sha256(content).hexdigest()[:12]}.webp'
        (image_dir / filename).write_bytes(content)
        rendered[number] = {'pdfPage': number, 'printedPage': number - 1,
            'image': 'assets/listening/' + filename, 'width': img.width, 'height': img.height}
    catalog_path = ROOT / 'dist/data.js'
    catalog = json.loads(catalog_path.read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    units = {unit['id']: unit for unit in catalog['units']}
    part_count = question_count = 0
    for test, key_test in zip(questions['tests'], keys['tests']):
        assert test['id'] == key_test['id'] == f'simply-pet-test-{test["test"]}'
        parts = []
        for part, key_part in zip(test['parts'], key_test['parts']):
            assert part['id'] == key_part['id'] == f'part-{len(parts)+1}'
            answer_map = {q['number']: q for q in key_part['questions']}
            assert len(answer_map) == len(part['questions']) == [7, 6, 6, 6][len(parts)]
            combined = []
            for q in part['questions']:
                answer = answer_map[q['number']]
                assert answer['answer'] and answer['accepted'] and answer['answer'] in answer['accepted']
                assert answer['explanation'].strip() and answer['evidence'].strip()
                assert 0 <= answer['evidenceStart'] < answer['evidenceEnd'] <= units[test['id']]['listening'][len(parts)]['duration'] + 1
                item = {'number': q['number'], 'prompt': q['prompt']}
                if q.get('options'):
                    assert list(q['options']) == ['A', 'B', 'C']
                    item.update(options=['A', 'B', 'C'], optionText=q['options'])
                    assert answer['answer'] in item['options']
                    if q.get('visualOptions'):
                        item['visualOptions'] = True
                else:
                    assert part['id'] == 'part-3'
                item.update({field: answer[field] for field in ['answer', 'accepted', 'explanation', 'evidence', 'evidenceStart', 'evidenceEnd']})
                combined.append(item)
            parts.append({'id': part['id'], 'title': part['title'], 'instructions': part['instruction'],
                **{k: part[k] for k in ['heading', 'context'] if part.get(k)},
                'pages': [rendered[p] for p in part['pdfPages']], 'questions': combined})
            part_count += 1
            question_count += len(combined)
        assert [q['number'] for p in parts for q in p['questions']] == list(range(1, 26))
        content = (json.dumps({'id': test['id'], 'source': source, 'parts': parts}, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
        filename = test['id'] + '.' + hashlib.sha256(content).hexdigest()[:12] + '.json'
        (data_dir / filename).write_bytes(content)
        units[test['id']]['listeningFile'] = 'listening/' + filename
    assert part_count == 32 and question_count == 200
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    manifest = {**source, 'testCount': 8, 'partCount': part_count, 'questionCount': question_count,
        'uniqueBookPageCount': len(pages), 'pages': list(rendered.values())}
    (SOURCE / 'exercise-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported {question_count} Listening questions, {part_count} parts and {len(pages)} original pages across 8 tests.')


if __name__ == '__main__':
    main()
