# Simply PET listening audio

The user supplied Test 1–8, Parts 1–4: thirty-two original stereo MP3 files.
WordHop keeps their original bytes, including the full recording and pauses.
`source-manifest.json` records each filename, SHA-256, duration, size and codec.
Hashed copies are served from `dist/audio/simply-pet/`.

To import supplied files (requires ffprobe and ffmpeg):

```sh
python3 -B scripts/import_simply_pet_audio.py /absolute/path/to/audio-directory
```

The importer adds a `listening` array only to the matching Simply PET tests.
It preserves vocabulary, reading exercises, IDs and existing audio entries.
If vocabulary is reimported, run this importer afterwards to restore its links.
All eight supplied tests have four listening parts.

Each listening part has a direct hash route. Only one native audio player is
mounted at a time, with `preload="none"` and no autoplay. Switching part, test
or study tab stops playback and releases the previous source. Speed controls
use the native player's pitch-preserving playback. Playback is not tied to
the game's sound-effects toggle.

Full decoding passed for thirty supplied files. Test 4 Part 2 and Test 5
Part 3 report invalid MP3 frames (`invalid new backstep` / `Header missing`).
Their original bytes remain available, with a visible source warning in the
player. They need replacement recordings; WordHop does not invent missing
audio or hide the issue. The importer checks complete decoding and records
the result so replacing the supplied files clears their warnings automatically.
