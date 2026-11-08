// Runs during HTML parsing, before the game module, IndexedDB, or network.
// Paints a display-only projection of the last verified result for this exact
// route identity. It never supplies game, chart, replay, or share state and
// every control it shows is inert: hydration re-verifies identity before any
// interaction becomes live. All stored content is typed data, rebuilt here
// with DOM APIs (textContent / createElementNS); no stored string is ever
// parsed as markup.
(() => {
  const root = document.getElementById('result-first-paint');
  const discard = () => root?.remove();
  try {
    if (!root || !/^\/result\/?$/.test(location.pathname)) return discard();
    // Mirrors fnv128 in src/result-first-paint-core.ts; a unit test pins the
    // two implementations to identical outputs.
    const fnv = (value) => {
      let a1 = 0x811c9dc5,
        a2 = 0x811c9dc5,
        b1 = 0x811c9dc5,
        b2 = 0x811c9dc5;
      for (let i = 0; i < value.length; i++) {
        const c = value.charCodeAt(i);
        a1 = Math.imul(a1 ^ c, 0x01000193) >>> 0;
        a2 =
          (a2 +
            ((a2 << 1) + (a2 << 4) + (a2 << 7) + (a2 << 8) + (a2 << 24))) >>>
          0;
        b1 = Math.imul(b1 ^ (c ^ 0x9e3779b9), 0x01000193) >>> 0;
        b2 =
          (b2 +
            ((b2 << 3) + (b2 << 5) + (b2 << 11) + (b2 << 16) + (b2 << 22))) >>>
          0;
      }
      return (
        a1.toString(16).padStart(8, '0') +
        a2.toString(16).padStart(8, '0') +
        b1.toString(16).padStart(8, '0') +
        b2.toString(16).padStart(8, '0')
      );
    };
    const search = new URLSearchParams(location.search);
    let key = null;
    const share = search.get('s');
    const local = search.get('local');
    if (share && /^[A-Za-z0-9_-]{20,100}$/.test(share)) key = 's:' + share;
    else if (local && local.length <= 300) key = 'local:' + local;
    else if (location.hash.length > 1) {
      const fragment = location.hash.slice(1);
      if (fragment.length <= 130000) key = 'h:' + fnv(fragment);
    }
    if (!key) return discard();
    const raw = localStorage.getItem('orvio.result-display.v2');
    if (!raw) return discard();
    const store = JSON.parse(raw);
    if (store.v !== 2 || !store.entries || typeof store.entries !== 'object')
      return discard();
    const p = store.entries[key];
    if (!p) return discard();
    // Fragment-keyed entries bind identity by exact string equality: the
    // hash is only a lookup, a collision can never paint a wrong result.
    if (key.startsWith('h:')) {
      // Exact identity: the entry stores the full original fragment
      // serializations (arrival and canonical, which differ because the app
      // re-encodes and re-orders params). No hash comparison decides what
      // paints, so no collision can paint a different result.
      const fragment = location.hash.slice(1);
      if (
        !Array.isArray(p.fragments) ||
        !p.fragments.some(
          (f) => typeof f === 'string' && f.length <= 130000 && f === fragment,
        )
      )
        return discard();
    }
    // Locale is part of identity: a projection captured in another language
    // would flash stale labels. Settings are display preferences, safe to
    // read here; if they cannot be read, the stored locale must match the
    // document's static lang instead.
    let language = '';
    try {
      const settings = JSON.parse(
        localStorage.getItem('orvio.settings.v1') || 'null',
      );
      if (settings && typeof settings.language === 'string')
        language = settings.language;
    } catch {
      language = '';
    }
    if (!language) language = document.documentElement.lang || '';
    if (
      typeof p.locale !== 'string' ||
      (language && p.locale && p.locale !== language)
    )
      return discard();
    const text = (value, max = 600) =>
      typeof value === 'string' && value.length <= max ? value : '';
    if (
      !text(p.title) ||
      !text(p.scoreText, 40) ||
      !Number.isSafeInteger(p.combo) ||
      p.combo < 0 ||
      typeof p.rateText !== 'string' ||
      !/^\d{1,3}\.\d{2}%$/.test(p.rateText)
    )
      return discard();
    if (
      p.expiresAt !== undefined &&
      (!Number.isFinite(p.expiresAt) || p.expiresAt <= Date.now())
    )
      return discard();
    const judgments =
      Array.isArray(p.judgments) &&
      p.judgments.length === 12 &&
      p.judgments.every((v) => Number.isSafeInteger(v) && v >= 0 && v <= 100000)
        ? p.judgments
        : null;
    const image = (value) => {
      if (typeof value !== 'string') return '';
      try {
        const url = new URL(value, location.origin);
        if (url.search || url.hash) return '';
        return (url.origin === location.origin &&
          /^\/wallpapers\/[a-z0-9-]+\.png$/.test(url.pathname)) ||
          (url.origin === 'https://i.ytimg.com' &&
            /^\/vi\/[A-Za-z0-9_-]{11}\/(mqdefault|maxresdefault)\.jpg$/.test(
              url.pathname,
            ))
          ? url.href
          : '';
      } catch {
        return '';
      }
    };
    const set = (selector, value, max) => {
      const node = root.querySelector(selector);
      if (node) node.textContent = text(value, max);
    };
    set('#rp-song', p.title);
    set('#rp-metadata', p.metadata, 900);
    set('#rp-badge', p.badge, 200);
    set('#rp-rank', /^[SABC]?$/.test(p.rank) ? p.rank : '', 4);
    set('#rp-score', p.scoreText, 40);
    set('.rp-score-caption', p.scoreCaption, 100);
    set('#rp-rate', p.rateText, 16);
    set('#rp-combo', String(p.combo));
    set(
      '#rp-break',
      judgments ? String(judgments[11]) : text(p.breakText, 16),
      16,
    );
    const statsLabels = root.querySelectorAll('.result-stats > div > span');
    if (Array.isArray(p.statsLabels) && p.statsLabels.length === 3)
      p.statsLabels.forEach((value, i) => {
        if (statsLabels[i]) statsLabels[i].textContent = text(value, 100);
      });
    set('#rp-back', p.backLabel, 100);
    set('#rp-retry', p.retryLabel, 100);
    const retryNode = root.querySelector('#rp-retry');
    if (retryNode) retryNode.disabled = p.retryDisabled === true;
    // The share label goes into the dedicated span slot when the component
    // provides one, otherwise onto the button itself (its icon is static
    // markup in the component or absent - never stored data).
    const shareLabelNode =
      root.querySelector('[data-rp-share-label]') ??
      root.querySelector('#rp-share-result');
    if (shareLabelNode)
      shareLabelNode.textContent = text(p.shareLabel, 100);
    let noteNode = root.querySelector('[data-rp-mobile-note]');
    if (!noteNode) {
      noteNode = document.createElement('p');
      noteNode.className = 'mobile-playback-note';
      noteNode.setAttribute('data-rp-mobile-note', '');
      const actions = root.querySelector('.result-actions');
      if (actions) actions.before(noteNode);
    }
    if (noteNode) noteNode.textContent = text(p.note, 300);
    // Option badges: typed data only, rebuilt with createElementNS. Anything
    // outside the whitelist discards the whole projection.
    const KINDS = ['keys', 'difficulty', 'speed', 'shuffle', 'fader'];
    const PATH_CHARS = /^[-0-9A-Za-z .,:]+$/;
    const badgesOk =
      Array.isArray(p.badges) &&
      p.badges.every(
        (b) =>
          b &&
          KINDS.includes(b.kind) &&
          typeof b.value === 'string' &&
          b.value.length <= 40 &&
          text(b.label, 120) !== '' &&
          b.icon &&
          (b.icon.viewBox === 32 || b.icon.viewBox === 24) &&
          Array.isArray(b.icon.elements) &&
          b.icon.elements.length <= 12 &&
          b.icon.elements.every(
            (el) =>
              el &&
              ((el.type === 'path' &&
                typeof el.d === 'string' &&
                el.d.length <= 400 &&
                PATH_CHARS.test(el.d)) ||
                (el.type === 'circle' &&
                  Number.isFinite(el.cx) &&
                  Number.isFinite(el.cy) &&
                  Number.isFinite(el.r) &&
                  el.cx >= 0 &&
                  el.cx <= 64 &&
                  el.cy >= 0 &&
                  el.cy <= 64 &&
                  el.r > 0 &&
                  el.r <= 32)) &&
              (el.opacity === undefined ||
                (Number.isFinite(el.opacity) &&
                  el.opacity >= 0 &&
                  el.opacity <= 1)) &&
              (el.dash === undefined ||
                (typeof el.dash === 'string' &&
                  el.dash.length <= 24 &&
                  PATH_CHARS.test(el.dash))) &&
              (el.strokeWidth === undefined ||
                (Number.isFinite(el.strokeWidth) &&
                  el.strokeWidth > 0 &&
                  el.strokeWidth <= 8)) &&
              (el.fill === undefined || el.fill === true),
          ),
      );
    if (!badgesOk) return discard();
    const SVGNS = 'http://www.w3.org/2000/svg';
    const options = root.querySelector('#rp-options');
    if (options && p.badges.length) {
      options.textContent = '';
      for (const b of p.badges) {
        const span = document.createElement('span');
        span.className = 'result-option result-option-' + b.kind;
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', text(b.label, 120));
        span.title = text(b.label, 120);
        const svgEl = document.createElementNS(SVGNS, 'svg');
        svgEl.setAttribute(
          'viewBox',
          '0 0 ' + b.icon.viewBox + ' ' + b.icon.viewBox,
        );
        svgEl.setAttribute('fill', 'none');
        svgEl.setAttribute('stroke', 'currentColor');
        svgEl.setAttribute('stroke-width', String(b.icon.strokeWidth || 1.7));
        svgEl.setAttribute('stroke-linecap', 'round');
        svgEl.setAttribute('stroke-linejoin', 'round');
        svgEl.setAttribute('aria-hidden', 'true');
        for (const el of b.icon.elements) {
          const node = document.createElementNS(
            SVGNS,
            el.type === 'circle' ? 'circle' : 'path',
          );
          if (el.type === 'circle') {
            node.setAttribute('cx', String(el.cx));
            node.setAttribute('cy', String(el.cy));
            node.setAttribute('r', String(el.r));
          } else node.setAttribute('d', el.d);
          if (el.fill) node.setAttribute('fill', 'currentColor');
          if (el.opacity !== undefined)
            node.setAttribute('opacity', String(el.opacity));
          if (el.dash) node.setAttribute('stroke-dasharray', el.dash);
          if (el.strokeWidth !== undefined)
            node.setAttribute('stroke-width', String(el.strokeWidth));
          svgEl.append(node);
        }
        const value = document.createElement('b');
        value.setAttribute('aria-hidden', 'true');
        value.textContent = text(b.value, 40);
        span.append(svgEl, value);
        options.append(span);
      }
    }
    // FEVER summary: text + class-hidden state, same mechanism as the live
    // dialog (syncResultFever toggles the 'hidden' class).
    let fever = root.querySelector('#rp-fever');
    if (!fever) {
      fever = document.createElement('p');
      fever.id = 'rp-fever';
      fever.className = 'hint hidden';
      const list0 = root.querySelector('#rp-judgment-list');
      if (list0) list0.before(fever);
    }
    if (fever && p.fever && typeof p.fever === 'object') {
      if (p.fever.hidden !== true && text(p.fever.text, 120)) {
        fever.textContent = text(p.fever.text, 120);
        fever.classList.remove('hidden');
      } else fever.classList.add('hidden');
    }
    // Watch replay: the live control's visibility is its 'hidden' CLASS
    // (syncReplayButton), so the projection mirrors exactly that; a result
    // without a replay never shows the button.
    const watch = root.querySelector('#rp-watch-replay');
    if (watch && p.watchReplay && typeof p.watchReplay === 'object') {
      if (p.watchReplay.hidden !== true && text(p.watchReplay.label, 100)) {
        watch.textContent = text(p.watchReplay.label, 100);
        watch.classList.remove('hidden');
      } else watch.classList.add('hidden');
    }
    const preview = root.querySelector('#rp-preview');
    if (preview && p.preview && typeof p.preview === 'object') {
      if (p.preview.hidden === true) preview.classList.add('hidden');
      else {
        preview.classList.remove('hidden');
        preview.textContent = text(p.preview.label, 200);
      }
    }
    if (text(p.systemLabel, 100)) set('.rp-system-right', p.systemLabel, 100);
    const art = image(p.art);
    const artNode = root.querySelector('#rp-art');
    if (art && artNode) {
      artNode.src = art;
      artNode.referrerPolicy = 'no-referrer';
    } else artNode?.remove();
    const list = root.querySelector('#rp-judgment-list');
    const grades = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0];
    grades.forEach((v, i) => {
      const row = document.createElement('div');
      row.setAttribute('data-grade', String(v));
      row.style.setProperty(
        '--grade-color',
        v === 100
          ? '#fff4a8'
          : v === 0
            ? '#ff384f'
            : `hsl(${8 + v * 1.7} 95% ${58 + v * 0.12}%)`,
      );
      const name = document.createElement('span');
      name.textContent = v ? 'MAX ' + v + '%' : 'BREAK';
      const count = document.createElement('b');
      count.textContent = judgments ? String(judgments[i]) : '--';
      row.append(name, count);
      list.append(row);
    });
    // The pending overlay stays (it hides #app) but its spinner is replaced
    // by this projection; hydration removes both when the verified result
    // takes over.
    const entry = document.getElementById('result-entry');
    if (entry) entry.style.display = 'none';
    root.dataset.paintedAt = String(Math.round(performance.now()));
    window.__resultFirstPaint = { key, fp: text(p.fp, 400) };
    root.hidden = false;
  } catch {
    discard();
  }
})();
