# Basic IELTS Reading Unit 13

Imported from the supplied `Unit 13 Vocabulary - Verified.pptx` (29 slides).
The cover is excluded. All 28 vocabulary entries retain their source terms,
definitions, examples and matching pictures: 17 from More Cavities Needed
and 11 from Our Exploding Population: Problems and Solutions.

Each card uses its original slide picture and crop, encoded as WebP within
680 by 360 pixels. `provenance.json` records the source slide, fields, picture
checksum and crop. The source omits the part of speech for nesting site;
WordHop labels it as a noun phrase.

The original examples for decline, nest and increase contain the target word
twice. Flashcards retain those examples. Their fill-in-the-blank questions use
three separately documented game sentences, so an unblanked repetition does
not reveal the answer. The optional `clozeExample` field records this game
context; all other game examples use the exact supplied sentences.

Both original passages and their 37 questions appear on book/PDF pages 108–115.
Page 111 ends Passage 1 and begins Passage 2's pre-reading section, so it appears
with both passages. A note on each part explains the shared page.
All answers were checked against the supplied publisher Answer Key, PDF page 6,
printed page 173. English explanations and supporting excerpts were written for
WordHop from the original text.

Passage 2 Question 2 remains visible with publisher answer C but is not scored:
none of its printed choices accurately defines negative in negative effects
on life. Its explanation gives the contextual meaning harmful/adverse and
records the source issue. The other 36 questions are scored normally.

Reimport with Python, lxml, Pillow and PyMuPDF:

```sh
python -B scripts/import_unit_13.py '/absolute/Unit 13 Vocabulary - Verified.pptx'
python -B scripts/import_unit_13_reading.py '/absolute/book.pdf' '/absolute/Answer Key.pdf'
python -B scripts/import_basic_ielts_readings.py
```

Run the existing game, Reading, Listening and Pages checks before publication.
The import preserves every earlier unit, vocabulary ID and reading reference.
