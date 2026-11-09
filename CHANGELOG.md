# Changelog

## [0.2.53] - 2026-11-09

- Fix an import timeout that could stop an already prepared YouTube song during download.
- Give download, audio analysis and saving separate time limits after preparation succeeds. Keep the saved request for retry and show which step timed out.

## [0.2.52] - 2026-11-09

- Keep finished and reopened result reports on the same settled paint path; use straight rank-panel corners and release completed intro effects.
- Preserve intro motion, reduced-motion behavior, score/chart/replay data and the existing strict raw-pixel comparison gate.
- Keep compositing hints scoped to visible result content, not gameplay-hidden reports.

## [0.2.51] - 2026-11-09

- Reduce repeated frequency-band lookup work while preparing charts on the device. Preserve exact chart outputs, timing, judgments and existing replay identities.

## [0.2.50] - 2026-11-09

- Add 4-, 6- and 8-key modes for built-in songs alongside 5 and 7 keys.
- Configure one centered eight-key layout with per-mode previews. Preserve custom legacy five- and seven-key bindings.
- YouTube charts remain limited to their verified five- and seven-key modes.

## [0.2.49] - 2026-11-09

- Restore sharing for valid older score-only result links without inventing replay data. Missing required replays, corrupted replays and frozen chart mismatches still fail closed. Local result storage and current replay sharing are unchanged.

## [0.2.48] - 2026-11-09

- Prepare charts for already-saved audio on the device in an owned Web Worker.
- Preserve server-frozen charts and local immutable chart identities, including interrupted saves and concurrent tabs.
- Recover shared local charts only from exact verified audio. Missing or changed audio fails honestly without automatic extraction.
- New uncached audio admission and compression remain off. Existing audio and replay data are retained.

## [0.2.47] - 2026-11-09

- Isolate each whole-audio download's frozen identity, cancellation and returned buffer ownership. One caller cannot reuse another caller's WAV-dimension check, cancel its request or detach its bytes by transfer. These mutable owned buffers deliberately do not deduplicate concurrent requests; no full-WAV copy or persistent audio duplicate is added. Small JSON query caching and progressive playback are unchanged.

## [0.2.46] - 2026-11-09

- Coordinate network data through TanStack Query, using typed identity keys, small-JSON persistence, explicit retry rules and non-retrying mutations. Progressive transport has independent per-play query ownership, no shared Response or stream reader, no retries, zero post-completion cache retention and no persistent audio duplication.
- Paint previously verified results before module loading, using exact result/arrival identity bindings and shared result styles. Preserve the visible result address on refresh, count-up behavior on cold visits, expiry handling and quota-safe optional display data.
- Rename Local Replay to Replay in every supported language. Restore previously verified replay collection display before modules and local verification, using the same header, background and card layout on desktop and mobile. Display-only cards stay inert until verified session handoff; corrupt, unavailable, empty and language-mismatched data falls back honestly without changing stored sessions.

## [0.2.45] - 2026-11-09

- Match loading, failed and retained-but-unready song cards to library artwork, spacing and text styles on desktop and mobile. Keep retry, dismiss, device inspection, replay history and removal actions grouped and usable. Storage and extraction failures remain truthful; no automatic retry or retained-source deletion is added.

## [0.2.44] - 2026-11-09

- Keep the selected song visible after returning from other screens, refreshing, changing tabs or rebuilding the library list. Preserve selection and the relevant nested/page scroll position.
- Request persistent browser storage once after a successful audio save when supported. Refusal or unsupported storage never blocks playback, deletes songs or changes audio verification. Browser storage is still not a permanent backup.

## [0.2.43] - 2026-11-09

- Remove the idle selection-preview hint in every language and from legacy saved-library projections, without changing preview playback.
- Match loading YouTube cards to the standard library artwork size, spacing, rounded edges and title hierarchy at desktop and mobile widths. Keep progress distinct and loading tracks unplayable.
- Preserve explicit failed-import retry/removal and retained failure diagnostics.

## [0.2.42] - 2026-11-09

- Start supported shared tracks from verified audio segments before the whole download finishes, retaining the normal countdown and wallpaper presentation.
- Pause safely at the buffered boundary, resume with verified data, and cancel pending playback on exit or focus loss. Save audio only after the whole file and WAV checks pass.
- Cancel an unfinished preview download when starting the selected track, avoiding a duplicate full download.
- Preserve cached playback and fall back to full verification for tracks without a supported progressive manifest.

## [0.2.41] - 2026-11-09

- Keep failed YouTube additions readable, with grouped retry/remove actions and a separate small-screen action row. Preserve explicit retry and removal behavior without automatic new requests.
- Keep keyboard settings and reset controls within small and short screens across supported languages, without shrinking key targets or text.
- Retain typed failure details for diagnosis. This layout update does not claim that an unverified upstream failure has been fixed.

## [0.2.40] - 2026-11-09

- Keep the live YouTube add action inside the live app, not the temporary saved-library projection, so it survives refresh.
- Match the saved library toolbar and mobile notices to the live layout, with a trusted shared icon and display-only controls until startup completes.
- Add desktop and touch refresh regression checks for toolbar geometry, safe keyboard focus and the working add dialog.

## [0.2.39] - 2026-11-09

- Restore a small display-only saved library during HTML parsing, before module startup, IndexedDB hydration and background metadata refresh. Keep enlarged artwork, selection and scroll position.
- Remove full audio reads from library first paint while retaining verified canonical chart/reference identity. Playback still verifies audio hashes and WAV shape; display cache never authorizes actions.
- Add delayed-module/audio/metadata, offline, repeated-reload, invalid-cache and corrupted-audio checks, with cached/live row geometry matching. Pre-play wallpaper, result motion and fitted result cards are unchanged.

## [0.2.38] - 2026-11-09

- Enlarge song-list artwork and clarify titles, metadata and selection, while keeping controls reachable on portrait and landscape screens.
- Restore the requested 1.2-second decoded wallpaper presentation before player-triggered starts, including local replay retries. Credit a play-route gate already shown; do not add a catalog or result data-loading delay.
- Add real local replay retry and warm-start regression coverage while preserving audio readiness, cancellation, countdown and cached route startup checks.

## [0.2.37] - 2026-11-09

- Animate the result score from zero, stamp the rank and reveal details in sequence without blocking actions.
- Respect app and system reduced motion, finish interrupted reveals cleanly and preserve exact result, replay and session data.

## [0.2.36] - 2026-11-09

- Size result cards to their contents on tall, landscape and touch screens instead of leaving oversized blank space below actions. Short screens retain scrolling.

- Prefer memory and saved audio before rendering, prepare cached tracks before the play gesture, and remove artificial startup presentation delay. Cold rendering or unavailable audio still waits for real readiness.
- Restore saved local song play URLs on a static-host refresh without flashing the wrong start screen. Preserve missing-song recovery, startup cancellation and desktop-only gameplay.

## [0.2.35] - 2026-11-09

- Redesign the complete result screen with a grouped score and rank, clear metrics and judgments, and same-row text-labeled replay and share actions. Preserve saved results and replay behavior.
- Copy song links directly from the song context menu without opening a dialog. Report clipboard failures without claiming success.

## [0.2.34] - 2026-11-09

- Move song sharing to the song context menu and remove the duplicate preview action. Keyboard menu navigation and source-specific sharing are preserved.

## [0.2.33] - 2026-11-09

- Add song-only sharing with explicit review and Add before local storage.
- Show optional early YouTube titles and truthful import stages, with completion feedback only after local installation.
- Keep selection artwork stable with long titles, extend Korean glyph coverage and improve notification placement.
- Replace opaque BREAK fill with a thin edge without changing timing, judgments or scores.

## [0.2.32] - 2026-11-09

- Use a fixed CSS-pixel note-scroll reference across devices. Reserve the actual visible travel window for countdowns and retain saved replay timing.
- Fill the mobile play viewport, avoid stacked filters in judgment glow and suppress double-tap zoom without disabling pinch zoom.
- Enlarge result artwork, stabilize selection artwork and title space, align the YouTube action and shorten import instructions.
- Distinguish shared-result start controls from locally played-result retry controls.

## [0.2.31] - 2026-11-09

- Improve Safari preview and replay music playback with playback-session intent and activation during the original play gesture. Keep optional platform APIs optional.
- Reject incompatible output timestamps so replay progress uses the existing audio-clock fallback instead of freezing. Preserve valid output timestamps, saved audio, charts and replay data.

## [0.2.30] - 2026-11-08

- Replace the brief static result page with a reduced-motion-aware loading animation without added delay.
- Preserve source/song object identity and useful titles through reload; refresh only identity-bound result display metadata. Saved audio, charts, replays and shared fragments remain unchanged.
- Full-screen responsive mobile results, touch-friendly navigation and actual game-view replay playback. Direct gameplay stays desktop-only, including retry and deep-link starts.

## [0.2.29] - 2026-11-08

- Continue long-note hit effects while held, stop after release, honor reduced motion. Judgments and timing unchanged.
- Correct undersized translated action labels and menus. Keep full results visible at laptop height and all content reachable on small screens.
- Add replay artwork, exact song duration and new-session play timestamps; mark legacy missing times honestly. Improve archive cards and wheel/keyboard/touch scrolling.
- Remove duplicate top removal action and redundant library/keyboard copy. Preserve contextual and keyboard removal.
- Keep stable selected-song identity and list scroll when returning.
- Clearly label replay playback above the song title; hide on return or completion.
- Show current key-mode/difficulty note counts within each song row, remove bottom provenance/count line.
- Clarify that audio-capacity errors refer to the server limit, not device storage.

## [0.2.28] - 2026-11-08

- Recover YouTube song titles and artists from identity-bound saved metadata for fresh and already-added songs, without re-adding or re-extracting audio. Keep saved audio, charts and replays unchanged.
- Treat unavailable or mismatched display metadata as optional; playable songs remain playable. Update display-only local metadata without replacing saved audio bytes.

## [0.2.27] - 2026-11-08

- Add a replay collection for saved YouTube sessions and original-song sessions completed from this release onward. Keep exact saved charts for local playback and show storage failures honestly. Previously unsaved original sessions are not restored.
- Add right-click and keyboard list removal to pending and error rows without deleting audio, results or replays. Keep original artwork uncropped and preparation UI quiet.
- Clear YouTube input only after a successful addition, preserving failed, cancelled or newer input. Keep builtin replay sharing valid and handle clipboard share failures without uncaught errors.

## [0.2.26] - 2026-11-08

- Keep saved server audio without age-based expiry or oldest-first eviction. A finite storage limit rejects new audio before extraction rather than deleting existing songs.
- Read verified, pin-bound audio by stable song identity without a live processing job. Prefer verified local audio and never silently re-extract published songs during pending preparation or missing-artifact failures.
- Accept explicit non-expiring audio metadata and explain full storage in all 13 languages. Preserve archived charts, results and replays.
- Browser storage can still be removed by the browser or the user. This release does not promise unlimited cloud storage or recover audio deleted before this change.

## [0.2.25] - 2026-11-08

- Add removal controls to unavailable YouTube song rows. Confirming removes only the list entry; saved audio, results and replays stay unchanged.
- Add an on-demand, device-only saved-audio check for unavailable songs. Distinguish matching audio, unconfirmed charts, missing matching audio, invalid data and unreadable storage without uploading or deleting data.
- Keep all 13 interface translations and licensed font subsets current. This release does not restore evicted server audio or silently replace archived charts.

## [0.2.24] - 2026-11-08

- Show the existing audio request limit, up to 100 requests per IP per day, in the Add YouTube dialog in all 13 languages. No quota or service policy changes.

## [0.2.23] - 2026-11-08

- Use one verified chart set and difficulty per YouTube video across clients; keep archived charts and saved play history unchanged.
- Share the exact external-song replay, loading its verified audio only when watching.
- Keep unavailable songs visible with a read-only retry while other songs remain playable.
- Add YouTube songs immediately as non-playable loading rows while preparation runs in the background.
- Distinguish observed audio service, response, analysis and browser-storage failures without guessing unknown causes.
- Existing imports can obtain a canonical chart from trusted server-cached audio even when their old job has expired. Pending server repair is checked without another extraction request. Songs with no trusted server audio still need an explicit source or re-import choice; local archives are not silently replaced.
- This release does not claim a fix for the QWER upstream extraction failure, display ghosting, or a fully passing CI gate.

## [0.2.22] - 2026-11-08

- Remove a song from the library without deleting its audio, results or replay archive. Show one entry per video and remove old/new chart and migration controls.
- Fade hold bodies smoothly with FADE OUT and FADE OUT 2.
- Add original FEVER activation audio, burst and combo feedback, honoring volume and reduced motion.
- Preserve complete YouTube artwork across library, gameplay and results.
- Add opt-in local frame diagnostics with query-safe navigation. This is a measurement tool, not a claimed display-ghosting fix.
- Cross-device authoritative chart generation and external replay sharing remain separate work, not a guarantee in this release.

## [0.2.21] - 2026-11-08

- Support YouTube imports up to five minutes with bounded audio copies.
- Explain typed audio failures, quota scopes and reset times; retry only fresh existing artifact GETs.
- Restore select-all and normal editing in inputs, and use consistent scrollbars on game and patch notes.

## [0.2.20] - 2026-11-08

- Add separate SC charts and Orvio-estimated numeric levels beside NM, HD and MX in selection and results.
- Keep saved chart versions, results and replays unchanged; omit SC when no distinct arrangement exists.
- Add optional automatic FEVER up to ×5 with hold ticks and a separate combo, without a score bonus.
- Keep FEVER rules in replay metadata and record tick-only updates for replay timing.

## [Unreleased]

## [0.2.19] - 2026-11-08

### Changed

- New YouTube charts follow multi-band spectral onsets instead of a regular beat grid, with supported holds and chords. Hard charts keep more detected attacks; shared lane placement avoids repeated heads within 150ms on the same lane in the evaluated set.
- Saved source charts offer an explicit regenerate action. A new version appears beside the old chart; existing charts, results and replays keep their original notes and timing.
- The source-chart list scrolls independently so its actions and Start remain visible with multiple versions.

### Scope

- Built-in charts, bindings, settings, countdown, judgments and score rules are unchanged. Difficulty ratings and FEVER are separate work.
- Automatic analysis cannot guarantee a hand-authored chart's musical choices. The evaluation establishes source-signal alignment and playable hold/chord structure, not human listening quality.

## [0.2.18] - 2026-11-08

### Fixed

- Keep key highlights on their physical lanes after a second or later play, including custom punctuation bindings and switching between 5-key and 7-key modes.
- Each play or replay owns a fresh playfield renderer. Old canvas, WebGL context and generated textures are released; loading-screen warmup is retained.

### Scope

- Input mappings, audio timing, charts, judgments, scoring, settings, local replays and the previous countdown fix are unchanged. Difficulty ratings, chart generation and FEVER remain separate work.

## [0.2.17] - 2026-11-08

### Fixed

- Finish the countdown before any note can enter the field, including after a live speed change. Reserve the longest supported travel window without hiding notes or changing their chart times.
- Audio preparation has a 30-second deadline and a Cancel/Esc path back to track selection. Retry owns a new startup attempt; late completion from a cancelled attempt cannot start another soundtrack.
- New replays retain their exact audio lead-in. Older local replays keep their original audio anchor and input timing.

### Scope

- Charts, judgments, controls and scores are unchanged. This release does not fix the separately reported second-round lane highlight issue, change difficulty ratings or chart generation, or add FEVER.

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
