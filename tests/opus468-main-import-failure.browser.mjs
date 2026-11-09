import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
// Local candidate UI resources only. Genuine backend GET/read-only projection POST.
const root = path.resolve('dist'),
  out = '/downloads/basefailure1907',
  requests = [],
  errors = [];
const browser = await chromium.launch({
  headless: true,
  env: { ...process.env, TMPDIR: '/dev/shm' },
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--enable-unsafe-swiftshader',
  ],
});
const context = await browser.newContext({
  locale: 'ko-KR',
  viewport: { width: 1280, height: 900 },
  serviceWorkers: 'block',
});
await context.route('https://orvio-play.pages.dev/**', async (route) => {
  const u = new URL(route.request().url());
  let file = path.join(root, decodeURIComponent(u.pathname));
  if (u.pathname.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    await route.abort();
    return;
  }
  const types = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };
  await route.fulfill({
    status: 200,
    contentType: types[path.extname(file)] ?? 'application/octet-stream',
    body: fs.readFileSync(file),
  });
});
await context.route(
  'https://orvio-share.pn-26f.workers.dev/**',
  async (route) => {
    const r = route.request();
    requests.push({
      method: r.method(),
      url: r.url(),
      body: r.postData(),
      at: Date.now(),
    });
    if (
      r.method() !== 'GET' &&
      !(
        r.method() === 'POST' &&
        r.url() ===
          'https://orvio-share.pn-26f.workers.dev/v2/opus-owner-audio-projection'
      )
    )
      throw Error('unexpected_mutation');
    await route.continue();
  },
);
const p = await context.newPage();
p.on('pageerror', (e) => errors.push(String(e)));
try {
  await p.goto('https://orvio-play.pages.dev/select/');
  await p.waitForFunction(() => window.general468Qualification);
  const proof = await p.evaluate(async () => {
    const api = window.general468Qualification,
      c = new AbortController(),
      timer = setTimeout(() => c.abort(Error('integration_deadline')), 95000),
      stages = [],
      start = performance.now();
    try {
      const t = api.makeTransport(),
        runtime = api.createPublic468Candidate({
          readArtifact: api.readArtifact,
          exchangeProjection: t.exchange,
        });
      window.general468Runtime = runtime;
      await api.enableGeneral468Candidate({
        ...runtime,
        extendCachedBase: async () => {
          throw Error('qualification_extension_failure');
        },
      });
      const job = await api.readOpus35Job(
          {
            jobId: '5fe6f2ae-6841-4e76-969e-e399416d74c4',
            videoId: '1bZNp9d7pLM',
            transportVersion: 2,
            audioFormat: 'orvio-opus-v1',
          },
          c.signal,
        ),
        prepared = await api.prepareOpus35Job(job, c.signal),
        metadata = await api.earlyYoutubeMetadata(job.videoId, c.signal);
      if (!metadata) throw Error('real_metadata_missing');
      stages.push({
        stage: 'genuineExistingSourcePreparedAndLiveMetadata',
        ms: performance.now() - start,
      });
      await api.completePreparedYoutubeImport({
        prepared,
        title: metadata.title,
        author: metadata.author ?? undefined,
        jobId: job.jobId,
      });
      stages.push({
        stage: 'actualMainImportCompletionGeneralExtensionAndSingleInstall',
        ms: performance.now() - start,
      });
      return {
        stages,
        metadata,
        songs: runtime.frontend.list(),
        binding: runtime.releaseBinding,
        scope:
          'actual main new-import completion boundary fed genuine existing receipt/base/live metadata; provider/create/input-submit not executed',
      };
    } finally {
      clearTimeout(timer);
    }
  });
  proof.baseAfterExtensionFailure = await p.evaluate(() => ({
    ids: window.general468Qualification.catalogIds(),
    extensionCount: window.general468Runtime.frontend.list().length,
  }));
  await p.locator('[data-lanes="4"]').click();
  proof.failedRow = await p
    .locator('#songs [data-song]')
    .filter({ hasText: proof.metadata.title })
    .textContent();
  await p.screenshot({ path: out + '-failed468.png' });
  await p.locator('[data-lanes="5"]').click();
  await p
    .locator('#songs [data-song]')
    .filter({ hasText: proof.metadata.title })
    .click();
  await p.locator('#start').click();
  await p.waitForFunction(
    () => window.orvioDiagnostics.active && window.orvioDiagnostics.clock > 3,
    null,
    { timeout: 45000 },
  );
  proof.basePlay = await p.evaluate(() => ({
    active: window.orvioDiagnostics.active,
    song: window.orvioDiagnostics.song,
    lanes: window.orvioDiagnostics.settings.lanes,
    clock: window.orvioDiagnostics.clock,
  }));
  await p.keyboard.press('Escape');
  await p.locator('#pause-exit').click();
  if (
    !proof.failedRow.includes('다시 확인') ||
    proof.baseAfterExtensionFailure.extensionCount !== 0 ||
    !proof.basePlay.active ||
    proof.basePlay.lanes !== 5 ||
    proof.basePlay.clock <= 3 ||
    requests.some((r) => r.method !== 'GET')
  )
    throw Error('base_completion_failure_isolation_regression');
  await context.storageState({ path: out + '-storage.json', indexedDB: true });
  await p.screenshot({ path: out + '-selected.png' });
  fs.writeFileSync(
    out + '-install.json',
    JSON.stringify(
      {
        proof,
        requests,
        errors,
        scope:
          'private general build; genuine GET and nonce projection POST; no provider acquisition; not public rollout',
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ proof, requests: requests.length, errors }));
} catch (error) {
  fs.writeFileSync(
    out + '-failure.json',
    JSON.stringify(
      { error: String(error), stack: error.stack, requests, errors },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
