"""Render Unit 14 original pages and rebuild its publisher-checked Reading records."""
import argparse
import hashlib
import io
import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-assets/unit-14'
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
    assert not research['needsReview'] and research['id'] == key['id'] == 'bir-unit-14'
    assert [len(p['questions']) for p in research['parts']] == [23, 17]
    doc, pages = fitz.open(args.book_pdf), {}
    for number in sorted({n for part in research['parts'] for n in part['pdfPages']}):
        page = doc[number - 1]
        scale = 1350 / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        buffer = io.BytesIO()
        image.save(buffer, format='WEBP', quality=88, method=6)
        content = buffer.getvalue()
        filename = f'basic-ielts-page-{number}.{hashlib.sha256(content).hexdigest()[:12]}.webp'
        (ROOT / 'dist/assets/reading' / filename).write_bytes(content)
        pages[number] = {'pdfPage': number, 'printedPage': number, 'image': 'assets/reading/' + filename,
                         'width': image.width, 'height': image.height}
    assert list(pages) == list(range(116, 125))
    parts = []
    for part, key_part in zip(research['parts'], key['parts']):
        assert part['id'] == key_part['id']
        assert [q['number'] for q in part['questions']] == list(range(1, len(part['questions']) + 1))
        assert len(part['questions']) == len(key_part['answers'])
        for question, answer in zip(part['questions'], key_part['answers']):
            assert question['number'] == answer['number'] and question['publisherAnswer'] == answer['answer']
            assert not question.get('unscored')
            assert set(a.lower() for a in answer['accepted']) <= set(a.lower() for a in question['accepted'])
        parts.append({k: v for k, v in part.items() if k != 'pdfPages'} | {'pages': [pages[n] for n in part['pdfPages']]})
    manifest['source']['answerKeyOrigin'] = 'Checked against the supplied publisher Answer Key, book pages 169–174.'
    data = {'id': research['id'], 'partLabel': 'Passage', 'source': dict(manifest['source']), 'parts': parts}
    reviewed = [u for u in read(BASIC / 'answer-keys.json') if u['id'] != data['id']] + [data]
    save(BASIC / 'answer-keys.json', reviewed)
    publisher['units'] = [u for u in publisher['units'] if u['id'] != key['id']] + [key]
    publisher['reviewedQuestionCount'] = sum(len(p['answers']) for u in publisher['units'] for p in u['parts'])
    save(BASIC / 'publisher-answer-key.json', publisher)
    review = read(BASIC / 'publisher-key-review.json')
    review['reviewedUnits'], review['reviewedQuestions'] = [u['id'] for u in reviewed], publisher['reviewedQuestionCount']
    review['canonicalAnswerPolicy'] = 'Display publisher wording for accepted variants and dictionary forms. Retain appropriate existing text variants. Score multiple-choice items using the publisher choice, except documented unscored source issues.'
    save(BASIC / 'publisher-key-review.json', review)
    all_pages = {page['image']: page for u in reviewed for p in u['parts'] for page in p['pages']}
    manifest.update(units=len(reviewed), passages=sum(len(u['parts']) for u in reviewed),
                    questions=sum(len(p['questions']) for u in reviewed for p in u['parts']),
                    uniqueOriginalPages=len(all_pages))
    existing_pages = {page['image']: page for page in manifest['pages']}
    for name, page in all_pages.items():
        if name not in existing_pages:
            existing_pages[name] = page | {'bytes': (ROOT / 'dist' / name).stat().st_size}
    manifest['pages'] = sorted(existing_pages.values(), key=lambda page: page['pdfPage'])
    assert len(manifest['pages']) == manifest['uniqueOriginalPages']
    manifest['sourceCopyNote'] = 'Earlier unit JSON retains the fingerprint of the partial local source copy used during its import. Units 12–14 use the complete supplied PDF; their original book pages were verified from that file.'
    manifest['publisherAnswerKey']['reviewedQuestionCount'] = publisher['reviewedQuestionCount']
    save(BASIC / 'source-manifest.json', manifest)
    save(SOURCE / 'reading-manifest.json', {
        'bookPdfSha256': manifest['source']['sourcePdfSha256'],
        'publisherKeySha256': publisher['sourceSha256'], 'keyPdfPage': 7, 'keyPrintedPage': 174,
        'questions': 40, 'scoredQuestions': 40, 'pages': list(pages.values()),
        'sourceReview': [], 'unscored': []})
    print('Prepared Unit 14: 2 passages, 40 publisher-checked questions and 9 original pages.')


if __name__ == '__main__':
    main()
