# Contributing

Open an issue before large changes. Small fixes can use a focused pull request.

1. Branch from main. Keep commits focused (`feat:`, `fix:`, `test:`, `docs:`).
2. Add a failing regression test for engine bugs. Timing changes need boundary tests and source evidence; do not describe estimates as official DJMAX behavior.
3. Run `npm ci`, `npm test`, `npm run check`, `npm run build` and browser tests.
4. Include screenshots for UI changes and device/browser/viewport/renderer details for performance claims. No personal data, local absolute paths or credentials in screenshots/logs.
5. Add an Unreleased changelog entry. Maintainers bump versions and tag releases after checks.

Contributions are MIT licensed. Do not upload songs, samples, fonts, chart data or artwork without redistributable rights. Preserve OFL notices. Do not include secrets or user-linked identifiers. Do not use production service tokens in a pull request. Public CI has read-only repository permissions and no deployment secret.
