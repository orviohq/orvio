import { savedLocalGenerated } from './local-generated-library';
import { youtubeAddIcon } from './library-actions';
import {
  rememberLibraryFirstPaint,
  finishLibraryFirstPaint,
} from './library-first-paint';
import {
  rememberResultFirstPaint,
  finishResultFirstPaint,
  resultIdentityKey,
} from './result-first-paint';
import { savedCanonical } from './canonical-library';
import { importStageLabel } from './import-progress';
import { showToast as toast } from './ui/sonner';
import { copySongLink } from './song-share-clipboard';
import { createSongLink } from './song-share';
import {
  readLibrarySelection,
  writeLibrarySelection,
  resolveLibrarySelection,
} from './library-selection';
import { readCanonicalMetadata } from './canonical-metadata-api';
import { updateLocalDisplayMetadata } from './external-local';
import { updateExternalDisplayMetadata } from './external-catalog';
import { builtinShareFragment } from './builtin-share-fragment';
import { REPLAY_SAVE_ERROR } from './replay-storage-labels';
import {
  saveBuiltinSession,
  readBuiltinSession,
} from './builtin-replay-library';
import { REPLAY_READ_ERROR } from './replay-read-error';
import { libraryContextMenu } from './library-context-menu';
import { LibraryAddOrder } from './library-add-order';
import { inspectDeviceAudio } from './device-audio-inspection';
import {
  deviceInspectionButton,
  deviceInspectionChecking,
  deviceInspectionMessage,
} from './device-audio-labels';
import { audioAtStage } from './audio-error-stage';
import {
  reconcileCanonical,
  type CanonicalLibraryRow,
} from './canonical-reconcile';
import {
  hiddenLibraryIds,
  saveHiddenLibraryIds,
  removalLabels,
} from './library-removal';
import { canonicalPendingMessage } from './canonical-library-labels';
import { importRetryLabel } from './import-labels';
import { BackgroundImports } from './background-imports';
import {
  encodeExternalShare,
  decodeExternalShare,
  type ExternalSharedReplay,
} from './external-share';
import { readSharedAudio, recoverSharedAudio } from './external-share-audio';
import { sharedAudioLabels } from './shared-audio-labels';
import './scrollbars.css';
import { replayFrameChanged } from './replay-frame';
import { difficultyForChart, difficultyText } from './chart-difficulty';
import { CURRENT_FEVER } from './fever';
import { renderFeverHud } from './fever-hud';
import { StartupAttempt } from './startup';
import { songArt, ART_FALLBACK } from './song-art';
import { AudioJobError } from './external-audio-api';
import { externalError } from './external-errors';
import {
  localAudio,
  localMetadata,
  saveLocalAudio,
  readLocalSession,
  saveLocalSession,
} from './external-local';
import { initReplayPage, setReplayNavLabel, showReplays } from './replay-page';
import { externalLabels } from './external-labels';
import { importYoutube } from './external-import';
import { pinSource, allPinnedSources } from './external-source-store';
import {
  externalSource,
  externalAudio,
  installExternalSource,
} from './external-catalog';
import { FULLSCREEN_WARNING } from './fullscreen-labels';
import { saveSharedReplay, loadSharedReplay, ShareError } from './share-api';
import { queryClient, queryKeys, queryReady } from './query-client';
import { shareLabels } from './share-labels';
import { ScoreDisplay } from './score-display';
import { REPLAY_LABELS, REPLAY_PLAYING } from './replay-labels';
import {
  encodeReplay,
  decodeReplay,
  replayMatches,
  applyReplayOp,
  replayEngine,
  type ReplayData,
  type RuntimeReplay,
  type ReplayOp,
} from './replay';
import { RESULT_LABELS } from './result-labels';
import {
  guardFullscreenEscape,
  requestGameFullscreen,
  fullscreenEscapeStatus,
} from './fullscreen-escape';
import { resultBadgeData, resultBadges } from './result-badges';
import { enhanceSelects } from './select-ui';
import './select-ui.css';
import { cachedAudio, saveAudio } from './audio-cache';
import { browserLanguage, resolvedLanguage } from './language';
import { keyLabel } from './key-label';
import { countdownText, startupCountdownTiming } from './timing';
import { optionIcon } from './option-icons';
import {
  readResult,
  resultParams,
  SHARED_SONGS,
  type SharedResult,
} from './share';
import {
  FADERS,
  transformChart,
  type Fader,
  type Shuffle,
} from './game-options';
import { formatPerf } from './perf-overlay';
import { LANGUAGES, translate, type Language, type Word } from './i18n';
import './style.css';
import './result-screen.css';
import { ResultMotion } from './result-motion';
import {
  SONGS,
  makeChart,
  duration,
  type Difficulty,
  type Lanes,
  type Note,
} from './chart';
import { Engine, type JudgmentEvent } from './engine';
import { AudioClock, renderSong, type Soundtrack } from './audio';
import { Playfield } from './renderer';
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const defaults = {
  5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
  7: ['KeyS', 'KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK', 'KeyL'],
};
interface Settings {
  language: Language;
  languageMode: 'auto' | 'manual';
  reducedMotion: boolean;
  feverAuto: boolean;
  lanes: Lanes;
  difficulty: Difficulty;
  position: 'left' | 'center' | 'right';
  speed: number;
  fader: Fader;
  shuffle: Shuffle;
  volume: number;
  keys: Record<Lanes, string[]>;
}
function getSettings(): Settings {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('orvio.settings.v1') || '{}');
  } catch {
    /* Optional local storage. */
  }
  // Discard legacy manual calibration, including previously saved values.
  const { offset: _legacyOffset, ...automatic } = saved as Record<
    string,
    unknown
  >;
  return {
    reducedMotion: false,
    lanes: 5,
    difficulty: 'low',
    position: 'left',
    speed: 1.5,
    fader: 'off',
    shuffle: 'off',
    volume: 0.7,
    keys: structuredClone(defaults),
    ...automatic,
    language: resolvedLanguage(automatic, navigator.languages),
    languageMode: automatic.languageMode === 'manual' ? 'manual' : 'auto',
    feverAuto: true,
  };
}
let settings = getSettings();
settings.speed =
  Math.round(Math.max(1, Math.min(9, Number(settings.speed) || 1.5)) * 10) / 10;
if (!(FADERS as readonly string[]).includes(settings.fader))
  settings.fader = 'off';
if (!['off', 'mirror', 'random'].includes(settings.shuffle))
  settings.shuffle = 'off';
let shuffleSeed = crypto.getRandomValues(new Uint32Array(1))[0];
if (!(settings.language in LANGUAGES)) settings.language = 'ko';
const t = (word: Word) => translate(settings.language, word);
const label = (word: Word) => `<span data-i18n="${word}">${t(word)}</span>`;
let songIndex = 0;
let screen: 'home' | 'select' | 'ready' | 'play' | 'replays' = 'select';
// A37: a direct /play/ load paints the loading overlay (not the ready
// screen's start button) and the first Enter/click gesture starts through
// the normal path; audio activation still requires that gesture.
let readyAutostart = false;
let readingRoute = false;
let engine: Engine | null = null;
let clock: AudioClock;
let field: Playfield;
let active = false;
let paused = false;
let sequence = 0;
let frame = 0;
let seenEvents = 0;
let binding = -1;
let bindingLanes: Lanes = settings.lanes;
let rendered: Soundtrack | undefined;
let preview: AudioBufferSourceNode | undefined;
let previewGain: GainNode | undefined;
let preparing = false;
let startup: StartupAttempt | undefined;
type UiResult = Omit<SharedResult, 'song'> & { song: string };
let lastResult: UiResult | undefined;
let localSessionKey: string | undefined;
const ownResults = new WeakSet<UiResult>();
let receivedShare: { fragment: string; data: ExternalSharedReplay } | undefined;
let shareRouteRequest = 0;
let navigationVersion = 0;
let sessionReplay: RuntimeReplay | undefined,
  savedReplay: RuntimeReplay | undefined,
  playReplay: RuntimeReplay | undefined;
let lastRecordedSpeed = settings.speed,
  lastRecordedFader = settings.fader;
let replayCursor = 0,
  sessionWallAt = 0,
  replayText = '';
let replayExpected = false,
  replayIssue = false,
  replayExpectedLength = 0;
let replayEncoding: Promise<void> = Promise.resolve();
let replayAudioQueue: Promise<void> = Promise.resolve();
function recordOp(op: ReplayOp) {
  if (!sessionReplay || playReplay) return;
  op[1] = Math.max(
    0,
    performance.now() - sessionWallAt,
    sessionReplay.ops.at(-1)?.[1] ?? 0,
  );
  if (sessionReplay.ops.length < 12000) sessionReplay.ops.push(op);
  else sessionReplay = undefined;
}
function recordInput(lane: number, time: number, down: boolean) {
  if (!engine) return;
  recordOp([0, 0, time, lane, down ? 1 : 0]);
  engine.input({ lane, time, down, sequence: sequence++ });
}
function syncReplayButton() {
  const b = $('#watch-replay');
  if (!b) return;
  b.textContent = '▷ ' + REPLAY_LABELS[settings.language][0];
  b.classList.toggle('hidden', !savedReplay);
  const status = $('#replay-status');
  status.textContent = replayIssue ? REPLAY_LABELS[settings.language][2] : '';
  status.classList.toggle('hidden', !replayIssue);
}
function stopReplay() {
  if (!playReplay) return;
  active = false;
  cancelAnimationFrame(frame);
  clock.stop();
  field.pressed.clear();
  playReplay = undefined;
  document.body.classList.remove('replay-view');
  $<HTMLButtonElement>('#play-options').disabled = false;
  if (lastResult) showResult(lastResult);
}

let optionsDuringPlay = false;
let originalShuffle: Shuffle = settings.shuffle;
let originalSeed = shuffleSeed;
let sessionId = '';
let latestMetrics: unknown;
const cache = new Map<string, Soundtrack>();
// A37: while a refreshed play route awaits its first gesture, the song
// renders ahead (OfflineAudioContext needs no gesture) and the artwork
// decodes, so the start that follows is warm instead of a visible wait.
const preloading = new Map<string, Promise<Soundtrack | undefined>>();
let armedWallpaperAt = 0;
// Buffer assembly (createBuffer/copyToChannel) and IndexedDB reads need no
// activated AudioContext, so the gate hydrates through a throwaway context.
let preloadContext: OfflineAudioContext | undefined;
async function preloadTrack(id: string): Promise<Soundtrack | undefined> {
  try {
    preloadContext ??= new OfflineAudioContext(1, 1, 44100);
    if (externalSource(id)) {
      const item = externalSource(id)!;
      if (item.record.manifestSha256 && !item.bytes) {
        const local = await localAudio(item.record);
        if (local) item.bytes = local.bytes;
        else return undefined;
      }
      await ensureExternalBytes(id);
      return { buffer: externalAudio(id, preloadContext), peak: 1 };
    }
    const cached = await cachedAudio(id, preloadContext);
    if (cached) return cached;
    const track = await renderSong(SONGS.find((s) => s.id === id)!);
    void saveAudio(id, track);
    return track;
  } catch {
    return undefined;
  }
}
function persist() {
  try {
    localStorage.setItem('orvio.settings.v1', JSON.stringify(settings));
  } catch {
    /* Private mode works without persistence. */
  }
}

const app = $('#app');
app.innerHTML = `
<div class="ambient"><div class="ambient-disc"></div><div class="scanlines"></div></div>
<header><a class="brand" href="/" aria-label="orvio home"><img class="brand-symbol" src="/favicon.png" alt=""><img src="/wordmark.svg" alt="orvio"></a><span class="edition">RHYTHM SYSTEM <i></i> 0.2.48</span><nav><button id="fullscreen" class="quiet">F11 ${label('fullscreen')}</button><button id="open-settings" class="quiet">F2 ${label('options')}</button></nav></header>
<section id="home-screen"><a class="home-patches" data-patch-link target="_blank" rel="noopener noreferrer" href="/patch-notes/">${label('patchNotes')}</a><button id="home-start" class="primary">${label('start')} <span>ENTER ↵</span></button></section><section id="ready-screen" class="hidden"><h1 id="ready-title"></h1><p id="ready-detail"></p><button id="ready-start" class="primary">${label('start')} <span>ENTER ↵</span></button><button id="ready-options" class="quiet">F3 ${label('gameOptions')}</button><p class="mobile-playback-note"></p><a href="/select/">${label('back')}</a></section><main id="lobby"><section class="intro"><div id="selected-art" class="selected-art cover-0"><div class="art-grid"></div><div class="art-orbit"></div><div class="art-orbit second"></div><div class="art-core"></div><span class="art-index">01</span><span class="art-mark">ORVIO / ORIGINALS</span></div><div class="selected-meta"><span id="selected-genre"></span><span id="selected-bpm"></span></div><h1 id="selected-title"></h1><p id="selected-subtitle"></p><div class="preview-status"><i></i><span id="preview-status"></span><div class="equalizer"><b></b><b></b><b></b><b></b><b></b></div></div><div class="mobile-note">${label('mobile')}</div></section>
<section class="library" aria-label="Track selection"><p class="mobile-playback-note"></p><div class="section-title"><strong>${label('select')}</strong></div><div id="songs"></div><div class="selection"><div class="segmented" id="difficulty" aria-label="Difficulty"><button data-diff="low">NM</button><button data-diff="mid">HD</button><button data-diff="high">MX</button><button data-diff="sc">SC</button></div><div class="segmented compact" id="lanes"><button data-lanes="5">5 KEY</button><button data-lanes="7">7 KEY</button></div></div><div class="start-row"><button id="open-game-options" class="quiet">F3 ${label('gameOptions')}</button><button id="start" class="primary">${label('start')} <span>ENTER ↵</span></button></div></section>
<section class="footer-strip"><a data-patch-link target="_blank" rel="noopener noreferrer" href="/patch-notes/">${label('patchNotes')}</a><span>${label('selectionHint')}</span><button id="about-button" class="quiet">F1 ${label('about')}</button></section></main>
<section id="game" class="hidden" aria-label="Rhythm game"><div class="game-top"><button id="exit" class="quiet">ESC ${label('exit')}</button><div class="song-now"><span id="replay-playing" role="status"></span><strong id="now-title"></strong><span id="now-detail"></span></div><span id="fps" hidden></span></div><div id="progress"><div></div></div><div id="arena" data-position="center"><aside class="score-block"><span class="eyebrow">${label('score')}</span><strong id="score">0000000</strong><div><b id="rate">100.00</b><span>% ${label('accuracy')}</span></div><section id="fever-hud" class="hidden" aria-live="off"></section></aside><div id="highway-wrap"><div id="highway"></div><div id="impact" aria-hidden="true"></div><div id="fever-burst" aria-hidden="true"></div><div id="judge" aria-live="off"></div><div id="combo"></div><div id="keycaps"></div><button id="play-options" class="quiet option-readout"></button><div id="countdown"></div></div><aside class="track-block"><div class="orb-mini"></div><span class="eyebrow">ORVIO ORIGINALS</span><h2 id="side-title"></h2><div id="lane-detail"></div></aside></div><div class="game-footer"></div></section>
<dialog id="pause"><div class="eyebrow">ORVIO / SESSION</div><h2>${label('pause')}</h2><button id="resume" class="primary">${label('resume')} ↵</button><button id="pause-settings" class="quiet">F2 ${label('options')}</button><button id="pause-exit" class="quiet">${label('back')}</button></dialog><dialog id="settings"><form method="dialog"><div class="dialog-title"><div><span class="eyebrow">SYSTEM / OPTIONS</span><h2>${label('options')}</h2></div><button class="close" aria-label="Close">×</button></div></form><div class="settings-tabs" role="tablist"><button data-settings-tab="general" id="settings-general-tab" role="tab" aria-controls="settings-general" aria-selected="true">${label('options')}</button><button data-settings-tab="keys" id="settings-keys-tab" role="tab" aria-controls="settings-keys" aria-selected="false" tabindex="-1">${label('bindings')}</button></div><div class="settings-grid"><section class="settings-general" id="settings-general" role="tabpanel" aria-labelledby="settings-general-tab"><label for="language">${label('language')}</label><select id="language"><option value="auto">${t('browserLanguage')}</option>${Object.entries(
  LANGUAGES,
)
  .map(([k, v]) => `<option value="${k}">${v}</option>`)
  .join(
    '',
  )}</select><label>${label('position')}</label><div class="segmented" id="position"><button data-pos="left"><span class="position-preview" aria-hidden="true"><i></i><b></b><i></i></span>${label('left')}</button><button data-pos="center"><span class="position-preview" aria-hidden="true"><i></i><b></b><i></i></span>${label('center')}</button><button data-pos="right"><span class="position-preview" aria-hidden="true"><i></i><b></b><i></i></span>${label('right')}</button></div><label for="volume">${label('volume')}</label><input id="volume" type="range" min="0" max="1" step="0.05"></section><section class="settings-keys" id="settings-keys" role="tabpanel" aria-labelledby="settings-keys-tab"><label>${label('bindings')} <span id="binding-mode"></span></label><div id="bindings"></div><p class="hint" id="bind-hint">${label('bindHint')}</p></section></div><label class="toggle"><span>${label('reduced')}</span><input id="reduced-motion" type="checkbox"></label><button id="reset" class="quiet">${label('reset')}</button><p class="local-note">TAB / SHIFT TAB / ESC</p></dialog>
<div id="song-loading" class="hidden" role="status" aria-live="polite"><img id="loading-wallpaper" alt=""><div class="loading-info"><span>ORVIO ORIGINALS</span><h1 id="loading-title"></h1><p id="loading-detail"></p><strong id="loading-status"></strong><button id="cancel-startup" class="quiet" type="button"></button></div></div><dialog id="game-options"><form method="dialog"><div class="dialog-title"><h2>${label('gameOptions')}</h2><button class="close" aria-label="Close">×</button></div></form><label for="speed">${label('speed')} <output id="speed-value"></output></label><select id="speed"></select><label for="fader">${label('fader')}</label><select id="fader"><option value="off">OFF</option><option value="in">FADE IN</option><option value="in2">FADE IN 2</option><option value="out">FADE OUT</option><option value="out2">FADE OUT 2</option><option value="blink">BLINK</option><option value="blink2">BLINK 2</option><option value="fog">FOG</option><option value="pixel">PIXEL</option><option value="pixel2">PIXEL 2</option><option value="blind">BLIND</option></select><label for="shuffle">${label('shuffle')}</label><select id="shuffle"><option value="off">OFF</option><option value="mirror">MIRROR</option><option value="random">RANDOM</option></select><p class="hint" id="option-hint">${label('optionHint')}</p><button id="options-done" class="primary">${label('close')} ↵</button></dialog><dialog id="restart-options"><h2>${label('shuffleRestart')}</h2><p>${label('shuffleRestartHint')}</p><button id="confirm-shuffle-restart" class="primary">${label('restartApply')}</button><button id="cancel-shuffle-restart" class="quiet">${label('cancelChange')}</button></dialog><dialog id="results" tabindex="-1" aria-labelledby="result-song"><div class="result-system">ORVIO <span>SESSION REPORT</span></div><div class="result-heading"><img id="result-art" alt=""><div class="result-track"><h2 id="result-song"></h2><p id="result-metadata"></p><button id="result-preview" class="quiet" aria-pressed="false"></button></div></div><p id="result-options"></p><div class="result-summary"><div class="result-score-block"><div id="result-badge"></div><div class="result-score-caption">${label('score')}</div><div class="result-score" id="result-score"></div></div><div class="result-rank-block"><span class="result-rank-caption">RANK</span><span id="result-rank"></span></div></div><div class="result-stats"><div><span>${label('accuracy')}</span><strong id="result-rate"></strong></div><div><span>${label('maxCombo')}</span><strong id="result-combo"></strong></div><div><span>BREAK</span><strong id="result-break"></strong></div></div><p id="result-fever" class="hint hidden"></p><div id="judgment-list"></div><div class="result-tools"><button id="watch-replay" class="quiet hidden"></button><button id="share-result" class="quiet"></button></div><p id="share-status" class="hint" role="status"></p><p id="replay-status" class="hint hidden" role="status"></p><p class="mobile-playback-note"></p><div class="result-actions"><button id="back" class="quiet">ESC ${label('back')}</button><button id="retry" class="primary">${label('retry')} ↵</button></div></dialog>

<dialog id="about"><form method="dialog"><div class="dialog-title"><h2>${label('aboutTitle')}</h2><button class="close" aria-label="Close">×</button></div></form><p>${label('aboutBody')}</p><a href="https://github.com/orviohq/orvio" target="_blank" rel="noreferrer">${label('code')} ↗</a></dialog>`;
app.insertAdjacentHTML(
  'beforeend',
  '<dialog id="youtube-import"><form id="youtube-form"><div class="dialog-title"><h2 id="youtube-heading"></h2><button id="youtube-cancel" type="button" class="close">×</button></div><label for="youtube-url" id="youtube-label"></label><input id="youtube-url" type="url" required autocomplete="off" placeholder="https://www.youtube.com/watch?v=…"><p id="youtube-rights" class="hint"></p><div id="youtube-progress" hidden role="status" aria-live="polite"><span class="youtube-spinner" aria-hidden="true"></span><strong id="youtube-progress-label"></strong><span id="youtube-elapsed"></span><progress aria-label="YouTube"></progress></div><p id="youtube-status" role="status" class="hint"></p><button id="youtube-submit" class="primary"></button></form></dialog>',
);
const addYoutube = document.createElement('button');
addYoutube.id = 'add-youtube';
addYoutube.className = 'quiet youtube-add-icon';
addYoutube.innerHTML = youtubeAddIcon;
const libraryActions = document.createElement('div');
libraryActions.id = 'library-actions';
$('#app .library .section-title').append(libraryActions);
libraryActions.append(addYoutube);
let sharingSong = false;
async function shareLibrarySong(id: string) {
  const item = externalSource(id);
  if (!item || sharingSong) return;
  sharingSong = true;
  try {
    await copySongLink(createSongLink(item.record, location.origin));
    toast(
      settings.language === 'ko' ? '곡 링크를 복사했어요' : 'Song link copied',
    );
  } catch {
    toast(
      settings.language === 'ko'
        ? '곡 링크를 복사할 수 없습니다. 곡 정보와 연결 또는 클립보드 권한을 확인해 주세요.'
        : 'Could not copy the song link. Check the source, connection or clipboard permission.',
    );
  } finally {
    sharingSong = false;
  }
}
const hiddenSongs = hiddenLibraryIds();
const libraryVideoKey = (id: string) => {
  const source = externalSource(id);
  return source ? 'yt:' + source.record.videoId : id;
};
const isHiddenSong = (id: string) =>
  hiddenSongs.has(id) || hiddenSongs.has(libraryVideoKey(id));
let librarySelection = readLibrarySelection(localStorage);
function rememberLibrarySelection() {
  if (!SONGS[songIndex] || isHiddenSong(SONGS[songIndex].id)) return;
  librarySelection = {
    key: libraryVideoKey(SONGS[songIndex].id),
    scroll: $('#songs').scrollTop,
    pageScroll: window.scrollY,
  };
  writeLibrarySelection(localStorage, librarySelection);
}
function restoreLibrarySelection() {
  const visible = visibleSongIndices();
  const at = resolveLibrarySelection(
    visible.map((i) => libraryVideoKey(SONGS[i].id)),
    librarySelection?.key,
  );
  if (at < 0) return;
  songIndex = visible[at];
}
let restoringLibraryScroll = false;
function restoreLibraryScroll() {
  if (!librarySelection || screen !== 'select') return;
  restoringLibraryScroll = true;
  const list = $('#songs');
  list.scrollTop = librarySelection.scroll;
  window.scrollTo(0, librarySelection.pageScroll);
  const selected = list.querySelector<HTMLElement>('.song-card.selected');
  if (selected) {
    const row = selected.getBoundingClientRect(),
      box = list.getBoundingClientRect();
    if (list.scrollHeight > list.clientHeight + 1) {
      const visibleTop = Math.max(72, box.top),
        visibleBottom = Math.min(innerHeight - 12, box.bottom);
      if (row.top < visibleTop) list.scrollTop += row.top - visibleTop;
      else if (row.bottom > visibleBottom)
        list.scrollTop += row.bottom - visibleBottom;
    }
    {
      const row = selected.getBoundingClientRect();
      const top = 72,
        bottom = innerHeight - 12;
      if (row.top < top) window.scrollBy(0, row.top - top);
      else if (row.bottom > bottom) window.scrollBy(0, row.bottom - bottom);
    }
  }
  requestAnimationFrame(() => {
    const selected = list.querySelector<HTMLElement>('.song-card.selected');
    selected?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'instant',
    });
    requestAnimationFrame(() => {
      restoringLibraryScroll = false;
    });
  });
}
$('#songs').addEventListener(
  'scroll',
  () => {
    if (screen === 'select' && !active && !preparing && !restoringLibraryScroll)
      rememberLibrarySelection();
  },
  { passive: true },
);
window.addEventListener(
  'scroll',
  () => {
    if (screen === 'select' && !active && !preparing && !restoringLibraryScroll)
      rememberLibrarySelection();
  },
  { passive: true },
);
let libraryHydrated = false;
// Verified server canonical reference + chart identity, not an audio-ready flag.
// Audio is independently loaded and hash/WAV-verified by prepare/watchReplay.
// Preferred means verified server reference + pinned chart/source identity.
// It never implies hydrated or verified audio; prepare/readSharedAudio own that gate.
const canonicalPreferred = new Map<string, string>();
const canonicalPending = new Map<string, CanonicalLibraryRow>();
const libraryAddOrder = new LibraryAddOrder(localStorage);
const visibleSongIndices = () => {
  const seen = new Set<string>();
  return SONGS.flatMap((song, i) => {
    const source = externalSource(song.id);
    if (source && canonicalPreferred.get(source.record.videoId) !== song.id)
      return [];
    const key = libraryVideoKey(song.id);
    if (isHiddenSong(song.id) || seen.has(key)) return [];
    seen.add(key);
    return [i];
  }).sort(
    (a, b) =>
      libraryAddOrder.rank(externalSource(SONGS[a].id)?.record.videoId) -
      libraryAddOrder.rank(externalSource(SONGS[b].id)?.record.videoId),
  );
};
app.insertAdjacentHTML(
  'beforeend',
  '<dialog id="remove-song-dialog" aria-labelledby="remove-song-title"><h2 id="remove-song-title"></h2><p id="remove-song-prompt"></p><strong id="remove-song-name"></strong><div class="remove-song-actions"><button id="remove-song-cancel" class="quiet"></button><button id="remove-song-confirm" class="primary"></button></div></dialog>',
);
// A24: dedicated replay collection page; entry lives in the header nav.
initReplayPage({
  getLanguage: () => settings.language,
  getLabels: () => ({
    title: externalLabels(settings.language).replay,
    empty: externalLabels(settings.language).empty,
    readError: REPLAY_READ_ERROR[settings.language],
    back: t('back'),
  }),
  onOpen: (key) => void openLocalSession(key),
  onNavigate: () => {
    if (active || preparing) return;
    rememberLibrarySelection();
    history.pushState(null, '', '/replays/');
    readRoute();
  },
  onBack: () => {
    history.pushState(null, '', '/select/');
    readRoute();
  },
});
let removingSongKey: string | undefined;
libraryContextMenu($('#songs'), (row) => {
  if (active || preparing) return null;
  const index =
    row.dataset.song === undefined ? undefined : Number(row.dataset.song);
  const song = index === undefined ? undefined : SONGS[index];
  const videoId =
    row.dataset.canonicalVideo ??
    row.dataset.importVideo ??
    row.dataset.pendingVideo ??
    (song ? externalSource(song.id)?.record.videoId : undefined);
  if (!videoId) return null;
  const title =
    song?.title ??
    canonicalPending.get(videoId)?.title ??
    backgroundImports.rows.get(videoId)?.title ??
    row.querySelector('strong')?.textContent ??
    videoId;
  return {
    label: removalLabels(settings.language).button,
    remove: () => openSongRemoval('yt:' + videoId, title),
    share:
      song && externalSource(song.id)
        ? {
            label: settings.language === 'ko' ? '곡 공유' : 'Share song',
            run: () => void shareLibrarySong(song.id),
          }
        : undefined,
  };
});
function openSongRemoval(key: string, title: string) {
  if (active || preparing) return;
  removingSongKey = key;
  const labels = removalLabels(settings.language);
  $('#remove-song-title').textContent = labels.button;
  $('#remove-song-prompt').textContent = labels.prompt;
  $('#remove-song-name').textContent = title;
  $('#remove-song-cancel').textContent = labels.cancel;
  $('#remove-song-confirm').textContent = labels.confirm;
  $<HTMLDialogElement>('#remove-song-dialog').showModal();
  $('#remove-song-cancel').focus();
}
$('#remove-song-cancel').onclick = () =>
  $<HTMLDialogElement>('#remove-song-dialog').close();
$('#remove-song-confirm').onclick = () => {
  if (!removingSongKey || active || preparing) return;
  const next = new Set(hiddenSongs);
  next.add(removingSongKey);
  try {
    saveHiddenLibraryIds(next);
  } catch {
    toast(removalLabels(settings.language).failed);
    return;
  }
  hiddenSongs.add(removingSongKey);
  $<HTMLDialogElement>('#remove-song-dialog').close();
  stopPreview();
  selectSong(visibleSongIndices()[0], false);
  history.replaceState(null, '', selectionPath());
  toast(removalLabels(settings.language).removed);
};
function restoreLibraryVideo(videoId: string) {
  const next = new Set(hiddenSongs);
  next.delete('yt:' + videoId);
  for (const song of SONGS)
    if (externalSource(song.id)?.record.videoId === videoId)
      next.delete(song.id);
  if (next.size === hiddenSongs.size) return;
  saveHiddenLibraryIds(next);
  hiddenSongs.clear();
  for (const id of next) hiddenSongs.add(id);
}
async function localVideoSessions(videoId: string) {
  const sessions = [];
  for (const song of SONGS) {
    if (externalSource(song.id)?.record.videoId !== videoId) continue;
    try {
      const session = await readLocalSession(song.id);
      if (session) sessions.push(session);
    } catch {
      /* Keep corrupt archives untouched, never rewrite them. */
    }
  }
  return sessions;
}
async function openVideoHistory(videoId: string) {
  const sessions = await localVideoSessions(videoId);
  if (sessions.length === 1) {
    await openLocalSession(sessions[0].key);
    return;
  }
  if (!sessions.length) {
    toast(externalLabels(settings.language).failed);
    return;
  }
  const dialog = document.createElement('dialog');
  const heading = document.createElement('h2');
  heading.textContent = externalLabels(settings.language).replay;
  dialog.append(heading);
  for (const session of sessions) {
    const button = document.createElement('button');
    button.className = 'quiet';
    button.style.display = 'block';
    button.style.marginBlock = '12px';
    const key =
      `${session.replay.lanes}:${session.replay.difficulty}` as keyof typeof session.source.charts;
    const level =
      session.source.chartMetadata?.[key] ??
      difficultyForChart(
        session.source.charts[key]!.notes,
        session.source.frames / session.source.sampleRate,
        key,
      );
    button.textContent = `${session.replay.lanes} KEY · ${difficultyText(level, settings.language)} · ${session.result.score.toLocaleString()}`;
    button.onclick = () => {
      dialog.close();
      void openLocalSession(session.key);
    };
    dialog.append(button);
  }
  const close = document.createElement('button');
  close.className = 'quiet';
  close.textContent = externalLabels(settings.language).cancel;
  close.onclick = () => dialog.close();
  dialog.append(close);
  dialog.onclose = () => dialog.remove();
  document.body.append(dialog);
  dialog.showModal();
}
async function openLocalSession(id: string) {
  try {
    const session = id.startsWith('builtin:')
      ? await readBuiltinSession(id)
      : await readLocalSession(id);
    localBuiltinNotes =
      session && 'kind' in session && session.kind === 'builtin'
        ? session.chart
        : undefined;
    if (!session) throw Error();
    savedReplay = session.replay;
    replayExpected = false;
    replayIssue = false;
    lastResult = session.result;
    localSessionKey = session.key;
    ownResults.add(session.result);
    showResult(session.result);
  } catch {
    toast(REPLAY_READ_ERROR[settings.language]);
  }
}
let selectionVersion = 0;
let localBuiltinNotes: Note[] | undefined;
let youtubeInputRevision = 0;
let submittedYoutubeInput:
  { videoId: string; value: string; revision: number } | undefined;
$('#youtube-url').addEventListener('input', () => {
  youtubeInputRevision++;
});
const backgroundImports = new BackgroundImports(
  () => songCards(),
  async (r) => {
    const title = r.title?.trim() || 'YouTube · ' + r.prepared.record.videoId;
    await audioAtStage('storage', () =>
      saveLocalAudio(
        r.prepared.record,
        title,
        r.jobId,
        r.prepared.bytes,
        r.author,
      ),
    );
    const item = installExternalSource(
      r.prepared.record,
      title,
      r.prepared.bytes,
      r.jobId,
      r.author,
    );
    if (!SONGS.some((s) => s.id === item.song.id)) SONGS.push(item.song);
    canonicalPreferred.set(r.prepared.record.videoId, item.song.id);
    canonicalPending.delete(r.prepared.record.videoId);
    recoverDisplayMetadata(r.prepared.record);
    if (!active && !preparing) {
      songCards();
      selectedSong();
    }
    const submitted = submittedYoutubeInput;
    const input = $<HTMLInputElement>('#youtube-url');
    if (
      submitted?.videoId === r.prepared.record.videoId &&
      submitted.revision === youtubeInputRevision &&
      input.value === submitted.value
    ) {
      input.value = '';
      submittedYoutubeInput = undefined;
    }
    toast(externalLabels(settings.language).saved);
  },
);
addYoutube.onclick = () => {
  $('#youtube-status').textContent = '';
  $('#youtube-progress').hidden = true;
  $<HTMLButtonElement>('#youtube-submit').disabled = false;
  $<HTMLDialogElement>('#youtube-import').showModal();
  $('#youtube-url').focus();
};
$('#youtube-cancel').onclick = () =>
  $<HTMLDialogElement>('#youtube-import').close();
$('#youtube-form').onsubmit = (e) => {
  e.preventDefault();
  try {
    const videoId = backgroundImports.enqueue(
      $<HTMLInputElement>('#youtube-url').value.trim(),
    );
    submittedYoutubeInput = {
      videoId,
      value: $<HTMLInputElement>('#youtube-url').value,
      revision: ++youtubeInputRevision,
    };
    restoreLibraryVideo(videoId);
    libraryAddOrder.added(videoId);
    songCards();
    $<HTMLDialogElement>('#youtube-import').close();
  } catch (error) {
    $('#youtube-status').textContent = externalError(error, settings.language);
  }
};
guardFullscreenEscape();
document.addEventListener('orvio:fullscreen-capture', () => {
  if (fullscreenEscapeStatus() !== 'locked')
    toast(FULLSCREEN_WARNING[settings.language]);
});
const scoreDisplay = new ScoreDisplay($('#score'));
const mobileInput = matchMedia('(hover: none) and (pointer: coarse)');
function mobilePlaybackOnly() {
  return mobileInput.matches;
}
function syncMobilePlayback() {
  document.body.classList.toggle('mobile-playback-only', mobilePlaybackOnly());
  for (const id of ['start', 'ready-start', 'retry']) {
    const button = document.querySelector<HTMLButtonElement>('#' + id);
    if (button) {
      button.disabled = mobilePlaybackOnly() || (id === 'start' && preparing);
      button.title = mobilePlaybackOnly() ? t('unsupported') : '';
    }
  }
  const back = document.querySelector<HTMLElement>('#back');
  const exitButton = document.querySelector<HTMLElement>('#exit');
  if (back) back.textContent = (mobilePlaybackOnly() ? '' : 'ESC ') + t('back');
  if (exitButton)
    exitButton.textContent = (mobilePlaybackOnly() ? '' : 'ESC ') + t('exit');
  for (const note of document.querySelectorAll<HTMLElement>(
    '.mobile-playback-note',
  ))
    note.textContent = t('unsupported');
}
mobileInput.addEventListener('change', syncMobilePlayback);
function localize() {
  syncMobilePlayback();
  const external = externalLabels(settings.language);
  addYoutube.setAttribute('aria-label', external.add);
  addYoutube.title = external.add;
  setReplayNavLabel(external.replay);
  $('#youtube-heading').textContent = external.add;
  $('#youtube-label').textContent = external.url;
  $('#youtube-submit').textContent = external.submit;
  $('#youtube-rights').textContent = externalError(
    new AudioJobError('too_long'),
    settings.language,
  );
  $('#youtube-cancel').setAttribute('aria-label', external.cancel);
  queueMicrotask(() => document.dispatchEvent(new Event('orvio:select-sync')));
  document.documentElement.lang = settings.language;
  const shareStatus = document.querySelector<HTMLElement>('#share-status');
  if (shareStatus) {
    const message = shareStatus.dataset.message as
      keyof ReturnType<typeof shareLabels> | undefined;
    if (message)
      shareStatus.textContent = shareLabels(settings.language)[message];
  }
  document.body.classList.toggle('reduced-motion', settings.reducedMotion);
  if (settings.reducedMotion && $<HTMLDialogElement>('#results').open)
    resultMotion.finish();
  document
    .querySelectorAll<HTMLElement>('[data-i18n]')
    .forEach((el) => (el.textContent = t(el.dataset.i18n as Word)));
  document
    .querySelectorAll<HTMLAnchorElement>('[data-patch-link]')
    .forEach((a) => (a.href = '/patch-notes/?lang=' + settings.language));
  $<HTMLSelectElement>('#language').value =
    settings.languageMode === 'manual' ? settings.language : 'auto';
  $<HTMLOptionElement>('#language option[value=auto]').textContent =
    t('browserLanguage');
  $('#share-result').setAttribute('aria-label', t('shareResult'));
  $('#share-result').title = t('shareResult');

  $('#option-hint').textContent = t(
    optionsDuringPlay ? 'liveOptionHint' : 'optionHint',
  );
  $('#ready-detail').textContent =
    `${settings.lanes} KEY / ${chartLevel(SONGS[songIndex], settings.difficulty, settings.lanes)} / ENTER`;
  if (lastResult) {
    resultOptions(lastResult);
    const counts = lastResult.judgments;
    $('#result-badge').textContent = counts
      ? lastResult.accuracy === 100
        ? t('perfectPlay')
        : counts[11] === 0
          ? t('maxCombo')
          : t('session')
      : t('session');
  }
  $<HTMLInputElement>('#reduced-motion').checked = settings.reducedMotion;
}
function selectedSong() {
  const song = SONGS[songIndex];
  document.documentElement.style.setProperty('--accent', song.color);
  $('#selected-art').className =
    'selected-art cover-' +
    songIndex +
    (externalSource(song.id) ? ' youtube-art' : '');
  $('#selected-art').style.backgroundImage =
    `url("${songArt(song.id)}"), url("${ART_FALLBACK}")`;
  $('#selected-art .art-index').textContent = '0' + (songIndex + 1);
  $('#selected-title').textContent = song.title;
  $('#selected-title').title = song.title;
  const originLabel = document.querySelector<HTMLElement>(
    '#selected-art .art-mark',
  );
  if (originLabel)
    originLabel.textContent = externalSource(song.id)
      ? 'YOUTUBE'
      : 'ORVIO / ORIGINALS';
  $('#selected-subtitle').textContent = externalSource(song.id)
    ? song.subtitle
    : t(('subtitle' + songIndex) as Word);
  $('#selected-genre').textContent = song.genre;
  $('#selected-bpm').textContent = song.bpm + ' BPM';
  if (libraryHydrated && screen === 'select') {
    rememberLibraryFirstPaint(
      visibleSongIndices().map((i) => SONGS[i].id),
      song.id,
    );
    finishLibraryFirstPaint();
  }
}
function selectSong(index: number, audition = true) {
  if (preparing || active) return;
  songIndex = (index + SONGS.length) % SONGS.length;
  if (!visibleSongIndices().includes(songIndex))
    songIndex = visibleSongIndices()[0];
  stopPreview();
  rendered = cache.get(SONGS[songIndex].id);
  songCards();
  syncSettings();
  selectedSong();
  const list = $('#songs');
  const selected = list.querySelector<HTMLElement>('.song-card.selected');
  // Keep keyboard selection visible inside the list without scrolling the
  // page or moving the artwork on touch layouts.
  if (selected && list.scrollHeight > list.clientHeight + 1) {
    const row = selected.getBoundingClientRect();
    const box = list.getBoundingClientRect();
    if (row.top < box.top) list.scrollTop += row.top - box.top;
    else if (row.bottom > box.bottom) list.scrollTop += row.bottom - box.bottom;
  }
  rememberLibrarySelection();
  if (audition) void previewSong();
}

function escapeText(text: string) {
  const span = document.createElement('span');
  span.textContent = text;
  return span.innerHTML;
}
function chartLevel(
  song: (typeof SONGS)[number],
  diff: Difficulty,
  lanes: Lanes,
) {
  const notes = makeChart(song, diff, lanes);
  return notes.length
    ? difficultyText(
        externalSource(song.id)?.record.chartMetadata?.[`${lanes}:${diff}`] ??
          difficultyForChart(notes, duration(song), `${lanes}:${diff}`),
        settings.language,
      )
    : 'SC --';
}
function songCards() {
  const listScroll = $('#songs').scrollTop;
  const visible = visibleSongIndices();
  $('#songs').innerHTML = visible
    .map((i) => {
      const s = SONGS[i];
      return `<button class="song-card ${i === songIndex ? 'selected' : ''}" data-song="${i}" style="--accent:${s.color}"><span class="cover cover-${i}">${externalSource(s.id) ? `<img class="youtube-cover" data-song-art="${s.id}" src="${songArt(s.id)}" alt="" referrerpolicy="no-referrer">` : `<span class="orb"></span><span class="cover-number">0${i + 1}</span>`}</span><span class="song-copy"><small>${s.genre} <i>·</i> ${s.bpm} BPM</small><strong>${escapeText(s.title)}</strong><span>${externalSource(s.id) ? escapeText(s.subtitle) : t(('subtitle' + i) as Word)}</span><span class="song-note-count" data-chart-song="${i}">${makeChart(s, settings.difficulty, settings.lanes).length || '--'} ${t('notes')}</span></span><span class="song-time"><em class="song-level">${chartLevel(s, settings.difficulty, settings.lanes)}</em>${Math.floor(duration(s) / 60)}:${Math.floor(
        duration(s) % 60,
      )
        .toString()
        .padStart(2, '0')} <b>↗</b></span></button>`;
    })
    .join('');
  for (const row of canonicalPending.values()) {
    if (
      backgroundImports.rows.has(row.videoId) ||
      hiddenSongs.has('yt:' + row.videoId)
    )
      continue;
    const element = document.createElement('div');
    element.className = 'song-card import-pending canonical-pending';
    element.dataset.canonicalVideo = row.videoId;
    element.dataset.state = row.state;
    element.setAttribute('role', 'group');
    element.tabIndex = 0;
    const copy = document.createElement('span');
    copy.className = 'song-copy';
    const title = document.createElement('strong');
    title.textContent = row.title;
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    status.textContent =
      row.state === 'loading'
        ? externalLabels(settings.language).preparing
        : [
            row.error ? externalError(row.error, settings.language) : '',
            canonicalPendingMessage(settings.language),
          ]
            .filter(Boolean)
            .join(' ');
    copy.append(title, status);
    const cover = document.createElement('span');
    cover.className = 'cover import-cover';
    const thumbnail = document.createElement('img');
    thumbnail.className = 'youtube-cover';
    thumbnail.alt = '';
    thumbnail.referrerPolicy = 'no-referrer';
    thumbnail.src = `https://i.ytimg.com/vi/${row.videoId}/mqdefault.jpg`;
    thumbnail.onerror = () => {
      thumbnail.onerror = null;
      thumbnail.src = ART_FALLBACK;
    };
    cover.append(thumbnail);
    const category = document.createElement('small');
    category.textContent = 'YouTube';
    copy.prepend(category);
    const actions = document.createElement('span');
    actions.className = 'import-actions';
    element.append(cover, copy, actions);
    if (row.state === 'loading') {
      element.setAttribute('aria-busy', 'true');
      const spinner = document.createElement('span');
      spinner.className = 'youtube-spinner';
      element.append(spinner);
    } else {
      const retry = document.createElement('button');
      retry.className = 'quiet';
      retry.textContent = importRetryLabel(settings.language);
      retry.onclick = () => void reconcileLibraryRow(row);
      actions.append(retry);
    }
    const inspect = document.createElement('button');
    inspect.className = 'quiet';
    inspect.textContent = deviceInspectionButton(settings.language);
    inspect.onclick = async () => {
      const dialog = document.createElement('dialog');
      dialog.className = 'device-audio-dialog';
      const title = document.createElement('h2');
      title.textContent = deviceInspectionButton(settings.language);
      const status = document.createElement('p');
      status.setAttribute('role', 'status');
      status.textContent = deviceInspectionChecking(settings.language);
      const close = document.createElement('button');
      close.className = 'quiet';
      close.textContent = t('close');
      close.onclick = () => dialog.close();
      dialog.append(title, status, close);
      dialog.onclose = () => dialog.remove();
      document.body.append(dialog);
      dialog.showModal();
      close.focus();
      const state = await inspectDeviceAudio(row.videoId);
      status.textContent = deviceInspectionMessage(state, settings.language);
      status.dataset.deviceAudio = state;
    };
    actions.append(inspect);
    const history = document.createElement('button');
    history.className = 'quiet';
    history.textContent = externalLabels(settings.language).replay;
    history.onclick = () => void openVideoHistory(row.videoId);
    actions.append(history);
    const remove = document.createElement('button');
    remove.className = 'quiet';
    remove.textContent = removalLabels(settings.language).button;
    remove.onclick = () => openSongRemoval('yt:' + row.videoId, row.title);
    actions.append(remove);
    $('#songs').append(element);
    void localVideoSessions(row.videoId)
      .then((sessions) => {
        if (!sessions.length) history.remove();
      })
      .catch(() => history.remove());
  }
  for (const pending of backgroundImports.rows.values()) {
    if (hiddenSongs.has('yt:' + pending.videoId)) continue;
    const row = document.createElement('div');
    row.className = 'song-card import-pending';
    row.tabIndex = 0;
    row.setAttribute('role', 'group');
    row.dataset.importVideo = pending.videoId;
    row.dataset.pendingVideo = pending.videoId;
    row.dataset.state = pending.state;
    // Diagnostic retention: keep the typed failure facts on the row (not user-visible).
    if (pending.failure) {
      row.dataset.importError = pending.failure.code;
      if (pending.failure.status)
        row.dataset.importErrorStatus = String(pending.failure.status);
    } else if (pending.error) {
      row.dataset.importError = pending.error;
    }
    const copy = document.createElement('span');
    copy.className = 'song-copy';
    const title = document.createElement('strong');
    title.textContent = pending.title || 'YouTube · ' + pending.videoId;
    const state = document.createElement('span');
    state.setAttribute('role', 'status');
    state.textContent =
      pending.state === 'loading'
        ? importStageLabel(pending.stage ?? 'checking', settings.language)
        : externalError(
            pending.failure ??
              new AudioJobError(pending.error ?? 'unavailable'),
            settings.language,
          );
    const category = document.createElement('small');
    category.textContent = 'YouTube';
    copy.append(category);
    copy.append(title, state);
    const cover = document.createElement('span');
    cover.className = 'cover import-cover';
    const thumbnail = document.createElement('img');
    thumbnail.className = 'youtube-cover';
    thumbnail.alt = '';
    thumbnail.referrerPolicy = 'no-referrer';
    thumbnail.src =
      pending.thumbnailUrl ??
      `https://i.ytimg.com/vi/${pending.videoId}/mqdefault.jpg`;
    thumbnail.onerror = () => {
      thumbnail.onerror = null;
      thumbnail.src = ART_FALLBACK;
    };
    cover.append(thumbnail);
    row.append(cover, copy);
    if (pending.stage) row.dataset.importStage = pending.stage;
    if (pending.state === 'loading') {
      row.setAttribute('aria-disabled', 'true');
      row.setAttribute('aria-busy', 'true');
      const spinner = document.createElement('span');
      spinner.className = 'youtube-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      row.append(spinner);
    } else {
      const retry = document.createElement('button');
      retry.className = 'quiet';
      retry.textContent = importRetryLabel(settings.language);
      retry.onclick = () => {
        addYoutube.click();
        $<HTMLInputElement>('#youtube-url').value =
          'https://www.youtube.com/watch?v=' + pending.videoId;
      };
      const dismiss = document.createElement('button');
      dismiss.className = 'quiet';
      dismiss.textContent = '×';
      dismiss.setAttribute('aria-label', t('close'));
      dismiss.onclick = () => {
        try {
          backgroundImports.dismiss(pending.videoId);
        } catch (error) {
          toast(externalError(error, settings.language));
        }
      };
      const actions = document.createElement('span');
      actions.className = 'import-actions';
      retry.classList.add('import-retry');
      dismiss.classList.add('import-dismiss');
      actions.append(retry, dismiss);
      row.append(actions);
    }
    $('#songs').append(row);
  }
  // Order DOM rows together, including loading/error transitions, without changing song IDs or selection indices.
  const rows = [...$('#songs').children];
  rows.sort((a, b) => {
    const video = (el: Element) => {
      const element = el as HTMLElement;
      return (
        element.dataset.canonicalVideo ??
        element.dataset.importVideo ??
        (element.dataset.song !== undefined
          ? externalSource(SONGS[Number(element.dataset.song)].id)?.record
              .videoId
          : undefined)
      );
    };
    return libraryAddOrder.rank(video(a)) - libraryAddOrder.rank(video(b));
  });
  $('#songs').append(...rows);
  $('#songs').scrollTop = listScroll;
  if (libraryHydrated && screen === 'select')
    rememberLibraryFirstPaint(
      visible.map((i) => SONGS[i].id),
      SONGS[songIndex].id,
    );
  document
    .querySelectorAll<HTMLImageElement>('.youtube-cover')
    .forEach((img) => {
      img.onerror = () => {
        img.onerror = null;
        img.src = ART_FALLBACK;
      };
    });
  document.querySelectorAll<HTMLButtonElement>('[data-song]').forEach(
    (b) =>
      (b.onclick = () => {
        selectSong(Number(b.dataset.song));
      }),
  );
}
function updateOptionReadout() {
  const shuffle = optionsDuringPlay ? originalShuffle : settings.shuffle;
  const fader = settings.fader;
  const speedText = `${settings.speed.toFixed(1)}×`;
  const faderText = fader === 'off' ? 'OFF' : fader.toUpperCase();
  const description = `${t('gameOptions')} (F3): ${t('speed')} ${speedText}, ${t('shuffle')} ${shuffle.toUpperCase()}, ${t('fader')} ${faderText}`;
  const button = $('#play-options');
  button.setAttribute('aria-label', description);
  button.innerHTML = `<span class="option-chip" data-tip="${t('speed')}" title="${t('speed')}">${optionIcon('speed')}<b>${speedText}</b></span><span class="option-chip ${shuffle !== 'off' ? 'enabled' : ''}" data-tip="${t('shuffle')}" title="${t('shuffle')}">${optionIcon('shuffle', shuffle)}<b>${shuffle.toUpperCase()}</b></span><span class="option-chip ${fader !== 'off' ? 'enabled' : ''}" data-tip="${t('fader')}" title="${t('fader')}">${optionIcon('fader', fader)}<b>${faderText}</b></span><kbd>F3</kbd>`;
}

function syncSettings() {
  const selected = SONGS[songIndex];
  if (
    settings.difficulty === 'sc' &&
    !makeChart(selected, 'sc', settings.lanes).length
  )
    settings.difficulty = 'high';
  document.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach((b) => {
    const diff = b.dataset.diff as Difficulty;
    b.disabled = !makeChart(selected, diff, settings.lanes).length;
    b.textContent = chartLevel(selected, diff, settings.lanes);
    b.removeAttribute('title');
  });
  document
    .querySelectorAll<HTMLElement>('#songs [data-song]')
    .forEach((row) => {
      const song = SONGS[Number(row.dataset.song)];
      const level = row.querySelector<HTMLElement>('.song-level');
      if (level)
        level.textContent = chartLevel(
          song,
          settings.difficulty,
          settings.lanes,
        );
      const count = row.querySelector<HTMLElement>('.song-note-count');
      if (count)
        count.textContent = `${makeChart(song, settings.difficulty, settings.lanes).length || '--'} ${t('notes')}`;
    });
  queueMicrotask(() => document.dispatchEvent(new Event('orvio:select-sync')));
  updateOptionReadout();
  clock?.setVolume(settings.volume);
  if (previewGain) previewGain.gain.value = settings.volume * 0.5;
  if (field) field.reducedMotion = settings.reducedMotion;
  document
    .querySelectorAll('[data-diff]')
    .forEach((b) =>
      b.classList.toggle(
        'selected',
        (b as HTMLElement).dataset.diff === settings.difficulty,
      ),
    );
  document
    .querySelectorAll('[data-lanes]')
    .forEach((b) =>
      b.classList.toggle(
        'selected',
        Number((b as HTMLElement).dataset.lanes) === settings.lanes,
      ),
    );
  document.querySelectorAll('[data-pos]').forEach((b) => {
    const selected = (b as HTMLElement).dataset.pos === settings.position;
    b.classList.toggle('selected', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
  const speed = $<HTMLSelectElement>('#speed');
  speed.innerHTML = Array.from({ length: 17 }, (_, i) => 1 + i / 2)
    .map((value) => `<option value="${value}">${value.toFixed(1)}×</option>`)
    .join('');
  if (!Number.isInteger(settings.speed * 2)) {
    const legacy = document.createElement('option');
    legacy.value = String(settings.speed);
    legacy.textContent = `${settings.speed.toFixed(1)}× · ${t('legacySpeed')}`;
    speed.prepend(legacy);
  }
  speed.value = String(settings.speed);
  $<HTMLInputElement>('#volume').value = String(settings.volume);
  $<HTMLSelectElement>('#fader').value = settings.fader;
  $<HTMLSelectElement>('#shuffle').value = settings.shuffle;
  $('#speed-value').textContent = settings.speed.toFixed(1) + '×';
  $('#binding-mode').textContent = '5 KEY / 7 KEY';
  const hint = $('#bind-hint');
  hint.replaceChildren();
  for (const [text, visible] of [
    [t('bindHint'), binding < 0],
    [
      `${t('listening')} · ${bindingLanes} KEY · ${Math.max(1, binding + 1)}/${bindingLanes}`,
      binding >= 0,
    ],
  ] as const) {
    const part = document.createElement('span');
    part.textContent = text;
    part.style.visibility = visible ? 'visible' : 'hidden';
    part.setAttribute('aria-hidden', String(!visible));
    hint.append(part);
  }
  $('#bindings').innerHTML = ([5, 7] as Lanes[])
    .map(
      (lanes) =>
        `<section class="binding-row" aria-label="${lanes} KEY"><strong>${lanes} KEY</strong><div class="binding-keys">${settings.keys[lanes].map((k, i) => `<button data-slot="${i}" data-keymode="${lanes}" ${lanes === settings.lanes ? `data-bind="${i}"` : ''} aria-label="${binding === i && bindingLanes === lanes ? t('listening') : keyLabel(k)}" class="key-bind ${binding === i && bindingLanes === lanes ? 'listening' : ''}">${binding === i && bindingLanes === lanes ? '●' : keyLabel(k)}</button>`).join('')}</div></section>`,
    )
    .join('');
  document.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(
    (b) =>
      (b.onclick = () => {
        binding = Number(b.dataset.slot);
        bindingLanes = Number(b.dataset.keymode) as Lanes;
        syncSettings();
        $<HTMLButtonElement>(
          `[data-keymode="${bindingLanes}"][data-slot="${binding}"]`,
        ).focus();
      }),
  );
  persist();
  if (
    !readingRoute &&
    screen === 'select' &&
    !$<HTMLDialogElement>('#results').open
  )
    history.replaceState(null, '', selectionPath());
  if (libraryHydrated && screen === 'select')
    rememberLibraryFirstPaint(
      visibleSongIndices().map((i) => SONGS[i].id),
      SONGS[songIndex].id,
    );
}

function stopPreview() {
  previewRequest++;
  previewAbort?.abort();
  previewAbort = undefined;
  try {
    preview?.stop();
  } catch {
    /* Preview ended. */
  }
  preview = undefined;
  syncResultPreview();
  $('#preview-status').textContent = '';
  document.body.classList.remove('previewing');
}
async function ensureExternalBytes(id: string, signal?: AbortSignal) {
  const external = externalSource(id);
  if (external && !external.bytes) {
    await readSharedAudio(external, signal);
  }
}
async function prepare(attempt: StartupAttempt, joinGatePreload = false) {
  if (!clock) clock = new AudioClock();
  const audio = clock;
  await attempt.wait(audio.activate());
  const song = SONGS[songIndex];
  const external = externalSource(song.id);
  if (external?.record.manifestSha256 && !external.bytes) {
    const local = await attempt.wait(localAudio(external.record));
    if (local) external.bytes = local.bytes;
    else {
      rendered = undefined;
      return { progressive: external, warm: false } as const;
    }
  }
  await attempt.wait(ensureExternalBytes(song.id));
  let track = cache.get(song.id);
  if (!track && joinGatePreload && preloading.has(song.id)) {
    // A gate preload already renders this song; join it instead of
    // rendering a second copy alongside it.
    await attempt.wait(preloading.get(song.id)!);
    track = cache.get(song.id);
  }
  track ??= externalSource(song.id)
    ? { buffer: externalAudio(song.id, audio.context), peak: 1 }
    : await attempt.wait(cachedAudio(song.id, audio.context));
  const warm = !!track;
  if (!track) {
    $('#start').textContent = t('preparing');
    track = await attempt.wait(renderSong(song));
    void saveAudio(song.id, track);
  }
  attempt.check();
  rendered = track;
  cache.set(song.id, track);
  $('#start').innerHTML = `${t('start')} <span>ENTER ↵</span>`;
  return { ...track, warm };
}
$('#cancel-startup').onclick = () => {
  if (readyAutostart) {
    readyAutostart = false;
    history.pushState(null, '', '/select/');
    readRoute();
    return;
  }
  startup?.cancel();
};
$('#song-loading').addEventListener('click', (e) => {
  if (!readyAutostart || preparing || active) return;
  if ((e.target as HTMLElement).closest('#cancel-startup')) return;
  $('#ready-start').click();
});
async function start() {
  if (!playReplay && mobilePlaybackOnly()) {
    toast(t('unsupported'));
    return;
  }
  if (!playReplay) {
    localBuiltinNotes = undefined;
    localSessionKey = undefined;
  }
  if (screen === 'home') {
    $('#home-start').click();
    return;
  }
  if (preparing || active) return;
  const external = externalSource(SONGS[songIndex].id);
  if (
    external &&
    !playReplay &&
    canonicalPreferred.get(external.record.videoId) !== SONGS[songIndex].id
  ) {
    const preferred = canonicalPreferred.get(external.record.videoId);
    const index = preferred
      ? SONGS.findIndex((song) => song.id === preferred)
      : -1;
    if (index < 0) {
      toast(externalLabels(settings.language).preparing);
      return;
    }
    songIndex = index;
  }
  if (!playReplay) rememberLibrarySelection();
  const fromGate = readyAutostart;
  readyAutostart = false;
  $('#song-loading').classList.remove('awaiting-start');
  preparing = true;
  const attempt = new StartupAttempt();
  startup = attempt;
  const loadingSong = SONGS[songIndex];
  const wallpaper = $<HTMLImageElement>('#loading-wallpaper');
  // A refreshed play route can already show this song's artwork from the
  // pre-gesture gate; re-decoding it would only re-add the wait it removed.
  const gateShown =
    wallpaper.dataset.songArt === loadingSong.id &&
    !wallpaper.hidden &&
    armedWallpaperAt > 0;
  if (!gateShown) {
    // Changing src may leave the last decoded image painted until the new decode.
    // Hide it before the overlay can be visible, then reveal only the new image.
    wallpaper.hidden = true;
    wallpaper.referrerPolicy = 'no-referrer';
    wallpaper.dataset.songArt = loadingSong.id;
    wallpaper.src = songArt(loadingSong.id);
  }
  $('#loading-title').textContent = loadingSong.title;
  $('#loading-title').previousElementSibling!.textContent = externalSource(
    loadingSong.id,
  )
    ? 'YOUTUBE'
    : 'ORVIO ORIGINALS';
  $('#loading-detail').textContent =
    `${loadingSong.genre} · ${loadingSong.bpm} BPM · ${settings.lanes} KEY`;
  $('#loading-status').textContent = t('preparing');
  $('#cancel-startup').textContent =
    externalLabels(settings.language).cancel + ' · ESC';
  $('#song-loading').classList.remove('hidden');
  if (location.pathname !== playPath()) history.pushState(null, '', playPath());
  screen = 'play';
  $('#home-screen').classList.add('hidden');
  $('#ready-screen').classList.add('hidden');
  stopPreview();
  document.body.classList.add('playing');
  $('#start').setAttribute('disabled', '');
  try {
    // iOS requires activation in the original click, before artwork awaits.
    if (!clock) clock = new AudioClock();
    await attempt.wait(clock.activate());
    if (!gateShown) {
      try {
        let imageTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          await attempt.wait(
            Promise.race([
              wallpaper.decode(),
              new Promise<never>((_, reject) => {
                imageTimer = setTimeout(
                  () => reject(new Error('Artwork unavailable')),
                  3000,
                );
              }),
            ]),
          );
        } finally {
          clearTimeout(imageTimer);
        }
      } catch {
        attempt.check();
        wallpaper.src = ART_FALLBACK;
        await attempt.wait(wallpaper.decode());
      }
      wallpaper.hidden = false;
    }
    const wallpaperAt = gateShown ? armedWallpaperAt : performance.now();
    armedWallpaperAt = 0;
    const track = await prepare(attempt, fromGate);
    $('#lobby').classList.add('hidden');
    $('#replays').classList.add('hidden');
    $('#game').classList.remove('hidden');
    // Keep renderer resources local to one play session so a later start
    // cannot reuse stale lane geometry from a previous sprite batch.
    field?.dispose();
    field = new Playfield();
    await attempt.wait(field.init($('#highway'), attempt.signal));
    const song = SONGS[songIndex];
    engine = new Engine(
      transformChart(
        playReplay && localBuiltinNotes
          ? structuredClone(localBuiltinNotes)
          : makeChart(song, settings.difficulty, settings.lanes),
        settings.lanes,
        settings.shuffle,
        shuffleSeed,
      ),
      playReplay ? playReplay.fever : { ...CURRENT_FEVER, auto: true },
    );
    seenEvents = 0;
    sequence = 0;
    lastFeverActivations = 0;
    $('#fps').hidden = !perfOverlay;
    if (!playReplay) {
      replayExpected = false;
      replayIssue = false;
      replayExpectedLength = 0;
    }
    savedReplay = playReplay ?? undefined;
    replayText = playReplay ? replayText : '';
    sessionReplay = playReplay
      ? undefined
      : {
          version: 1,
          song: song.id,
          lanes: settings.lanes,
          difficulty: settings.difficulty,
          options: {
            speed: settings.speed,
            fader: settings.fader,
            shuffle: settings.shuffle,
            seed: shuffleSeed,
          },
          ops: [],
          end: 0,
          fever: { ...CURRENT_FEVER, auto: true },
        };
    replayCursor = 0;
    lastRecordedSpeed = settings.speed;
    lastRecordedFader = settings.fader;
    replayAudioQueue = Promise.resolve();
    document.body.classList.toggle('replay-view', !!playReplay);
    $('#replay-playing').textContent = '▶ ' + REPLAY_PLAYING[settings.language];
    $<HTMLButtonElement>('#play-options').disabled = !!playReplay;
    sessionId = crypto.randomUUID();
    document.body.style.setProperty(
      '--play-wallpaper',
      `url("${songArt(song.id)}"), url("${ART_FALLBACK}")`,
    );
    $('#game').dataset.song = song.id;
    field.bpm = song.bpm;
    field.reducedMotion = settings.reducedMotion;
    field.fader = settings.fader;
    field.pressed.clear();
    field.flashes.clear();
    $('#highway-wrap').classList.remove('danger');
    field.setup(
      engine,
      settings.lanes,
      Number.parseInt(song.color.slice(1), 16),
    );
    $('#lobby').classList.add('hidden');
    $('#game').classList.remove('hidden');
    $('#arena').dataset.position = settings.position;
    $('#now-title').textContent = song.title;
    $('#side-title').textContent = song.title;
    $('#side-title').previousElementSibling!.textContent = externalSource(
      song.id,
    )
      ? 'YOUTUBE'
      : 'ORVIO ORIGINALS';
    $('#now-detail').textContent =
      `${playReplay ? REPLAY_LABELS[settings.language][1] + ' · ' : ''}${song.genre} · ${song.bpm} BPM`;
    $('#lane-detail').textContent =
      `${settings.lanes} KEY · ${chartLevel(song, settings.difficulty, settings.lanes)}`;
    $('#keycaps').innerHTML = settings.keys[settings.lanes]
      .map((k) => `<span>${keyLabel(k)}</span>`)
      .join('');
    $('#countdown').textContent = '';
    hudAt = 0;
    scoreDisplay.reset();
    $('#rate').textContent = '100.00';
    $('#judge').textContent = '';
    $('#combo').textContent = '';
    clock.setVolume(settings.volume);
    await attempt.wait(
      field.warmup(engine, settings.lanes, 2 / settings.speed),
    );
    // A player-triggered pre-play transition keeps the requested wallpaper
    // presentation. Only an already-visible decoded route gate earns credit.
    // This is not a catalog/result data-loading delay or an audio readiness gate.
    await attempt.wait(
      new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.max(0, 1200 - (performance.now() - wallpaperAt)),
        ),
      ),
    );
    attempt.check();
    $('#song-loading').classList.add('hidden');
    // Reserve this field's longest visible travel window (1x), including
    // the note-entry margin. Live speed changes cannot bring a note onto the
    // field before countdown ends. No hidden-note gate or shifted chart times.
    const cd = startupCountdownTiming(
      song.bpm,
      engine!.states[0]?.note.time ?? (4 * 60) / song.bpm,
      field.startupTravel,
    );
    countdownFallAt = cd.firstFall;
    countdownBeat = cd.beat;
    countdownLegacy = !!playReplay && playReplay.audioLeadIn === undefined;
    // New recordings stamp their exact lead-in; watching a pre-A5 replay
    // restores the fixed 0.15s anchor its wall-scheduled ops were made on.
    if (sessionReplay) sessionReplay.audioLeadIn = cd.leadIn;
    const leadIn = playReplay ? (playReplay.audioLeadIn ?? 0.15) : cd.leadIn;
    let bufferingAt: number | undefined;
    if ('progressive' in track && track.progressive) {
      const item = track.progressive;
      const playingClock = clock;
      await attempt.wait(
        clock.playProgressive(
          item.record,
          leadIn,
          attempt.signal,
          async (bytes) => {
            // Terminal whole-SHA/WAV gate passed; only now may these bytes persist.
            item.bytes = bytes;
            await saveLocalAudio(
              item.record,
              item.song.title,
              item.jobId,
              bytes,
              item.song.subtitle,
            );
          },
          (error) => {
            if (clock !== playingClock) return;
            if (active) {
              exit();
              toast(externalError(error, settings.language));
            }
          },
          (buffering) => {
            if (!active) return;
            if (buffering) {
              bufferingAt ??= performance.now();
              if (!playReplay) recordOp([2, 0, clock.now(), 1]);
            } else if (bufferingAt !== undefined) {
              if (playReplay) sessionWallAt += performance.now() - bufferingAt;
              else recordOp([2, 0, clock.now(), 0]);
              bufferingAt = undefined;
            }
          },
        ),
      );
    } else await attempt.wait(clock.play(track.buffer, leadIn, attempt.signal));
    sessionWallAt = performance.now();
    active = true;
    if (document.hidden || !document.hasFocus()) {
      await pauseGame();
      return;
    }
    frame = requestAnimationFrame(loop);
  } catch (e) {
    if (startup !== attempt) return;
    // A pending browser operation can finish later, but no old continuation
    // can start audio or touch the next attempt's UI/renderer.
    attempt.cancel(
      attempt.signal.aborted ? String(attempt.signal.reason) : 'error',
    );
    field?.dispose();
    field = undefined as unknown as Playfield;
    clock?.dispose();
    clock = undefined as unknown as AudioClock;
    if (attempt.signal.reason !== 'cancel') {
      toast(t('startError'));
      console.error(e);
    }
    exit();
  } finally {
    attempt.finish();
    if (startup === attempt) {
      startup = undefined;
      $('#song-loading').classList.add('hidden');
      preparing = false;
      $('#start').innerHTML = `${t('start')} <span>ENTER ↵</span>`;
      $('#start').removeAttribute('disabled');
      syncMobilePlayback();
    }
  }
}
function judgment(e: JudgmentEvent) {
  const j = $('#judge');
  j.textContent = e.value ? 'MAX ' + e.value + '%' : 'BREAK';
  j.className =
    e.value === 0
      ? 'break'
      : e.value === 100
        ? 'perfect'
        : e.value >= 80
          ? 'strong'
          : e.value >= 50
            ? 'fair'
            : e.value >= 20
              ? 'weak'
              : 'barely';
  j.dataset.grade = String(e.value);
  if (e.value > 0 && e.value < 100) {
    const hue = 8 + e.value * 1.7;
    j.style.color = `hsl(${hue} 95% ${58 + e.value * 0.12}%)`;
    j.style.fontSize = `${20 + e.value * 0.13}px`;
    j.style.textShadow =
      e.value >= 50
        ? `0 0 ${e.value * 0.18}px hsl(${hue} 95% 60% / .6)`
        : 'none';
  } else {
    j.style.color = '';
    j.style.fontSize = '';
    j.style.textShadow = '';
  }
  j.getAnimations().forEach((a) => a.cancel());
  j.style.animation = 'none';
  if (!settings.reducedMotion)
    j.animate(
      e.value === 100
        ? [
            {
              transform: 'scale(1.48) skewX(-8deg)',
              opacity: 1,
            },
            {
              transform: 'scale(.98) skewX(-3deg)',
              offset: 0.35,
            },
            { transform: 'scale(1)', opacity: 1 },
          ]
        : e.value === 0
          ? [
              { transform: 'translateX(-7px) scale(1.3)' },
              { transform: 'translateX(6px) scale(1.1)', offset: 0.2 },
              { transform: 'translateX(-3px)', offset: 0.4 },
              { transform: 'translateX(0)' },
            ]
          : [
              { transform: 'translateY(-5px) scale(1.15)', opacity: 0.85 },
              { transform: 'translateY(0) scale(1)', opacity: 1 },
            ],
      {
        duration: e.value === 100 ? 420 : e.value === 0 ? 500 : 250,
        easing: 'ease-out',
      },
    );
  const impact = $('#impact');
  impact.getAnimations().forEach((a) => a.cancel());
  impact.className = e.value === 0 ? 'break-impact' : '';
  impact.style.animation = 'none';
  if (e.value === 0 && !settings.reducedMotion)
    impact.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 450,
      easing: 'ease-out',
    });
  $('#highway-wrap').classList.toggle('danger', e.value === 0);
  field.flashes.set(e.lane, { at: performance.now(), ok: e.value > 0 });
  if (e.value === 100) clock.click();
}
let hudAt = 0;
let lastFeverActivations = 0;
let perfOverlay = false;
// A5: countdown is anchored to the first note's fall start so notes
// never appear before the countdown finishes, at any speed/BPM.
let countdownFallAt = 0,
  countdownBeat = 0.5;
// Pre-A5 replays (no audioLeadIn) watch under the original fixed 0.15s
// anchor and the original 4-beat countdown, keeping wall-ops in sync.
let countdownLegacy = false;
function loop(now: number) {
  if (!active || !engine || paused) return;
  const time = clock.now();
  if (clock.buffering) {
    frame = requestAnimationFrame(loop);
    return;
  }
  if (playReplay) {
    const elapsed = performance.now() - sessionWallAt;
    while (
      replayCursor < playReplay.ops.length &&
      playReplay.ops[replayCursor][1] <= elapsed
    ) {
      const op = playReplay.ops[replayCursor];
      applyReplayOp(engine, op, replayCursor++);
      if (op[0] === 0) {
        if (op[4]) field.pressed.add(op[3]);
        else field.pressed.delete(op[3]);
      }
      if (op[0] === 2) {
        const pause = !!op[3];
        replayAudioQueue = replayAudioQueue.then(async () => {
          if (playReplay) {
            if (pause) await clock.pause();
            else await clock.resume();
          }
        });
      }
      if (op[0] === 3) {
        settings.speed = op[3];
        settings.fader = op[4];
        field.fader = op[4];
        updateOptionReadout();
      }
    }
  } else {
    if (
      lastRecordedSpeed !== settings.speed ||
      lastRecordedFader !== settings.fader
    ) {
      recordOp([3, 0, time, settings.speed, settings.fader]);
      lastRecordedSpeed = settings.speed;
      lastRecordedFader = settings.fader;
    }
    const before = engine.events.length;
    const feverBefore = engine.fever.journal.length;
    engine.update(time);
    if (
      replayFrameChanged(
        before,
        engine.events.length,
        feverBefore,
        engine.fever.journal.length,
      )
    )
      recordOp([1, 0, time]);
  }
  for (; seenEvents < engine.events.length; seenEvents++)
    judgment(engine.events[seenEvents]);
  const visualTime = clock.now(now);
  if (!countdownLegacy) {
    // A resize may reveal more of the field. Clear the countdown no later
    // than the first visible note, without hiding notes or shifting replay ops.
    countdownFallAt = Math.min(
      countdownFallAt,
      (engine.states[0]?.note.time ?? Infinity) - field.startupTravel,
    );
  }
  $('#countdown').textContent = countdownLegacy
    ? visualTime < 0
      ? 'READY'
      : visualTime < 4 * countdownBeat
        ? String(Math.max(1, 4 - Math.floor(visualTime / countdownBeat)))
        : ''
    : countdownText(visualTime, countdownFallAt, countdownBeat);
  field.draw(engine, settings.lanes, visualTime, 2 / settings.speed, now);
  scoreDisplay.update(engine.score, now, settings.reducedMotion);
  if (now - hudAt > 50) {
    hudAt = now;

    $('#rate').textContent = engine.rate.toFixed(2);
    $('#combo').textContent =
      engine.fever.displayCombo > 1 ? String(engine.fever.displayCombo) : '';
    renderFeverHud($('#fever-hud'), engine.fever, settings.reducedMotion);
    // A11: activation feedback - original burst sound + visual + combo pop.
    // Rules, score and replay recording are untouched; this only reacts to the
    // existing activations counter.
    if (engine.fever.activations !== lastFeverActivations) {
      lastFeverActivations = engine.fever.activations;
      clock.feverBurst();
      if (!settings.reducedMotion) {
        const burst = $('#fever-burst');
        burst.classList.remove('fever-burst-on');
        void burst.offsetWidth;
        burst.classList.add('fever-burst-on');
        const comboEl = $('#combo');
        comboEl.classList.remove('combo-fever-pop');
        void comboEl.offsetWidth;
        comboEl.classList.add('combo-fever-pop');
      }
    }
    $('#combo').dataset.feverStage =
      engine.fever.status === 'ready' && engine.fever.stage > 1
        ? String(engine.fever.stage)
        : '';
    $('#progress > div').style.width =
      Math.min(100, Math.max(0, (time / duration(SONGS[songIndex])) * 100)) +
      '%';
    const recent = field.frames.slice(-60);
    $('#fps').textContent = perfOverlay
      ? formatPerf(field.recentPerf())
      : recent.length
        ? Math.round(
            1000 / (recent.reduce((a, b) => a + b, 0) / recent.length),
          ) + ' FPS'
        : '-- FPS';
  }
  if (
    !clock.verificationPending &&
    (playReplay
      ? performance.now() - sessionWallAt >= playReplay.end
      : time >= duration(SONGS[songIndex]))
  ) {
    finish();
    return;
  }
  frame = requestAnimationFrame(loop);
}
function finish() {
  if (!engine) return;
  if (playReplay) {
    while (replayCursor < playReplay.ops.length) {
      applyReplayOp(engine, playReplay.ops[replayCursor], replayCursor);
      replayCursor++;
    }
    stopReplay();
    return;
  }
  active = false;
  paused = false;
  cancelAnimationFrame(frame);
  clock.stop();
  field.pressed.clear();
  engine.update(9999);
  recordOp([1, 0, 9999]);
  if (sessionReplay) {
    sessionReplay.end = Math.max(
      performance.now() - sessionWallAt,
      sessionReplay.ops.at(-1)?.[1] ?? 0,
    );
    savedReplay = sessionReplay;
    sessionReplay = undefined;
  }
  latestMetrics = field.stats();
  lastResult = {
    song: SONGS[songIndex].id,
    lanes: settings.lanes,
    difficulty: settings.difficulty,
    score: engine.score,
    accuracy: engine.sum / engine.total,
    combo: engine.maxCombo,
  };
  lastResult.options = {
    speed: settings.speed,
    fader: settings.fader,
    shuffle: settings.shuffle,
    seed: shuffleSeed,
  };
  lastResult.judgments = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
    (v) => engine!.events.filter((e) => e.value === v).length,
  );
  const completed = lastResult;
  ownResults.add(completed);
  replayExpected = true;
  replayEncoding = (async () => {
    if (externalSource(completed.song)) {
      replayText = '';
      replayExpected = false;
      if (!savedReplay || !replayMatches(savedReplay, completed))
        savedReplay = undefined;
      if (savedReplay) {
        try {
          localSessionKey = await saveLocalSession(savedReplay, completed);
        } catch {
          toast(REPLAY_SAVE_ERROR[settings.language]);
        }
      }
    } else if (
      !externalSource(completed.song) &&
      savedReplay &&
      replayMatches(savedReplay, completed)
    ) {
      try {
        replayText = await encodeReplay(savedReplay as ReplayData);
        replayExpectedLength = replayText.length;
        try {
          localSessionKey = await saveBuiltinSession(savedReplay, completed);
        } catch {
          toast(REPLAY_SAVE_ERROR[settings.language]);
        }
      } catch {
        savedReplay = undefined;
        replayText = '';
      }
    } else {
      savedReplay = undefined;
      replayText = '';
    }
    if (lastResult === completed) {
      history.replaceState(null, '', resultLink(completed));
      replayIssue = !savedReplay;
      syncReplayButton();
    }
  })();
  void replayEncoding.then(() => {
    if (lastResult === completed) {
      showResult(completed);
      if (!savedReplay) toast(REPLAY_LABELS[settings.language][2]);
    }
  });
}
function resultLink(result: UiResult) {
  if (receivedShare?.data.result === result)
    return new URL('/result/#' + receivedShare.fragment, location.origin).href;
  if (externalSource(result.song) || localSessionKey?.startsWith('builtin:'))
    return new URL(
      '/result/?local=' + encodeURIComponent(localSessionKey ?? result.song),
      location.origin,
    ).href;
  const p = resultParams(result as SharedResult);
  if (replayExpected) {
    p.set('rp', '1');
    p.set('rn', String(replayExpectedLength));
  }
  if (replayText && savedReplay && replayMatches(savedReplay, result))
    p.set('r', replayText);
  return new URL('/result/#' + p, location.origin).href;
}
function showResult(result: UiResult) {
  const arrivalKey = initialArrivalKey ?? resultIdentityKey(location.href);
  const arrivalFragment = initialArrivalFragment;
  initialArrivalKey = null;
  initialArrivalFragment = null;
  $('#retry').innerHTML =
    `${label(ownResults.has(result) ? 'retry' : 'start')} ↵`;
  screen = 'select';
  delete $('#share-status').dataset.message;
  $('#share-status').textContent = '';
  $('#share-status').classList.add('hidden');
  lastResult = result;
  const sharedURL = resultLink(result);
  history.replaceState(null, '', sharedURL);
  const canonicalKey = resultIdentityKey(location.href);
  document.body.classList.remove('home-screen', 'ready-screen');
  document.body.classList.add('results-screen');
  $('#share-result').innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8"/></svg>' +
    label('shareResult');
  $('#share-result').setAttribute('aria-label', t('shareResult'));
  $('#share-result').title = t('shareResult');

  stopPreview();
  $('#result-song').textContent =
    SONGS.find((s) => s.id === result.song)?.title ?? result.song;
  $<HTMLButtonElement>('#share-result').hidden = false;
  const resultBadgeList = resultOptions(result);
  $('#result-rank').textContent =
    result.accuracy >= 97
      ? 'S'
      : result.accuracy >= 90
        ? 'A'
        : result.accuracy >= 80
          ? 'B'
          : 'C';
  const counts = result.judgments;
  $('#result-badge').textContent = counts
    ? result.accuracy === 100
      ? t('perfectPlay')
      : counts[11] === 0
        ? t('maxCombo')
        : t('session')
    : t('session');
  $('#result-score').textContent = result.score.toLocaleString('en-US');
  $('#result-rate').textContent = result.accuracy.toFixed(2) + '%';
  $('#result-combo').textContent = String(result.combo);
  const resultFever = $('#result-fever');
  resultFever.classList.add('hidden');
  if (
    savedReplay?.fever?.auto &&
    savedReplay.fever.rulesId === 'orvio-auto-v1' &&
    replayMatches(savedReplay, result, localBuiltinNotes)
  ) {
    const verified = replayEngine(savedReplay, localBuiltinNotes);
    savedReplay.ops.forEach((op, i) => applyReplayOp(verified, op, i));
    verified.update(9999);
    resultFever.textContent = `FEVER MAX ${verified.fever.maxDisplayCombo}`;
    resultFever.classList.remove('hidden');
  }

  $('#result-break').textContent = counts ? String(counts[11]) : '--';
  $('#judgment-list').innerHTML = [
    100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0,
  ]
    .map(
      (v, i) =>
        `<div data-grade="${v}" style="--grade-color:${v === 100 ? '#fff4a8' : v === 0 ? '#ff384f' : `hsl(${8 + v * 1.7} 95% ${58 + v * 0.12}%)`}"><span>${v ? 'MAX ' + v + '%' : 'BREAK'}</span><b>${counts ? counts[i] : '--'}</b></div>`,
    )
    .join('');
  const resultDialog = $<HTMLDialogElement>('#results');
  resultDialog.showModal();
  document.documentElement.removeAttribute('data-result-pending');
  resultDialog.focus({ preventScroll: true });
  resultDialog.scrollTop = 0;
  const projected = finishResultFirstPaint(result, [arrivalKey, canonicalKey]);
  // A result that arrived through a share carries the share's verified
  // expiry onto every identity the projection is written under, so an
  // expired share can never paint before the app rejects it.
  const shared = shortCache.get(sharedURL.slice(sharedURL.indexOf('#') + 1));
  rememberResultFirstPaint([arrivalKey, canonicalKey], result, {
    ...(shared ? { expiresAt: Date.parse(shared.expiresAt) } : {}),
    badges: resultBadgeList,
    locale: settings.language,
    arrivalFragment: arrivalFragment ?? undefined,
  });
  resultMotion.play(result.score, settings.reducedMotion || projected);
}

const resultMotion = new ResultMotion($<HTMLDialogElement>('#results'));

function syncResultPreview() {
  const b = $('#result-preview');
  if (!b) return;
  b.textContent =
    (preview ? '■ ' : '▶ ') + RESULT_LABELS[settings.language][preview ? 1 : 0];
  b.setAttribute('aria-pressed', String(!!preview));
}
function resultOptions(result: UiResult) {
  const song = SONGS.find((s) => s.id === result.song)!;
  const resultArt = $<HTMLImageElement>('#result-art');
  resultArt.referrerPolicy = 'no-referrer';
  resultArt.onerror = () => {
    resultArt.onerror = null;
    resultArt.src = ART_FALLBACK;
  };
  resultArt.dataset.songArt = song.id;
  resultArt.toggleAttribute('data-external', !!externalSource(song.id));
  resultArt.src = songArt(song.id);
  const count = makeChart(song, result.difficulty, result.lanes).length;
  $('#result-metadata').textContent =
    `${song.genre} · ${song.bpm} BPM · ${count} ${t('notes')}`;
  $('#result-metadata').title = RESULT_LABELS[settings.language][2];
  syncResultPreview();
  syncReplayButton();
  const badgeLabels = {
    keys: 'KEY',
    difficulty: chartLevel(song, result.difficulty, result.lanes),
    speed: t('speed'),
    shuffle: t('shuffle'),
    fader: t('fader'),
  };
  $('#result-options').innerHTML = resultBadges(result, badgeLabels);
  return resultBadgeData(result, badgeLabels);
}
function exit() {
  playReplay = undefined;
  sessionReplay = undefined;
  document.body.classList.remove('replay-view');
  $<HTMLButtonElement>('#play-options').disabled = false;
  active = false;
  paused = false;
  cancelAnimationFrame(frame);
  clock?.stop();
  field?.pressed.clear();
  document.body.classList.remove('playing', 'results-screen');
  $('#game').classList.add('hidden');
  $('#lobby').classList.remove('hidden');
  $('#replays').classList.add('hidden');
  screen = 'select';
  restoreLibrarySelection();
  if (!readingRoute) history.pushState(null, '', selectionPath());
  songCards();
  syncSettings();
  selectedSong();
  restoreLibraryScroll();
}
function keyTime(e: KeyboardEvent) {
  let stamp = e.timeStamp;
  if (stamp > 1e12) stamp -= performance.timeOrigin;
  return clock.now(stamp);
}
document.addEventListener('pointerdown', (e) => {
  if (binding >= 0 && !(e.target as HTMLElement).closest('[data-slot]')) {
    binding = -1;
    syncSettings();
  }
});
function editableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    target.closest(
      'input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, [contenteditable]:not([contenteditable=false])',
    )
  );
}
window.addEventListener('keydown', (e) => {
  if ($<HTMLDialogElement>('#remove-song-dialog').open) return;
  const editable = editableTarget(e.target);
  if (editable && e.code !== 'Escape') {
    // Meta+A has no native select-all mapping in some embedded browser hosts.
    // Select the actual field, never the game page. All other editing stays native.
    if (
      e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.isComposing &&
      e.code === 'KeyA' &&
      (editable instanceof HTMLInputElement ||
        editable instanceof HTMLTextAreaElement)
    ) {
      editable.select();
      e.preventDefault();
    }
    return;
  }
  if ($<HTMLDialogElement>('#youtube-import').open) {
    if (e.code === 'Escape') {
      e.preventDefault();
      $<HTMLDialogElement>('#youtube-import').close();
    }
    return;
  }
  if (playReplay && active) {
    e.preventDefault();
    if (e.code === 'Escape' && !e.repeat) stopReplay();
    return;
  }
  if (preparing) {
    if (e.code === 'Tab') $('#cancel-startup').focus();
    if (
      !e.repeat &&
      e.target === $('#cancel-startup') &&
      (e.code === 'Enter' || e.code === 'Space')
    )
      $('#cancel-startup').click();
    if (e.code === 'Escape' && !e.repeat) startup?.cancel();
    e.preventDefault();
    return;
  }
  if (binding >= 0) {
    e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Escape') {
      binding = -1;
      syncSettings();
      return;
    }
    if (
      [
        'Escape',
        'Enter',
        'Tab',
        'MetaLeft',
        'MetaRight',
        'ControlLeft',
        'ControlRight',
        'AltLeft',
        'AltRight',
      ].includes(e.code)
    ) {
      toast(t('otherKey'));
      return;
    }
    if (
      settings.keys[bindingLanes].some((k, i) => k === e.code && i !== binding)
    ) {
      toast(t('duplicate'));
      return;
    }
    settings.keys[bindingLanes][binding] = e.code;
    const finished = binding + 1 >= bindingLanes;
    binding = finished ? -1 : binding + 1;
    syncSettings();
    if (!finished)
      $<HTMLButtonElement>(
        `[data-keymode="${bindingLanes}"][data-slot="${binding}"]`,
      ).focus();
    return;
  }
  if (paused && $<HTMLDialogElement>('#settings').open && e.code === 'Escape') {
    e.preventDefault();
    $<HTMLDialogElement>('#settings').close();
    return;
  }
  if (
    $<HTMLDialogElement>('#game-options').open ||
    $<HTMLDialogElement>('#restart-options').open
  ) {
    if (e.code === 'Escape') {
      e.preventDefault();
      if ($<HTMLDialogElement>('#restart-options').open) {
        $<HTMLDialogElement>('#restart-options').close();
        cancelShuffleChange();
      } else $<HTMLDialogElement>('#game-options').close();
    }
    return;
  }
  if (
    e.code === 'F3' &&
    !e.repeat &&
    screen !== 'home' &&
    !document.querySelector('#settings[open],#results[open],#about[open]')
  ) {
    e.preventDefault();
    void openGameOptions();
    return;
  }
  if (e.code === 'Escape' && active) {
    e.preventDefault();
    if (paused) {
      if (!$<HTMLDialogElement>('#settings').open) void resumeGame();
    } else void pauseGame();
    return;
  }
  if (!active) {
    if (screen === 'home' || screen === 'ready') {
      if (readyAutostart && e.code === 'Escape' && !e.repeat) {
        e.preventDefault();
        $('#cancel-startup').click();
        return;
      }
      if (
        e.code === 'Enter' &&
        !e.repeat &&
        !(e.target as HTMLElement)?.matches('button,a')
      ) {
        e.preventDefault();
        screen === 'home'
          ? $('#home-start').click()
          : $('#ready-start').click();
      }
      return;
    }
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (dialog) {
      if (e.code === 'Escape') {
        e.preventDefault();
        dialog.close();
        if (dialog.id === 'results') exit();
        return;
      }
      if (
        dialog.id === 'results' &&
        e.code === 'Enter' &&
        !(e.target as HTMLElement)?.matches('button,input,select,a')
      ) {
        e.preventDefault();
        $('#retry').click();
      }
      return;
    }
    if (screen === 'replays') {
      if (e.code === 'Escape' && !e.repeat) {
        e.preventDefault();
        history.pushState(null, '', '/select/');
        readRoute();
      }
      return;
    }
    if (
      (e.target as HTMLElement)?.matches('button,input,select,a') &&
      e.code === 'Enter'
    )
      return;
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      e.preventDefault();
      const visible = visibleSongIndices();
      const next =
        (visible.indexOf(songIndex) +
          (e.code === 'ArrowDown' ? 1 : visible.length - 1)) %
        visible.length;
      selectSong(visible[next]);
      return;
    }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      e.preventDefault();
      const levels = (['low', 'mid', 'high', 'sc'] as Difficulty[]).filter(
        (d) => makeChart(SONGS[songIndex], d, settings.lanes).length,
      );
      settings.difficulty =
        levels[
          (levels.indexOf(settings.difficulty) +
            (e.code === 'ArrowRight' ? 1 : levels.length - 1)) %
            levels.length
        ];
      syncSettings();
      return;
    }
    if (e.code === 'Digit5' || e.code === 'Digit7') {
      settings.lanes = e.code === 'Digit5' ? 5 : 7;
      syncSettings();
      return;
    }
    if (e.code === 'F2') {
      e.preventDefault();
      $('#open-settings').click();
      return;
    }
    if (e.code === 'F1') {
      e.preventDefault();
      $('#about-button').click();
      return;
    }
    if (e.code === 'Enter' && !e.repeat) {
      e.preventDefault();
      void start();
      return;
    }
    return;
  }
  if (paused) {
    if (
      e.code === 'Enter' &&
      $<HTMLDialogElement>('#pause').open &&
      !(e.target as HTMLElement)?.matches('button,input,select,a')
    ) {
      e.preventDefault();
      void resumeGame();
    }
    if (e.code === 'F2' && $<HTMLDialogElement>('#pause').open) {
      e.preventDefault();
      $('#pause-settings').click();
    }
    return;
  }
  if (!active || !engine || e.repeat || clock.buffering) return;
  const lane = settings.keys[settings.lanes].indexOf(e.code);
  if (lane < 0) return;
  e.preventDefault();
  field.pressed.add(lane);
  recordInput(lane, keyTime(e), true);
});
window.addEventListener('keyup', (e) => {
  if (editableTarget(e.target)) return;
  if (playReplay) return;
  if (!active || !engine || clock.buffering) return;
  const lane = settings.keys[settings.lanes].indexOf(e.code);
  if (lane < 0) return;
  e.preventDefault();
  field.pressed.delete(lane);
  recordInput(lane, paused ? clock.now() : keyTime(e), false);
});
window.addEventListener('blur', () => {
  if (screen === 'select' && !active && !preparing) rememberLibrarySelection();
  stopPreview();
  if (active && !paused) {
    void pauseGame();
  }
});
window.addEventListener('pageshow', () => {
  if (screen === 'select' && libraryHydrated) restoreLibraryScroll();
});
window.addEventListener('focus', () => {
  if (screen === 'select' && libraryHydrated) restoreLibraryScroll();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'select' && !active && !preparing)
    rememberLibrarySelection();
  if (!document.hidden && screen === 'select' && libraryHydrated)
    restoreLibraryScroll();
  if (document.hidden) stopPreview();
  if (document.hidden && active && !paused) {
    void pauseGame();
  }
});
async function pauseGame() {
  if (playReplay) {
    stopReplay();
    return;
  }
  if (!active || paused) return;
  recordOp([2, 0, clock.now(), 1]);
  paused = true;
  cancelAnimationFrame(frame);
  await clock.pause();
  $<HTMLDialogElement>('#pause').showModal();
}
async function resumeGame() {
  $<HTMLDialogElement>('#pause').close();
  await clock.resume();
  recordOp([2, 0, clock.now(), 0]);
  paused = false;
  frame = requestAnimationFrame(loop);
}
$('#resume').onclick = () => void resumeGame();
$('#pause-settings').onclick = () => {
  $<HTMLDialogElement>('#pause').close();
  $<HTMLDialogElement>('#settings').showModal();
};
$('#pause-exit').onclick = () => {
  $<HTMLDialogElement>('#pause').close();
  exit();
  void previewSong();
};
$('#pause').addEventListener('cancel', (e) => {
  e.preventDefault();
  void resumeGame();
});
$('#settings').addEventListener('close', () => {
  binding = -1;
  syncSettings();
  if (paused) {
    $('#arena').dataset.position = settings.position;
    $('#keycaps').innerHTML = settings.keys[settings.lanes]
      .map((k) => `<span>${keyLabel(k)}</span>`)
      .join('');
  }
  if (paused) {
    $<HTMLDialogElement>('#pause').showModal();
    $('#resume').focus();
  }
});
async function openGameOptions() {
  optionsDuringPlay = active;
  originalShuffle = settings.shuffle;
  originalSeed = shuffleSeed;
  if (active && !paused) await pauseGame();
  $<HTMLDialogElement>('#pause').close();
  syncSettings();
  $('#option-hint').textContent = t(
    optionsDuringPlay ? 'liveOptionHint' : 'optionHint',
  );
  $<HTMLDialogElement>('#game-options').showModal();
}
$('#play-options').onclick = () => void openGameOptions();
$('#game-options').addEventListener('close', () => {
  if (!optionsDuringPlay) return;
  field.fader = settings.fader;
  if (
    settings.shuffle !== originalShuffle ||
    (settings.shuffle === 'random' && shuffleSeed !== originalSeed)
  ) {
    $<HTMLDialogElement>('#restart-options').showModal();
    return;
  }
  optionsDuringPlay = false;
  syncSettings();
  history.replaceState(null, '', playPath());
  $<HTMLDialogElement>('#pause').showModal();
  $('#resume').focus();
});
function cancelShuffleChange() {
  settings.shuffle = originalShuffle;
  shuffleSeed = originalSeed;
  field.fader = settings.fader;
  optionsDuringPlay = false;
  syncSettings();
  history.replaceState(null, '', playPath());
  $<HTMLDialogElement>('#pause').showModal();
  $('#resume').focus();
}
$('#cancel-shuffle-restart').onclick = () => {
  $<HTMLDialogElement>('#restart-options').close();
  cancelShuffleChange();
};
$('#restart-options').addEventListener('cancel', (e) => {
  e.preventDefault();
  $<HTMLDialogElement>('#restart-options').close();
  cancelShuffleChange();
});
$('#confirm-shuffle-restart').onclick = () => {
  const shuffle = settings.shuffle,
    seed = shuffleSeed;
  optionsDuringPlay = false;
  exit();
  $<HTMLDialogElement>('#restart-options').close();
  settings.shuffle = shuffle;
  shuffleSeed = seed;
  syncSettings();
  void start();
};
$('#open-game-options').onclick = openGameOptions;
$('#ready-options').onclick = openGameOptions;
$('#options-done').onclick = () =>
  $<HTMLDialogElement>('#game-options').close();
for (const id of ['fader', 'shuffle'] as const)
  $<HTMLSelectElement>('#' + id).onchange = (e) => {
    const value = (e.target as HTMLSelectElement).value;
    if (id === 'fader') settings.fader = value as Fader;
    else {
      settings.shuffle = value as Shuffle;
      shuffleSeed = crypto.getRandomValues(new Uint32Array(1))[0];
    }
    syncSettings();
  };
let shareBusy = false;
const shortCache = new Map<string, { id: string; expiresAt: string }>();
$('#share-result').onclick = async () => {
  if (!lastResult || shareBusy) return;
  const sharedResult = lastResult;
  shareBusy = true;
  const button = $<HTMLButtonElement>('#share-result');
  button.disabled = true;
  const status = $('#share-status');
  delete status.dataset.message;
  status.textContent = '';
  status.classList.add('hidden');
  // Start the clipboard write in the click gesture. The short URL resolves only
  // after the user's on-demand save, with no preview upload or long-link fallback.
  const link = (async () => {
    await replayEncoding;
    if (lastResult !== sharedResult) throw new ShareError(400);
    if (replayExpected && (!savedReplay || !replayText || replayIssue))
      throw new ShareError(400);
    const item = externalSource(lastResult!.song);
    const fragment = item
      ? await encodeExternalShare({
          record: item.record,
          replay: savedReplay!,
          result: lastResult!,
          title: item.song.title,
          ...(item.jobId ? { jobId: item.jobId } : {}),
        })
      : await builtinShareFragment(
          savedReplay!,
          lastResult! as SharedResult,
          localBuiltinNotes,
        );
    let shared = shortCache.get(fragment);
    if (!shared || Date.parse(shared.expiresAt) <= Date.now())
      shared = await saveSharedReplay(fragment);
    shortCache.set(fragment, shared);
    const url = new URL('/result/', location.origin);
    url.searchParams.set('s', shared.id);
    return url.href;
  })();
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const clipboardBody = link.then(
        (url) => new Blob([url], { type: 'text/plain' }),
      );
      // Some browsers decline clipboard access without consuming this promise.
      // Its rejection is handled by the surrounding share flow, not pageerror.
      void clipboardBody.catch(() => undefined);
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': clipboardBody }),
      ]);
    } else {
      await navigator.clipboard.writeText(await link);
    }
    toast(t('resultCopied'));
  } catch (error) {
    // Consume a delayed save rejection even when clipboard access failed first.
    void link.catch(() => undefined);
    toast(shareLabels(settings.language).failed);
    status.dataset.message =
      error instanceof ShareError && error.status === 429 ? 'quota' : 'failed';
    status.textContent = shareLabels(settings.language)[
      status.dataset.message as 'quota' | 'failed'
    ];
    status.classList.remove('hidden');
  } finally {
    shareBusy = false;
    button.disabled = false;
  }
};
$('#watch-replay').onclick = () => void watchReplay();
async function watchReplay() {
  if (
    !savedReplay ||
    !lastResult ||
    !replayMatches(savedReplay, lastResult, localBuiltinNotes)
  ) {
    toast(REPLAY_LABELS[settings.language][2]);
    return;
  }
  // Shared audio may need a network read; unlock while the click is still active.
  if (!clock) clock = new AudioClock();
  void clock.activate().catch(() => {});
  const watchHref = location.href,
    watchNavigation = navigationVersion;
  const replayToWatch = savedReplay,
    resultToWatch = lastResult;
  const item = externalSource(savedReplay.song);
  if (item && !item.bytes && !item.record.manifestSha256) {
    const button = $<HTMLButtonElement>('#watch-replay');
    button.disabled = true;
    try {
      await readSharedAudio(item);
    } catch (error) {
      if (
        navigationVersion === watchNavigation &&
        location.href === watchHref &&
        savedReplay === replayToWatch &&
        lastResult === resultToWatch &&
        $<HTMLDialogElement>('#results').open
      )
        showAudioRecovery(item, error);
      return;
    } finally {
      button.disabled = false;
    }
  }
  if (
    navigationVersion !== watchNavigation ||
    location.href !== watchHref ||
    savedReplay !== replayToWatch ||
    lastResult !== resultToWatch ||
    !$<HTMLDialogElement>('#results').open
  )
    return;
  playReplay = savedReplay;
  songIndex = SONGS.findIndex((s) => s.id === playReplay!.song);
  settings.lanes = playReplay.lanes;
  settings.difficulty = playReplay.difficulty;
  settings.speed = playReplay.options.speed;
  settings.fader = playReplay.options.fader;
  settings.shuffle = playReplay.options.shuffle;
  shuffleSeed = playReplay.options.seed;
  updateOptionReadout();
  $<HTMLDialogElement>('#results').close();
  document.body.classList.remove(
    'home-screen',
    'ready-screen',
    'results-screen',
  );
  screen = 'select';
  void start();
}
$('#start').onclick = () => void start();
$('#exit').onclick = () => void pauseGame();
$('#retry').onclick = () => {
  if (mobilePlaybackOnly()) {
    toast(t('unsupported'));
    return;
  }
  playReplay = undefined;
  const result = lastResult;
  $<HTMLDialogElement>('#results').close();
  exit();
  if (result) {
    songIndex = SONGS.findIndex((s) => s.id === result.song);
    settings.lanes = result.lanes;
    settings.difficulty = result.difficulty;
    if (result.options) {
      settings.speed = result.options.speed;
      settings.fader = result.options.fader;
      settings.shuffle = result.options.shuffle;
      shuffleSeed = result.options.seed;
    }
  }
  document.body.classList.remove(
    'home-screen',
    'ready-screen',
    'results-screen',
  );
  screen = 'select';
  void start();
};
$('#result-preview').onclick = () => {
  if (preview) stopPreview();
  else void previewSong();
};
$('#results').addEventListener('close', () => stopPreview());
$('#results').addEventListener('cancel', () => {
  exit();
  void previewSong();
});
$('#back').onclick = () => {
  $<HTMLDialogElement>('#results').close();
  exit();
  void previewSong();
};
$('#open-settings').onclick = () => {
  if (active) return;
  $<HTMLDialogElement>('#settings').showModal();
  syncSettings();
};
$('#about-button').onclick = () => $<HTMLDialogElement>('#about').showModal();
let previewRequest = 0;
let previewAbort: AbortController | undefined;
async function previewSong() {
  const request = ++previewRequest;
  previewAbort?.abort();
  const controller = new AbortController();
  previewAbort = controller;
  const song = SONGS[songIndex];
  if (!clock) clock = new AudioClock();
  try {
    // resume is called during the selection key/click gesture, before rendering.
    await clock.activate();
    await ensureExternalBytes(song.id, controller.signal);
    let track = cache.get(song.id);
    if (!track) {
      track = externalSource(song.id)
        ? { buffer: externalAudio(song.id, clock.context), peak: 1 }
        : ((await cachedAudio(song.id, clock.context)) ??
          (await renderSong(song)));
      cache.set(song.id, track);
      if (!externalSource(song.id)) void saveAudio(song.id, track);
    }
    if (
      request !== previewRequest ||
      active ||
      preparing ||
      SONGS[songIndex] !== song
    )
      return;
    try {
      preview?.stop();
    } catch {}
    preview = clock.context.createBufferSource();
    preview.buffer = track.buffer;
    const gain = clock.context.createGain();
    previewGain = gain;
    gain.gain.value = settings.volume * 0.5;
    preview.connect(gain);
    gain.connect(clock.context.destination);
    preview.loop = true;
    preview.loopStart = 8;
    preview.loopEnd = Math.min(24, track.buffer.duration);
    preview.start(0, 8);
    document.body.classList.add('previewing');
    $('#preview-status').textContent = t('nowPlaying');
    syncResultPreview();
  } catch {
    if (request === previewRequest) toast(t('previewBlocked'));
  }
}
document.querySelectorAll<HTMLButtonElement>('[data-settings-tab]').forEach(
  (button) =>
    (button.onclick = () => {
      const keys = button.dataset.settingsTab === 'keys';
      $('#settings').classList.toggle('keys-tab', keys);
      document
        .querySelectorAll<HTMLElement>('[data-settings-tab]')
        .forEach((b) => {
          b.setAttribute('aria-selected', String(b === button));
          b.tabIndex = b === button ? 0 : -1;
        });
    }),
);
document.querySelector('.settings-tabs')!.addEventListener('keydown', (e) => {
  const key = (e as KeyboardEvent).key;
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
  e.preventDefault();
  const current = document.querySelector<HTMLButtonElement>(
    '[data-settings-tab][aria-selected="true"]',
  )!;
  const next = document.querySelector<HTMLButtonElement>(
    `[data-settings-tab="${key === 'Home' ? 'general' : key === 'End' ? 'keys' : current.dataset.settingsTab === 'general' ? 'keys' : 'general'}"]`,
  )!;
  next.click();
  next.focus();
});
$('#language').onchange = (e) => {
  const choice = (e.target as HTMLSelectElement).value;
  settings.languageMode = choice === 'auto' ? 'auto' : 'manual';
  settings.language =
    choice === 'auto'
      ? browserLanguage(navigator.languages)
      : (choice as Language);
  localize();
  songCards();
  selectedSong();
  syncSettings();
  $('#preview-status').textContent = preview ? t('nowPlaying') : '';
};
$('#reduced-motion').onchange = (e) => {
  settings.reducedMotion = (e.target as HTMLInputElement).checked;
  localize();
  persist();
  if (
    !readingRoute &&
    screen === 'select' &&
    !$<HTMLDialogElement>('#results').open
  )
    history.replaceState(null, '', selectionPath());
};
$('#fullscreen').onclick = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void requestGameFullscreen();
};
document.querySelectorAll<HTMLButtonElement>('[data-diff]').forEach(
  (b) =>
    (b.onclick = () => {
      settings.difficulty = b.dataset.diff as Difficulty;
      syncSettings();
    }),
);
document.querySelectorAll<HTMLButtonElement>('[data-lanes]').forEach(
  (b) =>
    (b.onclick = () => {
      settings.lanes = Number(b.dataset.lanes) as Lanes;
      syncSettings();
    }),
);
document.querySelectorAll<HTMLButtonElement>('[data-pos]').forEach(
  (b) =>
    (b.onclick = () => {
      settings.position = b.dataset.pos as Settings['position'];
      syncSettings();
    }),
);
$<HTMLInputElement>('#volume').oninput = (e) => {
  settings.volume = Number((e.target as HTMLInputElement).value);
  syncSettings();
};
$<HTMLSelectElement>('#speed').onchange = (e) => {
  settings.speed = Number((e.target as HTMLSelectElement).value);
  syncSettings();
};
window.addEventListener('languagechange', () => {
  if (settings.languageMode === 'auto') {
    settings.language = browserLanguage(navigator.languages);
    localize();
    songCards();
    selectedSong();
    syncSettings();
  }
});
$('#reset').onclick = () => {
  settings = {
    feverAuto: true,
    language: settings.language,
    languageMode: settings.languageMode,
    reducedMotion: settings.reducedMotion,
    lanes: settings.lanes,
    difficulty: settings.difficulty,
    position: 'left',
    speed: 1.5,
    fader: 'off',
    shuffle: 'off',
    volume: 0.7,
    keys: structuredClone(defaults),
  };
  syncSettings();
};
function playPath() {
  if (externalSource(SONGS[songIndex].id)) return selectionPath();
  return `/play/${SONGS[songIndex].id}/${settings.lanes}/${settings.difficulty}/?speed=${settings.speed.toFixed(1)}&fader=${settings.fader}&shuffle=${settings.shuffle}&seed=${shuffleSeed}${perfOverlay ? '&perf=1' : ''}`;
}
function selectionPath() {
  return `/select/?song=${SONGS[songIndex].id}&lanes=${settings.lanes}&difficulty=${settings.difficulty}&speed=${settings.speed.toFixed(1)}&fader=${settings.fader}&shuffle=${settings.shuffle}&seed=${shuffleSeed}${perfOverlay ? '&perf=1' : ''}`;
}

function showAudioRecovery(
  item: NonNullable<ReturnType<typeof externalSource>>,
  error: unknown,
) {
  const recoveryHref = location.href,
    recoveryNavigation = navigationVersion;
  const recoveryReplay = savedReplay,
    recoveryResult = lastResult;
  const dialog = document.createElement('dialog');
  dialog.className = 'share-error';
  const text = document.createElement('p');
  text.textContent =
    externalError(error, settings.language) +
    ' ' +
    sharedAudioLabels(settings.language).explain;
  const restore = document.createElement('button');
  restore.className = 'primary';
  restore.textContent = sharedAudioLabels(settings.language).restore;
  const close = document.createElement('button');
  close.textContent = t('close');
  const controller = new AbortController();
  close.onclick = () => {
    controller.abort();
    dialog.close();
    dialog.remove();
  };
  dialog.addEventListener('cancel', () => controller.abort());
  dialog.addEventListener('close', () => {
    controller.abort();
    dialog.remove();
  });
  restore.onclick = async () => {
    restore.disabled = true;
    restore.textContent = externalLabels(settings.language).preparing;
    try {
      await recoverSharedAudio(
        item,
        AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]),
      );
      const stillCurrent =
        navigationVersion === recoveryNavigation &&
        location.href === recoveryHref &&
        savedReplay === recoveryReplay &&
        lastResult === recoveryResult &&
        $<HTMLDialogElement>('#results').open &&
        dialog.open;
      dialog.close();
      dialog.remove();
      if (stillCurrent) await watchReplay();
    } catch (e) {
      if (!controller.signal.aborted)
        text.textContent =
          externalError(e, settings.language) +
          ' ' +
          sharedAudioLabels(settings.language).explain;
    } finally {
      restore.disabled = false;
      restore.textContent = sharedAudioLabels(settings.language).restore;
    }
  };
  dialog.append(text, restore, close);
  document.body.append(dialog);
  dialog.showModal();
}
async function openExternalShare(fragment: string) {
  const request = ++shareRouteRequest;
  const href = location.href;
  const navigation = navigationVersion;
  const data = await decodeExternalShare(fragment);
  if (
    request !== shareRouteRequest ||
    location.href !== href ||
    navigationVersion !== navigation
  )
    return;
  await pinSource(data.record);
  if (
    request !== shareRouteRequest ||
    location.href !== href ||
    navigationVersion !== navigation
  )
    return;
  const item = installExternalSource(
    data.record,
    data.title,
    undefined,
    data.jobId,
  );
  if (!SONGS.some((s) => s.id === item.song.id)) SONGS.push(item.song);
  receivedShare = { fragment, data };
  savedReplay = data.replay;
  lastResult = data.result;
  replayExpected = false;
  replayIssue = false;
  replayText = '';
  readRoute();
}

function readRoute(initial = false) {
  localBuiltinNotes = undefined;
  if (location.pathname !== '/result/')
    document.documentElement.removeAttribute('data-result-pending');
  const fragment = location.hash.slice(1);
  if (
    location.pathname === '/result/' &&
    fragment.startsWith('v=5&d=') &&
    receivedShare?.fragment !== fragment
  ) {
    const routeHref = location.href,
      routeNavigation = navigationVersion;
    void openExternalShare(fragment).catch(() => {
      if (location.href !== routeHref || navigationVersion !== routeNavigation)
        return;
      toast(shareLabels(settings.language).invalid);
      document.documentElement.removeAttribute('data-result-pending');
    });
    return;
  }
  readingRoute = true;
  document
    .querySelectorAll<HTMLDialogElement>('dialog[open]')
    .forEach((d) => d.close());
  if (active || paused) exit();
  document.body.classList.remove('results-screen');
  const parts = location.pathname.split('/').filter(Boolean);
  const q = new URLSearchParams(location.search);
  const speed = Number(q.get('speed'));
  if (q.has('speed') && Number.isFinite(speed) && speed >= 1 && speed <= 9)
    settings.speed = Math.round(speed * 10) / 10;
  if ((FADERS as readonly string[]).includes(q.get('fader') || ''))
    settings.fader = q.get('fader') as Fader;
  if (q.has('perf')) perfOverlay = q.get('perf') === '1';
  document.body.classList.toggle('perf-enabled', perfOverlay);
  $('#fps').hidden = !perfOverlay;
  if (['off', 'mirror', 'random'].includes(q.get('shuffle') || ''))
    settings.shuffle = q.get('shuffle') as Shuffle;
  const seed = Number(q.get('seed'));
  if (
    q.has('seed') &&
    Number.isInteger(seed) &&
    seed >= 0 &&
    seed <= 4294967295
  )
    shuffleSeed = seed;
  const externalShared =
    parts[0] === 'result' && receivedShare?.fragment === fragment
      ? receivedShare.data
      : undefined;
  const shared =
    externalShared?.result ??
    (parts[0] === 'result'
      ? readResult(
          location.hash ? new URLSearchParams(location.hash.slice(1)) : q,
        )
      : null);
  if (shared && !externalShared) {
    lastResult = shared;
    const replayParams = new URLSearchParams(location.hash.slice(1));
    const encoded = replayParams.get('r');
    replayExpected = replayParams.get('rp') === '1' || !!encoded;
    replayExpectedLength = Number(
      replayParams.get('rn') || encoded?.length || 0,
    );
    replayIssue = replayExpected && !encoded;
    savedReplay = undefined;
    replayText = '';
    if (encoded) {
      replayEncoding = (async () => {
        const r =
          replayParams.has('rn') &&
          (replayExpectedLength !== encoded.length ||
            !Number.isInteger(replayExpectedLength))
            ? null
            : await decodeReplay(encoded);
        if (lastResult === shared && r && replayMatches(r, shared)) {
          savedReplay = r;
          replayText = encoded;
          history.replaceState(null, '', resultLink(shared));
          syncReplayButton();
        } else if (lastResult === shared) {
          replayIssue = true;
          syncReplayButton();
          toast(REPLAY_LABELS[settings.language][2]);
        }
      })();
    }
    settings.lanes = shared.lanes;
    settings.difficulty = shared.difficulty;
  }
  if (externalShared) {
    savedReplay = externalShared.replay;
    lastResult = externalShared.result;
    settings.lanes = externalShared.replay.lanes;
    settings.difficulty = externalShared.replay.difficulty;
  }
  const id = shared
    ? shared.song
    : parts[0] === 'play'
      ? parts[1]
      : q.get('song');
  const idx = SONGS.findIndex((s) => s.id === id);
  if (idx >= 0 && (shared || !isHiddenSong(SONGS[idx].id))) {
    songIndex = shared
      ? idx
      : (visibleSongIndices().find(
          (i) =>
            libraryVideoKey(SONGS[i].id) === libraryVideoKey(SONGS[idx].id),
        ) ?? idx);
  } else if (!shared && isHiddenSong(SONGS[songIndex].id))
    songIndex = visibleSongIndices()[0];
  if (!shared && !externalShared && !visibleSongIndices().includes(songIndex))
    songIndex = visibleSongIndices()[0];
  const lanes = parts[0] === 'play' ? parts[2] : q.get('lanes');
  const difficulty = parts[0] === 'play' ? parts[3] : q.get('difficulty');
  if (lanes === '5' || lanes === '7') settings.lanes = Number(lanes) as Lanes;
  if (
    difficulty === 'low' ||
    difficulty === 'mid' ||
    difficulty === 'high' ||
    difficulty === 'sc'
  )
    settings.difficulty = difficulty;
  screen =
    parts[0] === 'play'
      ? 'ready'
      : parts[0] === 'select'
        ? 'select'
        : parts[0] === 'replays'
          ? 'replays'
          : 'home';
  if (screen === 'select' && !id) restoreLibrarySelection();
  readyAutostart = initial && screen === 'ready' && !mobilePlaybackOnly();
  document.body.classList.toggle('home-screen', screen === 'home');
  document.body.classList.toggle('ready-screen', screen === 'ready');
  $('#home-screen').classList.toggle('hidden', screen !== 'home');
  $('#ready-screen').classList.toggle(
    'hidden',
    screen !== 'ready' || readyAutostart,
  );
  $('#lobby').classList.toggle('hidden', screen !== 'select');
  $('#replays').classList.toggle('hidden', screen !== 'replays');
  if (screen === 'replays') void showReplays();
  $('#game').classList.add('hidden');
  $('#ready-title').textContent = SONGS[songIndex].title;
  $('#ready-detail').textContent =
    `${settings.lanes} KEY / ${chartLevel(SONGS[songIndex], settings.difficulty, settings.lanes)} / ENTER`;
  if (readyAutostart) {
    const loadingSong = SONGS[songIndex];
    const wallpaper = $<HTMLImageElement>('#loading-wallpaper');
    armedWallpaperAt = 0;
    wallpaper.hidden = true;
    wallpaper.referrerPolicy = 'no-referrer';
    wallpaper.dataset.songArt = loadingSong.id;
    wallpaper.src = songArt(loadingSong.id);
    void wallpaper
      .decode()
      .then(() => {
        if (wallpaper.dataset.songArt !== loadingSong.id) return;
        wallpaper.hidden = false;
        if (!armedWallpaperAt) armedWallpaperAt = performance.now();
      })
      .catch(() => {});
    if (!cache.get(loadingSong.id) && !preloading.has(loadingSong.id))
      preloading.set(
        loadingSong.id,
        preloadTrack(loadingSong.id)
          .then((track) => {
            if (track) cache.set(loadingSong.id, track);
            return track;
          })
          .finally(() => preloading.delete(loadingSong.id)),
      );
    $('#loading-title').textContent = loadingSong.title;
    $('#loading-title').previousElementSibling!.textContent = externalSource(
      loadingSong.id,
    )
      ? 'YOUTUBE'
      : 'ORVIO ORIGINALS';
    $('#loading-detail').textContent =
      `${loadingSong.genre} · ${loadingSong.bpm} BPM · ${settings.lanes} KEY`;
    $('#loading-status').textContent = `${t('start')} · ENTER ↵`;
    $('#cancel-startup').textContent =
      externalLabels(settings.language).cancel + ' · ESC';
    $('#song-loading').classList.remove('hidden');
    $('#song-loading').classList.add('awaiting-start');
  } else if (!preparing) {
    armedWallpaperAt = 0;
    $('#song-loading').classList.add('hidden');
    $('#song-loading').classList.remove('awaiting-start');
  }
  localize();
  songCards();
  selectedSong();
  syncSettings();
  restoreLibraryScroll();
  readingRoute = false;
  if (shared) {
    // A verified replay owns its FEVER summary. Do not paint an incomplete
    // result while decoding and then leave that row missing after reload.
    const encoded = new URLSearchParams(location.hash.slice(1)).get('r');
    if (encoded)
      void replayEncoding.then(() => {
        if (lastResult === shared) showResult(shared);
      });
    else showResult(shared);
  }
}
$('#home-start').onclick = () => {
  // Keep the document alive so the gesture's fullscreen survives routing.
  // Permission denial never blocks starting the game.
  if (!document.fullscreenElement) void requestGameFullscreen();
  history.pushState(null, '', '/select/');
  readRoute();
  $('#start').focus();
  void previewSong();
};
$('#ready-start').onclick = () => {
  if (mobilePlaybackOnly()) {
    toast(t('unsupported'));
    return;
  }
  document.body.classList.remove('ready-screen');
  void start();
};
window.addEventListener('popstate', () => {
  navigationVersion++;
  if (startup) {
    startup.cancel();
    return;
  }
  readRoute();
});
/** Warm-cache-first shared replay load: identical identity (replay id),
 * expiry enforced locally exactly as the network path does. */
async function resolveSharedReplay(
  id: string,
): Promise<{ fragment: string; expiresAt: string }> {
  await queryReady;
  const key = queryKeys.sharedReplay(id);
  const cached = queryClient.getQueryData<{
    fragment: string;
    expiresAt: string;
  }>(key);
  if (cached) {
    if (Date.parse(cached.expiresAt) > Date.now()) return cached;
    queryClient.removeQueries({ queryKey: key });
  }
  return loadSharedReplay(id);
}
let initialArrivalKey: string | null = null;
let initialArrivalFragment: string | null = null;
async function readInitialRoute() {
  // The ?s= flow replaceStates to the fragment form before rendering; keep
  // the arrival identity so the projection is written under both.
  initialArrivalKey = resultIdentityKey(location.href);
  initialArrivalFragment =
    location.hash.length > 1 ? location.hash.slice(1) : null;
  let expectedHref = location.href;
  const initialNavigation = navigationVersion;
  const stillInitial = () =>
    navigationVersion === initialNavigation && location.href === expectedHref;
  const id = new URLSearchParams(location.search).get('s');
  if (!id) {
    if (location.hash.startsWith('#v=5&d=')) {
      try {
        await openExternalShare(location.hash.slice(1));
      } catch {
        if (!stillInitial()) return;
        finishResultFirstPaint(null);
        toast(shareLabels(settings.language).invalid);
        document.documentElement.removeAttribute('data-result-pending');
      }
      return;
    }
    // A37: a play fallback can boot the app for a source the local library
    // no longer holds; recover honestly instead of readying another song.
    const playId = location.pathname.match(/^\/play\/([^/]+)\//)?.[1];
    if (playId && !SONGS.some((s) => s.id === playId)) {
      history.replaceState(null, '', '/select/');
      toast(shareLabels(settings.language).missing);
    }
    readRoute(true);
    await replayEncoding;
    document.documentElement.removeAttribute('data-result-pending');
    return;
  }
  const labels = shareLabels(settings.language);
  try {
    // ORV-62: the restored IndexedDB query cache is awaited (fast local
    // read) so a previously fetched result renders instantly with no
    // network wait. Only a cold or expired cache reaches the network.
    const loaded = await resolveSharedReplay(id);
    if (!stillInitial()) return;
    const params = new URLSearchParams(loaded.fragment);
    if (params.get('v') === '5') {
      shortCache.set(loaded.fragment, { id, expiresAt: loaded.expiresAt });
      history.replaceState(null, '', '/result/#' + loaded.fragment);
      expectedHref = location.href;
      await openExternalShare(loaded.fragment);
      return;
    }
    if (!readResult(params)) throw new ShareError(400);
    const encoded = params.get('r');
    if (
      encoded &&
      params.has('rn') &&
      Number(params.get('rn')) !== encoded.length
    )
      throw new ShareError(400);
    if (encoded) {
      const replay = await decodeReplay(encoded);
      if (!stillInitial()) return;
      if (!replay || !replayMatches(replay, readResult(params)!))
        throw new ShareError(400);
    }
    if (params.get('rp') === '1' && !encoded) throw new ShareError(400);
    shortCache.set(loaded.fragment, { id, expiresAt: loaded.expiresAt });
    history.replaceState(null, '', '/result/#' + loaded.fragment);
    readRoute();
  } catch (error) {
    if (!stillInitial()) return;
    finishResultFirstPaint(null);
    readRoute();
    const dialog = document.createElement('dialog');
    dialog.className = 'share-error';
    const text = document.createElement('p');
    text.textContent =
      error instanceof ShareError && error.status === 404
        ? labels.missing
        : error instanceof ShareError && error.status === 400
          ? labels.invalid
          : labels.failed;
    const close = document.createElement('button');
    close.textContent = t('close');
    close.onclick = () => {
      dialog.close();
      history.replaceState(null, '', '/select/');
      readRoute();
    };
    dialog.append(text, close);
    document.body.append(dialog);
    dialog.showModal();
    document.documentElement.removeAttribute('data-result-pending');
  }
}
const initialQuery = new URLSearchParams(location.search);
const deferredLibraryRoute =
  location.pathname.includes('/yt-') ||
  initialQuery.get('song')?.startsWith('yt-') ||
  initialQuery.has('local') ||
  initialQuery.has('s') ||
  location.hash.startsWith('#v=5&d=');
// A37: until the library hydrate finishes and the initial route is read, no
// screen owns this route; the default markup would paint the home screen's
// start button under the user's refresh.
if (deferredLibraryRoute) {
  $('#home-screen').classList.add('hidden');
  $('#lobby').classList.add('hidden');
}
if (!deferredLibraryRoute) void readInitialRoute();
async function reconcileLibraryRow(row: CanonicalLibraryRow) {
  if ((row as CanonicalLibraryRow & { active?: boolean }).active) return;
  const activeRow = row as CanonicalLibraryRow & { active?: boolean };
  activeRow.active = true;
  row.state = 'loading';
  songCards();
  try {
    const result = await reconcileCanonical(row, AbortSignal.timeout(90000));
    await saveLocalAudio(
      result.record,
      result.title,
      result.jobId,
      result.bytes,
      result.author,
    );
    const item = installExternalSource(
      result.record,
      result.title,
      result.bytes,
      result.jobId,
      result.author,
    );
    if (!SONGS.some((s) => s.id === item.song.id)) SONGS.push(item.song);
    canonicalPreferred.set(row.videoId, item.song.id);
    canonicalPending.delete(row.videoId);
    recoverDisplayMetadata(result.record);
  } catch (error) {
    row.state = 'error';
    row.error =
      error instanceof AudioJobError ? error : new AudioJobError('unavailable');
  } finally {
    activeRow.active = false;
    songCards();
    if (!active && !preparing && screen === 'select') {
      if (!visibleSongIndices().includes(songIndex))
        songIndex = visibleSongIndices()[0];
      selectedSong();
    }
  }
}
const displayMetadataRequests = new Set<string>();
function recoverDisplayMetadata(
  record: import('./external-source').SourceRecord,
) {
  const key =
    record.videoId + ':' + record.audioSha256 + ':' + record.chartSetSha256;
  if (displayMetadataRequests.has(key)) return;
  displayMetadataRequests.add(key);
  void (async () => {
    try {
      const metadata = await readCanonicalMetadata(record);
      if (!metadata) return;
      await updateLocalDisplayMetadata(record, metadata.title, metadata.author);
      updateExternalDisplayMetadata(record, metadata.title, metadata.author);
      for (const song of SONGS) {
        const item = externalSource(song.id);
        if (
          item?.record.videoId === record.videoId &&
          item.record.audioSha256 === record.audioSha256 &&
          item.record.chartSetSha256 === record.chartSetSha256
        ) {
          song.title = metadata.title;
          if (metadata.author !== null)
            song.subtitle = metadata.author || song.subtitle;
        }
      }
      const pending = canonicalPending.get(record.videoId);
      if (pending) pending.title = metadata.title;
      const resultSource = lastResult && externalSource(lastResult.song);
      if (
        resultSource?.record.videoId === record.videoId &&
        resultSource.record.audioSha256 === record.audioSha256 &&
        resultSource.record.chartSetSha256 === record.chartSetSha256 &&
        $<HTMLDialogElement>('#results').open
      ) {
        $('#result-song').textContent = metadata.title;
      }
      if (!active && !preparing && screen === 'select') {
        songCards();
        selectedSong();
      } else if (screen === 'replays') void showReplays();
    } catch {
      /* Optional display recovery never blocks or replaces a playable source. */
    }
  })();
}
async function initializeLibrary() {
  try {
    for (const record of await allPinnedSources()) {
      const saved = await localMetadata(record);
      const item = installExternalSource(
        record,
        saved?.title ?? record.videoId,
        undefined,
        saved?.jobId,
        saved?.author,
      );
      if (!SONGS.some((s) => s.id === item.song.id)) SONGS.push(item.song);
      if (!canonicalPending.has(record.videoId))
        canonicalPending.set(record.videoId, {
          videoId: record.videoId,
          title: saved?.title ?? record.videoId,
          archiveId: item.song.id,
          jobId: saved?.jobId,
          state: 'loading',
        });
    }
    for (const row of [...canonicalPending.values()]) {
      try {
        const record =
          (await savedCanonical(row.videoId)) ??
          (await savedLocalGenerated(row.videoId));
        const saved = record ? await localMetadata(record) : null;
        if (record) {
          const item = installExternalSource(
            record,
            saved?.title ?? row.title,
            undefined,
            saved?.jobId,
            saved?.author,
          );
          if (!SONGS.some((s) => s.id === item.song.id)) SONGS.push(item.song);
          canonicalPreferred.set(row.videoId, item.song.id);
          canonicalPending.delete(row.videoId);
          recoverDisplayMetadata(record);
        }
      } catch {
        /* Keep archive and pending recovery, never select an unverified chart. */
      }
    }
  } catch {
    if (location.pathname !== '/replays/' && location.pathname !== '/replays')
      toast(REPLAY_READ_ERROR[settings.language]);
  }
  libraryHydrated = true;
  for (const song of SONGS) {
    const item = externalSource(song.id);
    if (item) recoverDisplayMetadata(item.record);
  }
  for (const row of canonicalPending.values()) void reconcileLibraryRow(row);
  backgroundImports.resume();
  if (deferredLibraryRoute) await readInitialRoute();
  else if (screen === 'select' && !active) {
    if (!new URLSearchParams(location.search).has('song'))
      restoreLibrarySelection();
    songCards();
    selectedSong();
    syncSettings();
    restoreLibraryScroll();
  } else if (screen === 'replays') void showReplays();
  finishLibraryFirstPaint();
  const local = new URLSearchParams(location.search).get('local');
  if (local) {
    try {
      const session = local.startsWith('builtin:')
        ? await readBuiltinSession(local)
        : await readLocalSession(local);
      localBuiltinNotes =
        session && 'kind' in session && session.kind === 'builtin'
          ? session.chart
          : undefined;
      if (!session) throw Error();
      savedReplay = session.replay;
      lastResult = session.result;
      replayExpected = false;
      replayIssue = false;
      songIndex = SONGS.findIndex((s) => s.id === session.replay.song);
      localSessionKey = session.key;
      ownResults.add(session.result);
      settings.lanes = session.replay.lanes;
      settings.difficulty = session.replay.difficulty;
      showResult(session.result);
    } catch {
      finishResultFirstPaint(null);
      toast(REPLAY_READ_ERROR[settings.language]);
      document.documentElement.removeAttribute('data-result-pending');
    }
  }
}
void initializeLibrary();

// Read-only diagnostics. Never includes credentials, account identifiers, or private source paths.
Object.defineProperty(window, 'orvioDiagnostics', {
  get: () => ({
    version: '0.2.48',
    active,
    paused,
    fever: engine
      ? {
          metadata: engine.fever.metadata,
          status: engine.fever.status,
          stage: engine.fever.stage,
          charge: engine.fever.charge,
          displayCombo: engine.fever.displayCombo,
          maxDisplayCombo: engine.fever.maxDisplayCombo,
          journal: engine.fever.journal,
        }
      : null,
    sessionId,
    song: SONGS[songIndex].id,
    settings: {
      language: settings.language,
      languageMode: settings.languageMode,
      lanes: settings.lanes,
      difficulty: settings.difficulty,
      speed: settings.speed,
      fader: settings.fader,
      shuffle: settings.shuffle,
      shuffleSeed,
    },
    clock: clock?.now(),
    notes: engine?.states.map((s) => ({ ...s })),
    score: engine?.score,
    resolved: engine?.resolved,
    total: engine?.total,
    events: engine?.events,
    metrics: active ? field?.stats() : latestMetrics,
    audioPeak: rendered?.peak,
    audioActive: clock?.active ?? false,
    previewActive: !!preview,
    fullscreenEscape: fullscreenEscapeStatus(),
    replayActive: !!playReplay,
    replayAvailable: !!savedReplay,
    audioContextState: clock?.context.state,
    outputLatency: clock?.context.outputLatency,
    baseLatency: clock?.context.baseLatency,
  }),
});

// Prevent page text/image dragging, while preserving ranges and real controls.
document.addEventListener(
  'dragstart',
  (e) => {
    if (!editableTarget(e.target)) e.preventDefault();
  },
  true,
);
document.addEventListener(
  'selectstart',
  (e) => {
    if (!editableTarget(e.target)) e.preventDefault();
  },
  true,
);

// Lightweight read-only timing sample for input path diagnostics. Avoid copying
// the whole chart each millisecond in real-time integration checks.
Object.defineProperty(window, 'orvioAudioTime', { get: () => clock?.now() });

enhanceSelects();

// One verified thumbnail choice is used by every view, including later image loads.
document.addEventListener('orvio:art-ready', (event) => {
  const id = (event as CustomEvent<string>).detail;
  if (!externalSource(id)) return;
  const url = songArt(id);
  document
    .querySelectorAll<HTMLImageElement>('[data-song-art]')
    .forEach((img) => {
      if (img.dataset.songArt === id) {
        if (img.classList.contains('replay-art'))
          img.hidden = url === ART_FALLBACK;
        img.src = url;
      }
    });
  if (SONGS[songIndex]?.id === id)
    $('#selected-art').style.backgroundImage =
      `url("${url}"), url("${ART_FALLBACK}")`;
  if (libraryHydrated && screen === 'select')
    rememberLibraryFirstPaint(
      visibleSongIndices().map((i) => SONGS[i].id),
      SONGS[songIndex].id,
    );
  if ($('#game').dataset.song === id)
    document.body.style.setProperty(
      '--play-wallpaper',
      `url("${url}"), url("${ART_FALLBACK}")`,
    );
});
