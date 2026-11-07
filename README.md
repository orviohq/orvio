<p align="center"><img src="public/wordmark.svg" width="180" alt="orvio"></p>

# Find your flow

A local-first, open-source keyboard rhythm game. Three original synth tracks, eighteen charts, five or seven lanes. No sign-in, analytics or paid APIs. Gameplay is local; optional result sharing uses small same-site Pages Functions.

**Prototype:** https://orvio-play.pages.dev/

## Play

Arrow keys choose a track and difficulty, 5/7 choose lane count, Enter starts, F2 opens settings. Tab/Shift+Tab and Enter operate every menu. Escape pauses during play; resume, settings and track selection are available without a mouse. Track selection starts an audio preview after the selection gesture. English, Korean, Chinese, Japanese and Spanish are saved locally.

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

The result screen places the share URL in the address bar without making a result request. The share icon copies it immediately; a visible read-only field also allows manual copy. Opening or reloading that URL requests a same-site HTML result and PNG social image. Only a fixed built-in song ID, key mode, difficulty, score, accuracy and combo are included. No identity, account, timestamp, device data or local settings are sent. Shared URLs are public to anyone who receives them. Results are self-reported local play, not authenticated leaderboard records.

Cloudflare Pages Functions handle only `/result/*` and `/result.png`; all gameplay routes remain static. Local result testing: `npx wrangler pages dev dist --port 4176`. The PNG renderer has no runtime font download, external image URL or third-party API dependency.

Website patch notes are available from Home or track selection in each supported language. Browser language is the default (first supported preference, English fallback); settings allow an explicit saved override or a return to browser-following. Old language settings without an explicit mode migrate to browser-following. New/reset speed is 1.5, selected in 0.5 steps; legacy exact speeds remain visibly labeled until changed.

Supported UI and website patch-note languages: English, Korean, Chinese, Japanese, Spanish, French, German, Portuguese, Italian, Russian, Indonesian, Turkish and Vietnamese. Shared HTML follows supported browser language preferences. Social PNG labels retain the fixed English format; result values and the seven-field URL are language-independent. Song titles and named effect modes remain original identifiers.
