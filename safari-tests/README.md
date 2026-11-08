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
