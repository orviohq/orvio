# Judgment and score evidence

Checked 2026-11-07. The reference is DJMAX RESPECT V. Evidence levels are kept separate.

## First-party

- DJMAX RESPECT PS4 manual: https://www.djmaxrespect.com/manual/index.html . Its result guide displays MAX 100%, MAX 1~90%, BREAK; its play guide describes normal/long/analog notes and combo reset on BREAK. It is a **PS4 manual**, not a current V 2.0 scoring specification.
- ROCKY STUDIO's Steam development notes, April 29 / May 1, 2024: https://store.steampowered.com/news/posts/?appids=960170&enddate=1715061613&feed=steam_community_announcements . Score maximum changed from 350,000 to 1,000,000. FEVER no longer awards score bonuses, only boosts combo. This supports the modern maximum and no FEVER score bonus, not every formula below.

## Community corroboration, not official specification

- https://wikiwiki.jp/djmax_rv/Score describes RATE as average judgment percentage and V 2.x score as the corresponding 1,000,000-point proportion, with S at 97%, A at 90%, B at 80%.
- https://en.namu.wiki/w/DJMAX%20RESPECT/%EC%8B%9C%EC%8A%A4%ED%85%9C describes MAX categories, BPM-independent PC timing and an estimated normal MAX100 window around ±41.67 ms. Its exactness is not established by this project.

## Explicit Orvio prototype policy

The full official 90→1% window table was **not verified**. We do not claim the following boundaries are official. Absolute timing error in ms maps to inclusive upper bounds:

| MAX | 100   | 90  | 80    | 70    | 60  | 50    | 40    | 30  | 20     | 10     | 1   |
| --- | ----- | --- | ----- | ----- | --- | ----- | ----- | --- | ------ | ------ | --- |
| ms  | 41.67 | 50  | 58.33 | 66.67 | 75  | 83.33 | 91.67 | 100 | 108.33 | 116.67 | 150 |

An unhit head past 150 ms is BREAK. Empty unrelated presses do not break another lane. A successful hold has two scoring units, head and tail. Release within ±116.67 ms retains the head percentage; early release is BREAK; release more than 116.67 ms late awards MAX1; if still held at 150 ms late, the tail resolves automatically at MAX1. Hold ticks do not add combo in this prototype. These hold/empty-press/rounding choices are **not established DJMAX parity**.

`score = floor(1,000,000 × sum(judgment percentages) / (100 × scoring units))`. Rounding is applied to the accumulated sum, never separately per note. Missing scoring units contribute zero; live accuracy averages resolved units, final accuracy uses all units. No FEVER or pause bonus/penalty is implemented. Escape/focus loss aborts rather than fabricating a pause-resume result. Restart starts fresh.

All eighteen charts are tested for no overlapping lane input, deterministic generation and exact 1,000,000-point perfect results. The timing constants and formula are isolated in `src/engine.ts` for replacement when authoritative evidence is available.
