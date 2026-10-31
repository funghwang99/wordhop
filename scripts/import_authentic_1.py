"""Import the supplied Authentic 1 book, vocabulary and four-part recordings."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess

from docx import Document
import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-assets/authentic-1'
PREFIX = 'window.WQ_CATALOG = '
COUNTS = [62, 62, 57, 62]


def digest(content):
    return hashlib.sha256(content).hexdigest()


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def hashed_json(folder, name, value):
    content = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    filename = name + '.' + digest(content)[:12] + '.json'
    (ROOT / 'dist' / folder).mkdir(parents=True, exist_ok=True)
    (ROOT / 'dist' / folder / filename).write_bytes(content)
    return folder + '/' + filename


def verify_vocabulary(docx, vocabulary):
    tables = Document(docx).tables
    assert len(tables) == 4 and not vocabulary['needsReview']
    corrections = {(c['test'], c['entry']): c for c in vocabulary['corrections']}
    for number, (table, test) in enumerate(zip(tables, vocabulary['tests']), 1):
        rows = [[cell.text.strip() for cell in row.cells] for row in table.rows]
        assert rows[0] == ['VOCABULARY', 'ENGLISH DEFINITION', 'EXAMPLE']
        assert test['test'] == number and len(test['words']) == len(rows) - 1 == COUNTS[number - 1]
        for entry, (raw, word) in enumerate(zip(rows[1:], test['words']), 1):
            assert word['term'] == raw[0] and word['example'] == raw[2]
            if word['definition'] != raw[1]:
                correction = corrections[number, entry]
                assert correction['before'] == raw[1] and correction['after'] == word['definition']
            assert word['cloze'].count('________') == 1
            assert word['cloze'].replace('________', word['answer']) == word['example']
            assert word['answer'] in word['accepted']


def render_page(doc, number, kind):
    page = doc[number - 1]
    scale = 1350 / page.rect.width
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
    buffer = io.BytesIO()
    image.save(buffer, format='WEBP', quality=88, method=6)
    content = buffer.getvalue()
    filename = f'authentic-1-page-{number}.{digest(content)[:12]}.webp'
    relative = f'assets/{kind}/{filename}'
    path = ROOT / 'dist' / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return {'pdfPage': number, 'printedPage': number - 2, 'image': relative,
            'width': image.width, 'height': image.height}


def audio_tracks(audio_dir):
    records = []
    target_dir = ROOT / 'dist/audio/authentic-1'
    target_dir.mkdir(parents=True, exist_ok=True)
    for test in range(1, 5):
        for part in range(1, 5):
            source = audio_dir / f'Test {test} Part {part}(1).mp3'
            original = source.read_bytes()
            temporary = target_dir / f'test-{test}-part-{part}.tmp.mp3'
            subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', str(source),
                '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-b:a', '96k',
                '-ac', '1', '-ar', '44100', str(temporary)], check=True)
            content = temporary.read_bytes()
            filename = f'test-{test}-part-{part}.{digest(content)[:12]}.mp3'
            temporary.replace(target_dir / filename)
            published = target_dir / filename
            probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                'format=duration:stream=codec_name,sample_rate,channels', '-of', 'json', str(published)]))
            original_probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                'format=duration', '-of', 'json', str(source)]))
            duration = float(probe['format']['duration'])
            # Some supplied MP3 headers estimate duration from bitrate. Compare
            # actual decoded samples, rather than trusting that estimate.
            decoded_lengths = []
            for audio in [source, published]:
                pcm = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-xerror', '-i', str(audio),
                    '-ac', '1', '-ar', '16000', '-f', 's16le', '-'])
                decoded_lengths.append(len(pcm) / 32000)
            assert abs(decoded_lengths[0] - decoded_lengths[1]) < .001
            records.append({'test': test, 'part': part, 'sourceFilename': source.name,
                'sourceSha256': digest(original), 'sourceBytes': len(original),
                'asset': 'audio/authentic-1/' + filename, 'assetSha256': digest(content),
                'bytes': len(content), 'durationSeconds': duration,
                'sourceReportedDurationSeconds': float(original_probe['format']['duration']),
                'sourceDecodedDurationSeconds': decoded_lengths[0],
                'assetDecodedDurationSeconds': decoded_lengths[1], **probe['streams'][0],
                'decodeReview': {'decoder': 'FFmpeg', 'status': 'passed', 'errors': []}})
            print(f'Audio Test {test} Part {part}: {len(content):,} bytes', flush=True)
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('book_pdf', type=Path)
    parser.add_argument('vocabulary_docx', type=Path)
    parser.add_argument('audio_dir', type=Path)
    parser.add_argument('--audio-only', action='store_true')
    parser.add_argument('--reuse-audio', action='store_true')
    args = parser.parse_args()
    SOURCE.mkdir(parents=True, exist_ok=True)
    if not args.reuse_audio:
        records = audio_tracks(args.audio_dir)
        save_json(SOURCE / 'audio-manifest.json', {'book': 'Authentic 1', 'testCount': 4, 'trackCount': 16,
            'processing': 'Complete recordings encoded as 96 kbps mono MP3 for delivery. No trimming; original and served files pass full FFmpeg decoding.',
            'tracks': records})
    else:
        records = json.loads((SOURCE / 'audio-manifest.json').read_text())['tracks']
        for record in records:
            assert digest((ROOT / 'dist' / record['asset']).read_bytes()) == record['assetSha256']
            assert digest((args.audio_dir / record['sourceFilename']).read_bytes()) == record['sourceSha256']
    if args.audio_only:
        return
    vocabulary = json.loads((SOURCE / 'vocabulary.json').read_text())
    verify_vocabulary(args.vocabulary_docx, vocabulary)
    research = {}
    for kind in ['reading', 'listening']:
        records_by_test = [json.loads((SOURCE / f'{kind}-{span}.json').read_text()) for span in ['1-2', '3-4']]
        assert all(not item['needsReview'] for item in records_by_test)
        research[kind] = [test for item in records_by_test for test in item['tests']]
        assert [t['test'] for t in research[kind]] == [1, 2, 3, 4]
    pdf_hash = digest(args.book_pdf.read_bytes())
    source = {'title': 'B1 Preliminary 1 With Answers: Authentic Practice Tests',
        'publisher': 'Cambridge University Press', 'pdfSha256': pdf_hash, 'answerKeyPdfSha256': pdf_hash,
        'answerKeyOrigin': 'Checked against the supplied publisher answer key in the same book.',
        'questions': 'Original book pages supplied by the user.',
        'explanations': 'Original English explanations written for WordHop, checked against the book and publisher key.'}
    doc = fitz.open(args.book_pdf)
    assert len(doc) == 163
    rendered = {}
    for kind, expected in [('reading', 40), ('listening', 24)]:
        pages = sorted({p for t in research[kind] for part in t['parts'] for p in part['pdfPages']})
        assert len(pages) == expected
        for page in pages:
            rendered[kind, page] = render_page(doc, page, kind)
    catalog_path = ROOT / 'dist/data.js'
    catalog = json.loads(catalog_path.read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    catalog['books'] = [b for b in catalog['books'] if b['id'] != 'authentic-1'] + [{
        'id': 'authentic-1', 'trackId': 'pet', 'levelId': None, 'title': 'Authentic 1',
        'description': '4 practice tests with vocabulary, Reading and Listening.', 'unitLabel': 'test'}]
    catalog['units'] = [u for u in catalog['units'] if u['bookId'] != 'authentic-1']
    for number, test in enumerate(vocabulary['tests'], 1):
        unit_id = f'authentic-1-test-{number}'
        words = [{'id': f'authentic-1-t{number}-' + re.sub(r'[^a-z0-9]+', '-', w['term'].lower()).strip('-'), **w}
                 for w in test['words']]
        assert len({w['id'] for w in words}) == len(words) == COUNTS[number - 1]
        assert len({w['definition'] for w in words}) == len(words)
        unit = {'id': unit_id, 'bookId': 'authentic-1', 'title': f'Test {number}',
            'source': args.vocabulary_docx.name, 'sourcePages': f'{8 + 18 * (number - 1)}–{17 + 18 * (number - 1)}',
            'wordCount': len(words), 'wordIds': [w['id'] for w in words],
            'dataFile': '/' + hashed_json('units', unit_id, {'id': unit_id, 'words': words})}
        tracks = [r for r in records if r['test'] == number]
        unit['listening'] = [{'id': f'part-{r["part"]}', 'title': f'Part {r["part"]}',
                              'src': r['asset'], 'duration': r['durationSeconds']} for r in tracks]
        for kind in ['reading', 'listening']:
            original = research[kind][number - 1]
            assert original['id'] == unit_id
            parts = []
            for i, part in enumerate(original['parts']):
                assert part['id'] == f'part-{i + 1}'
                for q in part['questions']:
                    assert q['answer'] in q['accepted'] and q['publisherAnswer']
                    assert q['explanation'].strip() and q['evidence'].strip()
                    if kind == 'listening':
                        assert 0 <= q['evidenceStart'] < q['evidenceEnd'] <= tracks[i]['durationSeconds']
                parts.append({k: v for k, v in part.items() if k != 'pdfPages'} |
                             {'pages': [rendered[kind, p] for p in part['pdfPages']]})
            assert [q['number'] for p in parts for q in p['questions']] == list(range(1, 33 if kind == 'reading' else 26))
            unit[kind + 'File'] = hashed_json('readings' if kind == 'reading' else 'listening', unit_id,
                                            {'id': unit_id, 'source': source, 'parts': parts})
        catalog['units'].append(unit)
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    save_json(SOURCE / 'source-manifest.json', {**source,
        'bookFilename': args.book_pdf.name, 'vocabularyFilename': args.vocabulary_docx.name,
        'vocabularySha256': digest(args.vocabulary_docx.read_bytes()), 'testCount': 4, 'wordCount': 243,
        'readingQuestionCount': 128, 'listeningQuestionCount': 100, 'readingPageCount': 40,
        'listeningPageCount': 24, 'trackCount': 16, 'pages': list(rendered.values())})
    print('Imported Authentic 1: 4 tests, 243 words, 128 Reading questions, 100 Listening questions and 16 recordings.')


if __name__ == '__main__':
    main()
