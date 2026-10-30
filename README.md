# WordHop

English vocabulary flashcards and games for PET and IELTS courses.

The current content includes Simply PET with eight Reading Tests and 250 words,
and Basic IELTS Reading with Units 4–12 and 414 words. The total is 664 words
across 17 units or tests.

Students study illustrated flashcards, then practise with matching, multiple
choice or fill-in-the-blank games without a word bank. Rounds default to all
words. The app includes card animations, pronunciation, feedback sounds and
browser-local progress and results.

## Publish on GitHub Pages

1. Put this project in a public GitHub repository. Keep the folders together,
   including `.github/workflows/pages.yml`.
2. Open the repository's Settings, then Pages. Under Build and deployment,
   set Source to GitHub Actions.
3. Push to `main`, or run Publish WordHop from the Actions tab.
4. Open the site URL returned by the deployment.

The workflow builds `_site/` and uploads only the website files. It uses
GitHub's standard Pages actions and needs no external service credentials.
It checks that every game includes all selected words before publishing.

The build changes asset URLs to relative paths, so unit JSON and pictures load
correctly when the site is published under a repository path such as `/wordhop/`.
It updates content hashes whenever those files change. Navigation uses hashes,
so links to units work without server rewrites.

## Build locally

```sh
python3 -B scripts/build_github_pages.py
python3 -B qa/check_github_pages.py
node qa/check-all-words.cjs
node qa/check-readings.cjs
```

Serve `_site/` with a static server to preview the built app. Edit source files
in `dist/`; the next build recreates `_site/`. No npm dependencies or framework
build are required.

## Update vocabulary

The import scripts and source provenance are included under `scripts/` and
`source-assets/`. To import slides or the supplied Simply PET tables, use the
commands in each source folder's README. Content import requires Python, lxml
and Pillow. Original user uploads are not part of this repository.

Importers update the catalog and hashed unit JSON in `dist/`. The Pages build
then prepares the correct relative URLs automatically. Stable word IDs preserve
existing progress when content is updated on the same website.

## Student progress

Progress and completed rounds are saved in each visitor's browser using
localStorage. They do not sync between devices. Changing from the previous
website address to a GitHub Pages address does not automatically transfer that
browser's saved progress. No student accounts or shared database are required.

## Book reading exercises

Simply PET includes all six Reading parts of each of the eight supplied tests:
256 original questions, displayed from 47 book pages. Test 8 Parts 5 and 6 share
a page. Open a Reading Test and select the Reading tab. Answer each part, then
check it to see the key, explanations and supporting excerpts. Answers and
checked parts persist in the same browser under a separate storage key.

Reading assets and JSON load only when needed. The page zoom and original-size
link preserve the printed text and options. Vocabulary and games still use
their existing data and progress.

The supplied PDF is a question book, without an official answer key. WordHop's
keys and English explanations were prepared from its text. Two imprecise source
questions remain visible with notes but are excluded from automatic scoring:
Test 7 Question 4 (finest versus natural ingredients), and Test 8 Question 11
(a temperature goal versus an original prediction). Source pages and answer
provenance are recorded under `source-assets/simply-pet-reading/`.

Basic IELTS Reading Units 4–12 also include their original reading pages and
numbered exercises: 18 passages, 319 questions and 60 book pages. This covers
multiple choice, short answers and completion, True/False/Not Given,
Yes/No/Not Given, matching headings and phrases, and multi-select questions.
All pages of a passage remain together, with later pages loaded lazily.

The Basic IELTS scan omits the answer-key section listed in its contents.
Its keys and English explanations were therefore prepared for WordHop from
the supplied passages, rather than presented as publisher answers. Numeric
answers in Unit 11's note-completion table accept the corresponding figures.
Source provenance and reviewed keys are under `source-assets/basic-ielts-reading/`.
Run `python3 -B scripts/import_basic_ielts_readings.py` after editing those keys
to regenerate the hashed JSON and catalog links.

Unit 12 includes all 35 illustrated vocabulary slides from its verified PPTX,
plus both original readings: Help! Volunteers Wanted and Modern Examinations.
Passage 1 Question 5 is visible but not scored because its answer choices do
not accurately define sub-part. Question 2 accepts both reasonable readings
of its approximate definitions. The source and importer are documented in
`source-assets/unit-12/`.
