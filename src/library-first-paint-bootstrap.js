// Runs during HTML parsing, before the game module, IndexedDB, or network.
// This projection is text/image-only. It never supplies game or chart state.
(() => {
  const root = document.getElementById('library-first-paint');
  const discard = () => root?.remove();
  try {
    if (
      !root ||
      !/^\/select\/?$/.test(location.pathname) ||
      location.hash ||
      ['s', 'local'].some((key) =>
        new URLSearchParams(location.search).has(key),
      )
    )
      return discard();
    const raw = localStorage.getItem('orvio.library-display.v1');
    if (!raw || raw.length > 150000) return discard();
    const cache = JSON.parse(raw);
    if (
      cache.v !== 1 ||
      !Array.isArray(cache.songs) ||
      !cache.songs.length ||
      cache.songs.length > 500
    )
      return discard();
    const hidden = new Set(
      JSON.parse(localStorage.getItem('orvio.library-hidden.v1') || '[]'),
    );
    const text = (value, max = 400) =>
      typeof value === 'string' && value.length <= max ? value : '';
    const songs = cache.songs.filter(
      (song) =>
        song &&
        typeof song.id === 'string' &&
        /^[a-zA-Z0-9_-]{1,180}$/.test(song.id) &&
        !hidden.has(song.id) &&
        !hidden.has('yt:' + song.id.match(/^yt-([A-Za-z0-9_-]{11})-/)?.[1]),
    );
    if (!songs.length) return discard();
    const requested = new URLSearchParams(location.search).get('song');
    const selected =
      songs.find((song) => song.id === requested) ||
      songs.find((song) => song.id === cache.selected) ||
      songs[0];
    const image = (value) => {
      if (typeof value !== 'string') return '/wallpapers/first-light.png';
      const url = new URL(value, location.origin);
      if (url.search || url.hash) return '/wallpapers/first-light.png';
      return (url.origin === location.origin &&
        /^\/wallpapers\/[a-z0-9-]+\.png$/.test(url.pathname)) ||
        (url.origin === 'https://i.ytimg.com' &&
          /^\/vi\/[A-Za-z0-9_-]{11}\/(mqdefault|maxresdefault)\.jpg$/.test(
            url.pathname,
          ))
        ? url.href
        : '/wallpapers/first-light.png';
    };
    const set = (selector, value) =>
      (root.querySelector(selector).textContent = text(value));
    const tree = (value, depth = 0) => {
      if (typeof value === 'string')
        return document.createTextNode(text(value));
      if (
        !value ||
        depth > 12 ||
        ![
          'span',
          'small',
          'strong',
          'button',
          'em',
          'kbd',
          'b',
          'i',
          'a',
          'div',
          'p',
          'nav',
          'section',
        ].includes(value.tag)
      )
        return document.createTextNode('');
      const node = document.createElement(value.tag);
      if (value.actionLabel === true)
        node.setAttribute('data-display-label', '');
      if (
        typeof value.className === 'string' &&
        /^[-a-zA-Z0-9_ ]{0,200}$/.test(value.className)
      )
        node.className = value.className;
      if (
        [
          'difficulty',
          'lanes',
          'start',
          'preview-status',
          'fullscreen',
        ].includes(value.id)
      )
        node.id = 'cached-' + value.id;
      if (Array.isArray(value.children))
        for (const child of value.children.slice(0, 100))
          node.append(tree(child, depth + 1));
      return node;
    };
    for (const [selector, target] of [
      ['header nav', '[data-cached-nav]'],
      ['.preview-status', '[data-cached-preview]'],
      ['.mobile-note', '[data-cached-mobile]'],
      ['.selection', '[data-cached-selection]'],
      ['.start-row', '[data-cached-start]'],
      ['.footer-strip', '[data-cached-footer]'],
    ]) {
      if (cache.fragments?.[selector])
        root.querySelector(target).replaceWith(tree(cache.fragments[selector]));
    }
    set('[data-cached-title]', selected.title);
    set('[data-cached-subtitle]', selected.subtitle);
    set('[data-cached-genre]', text(selected.meta).split('·')[0].trim());
    set(
      '[data-cached-bpm]',
      text(selected.meta).split('·').slice(1).join('·').trim(),
    );
    set('[data-cached-label]', cache.label);
    root.querySelector('.selected-art').style.backgroundImage =
      `url("${image(selected.art)}"), url("/wallpapers/first-light.png")`;
    const container = root.querySelector('.cached-songs');
    for (const song of songs) {
      const row = document.createElement('div');
      row.className =
        'song-card' + (song.id === selected.id ? ' selected' : '');
      if (/^#[a-fA-F0-9]{6}$/.test(song.color))
        row.style.setProperty('--accent', song.color);
      const cover = document.createElement('span');
      cover.className =
        typeof song.coverClass === 'string' &&
        /^cover(?: cover-\d+)?$/.test(song.coverClass)
          ? song.coverClass
          : 'cover';
      const art = document.createElement('img');
      art.className = 'youtube-cover';
      art.alt = '';
      art.referrerPolicy = 'no-referrer';
      art.src = image(song.art);
      if (song.external) cover.append(art);
      else {
        const orb = document.createElement('span');
        orb.className = 'orb';
        cover.append(orb);
        const number = document.createElement('span');
        number.className = 'cover-number';
        const index = song.coverClass?.match(/cover-(\d+)/)?.[1];
        number.textContent =
          index === undefined ? '' : String(Number(index) + 1).padStart(2, '0');
        cover.append(number);
      }
      const copy = document.createElement('span');
      copy.className = 'song-copy';
      for (const [tag, value, className] of [
        ['small', song.meta, ''],
        ['strong', song.title, ''],
        ['span', song.subtitle, ''],
        ['span', song.notes, 'song-note-count'],
      ]) {
        const node = document.createElement(tag);
        node.textContent = text(value);
        node.className = className;
        copy.append(node);
      }
      const time = document.createElement('span');
      time.className = 'song-time';
      const level = document.createElement('em');
      level.className = 'song-level';
      level.textContent = text(song.level, 50);
      const arrow = document.createElement('b');
      arrow.textContent = '↗';
      time.append(level, document.createTextNode(text(song.time, 100)), arrow);
      row.append(cover, copy, time);
      container.append(row);
    }
    root.hidden = false;
    // Match the saved selection viewport without making the projection actionable.
    const selection = JSON.parse(
      localStorage.getItem('orvio.library-selection.v1') || 'null',
    );
    if (
      selection &&
      Number.isFinite(selection.scroll) &&
      selection.scroll >= 0 &&
      Number.isFinite(selection.pageScroll) &&
      selection.pageScroll >= 0
    ) {
      container.scrollTop = selection.scroll;
      root.scrollTop = selection.pageScroll;
    }
  } catch {
    discard();
  }
})();
