# Changelog

## [Unreleased]

### Fixed

- Keep long-note heads on the judgment line and their bodies visible until release.
- Use automatic audible-output synchronization only, ignoring saved manual offsets and accounting for delayed input events in the fallback clock.

### Removed

- Manual input calibration control.

### Added

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
