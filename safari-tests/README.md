# WebKit audio checks

Run `npx playwright install --with-deps webkit` once, then
`npx playwright test -c playwright.safari.config.ts`.
An optional `ORVIO_WEBKIT_EXECUTABLE` selects a compatible WebKit launcher.

This development-only test uses the local source server to construct a valid
built-in replay. It does not belong in a production-preview test suite.
It checks running audio contexts, nonzero audio-graph samples, activation
before delayed artwork, and advancing replay time in a mobile-sized WebKit
viewport. Where AudioSession is unavailable, a setter probe checks call order.
That probe does not implement or prove a platform audio-session policy.

Linux WebKit is not physical iOS Safari. This test cannot verify device speaker
output, mute-switch behavior, interruptions from phone calls or iOS safe areas.

## Layout and speed checks

`layout.spec.ts` checks fixed artwork anchors, result artwork separation, visible
viewport fill, replay progression and unchanged viewport scale after a double
click. `scroll.spec.ts` measures actual rendered CSS-pixel movement at four
viewport sizes; it also reports the countdown travel reservation.

`npx playwright test -c playwright.layout-desktop.config.ts safari-tests/shine.spec.ts`
checks a real keyboard MAX100% judgment in desktop Chromium. The corresponding
`playwright.layout-webkit-desktop.config.ts` checks desktop WebKit. These use a
local source server and do not send extraction jobs or modify remote services.

Desktop full natural-session completion and built-output asset checks are kept
as release evidence separately. The mobile-sized browser checks are not proof
of physical iOS touch, safe-area, or display behavior.
