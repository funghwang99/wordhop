# Cambridge B1 Preliminary for Schools Trainer — working integration

**Status:** development branch. The six-test navigation is implemented, and Tests 1–2 each have one complete, scored Exam Practice Reading Part 1. The other sections are explicitly labelled *Content in preparation*; they are not yet available to students. This branch must not be described as having all six tests or 39 recordings published.

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

## Verified questions now implemented

- Test 1 / Exam Practice / Reading Part 1: 5 questions from book pp.12–13 (PDF 14–15). Official answers **A C C B A**, from Teacher's Notes p.182 (PDF 184).
- Test 2 / Exam Practice / Reading Part 1: 5 questions from book pp.54–55 (PDF 56–57). Official answers **C A B C A**, from Teacher's Notes p.198 (PDF 200).

The text of image signs/messages is transcribed. The scanned graphics have not yet been restored to the site. Each question has a Vietnamese evidence-based explanation.

## Existing WordHop behavior reused

The new navigation is integrated under PET and passes through the main student's sign-in guard. The answer sheets autosave in localStorage per authenticated student id; pressing **Check answers** grades with the official publisher key, and **Try again** resets only that Part. All other PET books and vocabulary games remain unchanged. Tests 1–2 Training and Exam Practice are displayed separately; Tests 3–6 have Exam Practice only.

Test 1 Exam Practice Listening Parts 1–4 correspond to source tracks 03, 06, 09 and 12, as previously checked. These recordings still need to be transferred with the correct permissions, mapping, keys, answer replay ranges and explanations. No nonexistent audio links are exposed on the site.

Run `node qa/check-trainer.cjs` before merging or publishing this branch.
