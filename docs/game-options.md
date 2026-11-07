# Game options

F3 opens game options from selection, a direct-chart ready screen, or gameplay. The gameplay panel displays the applied values and also opens options. F2 holds system settings. Options are stored locally and in address-bar URLs.

Opening options during play pauses audio and the score clock. Speed and visibility apply to the current chart on close without replacing note states, held notes or score. Shuffle changes require explicit confirmation to restart from the beginning. Cancel keeps the previous shuffle, seed, chart and score while retaining speed and visibility changes. The gameplay readout keeps showing the applied shuffle while a new choice is pending.

## Reference and limits

Community RESPECT V option documentation: https://wikiwiki.jp/djmax_rv/Option (checked 2026-11-07).

The page lists V speed 1.0–9.0 in 0.5 steps, distinct from PS4 0.50–5.00 in 0.25 steps. Orvio follows the V numeric range and increment, but keeps its own screen-height/travel-time renderer. No pixel-for-pixel speed or BPM-change parity claim.

FADE IN reveals notes near half the highway; IN 2 near two-thirds. FADE OUT hides near two-thirds; OUT 2 near half. Direct rectangle clipping keeps hold bodies within the reveal/hide region without a GPU mask; note heads and tails use a short opacity transition. Judgment remains unchanged.

MIRROR maps lane i to lanes-1-i. RANDOM uses one seeded, bijective, deranged permutation for the whole chart, excluding the mirror mapping. All note times, hold tails and chords remain unchanged. This follows the ordinary-lane shape in the community description; seven straight lanes are Orvio's own mode and not a DJMAX mode. The URL includes the permutation seed.

No copied graphics, music or charts. Other DJMAX options are not implemented by this patch.

## Gameplay tiles

The gameplay gear shows speed, shuffle and visibility as three original SVG icon tiles, with current values and hover/focus labels. Speed is the prominent numeric tile. OFF states are dim, active states use cyan. The strip reserves 64px below the canvas and does not overlap the judgment line or key labels.

Layout reference inspected 2026-11-07: [RESPECT V FreeStyle gameplay screenshot](https://interfaceingame.com/screenshots/djmax-respect-v-freestyle-gameplay/) and [ranked gameplay](https://interfaceingame.com/screenshots/djmax-respect-v-ranked-gameplay/). These show small option tiles attached to the bottom of the gear, with a large speed value and dark unused tiles. Capture build/date is not given, so this is not a latest-build parity claim. Icons and colors are Orvio artwork, not copied textures.

The speed control is a native select, not a range/progress bar. New and reset speed is 1.5. Legacy non-half-step saved/URL values are visibly labeled as previous values and remain exact until the user chooses a new value. Available new choices use 0.5 steps.
