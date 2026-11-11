import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";

for (const origin of [undefined, "", "malformed", "https://www.youtube.com"]) {
  test(`direct bootstrap overrides origin ${JSON.stringify(origin)} and blocks global fetch`, () => {
    const env = { ...process.env };
    if (origin === undefined) delete env.PUBLIC_YOUTUBE_API_ORIGIN;
    else env.PUBLIC_YOUTUBE_API_ORIGIN = origin;

    // Install a transport tripwire before either static import evaluates.
    const tripwire = `globalThis.transportCalls = 0;
      globalThis.fetch = () => {
        globalThis.transportCalls++;
        throw new Error('original transport reached');
      };`;
    const code = `
      import ${JSON.stringify(`data:text/javascript,${encodeURIComponent(tripwire)}`)};
      import { globalFetchCalls } from ${JSON.stringify(new URL("./youtube-direct-bootstrap.ts", import.meta.url).href)};
      import { acquireYoutubeAudio, YOUTUBE_DIRECT_ORIGIN } from ${JSON.stringify(new URL("../src/youtube-direct-api.ts", import.meta.url).href)};
      import assert from 'node:assert/strict';
      assert.equal(process.env.PUBLIC_YOUTUBE_API_ORIGIN, 'https://provider.fixture.invalid');
      assert.equal(YOUTUBE_DIRECT_ORIGIN, 'https://provider.fixture.invalid');
      assert.equal(globalFetchCalls, 0);
      assert.throws(() => globalThis.fetch(YOUTUBE_DIRECT_ORIGIN), /Unexpected global fetch/);
      assert.equal(globalFetchCalls, 1);
      await assert.rejects(
        acquireYoutubeAudio('unitTest_01', { publicKey: 'fixture' }),
        { code: 'network_error' },
      );
      assert.equal(globalFetchCalls, 2);
      assert.equal(globalThis.transportCalls, 0);
    `;
    const child = spawnSync(
      process.execPath,
      ["--experimental-transform-types", "--input-type=module", "-e", code],
      { env, encoding: "utf8", timeout: 10_000 },
    );
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr || child.stdout).toBe(0);
  });
}
