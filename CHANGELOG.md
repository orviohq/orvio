# Changelog

## [Unreleased]

## [0.2.16] - 2026-11-08

### Changed

- YouTube imports show a visible loading panel, indeterminate progress and elapsed time, with safe cancel, retry and error recovery.
- YouTube thumbnails appear in track selection, the play background, loading and results. Image failures use local artwork and cannot indefinitely block play.
- Existing charts, scores, controls, local replays and original-song artwork remain unchanged.

### Scope

- This release does not change chart generation, difficulty ratings, key mapping, countdown timing or add FEVER. The short-video limits remain unchanged.

## [0.2.15] - 2026-11-08

### Added

- YouTube link input in the original track selection screen, using the original game, controls, settings, effects and results. Supports videos up to 130 seconds and canonical WAV files up to 24,056,664 bytes, with six Easy/Normal/Hard 5-key/7-key charts.
- Device-local source audio, frozen charts and source-bound replay sessions. Updates reuse saved note arrays. Matching audio is verified by its full-file SHA; changed audio cannot replace saved charts. Browser data removal or another device can lose the local library.
- Original UI import and recovery text, plus player-facing patch notes, in all 13 languages. Local interface fonts include the new text.

### Limits

- YouTube replays are local only and do not have public share links. Original-song result sharing remains unchanged.
- Same video across fresh devices is not guaranteed to produce the same chart. A different audio artifact is refused for an existing chart instead of regenerating it.
- This release supports short videos, not arbitrary full-length songs. Only use audio you have permission to use.

## [0.2.14] - 2026-11-07

- Prepare the playfield under the existing song-loading screen before audio begins, reducing first-frame hesitation in play and replays. Music/input timing, charts, judgments and scoring are unchanged.

## [0.2.13] - 2026-11-07

- One-click short-link copying without an app verification window or waiting message.
- Result-only entry screen and initial-HTML result preview card.
- Removed generated translucent trails behind fast notes; speed, charts and judgments are unchanged.
- Player-focused release history with selectable, copyable text and updated local fonts.

## [0.2.12] - 2026-11-07

- Icon radio controls for note speed, note effects and shuffle; approximate BLINK/BLINK 2/FOG/PIXEL/PIXEL 2/BLIND display effects.
- At least 1.2 seconds of decoded song wallpaper even on warm starts; original song wallpaper behind gameplay.
- Score-only number rise, short glow and bounded bounce, disabled by reduced-motion settings.
- Short Escape retains fullscreen when Keyboard Lock is allowed. Unsupported or denied capture can still leave fullscreen by browser policy.
- Fixed dialog descendant text selection and dragging. Patch notes open in a new tab.
- Lossless binary replay timing, persistent missing/corrupt replay warnings, startup HUD reset and cold/warm clock regression checks. The reported startup hesitation has not been reproduced on every device.
- Explicit result-share click creates a short replay link; no automatic uploads. Default expiry is one year, with early removal of oldest records under space pressure. Free quota or network failure is visible and never silently copies a long fallback or enables paid services.

## [0.2.11] - 2026-11-07

- Result-only option icons, judgment colors, original per-song art, BPM/genre/note-head count and explicit preview controls.
- Local actual-input replay fragments with bounded decoding and exact same-engine judgment/score/combo validation. No input, audio or identity uploads.
- First Escape only exits fullscreen; a held key cannot also dismiss results.
- Removed duplicate result Escape hints and automatic action-button focus on entry; keyboard Tab focus remains visible. Compact laptop-height spacing and result scrolling keep full action buttons accessible.

## [0.2.10] - 2026-11-07

### Added

- Desktop-installable PWA manifest and local static offline shell. Browser installation support varies; an update waits until old app windows close.
- Prepared original music is saved on this device with a synthesis version. Warm reload/offline playback reuses it and skips the old loading delay, after an explicit user start. Storage eviction or quota failure falls back to synthesis; no audio or play data is uploaded.
- Replaced every visible native dropdown with the same keyboard-accessible custom menu, including language, speed, fade, shuffle and patch-note language. All release notes now have feature/improvement and bug-fix sections in 13 languages, preserving original historical entries.

## [0.2.9] - 2026-11-07

### Changed

- Continuous high-speed note exposure fills only the gap to the previous frame while retaining one sharp head; holds, paused scenes and low speed remain unchanged. This does not confirm the reported physical-display symptom is resolved.
- Result screens show song, key mode, difficulty and recorded speed/shuffle/fade options. Shared-result retry restores the chart and options instead of the home view; old links omit unavailable options. Removed duplicate completion text.
- Short landscape settings are more compact. Integration tests compare decoded pixels rather than PNG bytes and sample the audio clock without copying the entire chart; judgment thresholds are unchanged.

## [0.2.8] - 2026-11-07

### Changed

- Game-end and shared links now use the same result screen. Larger judgment labels, no link input, privacy paragraph or performance readout. Copy feedback stays above the result dialog.
- Settings fit without scrolling, using tabs on narrow short screens. Loading hides the old wallpaper until the new track image is decoded.
- Results are interpreted entirely in the browser from the URL fragment. Removed result server functions and personalized social previews; old result links still open locally. Display-only clock smoothing and cached sizing reduce frame jitter without changing chart, speed or judgment. Physical-display high-speed perception remains unverified.
- Loading background is hidden before source replacement and revealed after decoding. Copy success and failure feedback are inside the active modal; failures point to the address bar. Settings retain keyboard controls and all 13 languages.

## [0.2.7] - 2026-11-07

### Added

- French, German, Portuguese, Italian, Russian, Indonesian, Turkish and Vietnamese UI translations, bringing the supported total to 13. Includes menus, settings, results and every release in the website patch notes, with browser language matching and explicit manual overrides.
- Local font coverage and layout regression checks for all supported languages. Song titles and technical effect names remain unchanged.
- Shared HTML follows supported browser-language preferences with an explicit Vary header. The seven result URL fields and fixed-English social PNG stay unchanged.
- Small-screen result buttons use two rows to avoid overlap with long translated labels.

## [0.2.6] - 2026-11-07

### Changed

- Results immediately expose the same bounded URL used for sharing, without sending a result request. The icon copies it directly instead of opening a native share sheet; a read-only link supports manual copy. Reload/direct entry renders the same song/score/accuracy/combo through the server preview.
- Explicitly clear each opaque WebGL frame and pixel-align note sprites. Software frame duplication probes cover 5/7 lanes, 1.5/5/9 speed and every fade mode. Display-specific high-speed motion perception remains unverified on physical devices, not a claimed fix.

- Replace the speed slider with a native keyboard-accessible selector from 1.0 to 9.0 in 0.5 steps; new/reset speed is 1.5. Old saved/URL speeds remain exact and explicitly labeled as previous values until changed.
- Default to the first supported browser language, with English fallback. System settings offer browser-following or an explicit saved override; old settings without an explicit mode migrate to browser-following. Patch notes inherit the same selection.

- Replaced long gameplay option text with three original icon tiles and applied values under the note gear. Scroll speed has a larger numeric value; shuffle and fade states use distinct lane/visibility glyphs and dim inactive states.
- Hover labels, keyboard-focus labels and an accessible full option name explain the tiles. F3, click, paused changes and explicit shuffle restart remain unchanged.
- Reserved a separate 64px options strip below the playfield so the tiles do not cover keys, note heads or the judgment line.
- Result Share is an accessible icon button. Social PNG glyphs use output-size antialiasing instead of scaled binary masks. New v2 URLs avoid stale v1 preview caches; old links remain supported.
- Position settings display miniature left/center/right layouts and explicit selected states, preserving saved values.
- Key labels use actual symbols, including ␣ , . /, without changing physical bindings. Capture uses a fixed-size status dot and separate full instruction, preventing key-button resizing.
- Website patch notes cover all releases in English, Korean, Chinese, Japanese and Spanish, with home/selection links and a consistency test against package/changelog versions.

## [0.2.5] - 2026-11-07

### Added

- Explicit result sharing with score, accuracy and maximum combo in a 1200×630 PNG social preview. Results remain local until Share is pressed; no player identity, account, timestamp or device data is included.
- Server-rendered result pages and PNG Open Graph/Twitter metadata. Results are labeled local and unverified, never leaderboard records. Strict bounded fields and fixed song titles prevent arbitrary markup or tracking content.
- Original wallpaper loading screens for all three built-in tracks. Song art and title remain visible for at least 900ms and through audio/renderer preparation, before the score clock or notes start. No copied game artwork.
- Default site Open Graph image and metadata.

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
