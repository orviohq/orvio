# Changelog

## [Unreleased]

## [0.2.4] - 2026-11-07

### Added

- Applied speed, shuffle and note-visibility readout in gameplay, with a clickable options button and F3 access. Opening options pauses the audio and score clock.
- Speed and visibility changes apply to the current chart without replacing notes, holds or score.
- Shuffle changes require explicit restart confirmation. Cancel keeps the previous shuffle, seed, chart and score. Restart applies the new permutation from the beginning.

### Fixed

- Remove stale README references to the deleted copy button and speed in system settings.

## [0.2.3] - 2026-11-07

### Added

- Separate game options (F3) in track selection and direct-chart ready screens: speed 1.0–9.0 in 0.1 steps, FADE IN / IN 2 / OUT / OUT 2, MIRROR and RANDOM.
- Reproducible full-chart lane permutations with a URL seed; holds and chords remain intact. Fader changes affect only note visibility, not scoring.

### Changed

- Scroll speed moved out of system settings. Game options apply at the next play and are preserved in direct-chart and selection URLs.
- New and reset playfields default to left. Explicit saved left/center/right choices remain intact.

### Scope

- Option names and approximate reveal/hide regions are informed by community RESPECT V documentation, not an exact renderer or timing clone. Orvio's custom seven lanes have their own lane permutation. No CHAOS, BLINK, FOG, PIXEL or BLIND claim.

## [0.2.2] - 2026-11-07

### Changed

- Removed chart-link and selection-link copy buttons. Direct chart URLs, address-bar state, refresh and history remain supported.

### Added

- Home start requests fullscreen during the click or Enter gesture, keeping the selection transition in the same document. Unsupported or denied fullscreen does not block play.
- Separate five-key and seven-key binding rows in one settings screen.
- Consecutive left-to-right key capture with automatic advance, same-mode duplicate checks, repeat rejection and Escape cancellation. Saved modes remain independent.

## [0.2.1] - 2026-11-07

### Fixed

- Snap the canvas to whole pixels per lane, preventing fractional right-edge clipping after resize.
- Replace tall geometric hit beams with a short original raster burst.
- Remove MAX100 field-wide overlay flashes and brightness pulses.
- Keep a failed hold's remaining body/tail muted until it reaches the judgment line, without changing resolved scoring or allowing re-entry.

## [0.2.0] - 2026-11-07

### Fixed

- Keep long-note heads on the judgment line and their bodies visible until release.
- Use automatic audible-output synchronization only, ignoring saved manual offsets and accounting for delayed input events in the fallback clock.

### Removed

- Manual input calibration control.

### Added

- Full-screen track console, gold perfect hits, red breaks, graded judgment feedback and lane-local beam/spark effects.
- Selection-gesture audio preview, keyboard-only menus and pause/settings/resume.
- English, Korean, Chinese, Japanese and Spanish UI with local fonts and saved preference.
- Clean primary URL with the original deployment retained.
- Astro static home, selection and 18 unique chart-ready routes; copy-link, refresh and safe browser-history navigation.
- Hourly production browser checks, retained failure evidence and recovery runbook.

## [0.1.0] - 2026-11-07

### Added

- Keyboard rhythm prototype with three original, prerendered synth tracks.
- Eighteen charts across three difficulties and five/seven lanes, including holds.
- Audio-output-aligned input clock, calibration, configurable keys and field position.
- Judgment/accuracy/combo/final result display and explicit evidence limits.
- Local-only settings, mobile browsing layout, no-touch-play guidance.
- Deterministic engine tests, browser tests, CI, license and contribution/security docs.

### Known limitations

- Full DJMAX timing/hold/rounding equivalence is not established.
- 60fps is device-dependent and remains a measured acceptance target, not a blanket guarantee.
- No multiplayer transport, persisted leaderboard or desktop wrapper yet.
