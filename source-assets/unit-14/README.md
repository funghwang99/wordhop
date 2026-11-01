# Basic IELTS Reading Unit 14

Imported from the supplied `Unit 14 Vocabulary.pptx` (35 slides).
The deck has one cover and 34 vocabulary slides, all included: 25 from
Victoria Explore and nine from U.S. Public Schools: What's Wrong with Them.
The cover says 35 words and the first passage numbering uses a denominator
of 26. The textbook's additional Passage 1 word, tube, has no slide in this
PPTX. No extra card or replacement picture has been invented.

All supplied terms, parts of speech, definitions and examples are retained.
Each card uses its original picture and crop, encoded as WebP within 680 by
360 pixels. `provenance.json` records slide numbers, fields, picture checksums
and crops. Every example has a single blank in the fill-in-the-blank game.
The original British forms Harbour and criticise also accept Harbor and
criticize respectively. All three games default to all 34 words.

Both original readings and all 40 numbered questions appear on book/PDF
pages 116–124. Shared page 120 ends Passage 1's vocabulary and starts Passage
2's pre-reading section; each reading includes a note about the shared page.
Answers were checked against the supplied publisher Answer Key, PDF page 7,
printed page 174. English explanations and supporting excerpts follow the
original text. Passage 2 Question 17 is one question requiring four distinct
choices (A, C, E, F), accepted in any order. All 40 questions are scored.

Reimport with Python, lxml, Pillow and PyMuPDF:

```sh
python -B scripts/import_unit_14.py '/absolute/Unit 14 Vocabulary.pptx'
python -B scripts/import_unit_14_reading.py '/absolute/book.pdf' '/absolute/Answer Key.pdf'
python -B scripts/import_basic_ielts_readings.py
```

Run the existing game, Reading, Listening and Pages checks before publication.
Stable unit and word IDs preserve earlier progress. Book cards keep the
existing title-only layout.
