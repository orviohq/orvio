# Production operations

The `production` Actions workflow tests https://orvio-4n8.pages.dev/ hourly
(at minute 17), after a main-branch push, and on manual dispatch. GitHub can
queue or delay scheduled runs; this is not a real-time availability guarantee.
The browser suite checks song inventory, keyboard input through a complete
chart and its result, key remapping, saved settings, field positions, negative
judgments, focus abort, and mobile browse-only layout. It uses no production
account and changes only an isolated browser's local storage.

The production config has no local web server. Failed tests are retried once.
Failure screenshots and traces are retained for seven days in Actions artifacts.
The existing `quality` workflow separately checks the source locally.

An independent hourly operations check reviews the public site and the latest
production workflow result. It treats a failed run, unavailable site, or missing
successful run for over 150 minutes as an incident to investigate, including
scheduled-workflow disablement or runner delay. This external check does not
need a GitHub token. Public network checks can fail independently of the site;
confirm the failure before changing production.

## Recovery

1. Read the failed test and verify the public site independently. Distinguish an
   application regression from browser/runner failure or a hosting outage.
2. Reproduce against the affected deployed version. Preserve the report and
   compare the deployed asset hashes with the last known-good source/build.
3. For a confirmed application regression, prepare and verify the smallest fix,
   or redeploy the known-good release. Do not change DNS, accounts, billing,
   secrets, or unrelated projects as an incident workaround.
4. Run the production browser suite after recovery and verify the public URL.
   Record the cause, changed commit/deployment and remaining limits.

Hosting-provider outages may not be repairable from this repository. Escalate
those failures rather than claim a successful repair. Monitoring does not prove
subjective audio quality, human playability on every device, universal 60fps,
or exact DJMAX timing parity.
