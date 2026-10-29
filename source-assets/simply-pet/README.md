# Simply PET Reading vocabulary

Imported from the user-supplied `Simply PET - 8 Reading Tests - Vocabulary and Meanings.docx`.
Its 250 entries remain in their original order, grouped into eight reading tests.
`provenance.json` retains every original vocabulary label, English meaning,
reading part and source page range. The original Word file is unchanged.

The upload contains neither example sentences nor pictures. All 250 examples
in `examples.tsv` were written for WordHop. Square brackets identify the exact
answer span used for the no-word-bank cloze game; they are removed from the
displayed examples. Both answer spelling variants and common joined/hyphenated
forms are accepted where appropriate. No illustration is invented or attributed
to the source document.

Three source errors are repaired in the website and logged in `corrections.json`:

- Hold luggage means checked bags carried in the aircraft's cargo hold. The
  supplied meaning describes hand luggage instead.
- Finest is an adjective in the supplied sense, rather than a noun.
- Regret is a verb in the supplied sense, rather than a noun.

Other supplied meanings retain their wording. Missing parts of speech on phrases
are filled in. `sth` and `sb` in vocabulary labels remain dictionary placeholders;
the cloze answers use the phrase itself with an object supplied in the sentence.

Reimport with:

```sh
python scripts/import_simply_pet.py /absolute/path/to/source.docx
```

The importer preserves other books and units, uses stable word IDs and writes
content-hashed lazy unit files. Update `dist/index.html`'s `data.js` hash after
reimporting. The source checksum and per-test counts are in
`qa/simply-pet-import.json`.
