# Licensed test audio

`audio1.flac` is a lossless transport fixture for the exact PCM WAV used by the source-integration tests. `python scripts/restore-audio1.py` restores and verifies its SHA-256. It is not a bundled playable track.

Monkeys Spinning Monkeys by Kevin MacLeod (incompetech.com), licensed under Creative Commons Attribution 3.0.

- https://commons.wikimedia.org/wiki/File:Kevin_MacLeod_~_Monkeys_Spinning_Monkeys.ogg
- https://creativecommons.org/licenses/by/3.0/

Tests also use an eight-second PCM excerpt of this fixture to verify result and replay recovery. The excerpt is described as a short test, not a full-song playback proof.
