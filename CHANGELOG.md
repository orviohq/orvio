# Changelog

## [Unreleased]

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
