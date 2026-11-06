# WordHop

English vocabulary flashcards, games, reading and listening exercises for PET and IELTS courses.

The current content includes Simply PET with eight tests and 250 words,
Authentic 1 with four tests and 243 words, and Basic IELTS Reading with
Units 4–16 and 562 words. The total is 1055 words across 25 units or tests.

Students study illustrated flashcards, then practise with matching, multiple
choice or fill-in-the-blank games without a word bank. Unit 10 of Basic IELTS Reading also includes Flappy Vocab. Rounds default to all
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

Every test or unit has a **Clear saved results** button above its study tabs.
After confirmation it removes all saved Reading and Listening answers, Writing
drafts and game history for that test on the current device. The next visit starts with blank
answer sheets. Other tests, viewed flashcards, sound and round-size preferences
are preserved. Cancelling the dialog keeps the results. Clearing ends a current
round, stops its audio and cancels pending autosave; storage errors are reported.

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

Basic IELTS Reading Units 4–16 also include their original reading pages and
numbered exercises: 26 passages, 478 questions and 93 book pages. This covers
multiple choice, short answers and completion, True/False/Not Given,
Yes/No/Not Given, matching headings and phrases, and multi-select questions.
All pages of a passage remain together, with later pages loaded lazily.

All 478 Basic IELTS Reading questions in Units 4–16 have been checked against
the separately supplied publisher `Answer Key.pdf`, book key pages 169–175.
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

## Basic IELTS Reading Unit 13

Unit 13 adds all 28 illustrated vocabulary entries from the verified PPTX, with
flashcards and all three games, plus More Cavities Needed and Our Exploding
Population: Problems and Solutions. The two passages include 37 original questions
on eight book pages (108–115), publisher-checked answers and English explanations.
Passage 2 Question 2 is documented but unscored because none of its choices
accurately defines negative in context; the other 36 questions are scored.
Source records and reproducible import instructions are under `source-assets/unit-13/`.

## Basic IELTS Reading Unit 14

Unit 14 adds every supplied vocabulary entry and illustration: 34 flashcards
and all three games. The PPTX cover says 35 words, but there are 34 vocabulary
slides (25 for Passage 1 and nine for Passage 2); the textbook word tube has no
slide or picture in the supplied deck. Original definitions and examples are
preserved, with Harbor and criticize accepted alongside the British spellings.

Victoria Explore and U.S. Public Schools: What's Wrong with Them include all
40 original numbered questions on nine book pages (116–124), publisher-checked
answers and English explanations. All 40 questions are scored; Passage 2
Question 17 requires four distinct choices and accepts them in any order.
Source records and reproducible import instructions are under `source-assets/unit-14/`.

## Basic IELTS Reading Unit 15

Unit 15 adds all 42 supplied vocabulary entries, 40 original pictures,
flashcards and the three standard practice games. The via and despite slides
contain no picture, so those cards retain the supplied text. Original examples
remain on the cards; two separate cloze contexts for academic and military
avoid unblanked repetitions that would reveal the answer.

Getting Started with E-mail! and Educating Our Mobile Children include all
40 original numbered questions on eight book pages (125–132), publisher-checked
answers and English explanations. Source records and reproducible imports
are documented in `source-assets/unit-15/`.

## Flappy Vocab – Unit 10

Only **Basic IELTS Reading – Unit 10** has **Flappy Vocab** under Practice.
The pixel-art bird can be controlled with Space/Arrow Up or tapping the game.
The flight pauses when the bird reaches each pipe and a question asks students
to choose the right word for an English definition. Choices unlock only after
a short tap-safety delay, and students must confirm their selected answer.
Correct answers earn 10 points; a passed pipe adds 5 points. Incorrect answers cost one of three hearts. Colliding with a pipe,
the ground, or the ceiling ends the run immediately, without opening a question.

All 36 Unit 10 vocabulary words are supported, including illustrations and
examples. Results, play again, missed-word review and clear saved results use
the same local browser storage as the existing games. Other units keep their
original three games. The feature is implemented without external dependencies
in `dist/flappy.js` and `dist/flappy.css`.

## Arcade games by unit

Each Basic IELTS Reading unit is assigned at most one dedicated arcade game.
- **Unit 10:** Flappy Vocab (pixel bird, pipe gates).
- **Unit 11:** Word Ninja (original HTML5 Canvas fruit-slicing game).

Word Ninja uses **all 51 verified Unit 11 vocabulary entries**. Its 51 custom
IELTS questions cycle through contextual completion, paraphrase, collocation
and word formation (13/13/13/12). Full or shorter 10/20-word rounds, a
practice mode without a timer, and an arcade mode with 22 seconds per question
are offered. Mouse swipes, touch swipes, hearts, bombs, scoring, combos and
missed-word review remain available. The game lives at
`dist/games/word-ninja-unit11.html` and has no external dependencies.

The Word Ninja embed reports completed sessions back to the main WordHop
results history; the Unit 11 clear-results control also resets its saved
high score. The original Matching, Multiple choice and Fill in the blanks
practice activities remain available in all units.

## Word Invaders – Basic IELTS Reading Unit 12

Unit 12 has exactly one dedicated arcade game, **Word Invaders**, alongside the standard
vocabulary exercises. It covers all **35 verified Unit 12 words** using an original
2D UFO-shooting game with lasers, combos, Practice and Arcade modes, mouse,
keyboard and touch controls. Its 35 IELTS tasks rotate among context completion
(9), paraphrasing (9), collocations (9) and word formation (8).
All paraphrasing tasks highlight only the word/phrase students must replace.

The self-contained `dist/games/word-invaders-unit12.html` uses no external
libraries. Completed embedded sessions report scores and missed words to the
WordHop results history. Clear saved results also clears its local high score.

Unit 11 Word Ninja now highlights the target phrase in all **13** paraphrasing
tasks, as verified by the automated test suite. Unit 10 retains Flappy Vocab;
Unit 11 retains Word Ninja; Unit 12 uses Word Invaders.

## Word Cannon – Basic IELTS Reading Unit 13

Unit 13 has one dedicated arcade game: **Word Cannon – Eco Rescue**, alongside
standard Matching, Multiple Choice, and Fill-in-the-Blank activities. It contains
all **28 verified Unit 13 vocabulary entries**, with 7 context, 7 collocation,
7 paraphrasing, and 7 word-formation IELTS questions. Every paraphrasing
question highlights the specific phrase to replace.

Students use a 2D cannon to aim at floating answer balloons, with ballistic
shots, effects, bombs, combos, Practice and Arcade modes and mobile touch
controls. Short rounds of 10 or 20 words and all 28 words are supported. The
game is self-contained in `dist/games/word-cannon-unit13.html`, with no
external libraries or assets, so it also works at nested GitHub Pages URLs.

In WordHop it is available only in Unit 13; Unit 10 retains Flappy Vocab, Unit 11
retains Word Ninja, and Unit 12 retains Word Invaders. Embedded game results
are recorded in WordHop practice history, and the Unit 13 clear-results
action also resets Word Cannon's browser-local high score.

## Basic IELTS Reading Unit 16

Unit 16 adds all 44 supplied vocabulary entries and original illustrations,
flashcards and the three standard practice games. The original examples
remain on the cards; separate cloze contexts for claim and label avoid
repetitions that would reveal the answer. Distill is accepted alongside distil.

Which Is Better, Tap Water or Bottled Water? and Job-Sharing include all
42 numbered questions on eight original book pages (133–140), publisher-checked
answers and English explanations. Both passage views preserve shared page 137.
Source records and reproducible imports are in `source-assets/unit-16/`.

## Word Hopper – Basic IELTS Reading Unit 14

Unit 14 uses **Word Hopper – Harbour Hop** as its single dedicated arcade game.
All **34 verified Unit 14 words** appear once per full round. IELTS questions
alternate between Context Completion (9), Collocations & Usage (9),
Paraphrasing (8) and Word Formation (8); every paraphrase prompt highlights
exactly the phrase to replace.

Students **choose among three visible answer cards before hopping**; the chosen
answer gets a subtle mint border/checkmark and its dock is marked. The HOP
button activates only after a choice is made. The frog automatically jumps
to the selected dock and the game grades the landing. Desktop and mobile
controls, Practice and Arcade modes, sounds, scores, missed-word review,
and smaller 10/20-question rounds are supported.

The game runs entirely offline in `dist/games/word-hopper-unit14.html`,
embedded in WordHop's Unit 14 Practice screen. Its result messages feed
WordHop's local history. Clear saved results for Unit 14 also removes the
game's browser-local high score. The arcade games of Units 10–13 are preserved.

## PET Writing

Simply PET Tests 1–8 and Authentic 1 Tests 1–4 each have a Writing tab with both
original parts. The 24 full book pages contain all 36 prompts, including email
annotations, article questions, story opening sentences and Simply's Writing
Tutor panels. Part 1 requires Question 1; Part 2 offers Question 2 or Question 3.
The original instructions ask for about 100 words per answer.

Students can write below the prompt and see a live word count. Drafts are saved
per test, part and question on the same device. Switching between the article
and story retains both drafts. Clear saved results also clears Writing drafts
for the selected test, while other tests and flashcard progress are preserved.
Writing pages and data load on demand without downloading the full books.

Sources, page mappings and the reproducible import are documented in
`source-assets/pet-writing/`.

## Word Courier – Basic IELTS Reading Unit 15

Unit 15 has one dedicated arcade game: **Word Courier – Type to Deliver**,
alongside the standard vocabulary practice activities. The game includes
all **42 verified Unit 15 vocabulary words**, with contextual completion (11),
collocations (10), paraphrasing (10) and word formation (11). Every answer must
be typed (there is no word bank or multiple choice), and all paraphrasing tasks
highlight the precise phrase being replaced.

The standalone game in `dist/games/word-courier-unit15.html` has a 2D message
delivery animation, Practice and Arcade modes, 10/20/42 question rounds,
keyboard and mobile typing support, hints, combo points and a local best score.
**Enter, mobile Send, and the DELIVER button share the same submit handler**.

The embedded Unit 15 game reports completed sessions to WordHop's local
practice history, and Clear saved results also clears its high score.
Unit 10 has Flappy Vocab, Unit 11 Word Ninja, Unit 12 Word Invaders,
Unit 13 Word Cannon and Unit 14 Word Hopper.

## Word Circuit – Basic IELTS Reading Unit 16

Unit 16 has one dedicated arcade game: **Word Circuit – Restore the Grid**.
The game covers all **44 verified Unit 16 vocabulary entries** in four
balanced IELTS exercise types: 11 contextual completions, 11 collocations,
11 focused paraphrases and 11 word-formation tasks. Each answer is entered
by typing the missing word; there are no answer options or word banks.
For paraphrase prompts, the exact phrase to replace is highlighted.

Word Circuit is a standalone 2D HTML5 game in
`dist/games/word-circuit-unit16.html`. The game combines typing with
interactive circuit-rotation puzzles every five words. Practice and Arcade
modes, 10/20/44-word rounds, keyboard/mobile controls, hints, combo scores,
three hearts, timers and missed-word review are supported. Both Enter and
the SEND button use the same form submission handler.

The game is embedded in Unit 16's Practice menu and reports game results
back to WordHop's local history. Clear saved results for Unit 16 also
clears the Word Circuit local best score. Other Basic IELTS Reading
Units 10–15 retain their existing arcade games.
