# Authentic 1

The user-supplied book is **B1 Preliminary 1 With Answers: Authentic Practice
Tests** (Cambridge University Press). WordHop calls this PET book **Authentic 1**.
The supplied PDF has 163 scanned pages; printed page numbers are PDF page minus 2.

| Test | Reading PDF pages | Reading key PDF page | Listening PDF pages | Listening key / transcript PDF pages | Vocabulary |
| --- | --- | --- | --- | --- | --- |
| 1 | 10–19 | 98 | 22–27 | 105 / 105–109 | 62 |
| 2 | 28–37 | 110 | 40–45 | 117 / 117–121 | 62 |
| 3 | 46–55 | 122 | 58–63 | 129 / 129–134 | 57 |
| 4 | 64–73 | 135 | 76–81 | 142 / 142–147 | 62 |

All 128 Reading and 100 Listening answers were checked against the supplied
publisher keys. English explanations were written for WordHop from the passages
and official transcripts. Source JSON keeps key page references, accepted forms,
short supporting excerpts and the original page mapping. Listening Test 4 Q10's
transcript contains an unrelated repeated line; the source note documents it and
the answer/explanation follow the relevant dialogue and publisher key.

`vocabulary.json` keeps all 243 supplied terms and examples in their original
order, with grammatical cloze answers and part-of-speech labels. Eleven genuine
definition errors are corrected and documented with their original wording.
The supplied vocabulary DOCX has no illustrations. Original Reading and Listening
pictures are included on the corresponding book pages.

Each test has six Reading parts, four Listening parts, flashcards and the three
existing vocabulary games. Every vocabulary game defaults to all words. New IDs
use `authentic-1-test-N` and `authentic-1-tN-...`; existing books and their saved
progress are preserved.

The 16 supplied recordings are served as complete 96 kbps mono MP3 copies.
Source and served SHA-256 checksums are recorded in `audio-manifest.json`.
Both versions pass full FFmpeg decoding and have the same decoded sample count.
No content is trimmed. Some source MP3 headers estimate duration inaccurately;
the importer compares decoded samples and uses the served file's duration.

Answer replay timestamps were located locally using word-level speech recognition
and reviewed against the publisher transcript. No user recordings were sent to a
transcription service. Each question records the reviewed quote and matching audio
text. Only the selected recording is mounted (`preload="none"`); book pages,
questions and vocabulary load on demand. Replays appear after submission and stop
at the end of the selected evidence, for correct, wrong and unanswered questions.

To reproduce the import after editing the reviewed source records:

```sh
python -B scripts/import_authentic_1.py \
  '/absolute/AUTHENTIC PRACTICE TESTS(4).pdf' \
  '/absolute/B1_PET_Reading_Vocabulary_Tests_1-4_English_Definitions(1).docx' \
  '/absolute/folder-containing-the-16-recordings'
node qa/check-all-words.cjs
node qa/check-readings.cjs
node qa/check-listening.cjs
python -B scripts/build_github_pages.py
python -B qa/check_github_pages.py
```

The importer requires Python, python-docx, PyMuPDF, Pillow, FFmpeg and ffprobe.
Use `--audio-only` to prepare the recordings separately, then `--reuse-audio` to
reuse those verified assets while regenerating pages and question data.
Original source PDF/DOCX files are not included in the repository.
