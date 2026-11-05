# Basic IELTS Reading Unit 15

Imported from the supplied `Unit 15 Vocabulary.pptx`: 43 slides including the
cover and all 42 vocabulary entries, with 23 from Getting Started with E-mail!
and 19 from Educating Our Mobile Children.

All original terms, parts of speech, definitions and examples are preserved.
The deck contains 40 pictures. The via and despite slides have no illustration;
their cards therefore show the supplied text. Each picture keeps its original
crop and is encoded as WebP within 680 by 360 pixels. `provenance.json` records
source slide numbers, fields, picture checksums and crops.

The original academic and military examples repeat the target word. Flashcards
keep those sentences; fill-in-the-blank questions use two separately documented
sentences so an unblanked repetition cannot reveal the answer. The optional
`clozeExample` field records this game context. Other cloze sentences retain
the original examples. Decentralize, large scale and cross cultural are accepted
alongside decentralise, large-scale and cross-cultural respectively.

Both original readings and all 40 numbered questions appear on book/PDF pages
125–132: Passage 1 on 125–128 and Passage 2 on 129–132. Answers were checked
against the supplied publisher Answer Key, PDF page 7, printed page 174.
English explanations and supporting excerpts follow the original text.

Reimport with Python, lxml, Pillow and PyMuPDF:

```sh
python -B scripts/import_unit_15.py '/absolute/Unit 15 Vocabulary.pptx'
python -B scripts/import_unit_15_reading.py '/absolute/book.pdf' '/absolute/Answer Key.pdf'
python -B scripts/import_basic_ielts_readings.py
```

Run the existing game, Reading, Listening and Pages checks before publication.
Stable unit and word IDs preserve earlier progress. The title-only book layout
and dedicated arcade assignments in Units 10 and 11 remain in the source.
