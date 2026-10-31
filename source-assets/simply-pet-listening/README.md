# Simply PET Listening

The user supplied the 176-page Simply B1 Preliminary for Schools student
book (GLOBAL ELT, 2019, revised 2020 exam) and all 32 audio recordings.
The site contains 8 tests, 32 parts, 200 questions and 32 original book pages.

`source-manifest.json` records original audio filenames, checksums, durations,
codecs and full FFmpeg decode checks. The clean replacements are Test 4
Part 2.m4a (AAC, 48 kHz) and Test 5 Part 3(1).mp3 (MP3, 44.1 kHz).
All selected recordings decode completely without errors. Bytes and formats
are unchanged. Earlier hashed assets are retained for older tabs; the
replacement history and catalog identify the currently selected recordings.

```sh
python3 -B scripts/import_simply_pet_audio.py /absolute/path/to/audio-directory
```

The importer accepts MP3/M4A and optional numeric filename suffixes.

`questions.json` records all printed prompts and choice descriptions.
Picture options remain visible in original book images. Parts 3 and 4 share
a page. Test 8 starts at PDF page 132, a different offset from preceding tests.
`exercise-manifest.json` records source PDF hash, exact pages and image paths.

`answer-key.json` contains WordHop-authored keys, accepted variants, English
explanations, recording evidence and timestamps. The student book contains
no publisher Listening key/transcript. All 48 gap answers were reviewed with
the printed gap, grammar and word limit. Resolved listening traps are in
`review-record.json`. These are not presented as a publisher-provided key.

To regenerate pages and hashed data, install PyMuPDF and Pillow, then run:

```sh
python3 -B scripts/import_pet_listening_exercises.py /absolute/path/to/Simply-PET.pdf
```

Source PDF and intermediate transcription files are not committed.
Images are under `dist/assets/listening/`; exercise JSON under `dist/listening/`.

One native player is mounted, with preload="none" and no autoplay.
Part/test/tab navigation stops and releases the previous source. Checking
answers and retrying the current part preserve playback. Audio is independent
of game sound effects. Lazy question requests can be retried; stale responses
cannot replace a different view. Attempts use `wordhop.listening.v1` and
scores are recalculated from the current key. Reading and vocabulary keep
their existing data and progress.

```sh
node qa/check-listening.cjs
python3 -B scripts/build_github_pages.py
python3 -B qa/check_github_pages.py
```
