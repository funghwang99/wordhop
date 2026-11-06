# Vietnamese support for PET

Simply PET and Authentic 1 use Vietnamese vocabulary meanings and answer
explanations by default. The English interface, vocabulary terms, examples,
original tasks, answer keys and supporting text/recording quotes are retained.
IELTS content keeps its English support text.

| Book | Definitions | Reading explanations | Listening explanations |
| --- | --- | --- | --- |
| Simply PET, Tests 1–8 | 250 | 256 | 200 |
| Authentic 1, Tests 1–4 | 243 | 128 | 100 |

The translations use short, natural Vietnamese for A2–B1 learners. Definitions
follow the word's sense in its example. Explanations preserve the reasoning,
speaker and event sequence, wrong-choice distinctions and accepted forms.
The two documented Simply Reading source issues remain unscored, with their
caveats translated.

Reviewed translations are keyed by stable word IDs or the test, skill, part
and question number. English source fields remain intact; published JSON adds
`definitionVi`, `explanationVi` and, where needed, `reviewNoteVi`. The app uses
the Vietnamese text when present, including in matching, multiple choice,
feedback and missed-word review. Language attributes identify the Vietnamese
text for assistive technology.

`source-anchors.json` fingerprints all 36 reviewed English payloads. The import
fails if the English source changes, so translations must be reviewed before
they can be applied to revised questions. Reapply after any PET source import:

```sh
python -B scripts/import_pet_vietnamese.py
```

The import writes new immutable JSON filenames and updates catalog references.
Stable test, part, question and word IDs preserve existing saved results,
Writing drafts and flashcard progress. Audio files, replay cues, original book
images and dedicated IELTS arcade assignments are unaffected.

Run the all-word, Reading, Listening and GitHub Pages checks before publication.
