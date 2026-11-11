import { externalSource } from './external-catalog';
import { SONGS, duration } from './chart';
import { songArt, ART_FALLBACK } from './song-art';
import type { Language } from './i18n';
import {
  archiveLabels,
  archiveTime,
  archiveDuration,
  recordedTime,
} from './replay-presentation';
import {
  listBuiltinSessions,
  type BuiltinSession,
} from './builtin-replay-library';
// A24: dedicated local replay collection page.
// Additive module: owns its own DOM (header nav entry + #replays section),
// reads sessions through the external-local validation contract only.
import { listLocalSessions, type ListedLocalSession } from './external-local';
import {
  readReplayCount,
  writeReplayCount,
  replayMenuVisible,
} from './replay-menu-count';

export interface ReplayPageLabels {
  title: string;
  empty: string;
  readError: string;
  back: string;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  low: 'NM',
  mid: 'HD',
  high: 'MX',
  sc: 'SC',
};

// A72: display-only projection of the last verified list, painted pre-module
// on the next plain /replays/ reload. Sessions themselves stay in IndexedDB;
// this cache is skipped or discarded whenever it cannot be trusted.
const REPLAY_DISPLAY_KEY = 'orvio.replay-list-display.v1';
const dropFirstPaint = () =>
  document.getElementById('replay-first-paint')?.remove();

let getLabels: () => ReplayPageLabels = () => ({
  title: '',
  empty: '',
  readError: '',
  back: '',
});
let onOpen: (key: string) => void = () => {};
let showVersion = 0;
let getLanguage: () => Language = () => 'en';

function q<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw Error(`Missing element ${selector}`);
  return el;
}

let privateSessions: (() => Promise<any[]>) | undefined;
export function installPrivateReplayList(read: () => Promise<any[]>) {
  privateSessions = read;
}

// ORV-78: the nav entry exists only while at least one saved replay exists.
let navButton: HTMLButtonElement | undefined;
let lastNavLabel = '';

export function initReplayPage(options: {
  getLanguage: () => Language;
  getLabels: () => ReplayPageLabels;
  onOpen: (key: string) => void;
  onNavigate: () => void;
  onBack: () => void;
}) {
  getLanguage = options.getLanguage;
  getLabels = options.getLabels;
  onOpen = options.onOpen;

  // Entry relocated off the song selection page into the global header nav.
  navButton = document.createElement('button');
  navButton.id = 'open-replays';
  navButton.className = 'quiet';
  navButton.type = 'button';
  navButton.onclick = () => options.onNavigate();
  if (lastNavLabel) navButton.textContent = lastNavLabel;
  // ORV-78: insert only when the cached count says replays exist; verified
  // stores reconcile right after boot. The button is removed from the DOM
  // (never merely hidden) so the home first-paint nav projection stays true.
  if (replayMenuVisible(readReplayCount()))
    document.querySelector('#fullscreen')?.before(navButton);

  const section = document.createElement('section');
  section.id = 'replays';
  section.className = 'hidden';
  section.tabIndex = 0;
  section.setAttribute('aria-label', 'replays');
  const wrap = document.createElement('div');
  wrap.className = 'replays-wrap';
  const head = document.createElement('div');
  head.className = 'section-title';
  const heading = document.createElement('strong');
  heading.id = 'replays-title';
  head.append(heading);
  const list = document.createElement('div');
  list.id = 'replay-list';
  const empty = document.createElement('p');
  empty.id = 'replays-empty';
  empty.className = 'hidden';
  const foot = document.createElement('div');
  foot.className = 'replays-foot';
  const back = document.createElement('button');
  back.id = 'replays-back';
  back.className = 'quiet';
  back.type = 'button';
  back.onclick = () => options.onBack();
  foot.append(back);
  wrap.append(head, list, empty, foot);
  section.append(wrap);
  document.querySelector('#lobby')?.after(section);
}

export function setReplayNavLabel(text: string) {
  lastNavLabel = text;
  if (navButton) navButton.textContent = text;
}

/** ORV-78: the cached count drives menu presence; verified stores reconcile. */
export function setReplayMenuCount(n: number) {
  writeReplayCount(n);
  if (!navButton) return;
  if (replayMenuVisible(n)) {
    if (!navButton.isConnected) {
      if (lastNavLabel) navButton.textContent = lastNavLabel;
      document.querySelector('#fullscreen')?.before(navButton);
    }
  } else if (navButton.isConnected) navButton.remove();
}

function renderRow(
  session: ListedLocalSession | BuiltinSession,
): HTMLButtonElement {
  const row = document.createElement('button');
  row.className = 'replay-row';
  row.type = 'button';
  const language = getLanguage();
  const labels = archiveLabels[language];
  const art = document.createElement('img');
  art.className = 'replay-art';
  art.alt = '';
  art.loading = 'lazy';
  art.referrerPolicy = 'no-referrer';
  art.dataset.songArt = session.replay.song;
  const artwork = songArt(session.replay.song);
  art.hidden =
    !!externalSource(session.replay.song) && artwork === ART_FALLBACK;
  art.src = artwork;
  art.onerror = () => {
    art.hidden = true;
  };
  const artFrame = document.createElement('span');
  artFrame.className = 'replay-art-frame';
  const placeholder = document.createElement('span');
  placeholder.className = 'replay-art-placeholder';
  placeholder.textContent = '♪';
  placeholder.setAttribute('aria-hidden', 'true');
  artFrame.append(placeholder, art);
  const copy = document.createElement('span');
  copy.className = 'replay-copy';
  const title = document.createElement('strong');
  title.textContent = session.title ?? session.replay.song;
  const mode = document.createElement('span');
  mode.className = 'replay-mode';
  const difficulty =
    DIFFICULTY_LABEL[session.replay.difficulty] ?? session.replay.difficulty;
  const builtin =
    'kind' in session &&
    (session.kind === 'builtin' || String(session.kind) === 'extension');
  const song = SONGS.find((s) => s.id === session.replay.song);
  const length = builtin
    ? (session.durationSec ?? (song ? duration(song) : null))
    : 'source' in session
      ? session.source.frames / session.source.sampleRate
      : null;
  mode.textContent = `${session.replay.lanes} KEY · ${difficulty} · ${labels.duration} ${archiveDuration(length)}`;
  const time = document.createElement('time');
  time.className = 'replay-time';
  const playedAt = recordedTime(session.playedAt);
  if (playedAt !== null) time.dateTime = new Date(playedAt).toISOString();
  time.textContent =
    playedAt === null
      ? labels.unrecorded
      : `${labels.played} ${archiveTime(playedAt, language)}`;
  copy.append(title, mode, time);
  const score = document.createElement('span');
  score.className = 'replay-score';
  const value = document.createElement('strong');
  value.textContent = session.result.score.toLocaleString(language);
  const stats = document.createElement('span');
  stats.textContent = `${session.result.accuracy.toFixed(2)}% · ${session.result.combo}x`;
  const open = document.createElement('span');
  open.className = 'replay-open';
  open.textContent = '▶';
  open.setAttribute('aria-hidden', 'true');
  score.append(value, stats);
  row.append(artFrame, copy, score, open);
  row.onclick = () => onOpen(session.key);
  return row;
}

async function listAllSessions(): Promise<
  (ListedLocalSession | BuiltinSession)[]
> {
  const [external, builtin, extensions] = await Promise.all([
    listLocalSessions(),
    listBuiltinSessions(),
    privateSessions ? privateSessions() : Promise.resolve([]),
  ]);
  return [...external, ...builtin, ...extensions];
}

function sortSessions(sessions: (ListedLocalSession | BuiltinSession)[]) {
  // New sessions are newest first. Legacy rows keep deterministic title/score
  // order at the end; no fabricated date and no historical archive rewrite.
  sessions.sort(
    (a, b) =>
      (recordedTime(b.playedAt) ?? 0) - (recordedTime(a.playedAt) ?? 0) ||
      (a.title ?? a.replay.song).localeCompare(b.title ?? b.replay.song) ||
      b.result.score - a.result.score,
  );
  return sessions;
}

function projectDisplayCache(
  listEl: HTMLElement,
  fresh: ReplayPageLabels,
): string {
  const rows = [...listEl.querySelectorAll('.replay-row')].map((row) => ({
    title: row.querySelector('.replay-copy strong')?.textContent ?? '',
    mode: row.querySelector('.replay-mode')?.textContent ?? '',
    time: row.querySelector('.replay-time')?.textContent ?? '',
    dateTime: row.querySelector('time')?.getAttribute('datetime') ?? '',
    score: row.querySelector('.replay-score strong')?.textContent ?? '',
    stats: row.querySelector('.replay-score span')?.textContent ?? '',
    art: row.querySelector('img.replay-art')?.getAttribute('src') ?? '',
    artHidden:
      row.querySelector<HTMLImageElement>('img.replay-art')?.hidden === true,
  }));
  return JSON.stringify({
    v: 2,
    nav: [...document.querySelectorAll('#app > header nav button')].map(
      (node) => node.textContent ?? '',
    ),
    lang: getLanguage(),
    header: { title: fresh.title, back: fresh.back },
    rows,
  });
}

// A72: remember the verified list as a display-only projection for the next
// plain reload's pre-module paint. Serialized-identical entries are never
// rewritten; quota failure silently skips this optional cache.
function writeDisplayCache(json: string) {
  try {
    if (json.length > 200000) {
      localStorage.removeItem(REPLAY_DISPLAY_KEY);
    } else if (localStorage.getItem(REPLAY_DISPLAY_KEY) !== json) {
      localStorage.setItem(REPLAY_DISPLAY_KEY, json);
    }
  } catch {
    /* Optional paint cache never blocks the verified list. */
  }
}

interface CachedRow {
  title: string;
  mode: string;
  time: string;
  dateTime: string;
  score: string;
  stats: string;
  art: string;
  artHidden: boolean;
}

// ORV-78: validate the paint cache exactly like replay-first-paint-bootstrap.js
// so an in-app open paints the same rows a cold load would.
function readCachedRows(): CachedRow[] | null {
  try {
    const raw = localStorage.getItem(REPLAY_DISPLAY_KEY);
    if (!raw || raw.length > 200000) return null;
    const cache = JSON.parse(raw);
    if (
      cache?.v !== 2 ||
      cache.lang !== getLanguage() ||
      !Array.isArray(cache.nav) ||
      cache.nav.length !== 3 ||
      !Array.isArray(cache.rows) ||
      !cache.rows.length ||
      cache.rows.length > 1000
    )
      return null;
    const text = (value: unknown, max = 300) =>
      typeof value === 'string' && value.length <= max ? value : '';
    const art = (value: unknown): string => {
      if (typeof value !== 'string' || !value || value.length > 300) return '';
      let url: URL;
      try {
        url = new URL(value, location.origin);
      } catch {
        return '';
      }
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
    const rows: CachedRow[] = [];
    for (const row of cache.rows) {
      const parsed: CachedRow = {
        title: text(row?.title),
        mode: text(row?.mode, 120),
        time: text(row?.time, 120),
        dateTime: text(row?.dateTime, 40),
        score: text(row?.score, 60),
        stats: text(row?.stats, 120),
        art: art(row?.art),
        artHidden: row?.artHidden === true,
      };
      if (
        !parsed.title ||
        !parsed.mode ||
        !parsed.time ||
        !parsed.score ||
        !parsed.stats
      )
        return null;
      rows.push(parsed);
    }
    return rows;
  } catch {
    return null;
  }
}

// ORV-78: inert cached row; the verified render always replaces it.
function renderCachedRow(row: CachedRow): HTMLButtonElement {
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
  return el;
}

/** ORV-78: a completed play just saved a session; show the menu at once, then
 * let the verified stores reconcile the count and refresh the paint cache. */
export function noteReplaySessionSaved() {
  let bumped = 1;
  try {
    bumped = readReplayCount() + 1;
  } catch {
    /* Keep the fallback bump. */
  }
  setReplayMenuCount(bumped);
  void (async () => {
    try {
      const sessions = sortSessions(await listAllSessions());
      setReplayMenuCount(sessions.length);
      if (!sessions.length) {
        try {
          localStorage.removeItem(REPLAY_DISPLAY_KEY);
        } catch {
          /* Optional paint cache. */
        }
        return;
      }
      const container = document.createElement('div');
      for (const session of sessions) container.append(renderRow(session));
      writeDisplayCache(projectDisplayCache(container, getLabels()));
    } catch {
      /* Keep the bumped count; the next open reconciles. */
    }
  })();
}

/** ORV-78: deferred self-heal; failures keep the cached count. */
export async function reconcileReplayMenuCount() {
  try {
    const sessions = await listAllSessions();
    setReplayMenuCount(sessions.length);
  } catch {
    /* Keep the cached count. */
  }
}

export async function showReplays() {
  const version = ++showVersion;
  const labels = getLabels();
  q('#replays-title').textContent = labels.title;
  q<HTMLButtonElement>('#replays-back').textContent = `ESC ${labels.back}`;
  const list = q('#replay-list');
  const empty = q('#replays-empty');
  list.replaceChildren();
  empty.classList.add('hidden');
  // ORV-78: paint the last verified list instantly, like the cold-load first
  // paint; the verified stores replace it below. An invalid or absent cache
  // simply skips the pre-paint.
  const cached = readCachedRows();
  if (cached) for (const row of cached) list.append(renderCachedRow(row));
  let sessions: (ListedLocalSession | BuiltinSession)[];
  try {
    sessions = await listAllSessions();
  } catch {
    if (version !== showVersion) return;
    dropFirstPaint();
    try {
      localStorage.removeItem(REPLAY_DISPLAY_KEY);
    } catch {
      /* Optional paint cache. */
    }
    empty.textContent = getLabels().readError;
    empty.dataset.state = 'read-error';
    empty.classList.remove('hidden');
    return;
  }
  delete empty.dataset.state;
  if (version !== showVersion) return;
  const fresh = getLabels();
  q('#replays-title').textContent = fresh.title;
  q<HTMLButtonElement>('#replays-back').textContent = `ESC ${fresh.back}`;
  if (!sessions.length) {
    list.replaceChildren();
    dropFirstPaint();
    try {
      localStorage.removeItem(REPLAY_DISPLAY_KEY);
    } catch {
      /* Optional paint cache. */
    }
    setReplayMenuCount(0);
    empty.textContent = fresh.empty;
    empty.classList.remove('hidden');
    return;
  }
  sortSessions(sessions);
  // The cached pre-paint is fully replaced, never mixed with verified rows.
  list.replaceChildren();
  for (const session of sessions) list.append(renderRow(session));
  dropFirstPaint();
  setReplayMenuCount(sessions.length);
  writeDisplayCache(projectDisplayCache(list, fresh));
}
