<p align="center"><img src="public/wordmark.svg" width="180" alt="orvio"></p>

# Find your flow

A local-first, open-source keyboard rhythm game. Three original synth tracks, eighteen charts, five or seven lanes. No sign-in, analytics or paid APIs. All gameplay, settings and result processing run in the browser. Hosting serves static files only.

**Prototype:** https://orvio-play.pages.dev/

## Play

Arrow keys choose a track and difficulty, 5/7 choose lane count, Enter starts, F2 opens settings. Tab/Shift+Tab and Enter operate every menu. Escape pauses during play; resume, settings and track selection are available without a mouse. Track selection starts an audio preview after the selection gesture. All 13 supported languages and settings are saved locally.

Choose a track, difficulty (하 / 중 / 상) and 5 KEY or 7 KEY. Press Enter or Play. Hold long notes until the tail reaches the line, then release. Escape and loss of focus pause the audio and play loop.

- 5 keys: D F Space J K
- 7 keys: S D F Space J K L
- F2 system settings: rebind each key, move the playfield left/center/right, and change volume.
- F3 game options: speed, note visibility and lane shuffle. The gameplay panel shows the applied values and opens the same options. Opening options pauses play; speed and visibility apply to the current chart when closed. Changing shuffle requires an explicit restart from the beginning, or cancel to keep the current chart and score.
- Notes and keyboard events share the automatic audible-output clock. Legacy manual offsets are discarded. Browser/device latency reports are best-effort, not a guarantee of zero physical latency.
- Mobile is a browsing/listening layout, not a touch game.

## Develop

Node 22 or newer. Dependencies are locked in `package-lock.json`.

```sh
npm ci
npm run dev
npm test
npm run check
npm run build
npm run test:e2e
```

`npm run test:e2e` needs `npx playwright install chromium` once. Browser tests use real keyboard down/up events; deterministic engine tests are separate.

## What is and is not DJMAX parity

The judgment labels follow the RESPECT family: MAX 100%, 90%, 80%, 70%, 60%, 50%, 40%, 30%, 20%, 10%, 1%, BREAK. The modern RESPECT V maximum is 1,000,000 points, without a FEVER score bonus. See [research](docs/judgments.md).

**This is not a byte-exact DJMAX implementation.** Full timing boundaries, tail weighting and exact integer rounding were not verified from first-party public documentation. Those parts are explicit, tested prototype policy, not reverse-engineered official specifications. Custom seven straight lanes are an Orvio mode, not a claim that DJMAX has a seven-button mode.

## Architecture

- TypeScript + Astro static pages (Vite build pipeline). PixiJS WebGL uses preallocated sprites; no scene reconstruction during frames.
- OfflineAudioContext renders complete stereo tracks before play. Beat times and chart times share exact BPM arithmetic. AudioBufferSourceNode schedules the song independently of rendering.
- Input timestamps use `getOutputTimestamp()` to map the browser event clock to the audible output clock; supported-browser fallback subtracts both reported graph and output latency and maps the original event timestamp. No manual input calibration is used. Physical device/display latency can remain.
- Pure deterministic engine consumes sequenced lane/time/down input events. Rendering cannot award points. This separates future replay/network transport from local judgment.
- Future multiplayer must keep local audio/input immediate, distribute an agreed chart hash and future start epoch, exchange sequenced input/replay data, and reconcile with an authoritative server. No server exists in this prototype. Network delay cannot be zero; waiting for network acknowledgment must never be on the local key feedback path.

## Quality and release

Tests, formatting, strict type checking and production build run in CI. Hourly production browser checks and an independent failure/missing-run watch cover the deployed site. See the [operations and recovery runbook](docs/operations.md). Versioned releases use SemVer and `CHANGELOG.md`. See [contributing](CONTRIBUTING.md), [security](SECURITY.md), [performance](docs/performance.md), and [asset provenance](docs/assets.md).

Code and original procedural music are MIT licensed. Outfit and the subset of Noto Sans KR retain their respective SIL OFL notices in `public/`. The logo is original project artwork, with no trademark-clearance claim. No DJMAX music, graphics, charts or code are included.

## Routes and sharing

- `/`: single start-button home.
- `/select/`: track selection. Optional `song`, `lanes` and `difficulty` query parameters preserve the selection.
- `/play/{song}/{5|7}/{low|mid|high}/`: directly shareable play-ready page. All 18 built-in chart routes are generated at build time. Enter or the start button begins playback; opening a link never starts the score clock.
- The address bar preserves the chart, speed, visibility, shuffle and seed. Back/forward returns to a safe ready/selection screen, never a running game.

Astro generates static HTML. The existing TypeScript/PixiJS/Web Audio client runs the game. No server adapter or account is required.

## Result sharing

Gameplay and recording run locally. In 0.2.12, only an explicit Share click sends the result and compressed input replay to the short-link service; opening a short link fetches that record. No audio, key bindings, account identifiers or identity fields are included. Local fragment links remain readable. See the current sharing section below.

## Local result links (0.2.8)

Historical 0.2.8–0.2.11 local result links carry only bounded song, chart and score/judgment values after `#`. The browser renders the same result dialog used at game end; no result request is sent. No server function, result database, analytics, identity or device data is used. Sharing copies the link and shows visible success or failure feedback. Failed copy can be recovered through the address bar. Older query links are parsed locally and immediately replaced with fragment links, but their first navigation necessarily sends the old query to static hosting. Personalized OG score previews are no longer served; crawlers see the generic Orvio image. Existing v1/v2 links do not contain judgment counts and show `--` for missing values. New v4 links also carry bounded gameplay speed, shuffle, fade and deterministic lane seed, not device data or key bindings. Result retry restores that chart and those options; old links only show values they actually contain. Actual-input replay was added in 0.2.11; older result links still contain no replay.

High-speed rendering uses a single sharp note head and a bounded continuous footprint toward its previous frame. It does not change note times, judgment windows or speed. This is a display-side mitigation, not a confirmed fix for perception on every physical display.

## Desktop install and offline audio (0.2.10)

Supporting desktop browsers can install Orvio from their site/app install action. The manifest, 192/512 icons and service worker are local static assets. The service worker precaches the static application; updates use a content-hashed cache and wait until older app windows close. Gameplay does not reload to force an update. Original tracks are synthesized in the browser and cached in IndexedDB (`orvio-audio`) with a synthesis version, including after preview. Repeat play/reload/offline starts reuse the prepared buffer. From 0.2.12 the decoded song wallpaper is still presented for at least 1.2 seconds, separately from cache performance. Start still requires a user gesture. Browser quota/eviction/private-mode restrictions can remove or prevent this cache; play falls back to synthesis. No personal data, audio or input is sent to a server.

All visible dropdowns use a shared local custom listbox/combobox with keyboard navigation, typeahead, selection, Escape and focus restoration. A non-interactive hidden source select retains the value model. Release history is grouped into features/improvements and bug fixes in all 13 languages; mixed historical paragraphs are grouped by their primary change, preserving their original wording and caveats.

## Result report and local replay (0.2.11)

The result uses original per-song art, accessible option badges, judgment colors, genre, fixed BPM and chart note-head count. A hold counts as one chart note; its tail is an additional judgment. Original song previews require an explicit play/stop action and are available from a shared result as well. The 0.2.11 candidate exited fullscreen on the first Escape. Version 0.2.12 corrects this: a short Escape returns results to song selection while retaining fullscreen when Keyboard Lock is permitted; browser refusal or missing support can still exit fullscreen.

A completed new play can include a local replay in the URL fragment. It records actual lane presses/releases with original audio timestamps and application order, sparse engine-update calls that produced judgments, relative playback timing, pauses and speed/fade changes, and the initial chart options/seed. It does not store names, key bindings, device data, absolute dates or account identifiers. No replay or audio is uploaded. The reader validates bounds, decompresses at most 1 MB and recomputes judgments, score and combo through the same engine before offering playback. Invalid, oversized, unsupported or inconsistent recordings are not replayed. This is a local performance recording, not an authenticated competitive score.

Limits: version 1 covers the three built-in original songs and the current deterministic chart/engine. The recording is capped at 12,000 operations and 10 minutes; the encoded link is capped at 120,000 characters. Browser clipboard/link handling can impose smaller limits. Gameplay remains usable if a replay cannot be recorded; the result reports replay unavailability instead of inventing input. Pauses and option changes are replayed, while another viewer cannot add scoring inputs during replay.

## Short sharing and display updates (0.2.12)

The share button creates an on-demand short URL through the Orvio share service. Opening it fetches only the stored result/replay and validates the result, replay bounds and same-engine judgments before enabling playback. No automatic gameplay upload occurs. Anyone with the link can view it. Records normally expire after one year, but oldest records may be removed earlier under storage pressure. The free service can stop accepting requests when its daily quota is exhausted. Failure is visible, copies no fallback link and never enables a paid service.

Replay packing is lossless at the original IEEE-754 timestamp level. Existing JSON/deflate links remain readable. `rp` and `rn` before the replay payload detect missing or truncated recordings when those markers survive transport; no local format can detect an intermediary removing both the payload and its markers. Large URL-only replays can still exceed messaging-app limits. Short sharing does not claim an authenticated competitive score.

Game options use accessible icon radio groups. BLINK, BLINK 2, FOG, PIXEL, PIXEL 2 and BLIND are approximate display effects, not exact DJMAX parity. Original song wallpaper appears behind gameplay while the gear retains its own contrast. The score's 150 ms numerical rise and short glow/bounce are display-only; reduced motion shows the exact score immediately. Every dialog descendant blocks text selection and dragging while real form controls remain usable.

Startup resets stale countdown and score labels before preparation. Cold/warm replay clock continuity is tested, but the reported device-specific hesitation is not claimed reproduced or universally fixed. YouTube-link audio analysis and physical-display high-speed perception remain separate open limitations.
