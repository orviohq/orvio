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
      let url;
      try {
        url = new URL(value, location.origin);
      } catch {
        return '/wallpapers/first-light.png';
      }
      if (url.search || url.hash || url.username || url.password)
        return '/wallpapers/first-light.png';
      return (url.origin === location.origin &&
        /^\/wallpapers\/[a-z0-9-]+\.png$/.test(url.pathname)) ||
        (url.origin === 'https://i.ytimg.com' &&
          /^\/vi\/[A-Za-z0-9_-]{11}\/(mqdefault|maxresdefault)\.jpg$/.test(
            url.pathname,
          ))
        ? url.href
        : '/wallpapers/first-light.png';
    };
    // Even valid legacy CDN URLs are lookup keys, never first-paint requests.
    const localImage = (value) => {
      const url = image(value);
      return url.startsWith('https://i.ytimg.com/')
        ? '/wallpapers/first-light.png'
        : url;
    };
    const artwork = new Map();
    const queueArtwork = (song, apply) => {
      const videoId =
        typeof song.artVideoId === 'string' &&
        /^[A-Za-z0-9_-]{11}$/.test(song.artVideoId)
          ? song.artVideoId
          : image(song.art).match(
              /^https:\/\/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\//,
            )?.[1];
      if (!videoId) return;
      if (!artwork.has(videoId)) artwork.set(videoId, []);
      artwork.get(videoId).push(apply);
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
      ['.library .mobile-playback-note', '[data-cached-playback-note]'],
      ['.selection', '[data-cached-selection]'],
      ['.start-row', '[data-cached-start]'],
      ['.footer-strip', '[data-cached-footer]'],
    ]) {
      if (cache.fragments?.[selector])
        root.querySelector(target).replaceWith(tree(cache.fragments[selector]));
    }
    // Cached controls are display-only, but retain the live family palette.
    const families = ['low', 'mid', 'high', 'sc'];
    const familyLabels = ['NM', 'HD', 'MX', 'SC'];
    root.querySelectorAll('#cached-difficulty button').forEach((button, index) => {
      if (!families[index]) return;
      button.dataset.diff = families[index];
      button.textContent = familyLabels[index];
    });
    set('[data-cached-title]', selected.title);
    set('[data-cached-subtitle]', selected.subtitle);
    set('[data-cached-genre]', text(selected.meta).split('·')[0].trim());
    set(
      '[data-cached-bpm]',
      text(selected.meta).split('·').slice(1).join('·').trim(),
    );
    const legacyNote = root.querySelector('[data-cached-playback-note]');
    if (legacyNote) {
      const labels = JSON.parse(root.dataset.mobileLabels || '{}');
      const settings = JSON.parse(
        localStorage.getItem('orvio.settings.v1') || '{}',
      );
      const browser =
        (navigator.languages || [navigator.language])
          .map((value) => value.toLowerCase().split(/[-_]/)[0])
          .find((value) => value in labels) || 'en';
      const language =
        settings.languageMode === 'manual' && settings.language in labels
          ? settings.language
          : browser;
      legacyNote.textContent = labels[language] || '';
    }
    set('[data-cached-label]', cache.label);
    const add = root.querySelector('#cached-add-youtube');
    add.setAttribute('aria-label', text(cache.addLabel) || 'Add YouTube');
    add.title = text(cache.addLabel) || 'Add YouTube';
    const hero = root.querySelector('.selected-art');
    const paintHero = (url) => {
      hero.style.backgroundImage =
        `url("${url}"), url("/wallpapers/first-light.png")`;
    };
    paintHero(localImage(selected.art));
    queueArtwork(selected, paintHero);
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
      art.src = localImage(song.art);
      if (song.external) {
        cover.append(art);
        queueArtwork(song, (url) => {
          art.src = url;
        });
      } else {
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
      const metadata = document.createElement('small');
      const meta = document.createElement('span');
      meta.className = 'song-meta';
      // Accept both pre-relocation and intermediate v1 display caches.
      const embeddedTime = text(song.meta).match(/\s*·\s*(\d+:\d{2})\s*$/);
      meta.textContent = text(song.meta).replace(/\s*·\s*\d+:\d{2}\s*$/, '');
      const duration = document.createElement('span');
      duration.className = 'song-duration';
      duration.textContent = text(song.time, 100).trim() || embeddedTime?.[1] || '';
      metadata.append(meta);
      if (duration.textContent) {
        const separator = document.createElement('i');
        separator.textContent = '·';
        metadata.append(' ', separator, ' ', duration);
      }
      copy.append(metadata);
      for (const [tag, value, className] of [
        ['strong', song.title, ''],
        ['span', song.subtitle, ''],
        ['span', song.notes, 'song-note-count'],
      ]) {
        const node = document.createElement(tag);
        node.textContent = text(value);
        node.className = className;
        copy.append(node);
      }
      const level = document.createElement('em');
      level.className = 'song-level';
      level.textContent = text(song.level, 50).match(/(?:^|\s)(\d+|--)$/)?.[1] || '--';
      row.append(cover, copy, level);
      container.append(row);
    }
    root.classList.toggle(
      'mobile-playback-only',
      matchMedia('(hover: none) and (pointer: coarse)').matches,
    );
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
    if (artwork.size) {
      const urls = new Set();
      const observer = new MutationObserver(() => {
        if (root.isConnected) return;
        observer.disconnect();
        for (const url of urls) URL.revokeObjectURL(url);
        urls.clear();
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      // Keep cache name, candidate order, MIME/size limits in sync with
      // youtube-artwork.ts. This pre-parse script cannot import the game module.
      // CacheStorage reads are local: no fetch, IDB, or playback authority here.
      const cachePromise = (async () => {
        try {
          return await caches.open('orvio-youtube-art-v1');
        } catch {}
      })();
      for (const [videoId, apply] of artwork) {
        void (async () => {
          const artCache = await cachePromise;
          for (const size of ['maxresdefault', 'mqdefault', 'hqdefault']) {
            if (!root.isConnected) return;
            let objectUrl;
            try {
              const key = `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
              const response =
                (await artCache?.match(key)) ?? (await caches.match(key));
              if (
                !response?.ok ||
                !/^image\/(jpeg|png|webp)(?:;|$)/i.test(
                  response.headers.get('content-type') ?? '',
                )
              )
                continue;
              const blob = await response.blob();
              if (!root.isConnected) return;
              if (!blob.size || blob.size > 4 * 1024 * 1024) continue;
              objectUrl = URL.createObjectURL(blob);
              for (const paint of apply) paint(objectUrl);
              urls.add(objectUrl);
              return;
            } catch {
              if (objectUrl) URL.revokeObjectURL(objectUrl);
              // Cache access is optional; keep the synchronously painted fallback.
            }
          }
        })();
      }
    }
  } catch {
    discard();
  }
})();
