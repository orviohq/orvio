# Performance and playtest record

2026-11-07, prototype 0.1.0. These are measured sessions, **not an all-browser guarantee**.

## Environment and change

Chromium 158.0.8127.18 (Playwright 1.65), Linux headless, 1280×800 viewport, ANGLE SwiftShader software WebGL, visible foreground page, default browser frame limiter. No disabled-vsync or unlimited-framerate flags. WebGL backing resolution 0.75, CSS size unchanged. Desktop GPU testing remains desirable.

A 1.0 backing resolution produced 53.7–56.9 fps despite 0.2ms P95 CPU submission. Reusing sprites was insufficient. Reducing backing resolution to 0.75 removed the observed software-rendering frame drops. Plain blank-page rAF baseline: 60.0025 fps / P95 16.7ms over 720 frames. UI lobby including loading: 58.09 fps, two >25ms frames. Metrics in results exclude the first 60 startup frames, so they assess sustained play, not page-load speed.

| Actual browser keyboard session | Scoring units  | Score     | Average fps | P95 frame | Maximum | Frames >25ms |
| ------------------------------- | -------------- | --------- | ----------- | --------- | ------- | ------------ |
| First Light, 5-key easy         | 56/56 MAX100   | 1,000,000 | 60.0023     | 16.7ms    | 16.8ms  | 0 / 2167     |
| Afterimage, 7-key easy          | 70/70 MAX100   | 1,000,000 | 60.0025     | 16.8ms    | 16.8ms  | 0 / 2322     |
| Violet Drive, 5-key hard        | 332/332 MAX100 | 1,000,000 | 60.0024     | 16.8ms    | 16.8ms  | 0 / 2376     |

These sessions send actual browser keydown/keyup events against the audible clock. They are automated keyboard playtests, **not human play** and not engine-call autoplay. One-millisecond-class scheduler error in this environment does not establish latency on a user's hardware. A cloud interactive session showed poor cadence and is not counted as a performance pass.

## Other checks

- All 18 generated chart variants: deterministic, no same-lane head/hold overlaps, perfect replay exactly 1,000,000.
- Browser tests: complete 7-key keyboard session with remapped key and result/back path; left/center/right positions; duplicate-key refusal; missing/wrong/late input; early hold release; reset/restart; preview stop/start; focus-loss abort; mobile play refusal/no horizontal overflow.
- Three rendered stereo soundtracks: zero clipped samples. Peaks 0.4377 / 0.3784 / 0.3755. RMS 0.04354 / 0.03617 / 0.04084. Charts use the same quarter-beat grid as synthesis (floating-point grid error <6e-14 beat units). Buffer analysis is not a substitute for subjective listening or real output-device calibration.

## Reproduce

`npm ci && npx playwright install chromium && npm run test:e2e`. In browser, `window.orvioDiagnostics` provides read-only states/events/timing/frame metrics without private account data. The results show every completed session's own fps, P95 and sample count.

For acceptance on a target device: foreground tab, wired headphones, native refresh ≥60Hz, a full hard chart, no other heavy tabs, then inspect session fps/P95. A 60Hz screen has ~16.67ms cadence; tiny rounding above/below 60.0 is expected. Re-test after renderer/chart changes. Lower-refresh screens cannot show 60fps. Background tab throttling is not supported; hiding the tab aborts. No zero-network-delay promise is made.
