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
  const navButton = document.createElement('button');
  navButton.id = 'open-replays';
  navButton.className = 'quiet';
  navButton.type = 'button';
  navButton.onclick = () => options.onNavigate();
  const fullscreen = document.querySelector('#fullscreen');
  fullscreen?.before(navButton);

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
  const b = document.querySelector('#open-replays');
  if (b) b.textContent = text;
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

export async function showReplays() {
  const version = ++showVersion;
  const labels = getLabels();
  q('#replays-title').textContent = labels.title;
  q<HTMLButtonElement>('#replays-back').textContent = `ESC ${labels.back}`;
  const list = q('#replay-list');
  const empty = q('#replays-empty');
  list.replaceChildren();
  empty.classList.add('hidden');
  let sessions: (ListedLocalSession | BuiltinSession)[];
  try {
    const [external, builtin, extensions] = await Promise.all([
      listLocalSessions(),
      listBuiltinSessions(),
      privateSessions ? privateSessions() : Promise.resolve([]),
    ]);
    sessions = [...external, ...builtin, ...extensions];
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
    dropFirstPaint();
    try {
      localStorage.removeItem(REPLAY_DISPLAY_KEY);
    } catch {
      /* Optional paint cache. */
    }
    empty.textContent = fresh.empty;
    empty.classList.remove('hidden');
    return;
  }
  // New sessions are newest first. Legacy rows keep deterministic title/score
  // order at the end; no fabricated date and no historical archive rewrite.
  sessions.sort(
    (a, b) =>
      (recordedTime(b.playedAt) ?? 0) - (recordedTime(a.playedAt) ?? 0) ||
      (a.title ?? a.replay.song).localeCompare(b.title ?? b.replay.song) ||
      b.result.score - a.result.score,
  );
  for (const session of sessions) list.append(renderRow(session));
  dropFirstPaint();
  // A72: remember the verified list as a display-only projection for the next
  // plain reload's pre-module paint. Serialized-identical entries are never
  // rewritten; quota failure silently skips this optional cache.
  try {
    const rows = [...list.querySelectorAll('.replay-row')].map((row) => ({
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
    const json = JSON.stringify({
      v: 2,
      nav: [...document.querySelectorAll('#app > header nav button')].map(
        (node) => node.textContent ?? '',
      ),
      lang: getLanguage(),
      header: { title: fresh.title, back: fresh.back },
      rows,
    });
    if (json.length > 200000) {
      localStorage.removeItem(REPLAY_DISPLAY_KEY);
    } else if (localStorage.getItem(REPLAY_DISPLAY_KEY) !== json) {
      localStorage.setItem(REPLAY_DISPLAY_KEY, json);
    }
  } catch {
    /* Optional paint cache never blocks the verified list. */
  }
}
