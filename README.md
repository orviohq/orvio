<p align="center"><img src="public/wordmark.svg" width="180" alt="orvio"></p>

# Find your flow

A local-first, open-source keyboard rhythm game. Three original synth tracks, eighteen charts, five or seven lanes. No sign-in, analytics, paid APIs, or remote runtime dependencies.

**Prototype:** https://orvio-4n8.pages.dev/

## Play

Choose a track, difficulty (하 / 중 / 상) and 5 KEY or 7 KEY. Press Enter or Play. Hold long notes until the tail reaches the line, then release. Escape aborts without saving a score. Losing focus aborts rather than scoring hidden-tab input.

- 5 keys: D F Space J K
- 7 keys: S D F Space J K L
- Settings: rebind each key, move the playfield left/center/right, change scroll speed, volume and input offset.
- Positive offset compensates late input. Prefer wired headphones; Bluetooth adds device-dependent latency.
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

- TypeScript + Vite. PixiJS WebGL uses preallocated sprites; no scene reconstruction during frames.
- OfflineAudioContext renders complete stereo tracks before play. Beat times and chart times share exact BPM arithmetic. AudioBufferSourceNode schedules the song independently of rendering.
- Input timestamps use `getOutputTimestamp()` to map the browser event clock to the audible output clock; supported-browser fallback subtracts reported output/base latency. Calibration remains necessary for the actual device.
- Pure deterministic engine consumes sequenced lane/time/down input events. Rendering cannot award points. This separates future replay/network transport from local judgment.
- Future multiplayer must keep local audio/input immediate, distribute an agreed chart hash and future start epoch, exchange sequenced input/replay data, and reconcile with an authoritative server. No server exists in this prototype. Network delay cannot be zero; waiting for network acknowledgment must never be on the local key feedback path.

## Quality and release

Tests, formatting, strict type checking and production build run in CI. Versioned releases use SemVer and `CHANGELOG.md`. See [contributing](CONTRIBUTING.md), [security](SECURITY.md), [performance](docs/performance.md), and [asset provenance](docs/assets.md).

Code and original procedural music are MIT licensed. Outfit and the subset of Noto Sans KR retain their respective SIL OFL notices in `public/`. The logo is original project artwork, with no trademark-clearance claim. No DJMAX music, graphics, charts or code are included.
