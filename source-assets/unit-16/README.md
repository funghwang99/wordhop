# Basic IELTS Reading Unit 16

Imported from the supplied `Unit 16 Vocabulary.pptx`: 45 slides including the
cover and all 44 vocabulary entries, with 22 from Which Is Better, Tap Water
or Bottled Water? and 22 from Job-Sharing.

All original terms, parts of speech, definitions, examples and 44 illustrations
are preserved. Each picture keeps its original crop and is encoded as WebP
within 680 by 360 pixels. `provenance.json` records source slide numbers,
fields, picture checksums and crops.

The original claim and label examples repeat the target word. Flashcards keep
those sentences; fill-in-the-blank questions use two separately documented
sentences so an unblanked repetition cannot reveal the answer. The optional
`clozeExample` field records this game context. Other cloze sentences retain
the original examples. Distill is accepted alongside distil.

Both original readings and all 42 numbered questions appear on book/PDF pages
133–140: Passage 1 on 133–137 and Passage 2 on 137–140. Shared page 137 is kept
in both views, with a note explaining its contents. Answers were checked
against the supplied publisher Answer Key, PDF page 8, printed page 175.
English explanations and supporting excerpts follow the original text.
Passage 1 Question 12 accepts the key's optional phrase and sulfur/sulphur
spellings. Question 20 follows the publisher's NOT GIVEN: the passage describes
ozone purification and a flavour benefit without stating flavour as its purpose.

Reimport with Python, lxml, Pillow and PyMuPDF:

```sh
python -B scripts/import_unit_16.py '/absolute/Unit 16 Vocabulary.pptx'
python -B scripts/import_unit_16_reading.py '/absolute/book.pdf' '/absolute/Answer Key.pdf'
python -B scripts/import_basic_ielts_readings.py
```

Run the existing game, Reading, Listening and Pages checks before publication.
Stable unit and word IDs preserve earlier progress. Existing arcade assignments
and the title-only book layout are preserved.
