# PET Writing

All Writing tasks from the two supplied PET books are imported:

| Book | Tests | Parts | Prompts | Original pages |
| --- | --- | --- | --- | --- |
| Simply B1 Preliminary for Schools | 8 | 16 | 24 | 16 |
| Authentic 1 | 4 | 8 | 12 | 8 |

Each test requires the email in Part 1 (Question 1), followed by a choice of
article (Question 2) or story (Question 3) in Part 2. The source instructions
ask for about 100 words per answer. Full original pages preserve email notes,
story opening sentences and the Simply Writing Tutor panels.

Simply Writing PDF pages are 33–34, 47–48, 61–62, 75–76, 89–90, 103–104,
117–118 and 130–131. Printed page numbers are PDF page minus one. Test 8 has
an earlier Writing start because its Reading Parts 5 and 6 share a page.

Authentic 1 Writing PDF pages are 20–21, 38–39, 56–57 and 74–75. Printed page
numbers are PDF page minus two. Its original Writing paper allows 45 minutes.

Source hashes, reviewed question metadata and complete page mappings are
recorded in the two book JSON files and `source-manifest.json`. Original PDFs
are not included in the repository. WebP pages preserve the full page at 1350
pixels wide, with immutable checksummed filenames. Each test loads only its
selected Writing data and original page.

Reimport with Python, PyMuPDF and Pillow:

```sh
python -B scripts/import_pet_writing.py '/absolute/Simply.pdf' '/absolute/Authentic.pdf'
```

The Writing module saves a separate draft for each test, part and question on
the current browser. Switching article/story retains both drafts. Navigation
flushes pending edits; Clear saved results clears the selected test's Writing
drafts alongside Reading, Listening and games. Other tests and preferences
are preserved. Writing prompts are not given automatic correctness scores.

Run the all-word, Reading, Listening and GitHub Pages checks before publishing.
