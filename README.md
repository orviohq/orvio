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

Result sharing runs entirely in the browser. See Local result links below.

## Local result links (0.2.8)

New result links carry only bounded song, chart and score/judgment values after `#`. The browser renders the same result dialog used at game end; no result request is sent. No server function, result database, analytics, identity or device data is used. Sharing copies the link and shows visible success or failure feedback. Failed copy can be recovered through the address bar. Older query links are parsed locally and immediately replaced with fragment links, but their first navigation necessarily sends the old query to static hosting. Personalized OG score previews are no longer served; crawlers see the generic Orvio image. Existing v1/v2 links do not contain judgment counts and show `--` for missing values. New v4 links also carry bounded gameplay speed, shuffle, fade and deterministic lane seed, not device data or key bindings. Result retry restores that chart and those options; old links only show values they actually contain. Replay recording is not part of this release.

High-speed rendering uses a single sharp note head and a bounded continuous footprint toward its previous frame. It does not change note times, judgment windows or speed. This is a display-side mitigation, not a confirmed fix for perception on every physical display.

## Desktop install and offline audio (0.2.10)

Supporting desktop browsers can install Orvio from their site/app install action. The manifest, 192/512 icons and service worker are local static assets. The service worker precaches the static application; updates use a content-hashed cache and wait until older app windows close. Gameplay does not reload to force an update. Original tracks are synthesized in the browser and cached in IndexedDB (`orvio-audio`) with a synthesis version, including after preview. Repeat play/reload/offline starts reuse the prepared buffer and skip the old 900 ms loading minimum. Start still requires a user gesture. Browser quota/eviction/private-mode restrictions can remove or prevent this cache; play falls back to synthesis. No personal data, audio or input is sent to a server.

All visible dropdowns use a shared local custom listbox/combobox with keyboard navigation, typeahead, selection, Escape and focus restoration. A non-interactive hidden source select retains the value model. Release history is grouped into features/improvements and bug fixes in all 13 languages; mixed historical paragraphs are grouped by their primary change, preserving their original wording and caveats.
