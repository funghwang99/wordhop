"""Render Unit 13 original pages and rebuild its reviewed Reading records."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-assets/unit-13'
BASIC = ROOT / 'source-assets/basic-ielts-reading'
def read(path):
    return json.loads(path.read_text())
def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('book_pdf', type=Path)
    parser.add_argument('publisher_key_pdf', type=Path)
    args = parser.parse_args()
    manifest, publisher = read(BASIC / 'source-manifest.json'), read(BASIC / 'publisher-answer-key.json')
    assert hashlib.sha256(args.book_pdf.read_bytes()).hexdigest() == manifest['source']['sourcePdfSha256']
    assert hashlib.sha256(args.publisher_key_pdf.read_bytes()).hexdigest() == publisher['sourceSha256']
    research, key = read(SOURCE / 'reading.json'), read(SOURCE / 'publisher-key.json')
    assert not research['needsReview'] and research['id'] == key['id'] == 'bir-unit-13'
    assert [len(p['questions']) for p in research['parts']] == [17, 20]
    doc, pages = fitz.open(args.book_pdf), {}
    for number in sorted({n for part in research['parts'] for n in part['pdfPages']}):
        page = doc[number - 1]; scale = 1350 / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        buffer = io.BytesIO(); image.save(buffer, format='WEBP', quality=88, method=6)
        content = buffer.getvalue(); filename = f'basic-ielts-page-{number}.{hashlib.sha256(content).hexdigest()[:12]}.webp'
        (ROOT / 'dist/assets/reading' / filename).write_bytes(content)
        pages[number] = {'pdfPage': number, 'printedPage': number, 'image': 'assets/reading/' + filename, 'width': image.width, 'height': image.height}
    assert len(pages) == 8
    parts = []
    for part, key_part in zip(research['parts'], key['parts']):
        assert part['id'] == key_part['id']
        assert [q['number'] for q in part['questions']] == list(range(1, len(part['questions']) + 1))
        for question, answer in zip(part['questions'], key_part['answers']):
            assert question['number'] == answer['number'] and question['publisherAnswer'] == answer['answer']
            if not question.get('unscored'):
                assert set(a.lower() for a in answer['accepted']) <= set(a.lower() for a in question['accepted'])
        parts.append({k: v for k, v in part.items() if k != 'pdfPages'} | {'pages': [pages[n] for n in part['pdfPages']]})
    data = {'id': research['id'], 'partLabel': 'Passage', 'source': dict(manifest['source']), 'parts': parts}
    reviewed = [u for u in read(BASIC / 'answer-keys.json') if u['id'] != data['id']] + [data]
    save(BASIC / 'answer-keys.json', reviewed)
    publisher['units'] = [u for u in publisher['units'] if u['id'] != key['id']] + [key]
    publisher['reviewedQuestionCount'] = sum(len(p['answers']) for u in publisher['units'] for p in u['parts'])
    save(BASIC / 'publisher-answer-key.json', publisher)
    review = read(BASIC / 'publisher-key-review.json')
    review['reviewedUnits'], review['reviewedQuestions'] = [u['id'] for u in reviewed], publisher['reviewedQuestionCount']
    review['sourceExceptions'] = [x for x in review['sourceExceptions'] if x['unitId'] != data['id']] + [{'unitId': data['id'], 'partId': 'part-2', 'number': 2, 'publisherAnswer': 'C', 'reviewedAnswer': 'C', 'unscored': True, 'reason': research['parts'][1]['questions'][1]['reviewNote']}]
    save(BASIC / 'publisher-key-review.json', review)
    manifest.update(units=len(reviewed), passages=sum(len(u['parts']) for u in reviewed), questions=sum(len(p['questions']) for u in reviewed for p in u['parts']), uniqueOriginalPages=len({page['image'] for u in reviewed for p in u['parts'] for page in p['pages']}))
    manifest['publisherAnswerKey']['reviewedQuestionCount'] = publisher['reviewedQuestionCount']
    save(BASIC / 'source-manifest.json', manifest)
    print('Prepared Unit 13: 2 passages, 37 questions, 36 scored and 8 original pages.')
if __name__ == '__main__':
    main()
