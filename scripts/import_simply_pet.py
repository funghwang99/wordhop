"""Import the supplied Simply PET tables and separately authored game examples."""
import csv
import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source-assets/simply-pet'
PREFIX = 'window.WQ_CATALOG = '
EXPECTED = [32, 27, 42, 26, 31, 33, 34, 25]
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
POS = {'adj': 'adj.', 'adv': 'adv.', 'n': 'n.', 'n plural': 'n. pl.',
       'v': 'v.', 'phr v': 'phr. v.'}
PHRASES = {'in progress', 'take advantage of', 'get rid of sth', 'take care of sb/sth'}
VARIANTS = {
    'up-to-date': ['up to date'], 'staffroom': ['staff room'],
    'race track': ['racetrack'], 'career advisor': ['career adviser'],
    'advisor': ['adviser'], 'e-ticket': ['e ticket', 'eticket'],
    'hold luggage': ['hold baggage', 'checked luggage', 'checked baggage'],
    'hands-on': ['hands on'], 'part-time': ['part time'], 'dial-up': ['dial up'],
    'civilisation': ['civilization'], 'spoilt': ['spoiled'],
    'action-packed': ['action packed'], 'memorise': ['memorize'],
    'flash card': ['flashcard'], 'sell-by date': ['sell by date'],
    'socialise': ['socialize'],
}
CORRECTIONS = {
    (2, 'hold luggage'): {'definition': 'bags that are checked in and transported in an aircraft\'s cargo hold'},
    (3, 'finest'): {'pos': 'adj.'},
    (8, 'regret'): {'pos': 'v.'},
}


def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def text(node):
    return ' '.join(''.join(p.xpath('.//w:t/text()', namespaces=NS))
                    for p in node.findall('w:p', NS)).strip()


def extract(path):
    with ZipFile(path) as archive:
        root = etree.fromstring(archive.read('word/document.xml'))
    test = part = pages = None
    entries = []
    for element in root.find('w:body', NS):
        kind = etree.QName(element).localname
        if kind == 'p':
            value = ''.join(element.xpath('.//w:t/text()', namespaces=NS))
            if match := re.match(r'Practice Test (\d+) ', value):
                test = int(match[1])
                part = None
            elif match := re.match(r'Source: book pages ([\d–-]+)', value):
                pages = match[1]
            elif match := re.match(r'Reading – Part (\d+)', value):
                part = int(match[1])
        elif kind == 'tbl':
            rows = element.findall('w:tr', NS)
            assert [text(cell) for cell in rows[0].findall('w:tc', NS)] == ['Vocabulary', 'Meaning (English)']
            assert test and part and pages
            for row in rows[1:]:
                raw, definition = [text(cell) for cell in row.findall('w:tc', NS)]
                match = re.fullmatch(r'(.+?)\s*\((adj|adv|n plural|n|v|phr v)\)', raw)
                term = match[1] if match else raw
                pos = POS[match[2]] if match else 'phr.' if term in PHRASES else 'phr. v.'
                entries.append({'test': test, 'part': part, 'pages': pages,
                                'raw': raw, 'term': term, 'pos': pos, 'definition': definition})
    assert [sum(e['test'] == n for e in entries) for n in range(1, 9)] == EXPECTED
    assert len(entries) == 250
    return entries


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python scripts/import_simply_pet.py /absolute/source.docx')
    path = Path(sys.argv[1]).resolve()
    entries = extract(path)
    with (SOURCE / 'examples.tsv').open(newline='') as stream:
        rows = list(csv.DictReader(stream, delimiter='\t'))
    examples = {(int(row['test']), row['term']): row['marked_example'] for row in rows}
    assert len(examples) == len(rows) == len(entries)
    assert set(examples) == {(e['test'], e['term']) for e in entries}
    catalog_path = ROOT / 'dist/data.js'
    catalog = json.loads(catalog_path.read_text().removeprefix(PREFIX).strip().removesuffix(';'))
    book_id = 'simply-pet'
    catalog['books'] = [b for b in catalog['books'] if b['id'] != book_id] + [{
        'id': book_id, 'trackId': 'pet', 'levelId': None, 'title': 'Simply PET',
        'description': 'Reading vocabulary from 8 practice tests.', 'unitLabel': 'test',
    }]
    catalog['units'] = [u for u in catalog['units'] if u['bookId'] != book_id]
    provenance = []
    repairs = []
    units = []
    for number in range(1, 9):
        words = []
        unit_id = f'simply-pet-test-{number}'
        source_entries = [e for e in entries if e['test'] == number]
        for entry in source_entries:
            term = entry['term']
            marked = examples[number, term]
            matches = list(re.finditer(r'\[([^\[\]]+)\]', marked))
            assert len(matches) == 1 and marked.count('[') == marked.count(']') == 1, term
            match = matches[0]
            answer = match[1]
            example = marked[:match.start()] + answer + marked[match.end():]
            cloze = marked[:match.start()] + '________' + marked[match.end():]
            accepted = [answer] + VARIANTS.get(term, [])
            fields = {'pos': entry['pos'], 'definition': entry['definition']}
            for field, after in CORRECTIONS.get((number, term), {}).items():
                repairs.append({'test': number, 'term': term, 'field': field,
                                'before': fields[field], 'after': after})
                fields[field] = after
            word = {'id': f'simply-pet-t{number}-' + slug(term), 'term': term, **fields,
                    'example': example, 'cloze': cloze, 'answer': answer,
                    'accepted': list(dict.fromkeys(accepted))}
            assert all(word[k] for k in ['id', 'term', 'pos', 'definition', 'example', 'cloze', 'answer', 'accepted'])
            assert cloze.count('________') == 1 and cloze.replace('________', answer) == example
            words.append(word)
            provenance.append({'id': word['id'], 'test': number, 'part': entry['part'],
                               'bookPages': entry['pages'], 'sourceVocabulary': entry['raw'],
                               'sourceMeaning': entry['definition'], 'exampleSource': 'WordHop',
                               'example': example, 'answer': answer})
        assert len(words) == EXPECTED[number - 1]
        assert len({w['id'] for w in words}) == len(words)
        assert len({w['definition'] for w in words}) == len(words)
        content = (json.dumps({'id': unit_id, 'words': words}, ensure_ascii=False,
                              separators=(',', ':')) + '\n').encode()
        filename = unit_id + '.' + hashlib.sha256(content).hexdigest()[:12] + '.json'
        (ROOT / 'dist/units' / filename).write_bytes(content)
        unit = {'id': unit_id, 'bookId': book_id, 'title': f'Reading Test {number}',
                'source': path.name, 'sourcePages': source_entries[0]['pages'],
                'wordCount': len(words), 'wordIds': [w['id'] for w in words],
                'dataFile': '/units/' + filename}
        catalog['units'].append(unit)
        units.append({'test': number, 'words': len(words), 'bytes': len(content)})
    catalog_path.write_text(PREFIX + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
    (SOURCE / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
    (SOURCE / 'corrections.json').write_text(json.dumps(repairs, ensure_ascii=False, indent=2) + '\n')
    report = {'source': path.name, 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
              'tests': units, 'totalWords': len(provenance), 'authoredExamples': len(examples),
              'sourceImages': 0, 'corrections': repairs}
    (ROOT / 'qa/simply-pet-import.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
