import { test, expect } from '@playwright/test';
// Acquisition responses below are fixtures; never contact remote providers.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
      ? route.continue()
      : route.abort('blockedbyclient');
  });
});
test('checking to downloading preserves keyboard context row identity', async ({
  page,
}) => {
  await page.route('**/order-fixture', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
  await page.goto('/order-fixture');
  const fixture = await page.evaluate(async () => {
    const { chartSetHash } = await import(
      /* @vite-ignore */ String('/src/external-source.ts')
    );
    const { FAMILY_CHART_KEYS, difficultyForChart } = await import(
      /* @vite-ignore */ String('/src/chart-difficulty.ts')
    );
    const bytes = new Uint8Array(192044),
      v = new DataView(bytes.buffer);
    for (const [o, w] of [
      [0, 'RIFF'],
      [8, 'WAVE'],
      [12, 'fmt '],
      [36, 'data'],
    ] as const)
      for (let i = 0; i < 4; i++) v.setUint8(o + i, w.charCodeAt(i));
    v.setUint32(4, bytes.length - 8, true);
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 2, true);
    v.setUint32(24, 48000, true);
    v.setUint32(28, 192000, true);
    v.setUint16(32, 4, true);
    v.setUint16(34, 16, true);
    v.setUint32(40, 192000, true);
    const hash = async (b: BufferSource) =>
      [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    const sha = await hash(bytes),
      notes = [{ id: 0, time: 0.5, lane: 0 }],
      noteSha = await hash(new TextEncoder().encode(JSON.stringify(notes)));
    const records = [];
    for (const id of ['AAAAAAAAAAA', 'BBBBBBBBBBB']) {
      const record: any = {
        version: 1,
        videoId: id,
        audioSha256: sha,
        frames: 48000,
        sampleRate: 48000,
        estimatedBpm: 120,
        pipelineVersion: 'fixture',
        analyzerVersion: 'fixture',
        config: '{}',
        charts: Object.fromEntries(
          FAMILY_CHART_KEYS.map((k: any) => [k, { notes, sha256: noteSha }]),
        ),
        chartMetadata: Object.fromEntries(
          FAMILY_CHART_KEYS.map((k: any) => [
            k,
            difficultyForChart(notes, 1, k),
          ]),
        ),
      };
      record.chartSetSha256 = await chartSetHash(record);
      const raw = JSON.stringify(record);
      records.push({
        id,
        raw,
        rawSha: await hash(new TextEncoder().encode(raw)),
        chartSet: record.chartSetSha256,
      });
    }
    return { records, bytes: Array.from(bytes), sha };
  });
  const audio = Buffer.from(fixture.bytes);
  let releaseRecord!: () => void;
  const recordGate = new Promise<void>((resolve) => {
    releaseRecord = resolve;
  });
  await page.route('https://i.ytimg.com/**', (r) => r.fulfill({ status: 404 }));
  const posts: string[] = [];
  let failCanonical = false;
  let releaseAudio!: () => void;
  let audioGate: Promise<void> | undefined = new Promise<void>((resolve) => {
    releaseAudio = resolve;
  });
  await page.route(
    'https://orvio-share.pn-26f.workers.dev/**',
    async (route) => {
      const url = route.request().url();
      if (route.request().method() !== 'GET') {
        posts.push(url);
        throw Error('No POST permitted');
      }
      if (
        failCanonical &&
        url.includes('AAAAAAAAAAA') &&
        !url.endsWith('/audio')
      )
        return route.fulfill({
          status: 503,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: '{}',
        });
      const record = fixture.records.find((r) => url.includes(r.id));
      if (!record) return route.fulfill({ status: 404, body: '{}' });
      if (url.endsWith('/audio')) {
        if (record.id === 'BBBBBBBBBBB' && audioGate) await audioGate;
        return route.fulfill({
          body: audio,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': '*',
            'Content-Type': 'audio/wav',
            'Content-Length': String(audio.length),
            'X-Content-SHA256': fixture.sha,
            'X-Canonical-Audio-SHA256': fixture.sha,
            'X-Source-Video-Id': record.id,
            'X-Audio-Contract': 'audio/1',
          },
        });
      }
      if (record.id === 'BBBBBBBBBBB' && !url.includes('youtube-metadata'))
        await recordGate;
      return route.fulfill({
        body: record.raw,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': '*',
          'Content-Type': 'application/json',
          'X-SourceRecord-SHA256': record.rawSha,
          'X-ChartSet-SHA256': record.chartSet,
          'X-Canonical-Audio-SHA256': fixture.sha,
          'X-Canonical-Audio-Cached': 'true',
        },
      });
    },
  );
  // Exercise the current direct acquisition adapter with a gated streaming
  // response. Only transport is mocked; normal Add UI owns all row updates.
  await page.addInitScript(({ bytes }) => {
    const original = window.fetch.bind(window);
    let release!: () => void;
    const headersReady = new Promise<void>(resolve => { release = resolve; });
    (window as any).__releaseFixtureHeaders = release;
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.origin !== 'https://provider.fixture.invalid') return original(input, init);
      if (!url.pathname.endsWith('/audio'))
        return Response.json({ title: 'Fixture song', author: 'Fixture' });
      await headersReady;
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(bytes.slice(0, 4096)));
          (window as any).__releaseFixtureAudio = () => {
            controller.enqueue(new Uint8Array(bytes.slice(4096)));
            controller.close();
          };
        },
      }), { headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(bytes.length) } });
    };
  }, { bytes: fixture.bytes });
  await page.goto('/select/');
  const submit = async (id: string) => {
    await page.click('#add-youtube');
    await page.fill('#youtube-url', 'https://youtu.be/' + id);
    await page.click('#youtube-submit');
  };
  await submit('BBBBBBBBBBB');
  const loading = page.locator('[data-import-video="BBBBBBBBBBB"]');
  await expect(loading).toHaveAttribute('data-import-stage', 'checking');
  await loading.focus();
  await loading.evaluate((el) => {
    (window as any).__focusedPending = el;
    (window as any).__pendingCover = el.querySelector('.cover');
    (window as any).__pendingAnimations = el.getAnimations({ subtree: true });
    (window as any).__pendingAnimationTimes = el
      .getAnimations({ subtree: true })
      .map((a) => a.currentTime);
    (window as any).__pendingDetached = false;
    new MutationObserver((records) => {
      for (const record of records)
        for (const removed of record.removedNodes)
          if (removed === el || removed.contains(el))
            (window as any).__pendingDetached = true;
    }).observe(el.parentElement!, { childList: true, subtree: true });
  });
  expect(await loading.evaluate((el) => document.activeElement === el)).toBe(
    true,
  );
  releaseRecord();
  await page.evaluate(() => (window as any).__releaseFixtureHeaders());
  await expect(loading).toHaveAttribute('data-import-stage', 'downloading');
  const transition = await loading.evaluate((el) => ({
    sameNode: el === (window as any).__focusedPending,
    oldConnected: (window as any).__focusedPending.isConnected,
    focused: document.activeElement === el,
    activeTag: document.activeElement?.tagName,
    sameCover: el.querySelector('.cover') === (window as any).__pendingCover,
    detached: (window as any).__pendingDetached,
    continuous:
      (window as any).__pendingAnimations.length > 0 &&
      (window as any).__pendingAnimations.every(
        (a: Animation, i: number) =>
          el.getAnimations({ subtree: true }).includes(a) &&
          Number(a.currentTime) >=
            Number((window as any).__pendingAnimationTimes[i]),
      ),
  }));
  await page.keyboard.press('Shift+F10');
  const menuVisible = await page.locator('.library-context-menu').isVisible();
  console.log(
    'FOCUS_COUNTEREXAMPLE',
    JSON.stringify({ transition, menuVisible }),
  );
  expect(transition.sameNode).toBe(true);
  expect(transition.oldConnected).toBe(true);
  expect(transition.sameCover).toBe(true);
  expect(transition.detached).toBe(false);
  expect(transition.continuous).toBe(true);
  expect(transition.focused).toBe(true);
  expect(menuVisible).toBe(true);
  expect(posts).toEqual([]);
  await page.screenshot({
    path: test.info().outputPath('context-focus-preserved.png'),
  });
  releaseAudio();
  await page.evaluate(() => (window as any).__releaseFixtureAudio());
});

for (const reduced of [false, true]) {
  test(`two streamed imports: completion, error/retry, reduced=${reduced}`, async ({ page }) => {
    await installTwoImportFixture(page);
    await page.goto('/select/');
    if (reduced) await page.evaluate(() => document.body.classList.add('reduced-motion'));
    for (const id of ['AAAAAAAAAAA', 'BBBBBBBBBBB']) {
      await page.click('#add-youtube');
      await page.fill('#youtube-url', 'https://youtu.be/' + id);
      await page.click('#youtube-submit');
    }
    const b = page.locator('[data-import-video="BBBBBBBBBBB"]');
    await expect(b).toHaveAttribute('data-import-stage', 'downloading');
    await b.focus();
    await rememberPending(b);
    const before = await page.locator('#songs > *').evaluateAll(rows => rows.map(row => (row as HTMLElement).dataset.libraryFocusKey));
    await page.evaluate(() => (window as any).__streams.AAAAAAAAAAA.finish());
    await expect(page.locator('[data-import-video="AAAAAAAAAAA"]')).toHaveCount(0, { timeout: 20000 });
    await expect(page.locator('#songs [data-library-focus-key="yt:AAAAAAAAAAA"][data-song]')).toHaveCount(1);
    expect(await pendingContinuity(b, reduced)).toEqual({ same: true, cover: true, connected: true, detached: false, focus: true, animation: true });
    expect(await page.locator('#songs > *').evaluateAll(rows => rows.map(row => (row as HTMLElement).dataset.libraryFocusKey))).toEqual(before);
    await page.evaluate(() => (window as any).__streams.BBBBBBBBBBB.fail());
    await expect(b).toHaveAttribute('data-state', 'error');
    await expect(b).not.toHaveClass(/import-shine/);
    expect(await b.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
    await page.screenshot({ path: test.info().outputPath('B-error.png') });
    await b.locator('[data-library-focus-action="retry"]').click();
    await expect(page.locator('#youtube-url')).toHaveValue('https://www.youtube.com/watch?v=BBBBBBBBBBB');
    await page.click('#youtube-submit');
    await expect(b).toHaveAttribute('data-state', 'loading');
    await expect(b).toHaveAttribute('data-import-stage', 'downloading');
    await expect(b).toHaveClass(/import-shine/);
    await expect(b.locator('[role="status"]')).not.toHaveText('');
    expect(await b.evaluate(el => el === (window as any).__kept.row && el.querySelector('.cover') === (window as any).__kept.cover)).toBe(true);
    expect(await b.evaluate(el => el.getAnimations({ subtree: true }).length > 0)).toBe(!reduced);
    await page.screenshot({ path: test.info().outputPath('B-retry.png') });
  });
}

async function installTwoImportFixture(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const bytes = new Uint8Array(44 + 48000 * 4 * 8), v = new DataView(bytes.buffer);
    for (const [offset, word] of [[0, 'RIFF'], [8, 'WAVE'], [12, 'fmt '], [36, 'data']] as const)
      for (let i = 0; i < word.length; i++) v.setUint8(offset + i, word.charCodeAt(i));
    v.setUint32(4, bytes.length - 8, true); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, 48000, true);
    v.setUint32(28, 192000, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
    v.setUint32(40, bytes.length - 44, true);
    for (let i = 0; i < 48000 * 8; i++) {
      const sample = Math.round(Math.sin(i * 2 * Math.PI * 440 / 48000) * Math.exp(-(i % 12000) / 1800) * 24000);
      v.setInt16(44 + i * 4, sample, true); v.setInt16(46 + i * 4, sample, true);
    }
    const original = window.fetch.bind(window);
    (window as any).__streams = {};
    window.fetch = async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
      if (url.origin !== 'https://provider.fixture.invalid') return original(input, init);
      const id = url.pathname.split('/')[3];
      if (!url.pathname.endsWith('/audio')) return Response.json({ title: 'Fixture ' + id, author: 'Fixture' });
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(bytes.slice(0, 4096));
        let offset = 4096;
        (window as any).__streams[id] = {
          progress() { controller.enqueue(bytes.slice(offset, offset + 4096)); offset += 4096; },
          finish() { controller.enqueue(bytes.slice(offset)); controller.close(); },
          fail() { controller.error(new Error('fixture download failure')); },
        };
      }}), { headers: { 'Content-Type': 'audio/wav', 'Content-Length': String(bytes.length) } });
    };
  });
}

async function rememberPending(row: import('@playwright/test').Locator) {
  await row.evaluate(el => {
    const kept = (window as any).__kept = { row: el, cover: el.querySelector('.cover'), animations: el.getAnimations({ subtree: true }), detached: false };
    new MutationObserver(records => {
      for (const record of records) for (const removed of record.removedNodes)
        if (removed === el || removed.contains(el)) kept.detached = true;
    }).observe(el.parentElement!, { childList: true });
  });
}

async function pendingContinuity(row: import('@playwright/test').Locator, reduced: boolean) {
  return row.evaluate((el, reduced) => {
    const kept = (window as any).__kept, animations = el.getAnimations({ subtree: true });
    return { same: el === kept.row, cover: el.querySelector('.cover') === kept.cover, connected: el.isConnected, detached: kept.detached, focus: document.activeElement === el,
      animation: reduced ? animations.length === 0 : kept.animations.length > 0 && kept.animations.every((a: Animation) => animations.includes(a) && a.playState === 'running') };
  }, reduced);
}

test('row focus restore refuses removed/changed identity, modal or successor focus; matches exact surviving action', async ({
  page,
}) => {
  await page.goto('/select/');
  const result = await page.evaluate(async () => {
    const { captureLibraryRowFocus } = await import(
      /* @vite-ignore */ String('/src/library-row-focus.ts')
    );
    const host = document.createElement('section');
    document.body.append(host);
    const render = (key = 'yt:AAAAAAAAAAA', action = 'retry') => {
      host.innerHTML = `<div tabindex="0" data-library-focus-key="${key}"><button data-library-focus-action="${action}">Retry</button></div>`;
      return host.firstElementChild as HTMLElement;
    };
    const cases: Record<string, boolean> = {};
    let row = render();
    row.focus();
    let restore = captureLibraryRowFocus(host, true);
    render('yt:BBBBBBBBBBB');
    restore(true);
    cases.changed = document.activeElement === document.body;
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    host.replaceChildren();
    restore(true);
    cases.removed = document.activeElement === document.body;
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    const next = render();
    const other = document.createElement('button');
    document.body.append(other);
    other.focus();
    restore(true);
    cases.successor = document.activeElement === other;
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    render();
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<button>Close</button>';
    document.body.append(dialog);
    dialog.showModal();
    const focused = document.activeElement;
    restore(true);
    cases.modal = document.activeElement === focused;
    dialog.close();
    dialog.remove();
    row = render();
    const old = row.querySelector('button')!;
    old.focus();
    restore = captureLibraryRowFocus(host, true);
    const replacement = render();
    restore(true);
    cases.action =
      document.activeElement === replacement.querySelector('button');
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    render();
    restore(false);
    cases.screen = document.activeElement === document.body;
    row = render();
    row.focus();
    restore = captureLibraryRowFocus(host, true);
    render().hidden = true;
    restore(true);
    cases.hidden = document.activeElement === document.body;
    row = render();
    row.querySelector('button')!.focus();
    restore = captureLibraryRowFocus(host, true);
    render('yt:AAAAAAAAAAA', 'inspect');
    restore(true);
    cases.missingAction = document.activeElement === document.body;
    host.remove();
    other.remove();
    return cases;
  });
  expect(result).toEqual({
    changed: true,
    removed: true,
    successor: true,
    modal: true,
    action: true,
    screen: true,
    hidden: true,
    missingAction: true,
  });
});

test('fallback insertBefore actual reorder preserves pending continuity', async({page})=>{
 await installTwoImportFixture(page);await page.addInitScript(()=>Object.defineProperty(Element.prototype,'moveBefore',{configurable:true,value:undefined}));await page.goto('/select/');
 for(const id of ['AAAAAAAAAAA','BBBBBBBBBBB']){await page.click('#add-youtube');await page.fill('#youtube-url','https://youtu.be/'+id);await page.click('#youtube-submit');}
 const a=page.locator('[data-import-video="BBBBBBBBBBB"]');await expect(a).toHaveAttribute('data-import-stage','downloading');
 await a.evaluate(el=>el.parentElement!.append(el));await a.focus();await rememberPending(a);
 await page.evaluate(()=> (window as any).__streams.BBBBBBBBBBB.progress());
 await expect.poll(()=>page.locator('#songs > *').first().getAttribute('data-import-video')).toBe('BBBBBBBBBBB');
 const result=await pendingContinuity(a,false);console.log('FALLBACK_REORDER',JSON.stringify(result));await page.screenshot({path:test.info().outputPath('fallback-reorder.png')});expect(result).toEqual({same:true,cover:true,connected:true,detached:false,focus:true,animation:true});
});

test('legacy unranked error retry keeps all pending rows connected and ordered',async({page})=>{
 await installTwoImportFixture(page);
 await page.addInitScript(()=>{Object.defineProperty(Element.prototype,'moveBefore',{configurable:true,value:undefined});localStorage.removeItem('orvio.library-add-order.v1');localStorage.setItem('orvio.pending-imports.v1',JSON.stringify([{videoId:'BBBBBBBBBBB',state:'loading',stage:'checking'},{videoId:'AAAAAAAAAAA',state:'error',error:'network_error'},{videoId:'CCCCCCCCCCC',state:'loading',stage:'checking'}]));});
 await page.goto('/select/');const b=page.locator('[data-import-video="BBBBBBBBBBB"]'),a=page.locator('[data-import-video="AAAAAAAAAAA"]'),c=page.locator('[data-import-video="CCCCCCCCCCC"]');await expect(b).toHaveAttribute('data-import-stage','downloading');await expect(c).toHaveAttribute('data-import-stage','downloading');await expect(a).toHaveAttribute('data-state','error');
 await page.evaluate(()=>{(window as any).__legacyRows=[...document.querySelectorAll('#songs [data-import-video]')].map(el=>({el,cover:el.querySelector('.cover'),animations:el.getAnimations({subtree:true}),detached:false}));const tracked=(window as any).__legacyRows;new MutationObserver(records=>{for(const record of records)for(const removed of record.removedNodes)for(const item of tracked)if(removed===item.el||removed.contains(item.el))item.detached=true;}).observe(document.querySelector('#songs')!,{childList:true});});
 const before=await page.locator('#songs [data-import-video]').evaluateAll(rows=>rows.map(el=>(el as HTMLElement).dataset.importVideo));
 await a.locator('[data-library-focus-action="retry"]').click();await page.click('#youtube-submit');await expect(a).toHaveAttribute('data-state','loading');await expect(a).toHaveAttribute('data-import-stage','downloading');
 const after=await page.locator('#songs [data-import-video]').evaluateAll(rows=>rows.map(el=>(el as HTMLElement).dataset.importVideo));
 const rows=await page.evaluate(()=>(window as any).__legacyRows.map((item:any)=>({id:item.el.dataset.importVideo,connected:item.el.isConnected,sameCover:item.el.querySelector('.cover')===item.cover,detached:item.detached,continuous:item.animations.every((x:Animation)=>item.el.getAnimations({subtree:true}).includes(x))})));
 console.log('LEGACY_RETRY',JSON.stringify({before,after,rows}));await page.screenshot({path:test.info().outputPath('legacy-retry.png')});expect(after).toEqual(before);expect(rows.every((x:any)=>x.connected&&x.sameCover&&!x.detached&&x.continuous)).toBe(true);
});
