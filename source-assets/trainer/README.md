# Cambridge B1 Preliminary for Schools Trainer — working integration

**Status:** development branch. The six-test navigation is implemented, and Tests 1–2 each have scored Exam Practice Reading Parts 1–3 (30 questions total), rendered by WordHop's shared Reading module. The other sections are explicitly labelled *Content in preparation*; they are not yet available to students. This branch must not be described as having all six tests or 39 recordings published.

## Input source

The user provided **TRAINER(1).pdf**, a 243-page scanned copy of Cambridge *B1 Preliminary for Schools Trainer*, second edition, with six practice tests, answers and Teacher's Notes, plus separate tracks 01–39 covering Tests 1–2. The PDF has no searchable text layer. Scanned page and audio assets are **not** yet committed to the GitHub repository.

## Syllabus page boundaries (printed book pages)

PDF page number is printed page + 2 for the ordinary numbered pages.

| Test | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 1 | 10–27 | 28–33 | 34–43 | 44–51 |
| 2 | 52–69 | 70–75 | 76–85 | 86–93 |
| 3 | 94–103 | 104–105 | 106–110 | 111 |
| 4 | 112–121 | 122–123 | 124–128 | 129 |
| 5 | 130–139 | 140–141 | 142–146 | 147 |
| 6 | 148–157 | 158–159 | 160–164 | 165 |

Tests **1–2** interleave *Training* and *Exam Practice* sections by part, so they are **separate navigation modes**, not two consecutive page blocks. Tests **3–6** are standard Practice Tests.

Teacher's Notes and Keys for Tests 1–2 begin at printed page 182 (PDF 184). Keys for Tests 3–6 begin at printed page 214 (PDF 216).

## Existing source questions in this rebuild

- Test 1 / Exam Practice / Reading Part 1: 5 questions from book pp.12–13 (PDF 14–15). Official answers **A C C B A**, from Teacher's Notes p.182 (PDF 184).
- Test 2 / Exam Practice / Reading Part 1: 5 questions from book pp.54–55 (PDF 56–57). Official answers **C A B C A**, from Teacher's Notes p.198 (PDF 200).

- Test 1 / Exam Practice / Reading Part 2: **B H D F A**; Part 3: **D A C B D**.
- Test 2 / Exam Practice / Reading Part 2: **C H E B F**; Part 3: **C A B D A**.

This rebuild preserves the existing repository transcriptions and keys. It does not claim a new comparison against the scanned PDF.

The text of image signs/messages is transcribed. The scanned graphics have not yet been restored to the site. Each question has a Vietnamese evidence-based explanation.

## Existing WordHop behavior reused

The new navigation is integrated under PET and passes through the main student's sign-in guard. The answer sheets autosave in localStorage per authenticated student id; pressing **Check answers** grades with the official publisher key, and **Try this part again** resets only that Part. Legacy Trainer answers migrate once per student. Clearing results removes only the selected Trainer test; other students and ordinary Reading progress stay intact. Other books keep their image-based Reading layout and default storage key. Tests 1–2 Training and Exam Practice are displayed separately; Tests 3–6 have Exam Practice only.

Test 1 Exam Practice Listening Parts 1–4 correspond to source tracks 03, 06, 09 and 12, as previously checked. These recordings still need to be transferred with the correct permissions, mapping, keys, answer replay ranges and explanations. No nonexistent audio links are exposed on the site.

Run `node qa/check-trainer.cjs` before merging or publishing this branch.

## Source audio map and outstanding content

Audio track mappings for all 39 Test 1–2 recordings are in `source-assets/trainer/audio-manifest.json` and the student-facing `dist/trainer/audio-manifest.json`. The audio is mixed: Test 1 includes Writing and Speaking sample recordings as well as Listening; Test 2 includes Speaking samples too. Source track 37 (Test 2) still requires manual Part confirmation.

The shared-interface rebuild shows pending sections for Training, Reading Parts 4–6, Listening, Writing and Speaking. It does not expose a player before the recordings and exercise data are available. The 39 records are metadata, not uploaded audio.

`scripts/import_trainer_audio.py --source-dir PATH` prepares canonical filenames after all 39 originals are available locally. Import the original scan and recordings before completing the remaining questions, page images, answer keys, replay ranges and explanations. Do not publish this draft as a complete book.

## Checks

- `node qa/check-trainer.cjs`: all 30 preserved questions, rendering, correct/wrong/blank scores, locked results, retry, autosave, migration, student isolation, clearing, stale fetches and storage failures.
- `node qa/check-student-gate.cjs` and `node qa/check-clear-results.cjs`: sign-in and existing clear-results regressions.
- `python3 -B scripts/build_github_pages.py` then `python3 -B qa/check_github_pages.py`: shared module, hashed data and nested project paths.

The pull-request validation workflow runs these checks together with the existing content checks on a full repository checkout. The local preview's mock student is not part of the production source.
