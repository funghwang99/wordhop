# WordHop

English vocabulary flashcards, games, reading and listening exercises for PET and IELTS courses.

The current content includes Simply PET with eight tests and 250 words,
Authentic 1 with four tests and 243 words, and Basic IELTS Reading with
Units 4–12 and 414 words. The total is 907 words across 21 units or tests.

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
node qa/check-listening.cjs
```

Serve `_site/` with a static server to preview the built app. Edit source files
in `dist/`; the next build recreates `_site/`. No npm dependencies or framework
build are required.

## Update vocabulary

The import scripts and source provenance are included under `scripts/` and
`source-assets/`. To import slides or the supplied Simply PET tables, use the
commands in each source folder's README. Content import requires Python, lxml
and Pillow. Original vocabulary and reading source documents are not part of this repository;
the supplied listening recordings are served with the website.

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

All 319 Basic IELTS Reading questions in Units 4–12 have been checked against
the separately supplied publisher `Answer Key.pdf`, book key pages 169–173.
English explanations are written for WordHop and reviewed against the key
and original passages. Numeric answers in Unit 11's note-completion table
accept the corresponding figures. The publisher transcription and correction
record are under `source-assets/basic-ielts-reading/` alongside source provenance.
Run `python3 -B scripts/import_basic_ielts_readings.py` after editing those keys
to regenerate the hashed JSON and catalog links.

Unit 12 includes all 35 illustrated vocabulary slides from its verified PPTX,
plus both original readings: Help! Volunteers Wanted and Modern Examinations.
Passage 1 Question 5 is visible but not scored because its choices do not
accurately define sub-part, despite the publisher key selecting C. Unit 8
Passage 1 Question 1 is also unscored: the key lists B, city centre only,
whereas A, city centre and suburbs, matches metropolitan area in the question.
Both issues show the publisher answer and an explanatory note. Other choice
questions follow the publisher key, including Unit 12 Passage 1 Question 2 (B).
The Unit 12 source and importer are documented in `source-assets/unit-12/`.

## Simply PET listening

Tests 1–8 each include all four Listening parts: 200 original questions,
32 recordings and 32 original book pages, including picture choices.
Open a test, select Listening and choose a Part. Use the A/B/C selectors or
enter short answers without a word bank, then select Check answers to see
the score, key, English explanation and recording evidence for every question.
After submitting, Listen to this answer replays the key audio beside each
explanation and stops at the end of that excerpt. Replay works for correct,
incorrect and unanswered questions. Try this part again clears only that part. Answers and checked parts persist
in the same browser under `wordhop.listening.v1`, separately from Reading
and vocabulary. Keys and explanations were prepared for WordHop from the
supplied recordings; the student-book PDF does not provide a publisher key.

The player supports seeking, replay and 0.75×, 1×, 1.25× or 1.5× speed.
Checking answers and retrying preserve audio position. Switching part or
leaving Listening stops and releases the player. Only the selected track is
mounted, with no preloading or autoplay. Book pages and question data load
on demand; pages can be zoomed or opened at full size.

The user supplied clean replacements for Test 4 Part 2 (AAC/M4A) and Test 5
Part 3 (MP3). Their original bytes and formats are preserved. All 32 selected
recordings pass full FFmpeg decoding. Earlier hashed audio files are retained
for older tabs, while the current catalog selects the clean replacements.

Source records and import commands are under `source-assets/simply-pet-listening/`.
Run `node qa/check-listening.cjs` to check all track mappings, checksums,
200 keys, accepted forms, pages and evidence timestamps before publishing.

## Authentic 1

The PET course also includes Authentic 1 (Cambridge B1 Preliminary 1 With Answers):
four tests, 243 supplied vocabulary entries, 128 Reading questions on 40 original
pages, and 100 Listening questions on 24 original pages with 16 complete recordings.
All answers were checked against the supplied publisher keys. English explanations
and post-submission answer replays work in the same way as Simply PET.

The complete recordings are encoded as 96 kbps mono MP3 for efficient delivery;
decoded content length is preserved and all source and served recordings pass
FFmpeg decoding. The vocabulary source contains no illustrations. Source records,
documented definition corrections and reproducible import instructions are under
`source-assets/authentic-1/`. `qa/check-listening.cjs` also runs the Authentic 1
checks, covering every source entry, publisher key mapping and reviewed replay cue.
