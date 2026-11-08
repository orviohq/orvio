// Runs during HTML parsing, before the game module, IndexedDB, or network.
// A72: paints the last verified replay list on a plain /replays/ reload.
// This projection is text/image-only display data. It never supplies session,
// chart, or game state; the verified IndexedDB list replaces it at handoff.
(() => {
  const root = document.getElementById('replay-first-paint');
  const discard = () => root?.remove();
  try {
    if (!root || !/^\/replays\/?$/.test(location.pathname)) return discard();
    if (location.hash || location.search.length > 1) return discard();
    const raw = localStorage.getItem('orvio.replay-list-display.v1');
    if (!raw || raw.length > 200000) return discard();
    const cache = JSON.parse(raw);
    const settings = JSON.parse(
      localStorage.getItem('orvio.settings.v1') || '{}',
    );
    if (
      cache?.v !== 2 ||
      cache.lang !== settings.language ||
      !Array.isArray(cache.nav) ||
      cache.nav.length !== 3 ||
      !Array.isArray(cache.rows) ||
      !cache.rows.length ||
      cache.rows.length > 1000
    )
      return discard();
    const text = (value, max = 300) =>
      typeof value === 'string' && value.length <= max ? value : '';
    const art = (value) => {
      if (typeof value !== 'string' || !value || value.length > 300) return '';
      const url = new URL(value, location.origin);
      if (url.search || url.hash) return '';
      if (
        url.origin === location.origin &&
        /^\/(wallpapers|art)\/[A-Za-z0-9_.-]+$/.test(url.pathname)
      )
        return url.pathname;
      if (
        url.origin === 'https://i.ytimg.com' &&
        /^\/vi\/[A-Za-z0-9_-]{11}\/(mqdefault|maxresdefault)\.jpg$/.test(
          url.pathname,
        )
      )
        return url.href;
      return '';
    };
    const rows = cache.rows.map((row) => ({
      title: text(row?.title),
      mode: text(row?.mode, 120),
      time: text(row?.time, 120),
      dateTime: text(row?.dateTime, 40),
      score: text(row?.score, 60),
      stats: text(row?.stats, 120),
      art: art(row?.art),
      artHidden: row?.artHidden === true,
    }));
    if (
      rows.some(
        (row) =>
          !row.title || !row.mode || !row.time || !row.score || !row.stats,
      )
    )
      return discard();
    const nav = root.querySelector('[data-cached-nav]');
    if (!nav) return discard();
    for (const label of cache.nav) {
      const button = document.createElement('button');
      button.className = 'quiet';
      button.type = 'button';
      button.tabIndex = -1;
      button.textContent = text(label, 120);
      if (!button.textContent) return discard();
      nav.append(button);
    }
    const title = text(cache.header?.title);
    const back = text(cache.header?.back, 60);
    const titleNode = root.querySelector('[data-cached-title]');
    if (titleNode) titleNode.textContent = title;
    const backNode = root.querySelector('[data-cached-back]');
    if (backNode) backNode.textContent = back ? 'ESC ' + back : '';
    const list = root.querySelector('[data-cached-rows]');
    if (!list) return discard();
    for (const row of rows) {
      const el = document.createElement('button');
      el.className = 'replay-row';
      el.type = 'button';
      el.tabIndex = -1;
      const frame = document.createElement('span');
      frame.className = 'replay-art-frame';
      const placeholder = document.createElement('span');
      placeholder.className = 'replay-art-placeholder';
      placeholder.textContent = '♪';
      placeholder.setAttribute('aria-hidden', 'true');
      frame.append(placeholder);
      if (row.art && !row.artHidden) {
        const img = document.createElement('img');
        img.className = 'replay-art';
        img.alt = '';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.src = row.art;
        img.onerror = () => {
          img.hidden = true;
        };
        frame.append(img);
      }
      const copy = document.createElement('span');
      copy.className = 'replay-copy';
      const name = document.createElement('strong');
      name.textContent = row.title;
      const mode = document.createElement('span');
      mode.className = 'replay-mode';
      mode.textContent = row.mode;
      const time = document.createElement('time');
      time.className = 'replay-time';
      time.textContent = row.time;
      if (row.dateTime && Number.isFinite(Date.parse(row.dateTime)))
        time.dateTime = row.dateTime;
      copy.append(name, mode, time);
      const score = document.createElement('span');
      score.className = 'replay-score';
      const value = document.createElement('strong');
      value.textContent = row.score;
      const stats = document.createElement('span');
      stats.textContent = row.stats;
      score.append(value, stats);
      const open = document.createElement('span');
      open.className = 'replay-open';
      open.textContent = '▶';
      open.setAttribute('aria-hidden', 'true');
      el.append(frame, copy, score, open);
      list.append(el);
    }
    root.hidden = false;
  } catch {
    discard();
  }
})();
