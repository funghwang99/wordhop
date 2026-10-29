# Basic IELTS Reading, Units 4–9

The six user-supplied PowerPoint decks are the content and illustration source.
The uploads remain unchanged. The import script retains one vocabulary entry
per slide and its order within each unit. Pictures are extracted from their
slide relationships, preserve PowerPoint crop settings, and are converted to
WebP at up to 680 by 360 pixels without further cropping. Text illustrations,
including emojis and the `90°` label, are displayed alongside their vocabulary.
The small decorative image by the title on Unit 4's greed slide is excluded.
Unit 6's react and top illustrations are native PowerPoint drawings rather than
embedded pictures. They were rendered from the original slides, cropped to the
drawing bounds and retained in `native/` for reproducible imports.

`provenance.json` records the original fields, slide numbers, source media hashes
and published image paths. `corrections.json` records three explicit repairs:

- Unit 4, tuna: the slide contains no definition. A short definition was added.
- Unit 6, greenhouse effect: the slide repeats the definition for greenhouse.
  Its definition was corrected to describe heat trapped by atmospheric gases.
- Unit 7, injection: the slide uses an example about an infected graze that does
  not contain injection. It was replaced with an example about a nurse giving
  an injection, so studying and the cloze game use the same relevant example.

Definition references:

- https://dictionary.cambridge.org/dictionary/learner-english/tuna
- https://science.nasa.gov/climate-change/faq/what-is-the-greenhouse-effect/

Other supplied definitions and examples are retained. Cloze questions preserve
their example sentences and blank the actual form in the sentence, including
plurals, past forms and multiword expressions. British and American spellings
are accepted where relevant. For `the ultimate in something`, the tested
pattern is `the ultimate in`, followed by `safety` in the original sentence.

The site catalog contains unit metadata and word IDs only. Word content is
loaded once per selected unit from a content-addressed JSON file in `dist/units/`.
This keeps initial loading small as additional course materials are added.

To reproduce the import with the six source files in one directory:

```sh
python scripts/import_basic_reading_units.py /absolute/path/to/uploads
```

Keep the existing Unit 10 payload unchanged. Re-running the import replaces
Units 4–9 while retaining other units. The script needs Pillow and lxml.
