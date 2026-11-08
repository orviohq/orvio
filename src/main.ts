import './scrollbars.css';
import { replayFrameChanged } from './replay-frame';
import {
  difficultyForChart,
  difficultyText,
  ratingBasisText,
} from './chart-difficulty';
import { FEVER_LABELS } from './fever-labels';
import { CURRENT_FEVER } from './fever';
import { renderFeverHud } from './fever-hud';
import { regenerateSource } from './external-regenerate';
import { regenerationLabels } from './regeneration-labels';
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
import { externalLabels } from './external-labels';
import { importYoutube } from './external-import';
import { allPinnedSources } from './external-source-store';
import {
  externalSource,
  externalAudio,
  installExternalSource,
} from './external-catalog';
import { FULLSCREEN_WARNING } from './fullscreen-labels';
import { saveSharedReplay, loadSharedReplay, ShareError } from './share-api';
import { shareLabels } from './share-labels';
import { ScoreDisplay } from './score-display';
import { REPLAY_LABELS } from './replay-labels';
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
import { resultBadges } from './result-badges';
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
import { LANGUAGES, translate, type Language, type Word } from './i18n';
import './style.css';
import {
  SONGS,
  makeChart,
  duration,
  type Difficulty,
  type Lanes,
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
    feverAuto: automatic.feverAuto !== false,
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
let screen: 'home' | 'select' | 'ready' | 'play' = 'select';
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
<header><a class="brand" href="/" aria-label="orvio home"><img class="brand-symbol" src="/favicon.png" alt=""><img src="/wordmark.svg" alt="orvio"></a><span class="edition">RHYTHM SYSTEM <i></i> 0.2.21</span><nav><button id="fullscreen" class="quiet">F11 ${label('fullscreen')}</button><button id="open-settings" class="quiet">F2 ${label('options')}</button></nav></header>
<section id="home-screen"><a class="home-patches" data-patch-link target="_blank" rel="noopener noreferrer" href="/patch-notes/">${label('patchNotes')}</a><button id="home-start" class="primary">${label('start')} <span>ENTER ↵</span></button></section><section id="ready-screen" class="hidden"><h1 id="ready-title"></h1><p id="ready-detail"></p><button id="ready-start" class="primary">${label('start')} <span>ENTER ↵</span></button><button id="ready-options" class="quiet">F3 ${label('gameOptions')}</button><a href="/select/">${label('back')}</a></section><main id="lobby"><section class="intro"><div class="eyebrow">${label('selected')} <span id="selection-number">01 / 03</span></div><div id="selected-art" class="selected-art cover-0"><div class="art-grid"></div><div class="art-orbit"></div><div class="art-orbit second"></div><div class="art-core"></div><span class="art-index">01</span><span class="art-mark">ORVIO / ORIGINALS</span></div><div class="selected-meta"><span id="selected-genre"></span><span id="selected-bpm"></span></div><h1 id="selected-title"></h1><p id="selected-subtitle"></p><div class="preview-status"><i></i><span id="preview-status">${t('previewReady')}</span><div class="equalizer"><b></b><b></b><b></b><b></b><b></b></div></div><div class="mobile-note">${label('mobile')}</div></section>
<section class="library" aria-label="Track selection"><div class="section-title"><strong>${label('select')}</strong><span>ORIGINALS / 001</span></div><div id="songs"></div><div class="selection"><div class="segmented" id="difficulty" aria-label="Difficulty"><button data-diff="low">NM</button><button data-diff="mid">HD</button><button data-diff="high">MX</button><button data-diff="sc">SC</button></div><div class="segmented compact" id="lanes"><button data-lanes="5">5 KEY</button><button data-lanes="7">7 KEY</button></div></div><div class="start-row"><button id="open-game-options" class="quiet">F3 ${label('gameOptions')}</button><button id="start" class="primary">${label('start')} <span>ENTER ↵</span></button></div><div class="under-start"><span id="chart-info"></span><span>${label('keyboard')}</span></div></section>
<section class="footer-strip"><a data-patch-link target="_blank" rel="noopener noreferrer" href="/patch-notes/">${label('patchNotes')}</a><span>${label('selectionHint')}</span><button id="about-button" class="quiet">F1 ${label('about')}</button></section></main>
<section id="game" class="hidden" aria-label="Rhythm game"><div class="game-top"><button id="exit" class="quiet">ESC ${label('exit')}</button><div class="song-now"><strong id="now-title"></strong><span id="now-detail"></span></div><span id="fps" hidden></span></div><div id="progress"><div></div></div><div id="arena" data-position="center"><aside class="score-block"><span class="eyebrow">${label('score')}</span><strong id="score">0000000</strong><div><b id="rate">100.00</b><span>% ${label('accuracy')}</span></div><section id="fever-hud" class="hidden" aria-live="off"></section></aside><div id="highway-wrap"><div id="highway"></div><div id="impact" aria-hidden="true"></div><div id="judge" aria-live="off"></div><div id="combo"></div><div id="keycaps"></div><button id="play-options" class="quiet option-readout"></button><div id="countdown"></div></div><aside class="track-block"><div class="orb-mini"></div><span class="eyebrow">ORVIO ORIGINALS</span><h2 id="side-title"></h2><div id="lane-detail"></div></aside></div><div class="game-footer"></div></section>
<dialog id="pause"><div class="eyebrow">ORVIO / SESSION</div><h2>${label('pause')}</h2><button id="resume" class="primary">${label('resume')} ↵</button><button id="pause-settings" class="quiet">F2 ${label('options')}</button><button id="pause-exit" class="quiet">${label('back')}</button></dialog><dialog id="settings"><form method="dialog"><div class="dialog-title"><div><span class="eyebrow">SYSTEM / OPTIONS</span><h2>${label('options')}</h2></div><button class="close" aria-label="Close">×</button></div></form><div class="settings-tabs" role="tablist"><button data-settings-tab="general" id="settings-general-tab" role="tab" aria-controls="settings-general" aria-selected="true">${label('options')}</button><button data-settings-tab="keys" id="settings-keys-tab" role="tab" aria-controls="settings-keys" aria-selected="false" tabindex="-1">${label('bindings')}</button></div><div class="settings-grid"><section class="settings-general" id="settings-general" role="tabpanel" aria-labelledby="settings-general-tab"><label for="language">${label('language')}</label><select id="language"><option value="auto">${t('browserLanguage')}</option>${Object.entries(
  LANGUAGES,
)
  .map(([k, v]) => `<option value="${k}">${v}</option>`)
  .join(
    '',
  )}</select><label>${label('position')}</label><div class="segmented" id="position"><button data-pos="left"><span class="position-preview" aria-hidden="true"><i></i><b></b><i></i></span>${label('left')}</button><button data-pos="center"><span class="position-preview" aria-hidden="true"><i></i><b></b><i></i></span>${label('center')}</button><button data-pos="right"><span class="position-preview" aria-hidden="true"><i></i><b></b><i></i></span>${label('right')}</button></div><label for="volume">${label('volume')}</label><input id="volume" type="range" min="0" max="1" step="0.05"></section><section class="settings-keys" id="settings-keys" role="tabpanel" aria-labelledby="settings-keys-tab"><label>${label('bindings')} <span id="binding-mode"></span></label><div id="bindings"></div><p class="hint" id="bind-hint">${label('bindHint')}</p></section></div><label class="toggle"><span id="fever-option-label">${FEVER_LABELS[settings.language].option} · ${FEVER_LABELS[settings.language].rules}</span><input id="fever-auto" type="checkbox"></label><label class="toggle"><span>${label('reduced')}</span><input id="reduced-motion" type="checkbox"></label><button id="reset" class="quiet">${label('reset')}</button><p class="local-note">TAB / SHIFT TAB / ESC</p></dialog>
<div id="song-loading" class="hidden" role="status" aria-live="polite"><img id="loading-wallpaper" alt=""><div class="loading-info"><span>ORVIO ORIGINALS</span><h1 id="loading-title"></h1><p id="loading-detail"></p><strong id="loading-status"></strong><button id="cancel-startup" class="quiet" type="button"></button></div></div><dialog id="game-options"><form method="dialog"><div class="dialog-title"><h2>${label('gameOptions')}</h2><button class="close" aria-label="Close">×</button></div></form><label for="speed">${label('speed')} <output id="speed-value"></output></label><select id="speed"></select><label for="fader">${label('fader')}</label><select id="fader"><option value="off">OFF</option><option value="in">FADE IN</option><option value="in2">FADE IN 2</option><option value="out">FADE OUT</option><option value="out2">FADE OUT 2</option><option value="blink">BLINK</option><option value="blink2">BLINK 2</option><option value="fog">FOG</option><option value="pixel">PIXEL</option><option value="pixel2">PIXEL 2</option><option value="blind">BLIND</option></select><label for="shuffle">${label('shuffle')}</label><select id="shuffle"><option value="off">OFF</option><option value="mirror">MIRROR</option><option value="random">RANDOM</option></select><p class="hint" id="option-hint">${label('optionHint')}</p><button id="options-done" class="primary">${label('close')} ↵</button></dialog><dialog id="restart-options"><h2>${label('shuffleRestart')}</h2><p>${label('shuffleRestartHint')}</p><button id="confirm-shuffle-restart" class="primary">${label('restartApply')}</button><button id="cancel-shuffle-restart" class="quiet">${label('cancelChange')}</button></dialog><dialog id="results" tabindex="-1" aria-labelledby="result-song"><div class="result-system">ORVIO / SESSION REPORT</div><div class="result-heading"><img id="result-art" alt=""><div class="result-track"><h2 id="result-song"></h2><p id="result-metadata"></p><button id="result-preview" class="quiet" aria-pressed="false"></button></div><span id="result-rank"></span></div><p id="result-options"></p><div id="result-badge"></div><div class="result-score" id="result-score"></div><div class="result-stats"><div><span>${label('accuracy')}</span><strong id="result-rate"></strong></div><div><span>${label('maxCombo')}</span><strong id="result-combo"></strong></div><div><span>BREAK</span><strong id="result-break"></strong></div></div><p id="result-fever" class="hint hidden"></p><div id="judgment-list"></div><p id="share-status" class="hint" role="status"></p><p id="replay-status" class="hint hidden" role="status"></p><button id="watch-replay" class="quiet hidden"></button><div class="result-actions"><button id="share-result" class="quiet"></button><button id="back" class="quiet">ESC ${label('back')}</button><button id="retry" class="primary">${label('retry')} ↵</button></div></dialog>

<dialog id="about"><form method="dialog"><div class="dialog-title"><h2>${label('aboutTitle')}</h2><button class="close" aria-label="Close">×</button></div></form><p>${label('aboutBody')}</p><a href="https://github.com/orviohq/orvio" target="_blank" rel="noreferrer">${label('code')} ↗</a></dialog><div id="toast" role="status"></div>`;
app.insertAdjacentHTML(
  'beforeend',
  '<dialog id="youtube-import"><form id="youtube-form"><div class="dialog-title"><h2 id="youtube-heading"></h2><button id="youtube-cancel" type="button" class="close">×</button></div><label for="youtube-url" id="youtube-label"></label><input id="youtube-url" type="url" required autocomplete="off" placeholder="https://www.youtube.com/watch?v=…"><p id="youtube-rights" class="hint"></p><div id="youtube-progress" hidden role="status" aria-live="polite"><span class="youtube-spinner" aria-hidden="true"></span><strong id="youtube-progress-label"></strong><span id="youtube-elapsed"></span><progress aria-label="YouTube"></progress></div><p id="youtube-status" role="status" class="hint"></p><button id="youtube-submit" class="primary"></button></form></dialog>',
);
const addYoutube = document.createElement('button');
addYoutube.id = 'add-youtube';
addYoutube.className = 'quiet';
const libraryActions = document.createElement('div');
libraryActions.id = 'library-actions';
$('#songs').before(libraryActions);
libraryActions.append(addYoutube);
const localReplayButton = document.createElement('button');
localReplayButton.id = 'local-replay';
localReplayButton.className = 'quiet hidden';
addYoutube.after(localReplayButton);
const regenerateButton = document.createElement('button');
regenerateButton.id = 'regenerate-chart';
regenerateButton.className = 'quiet hidden';
localReplayButton.after(regenerateButton);
let regenerating = false;
regenerateButton.onclick = async () => {
  const original = externalSource(SONGS[songIndex].id);
  if (!original || regenerating || active || preparing) return;
  regenerating = true;
  regenerateButton.disabled = true;
  regenerateButton.textContent = regenerationLabels(settings.language).busy;
  // Paint the loading label before local analysis starts.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  try {
    const next = await regenerateSource(original.record);
    const item = installExternalSource(
      next.record,
      next.audio.title,
      next.audio.bytes,
      next.audio.jobId,
      next.audio.author,
    );
    let index = SONGS.findIndex((s) => s.id === item.song.id);
    if (index < 0) {
      SONGS.push(item.song);
      index = SONGS.length - 1;
    }
    regenerating = false;
    songCards();
    selectSong(index, false);
    toast(externalLabels(settings.language).saved);
  } catch {
    toast(externalLabels(settings.language).failed);
  } finally {
    regenerating = false;
    regenerateButton.disabled = false;
    regenerateButton.textContent = regenerationLabels(settings.language).create;
  }
};
localReplayButton.onclick = () => void openLocalSession(SONGS[songIndex].id);
async function openLocalSession(id: string) {
  try {
    const session = await readLocalSession(id);
    if (!session) throw Error();
    savedReplay = session.replay;
    replayExpected = false;
    replayIssue = false;
    lastResult = session.result;
    localSessionKey = session.key;
    showResult(session.result);
  } catch {
    toast(externalLabels(settings.language).failed);
  }
}
let selectionVersion = 0;
let importController: AbortController | undefined;
addYoutube.onclick = () => {
  $('#youtube-status').textContent = '';
  $('#youtube-progress').hidden = true;
  $<HTMLButtonElement>('#youtube-submit').disabled = false;
  $<HTMLDialogElement>('#youtube-import').showModal();
  $('#youtube-url').focus();
};
$('#youtube-import').addEventListener('cancel', () =>
  importController?.abort(),
);
$('#youtube-cancel').onclick = () => {
  importController?.abort();
  $<HTMLDialogElement>('#youtube-import').close();
};
$('#youtube-form').onsubmit = async (e) => {
  e.preventDefault();
  importController?.abort();
  const controller = new AbortController();
  importController = controller;
  const labels = externalLabels(settings.language);
  $<HTMLButtonElement>('#youtube-submit').disabled = true;
  $('#youtube-status').textContent = '';
  const progress = $('#youtube-progress');
  progress.hidden = false;
  $('#youtube-form').setAttribute('aria-busy', 'true');
  $('#youtube-progress-label').textContent = labels.preparing;
  const started = performance.now();
  const elapsed = setInterval(() => {
    if (controller.signal.aborted) return;
    $('#youtube-elapsed').textContent =
      Math.floor((performance.now() - started) / 1000) + ' s';
  }, 1000);
  // Paint the busy state before audio analysis can occupy the main thread.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  try {
    controller.signal.throwIfAborted();
    const r = await importYoutube(
      $<HTMLInputElement>('#youtube-url').value.trim(),
      controller.signal,
    );
    if (controller.signal.aborted) return;
    const title = r.title?.trim() || 'YouTube · ' + r.prepared.record.videoId;
    await saveLocalAudio(
      r.prepared.record,
      title,
      r.jobId,
      r.prepared.bytes,
      r.author,
    );
    if (controller.signal.aborted || importController !== controller) return;
    const item = installExternalSource(
      r.prepared.record,
      title,
      r.prepared.bytes,
      r.jobId,
      r.author,
    );
    let index = SONGS.findIndex((s) => s.id === item.song.id);
    if (index < 0) {
      SONGS.push(item.song);
      index = SONGS.length - 1;
    }
    songCards();
    selectSong(index, false);
    $<HTMLDialogElement>('#youtube-import').close();
    toast(labels.saved);
  } catch (error) {
    if (
      importController === controller &&
      !(error instanceof DOMException && error.name === 'AbortError')
    )
      $('#youtube-status').textContent = externalError(
        error,
        settings.language,
      );
  } finally {
    clearInterval(elapsed);
    if (importController === controller) {
      progress.hidden = true;
      $('#youtube-elapsed').textContent = '';
      $('#youtube-form').removeAttribute('aria-busy');
      $<HTMLButtonElement>('#youtube-submit').disabled = false;
    }
  }
};
guardFullscreenEscape();
document.addEventListener('orvio:fullscreen-capture', () => {
  if (fullscreenEscapeStatus() !== 'locked')
    toast(FULLSCREEN_WARNING[settings.language]);
});
const scoreDisplay = new ScoreDisplay($('#score'));
function localize() {
  const external = externalLabels(settings.language);
  $('#add-youtube').textContent = external.add;
  $('#local-replay').textContent = external.replay;
  regenerateButton.textContent = regenerationLabels(settings.language).create;
  $('#youtube-heading').textContent = external.add;
  $('#youtube-label').textContent = external.url;
  $('#youtube-submit').textContent = external.submit;
  $('#youtube-rights').textContent =
    externalError(new AudioJobError('too_long'), settings.language) +
    ' ' +
    external.rights +
    ' ' +
    external.saved;
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
  $('#fever-option-label').textContent =
    FEVER_LABELS[settings.language].option +
    ' · ' +
    FEVER_LABELS[settings.language].rules;
  $<HTMLInputElement>('#fever-auto').checked = settings.feverAuto;
  $<HTMLInputElement>('#fever-auto').disabled = active || preparing;
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
  $('#selection-number').textContent =
    `0${songIndex + 1} / ${String(SONGS.length).padStart(2, '0')}`;
  $('#selected-title').textContent = song.title;
  const originLabel = document.querySelector<HTMLElement>(
    '#selected-art .art-mark',
  );
  if (originLabel)
    originLabel.textContent = externalSource(song.id)
      ? 'YOUTUBE'
      : 'ORVIO / ORIGINALS';
  $('#selected-subtitle').textContent = externalSource(song.id)
    ? song.subtitle +
      ' · ' +
      (externalSource(song.id)!.record.chartSetSha256
        ? regenerationLabels(settings.language).current
        : regenerationLabels(settings.language).original)
    : t(('subtitle' + songIndex) as Word);
  $('#selected-genre').textContent = song.genre;
  $('#selected-bpm').textContent = song.bpm + ' BPM';
  const selection = ++selectionVersion;
  regenerateButton.classList.toggle('hidden', !externalSource(song.id));
  localReplayButton.classList.add('hidden');
  if (externalSource(song.id))
    void readLocalSession(song.id)
      .then((r) => {
        if (selection === selectionVersion)
          localReplayButton.classList.toggle('hidden', !r);
      })
      .catch(() => {});
}
function selectSong(index: number, audition = true) {
  if (preparing || active || regenerating) return;
  songIndex = (index + SONGS.length) % SONGS.length;
  stopPreview();
  rendered = cache.get(SONGS[songIndex].id);
  songCards();
  syncSettings();
  selectedSong();
  $('#songs .song-card.selected').scrollIntoView({ block: 'nearest' });
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
  document.querySelector<HTMLElement>(
    '.library .section-title>span',
  )!.textContent = SONGS.some((s) => externalSource(s.id))
    ? externalLabels(settings.language).library
    : 'ORIGINALS / 001';
  $('#songs').innerHTML = SONGS.map(
    (s, i) =>
      `<button class="song-card ${i === songIndex ? 'selected' : ''}" data-song="${i}" style="--accent:${s.color}"><span class="cover cover-${i}">${externalSource(s.id) ? `<img class="youtube-cover" src="${songArt(s.id)}" alt="" referrerpolicy="no-referrer">` : `<span class="orb"></span><span class="cover-number">0${i + 1}</span>`}</span><span class="song-copy"><small>${s.genre} <i>·</i> ${s.bpm} BPM</small><strong>${escapeText(s.title)}</strong><span>${externalSource(s.id) ? escapeText(s.subtitle + ' · ' + (externalSource(s.id)!.record.chartSetSha256 ? regenerationLabels(settings.language).current : regenerationLabels(settings.language).original)) : t(('subtitle' + i) as Word)}</span></span><span class="song-time"><em class="song-level">${chartLevel(s, settings.difficulty, settings.lanes)}</em>${Math.floor(duration(s) / 60)}:${Math.floor(
        duration(s) % 60,
      )
        .toString()
        .padStart(2, '0')} <b>↗</b></span></button>`,
  ).join('');
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
    b.title = ratingBasisText(settings.language);
  });
  document
    .querySelectorAll<HTMLElement>('.song-level')
    .forEach(
      (el, i) =>
        (el.textContent = chartLevel(
          SONGS[i],
          settings.difficulty,
          settings.lanes,
        )),
    );
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
  $('#chart-info').textContent =
    `${makeChart(SONGS[songIndex], settings.difficulty, settings.lanes).length} ${t('notes')} · ${externalSource(SONGS[songIndex].id) ? 'YouTube' : t('original')} · ${ratingBasisText(settings.language)}`;
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
  if (!readingRoute && screen === 'select')
    history.replaceState(null, '', selectionPath());
}
function toast(s: string) {
  // A modal's top layer hides even high-z-index siblings. Keep feedback inside it.
  const host = document.querySelector('dialog[open]') ?? document.body;
  host.append($('#toast'));
  $('#toast').textContent = s;
  $('#toast').classList.add('visible');
  setTimeout(() => $('#toast').classList.remove('visible'), 3000);
}
function stopPreview() {
  previewRequest++;
  try {
    preview?.stop();
  } catch {
    /* Preview ended. */
  }
  preview = undefined;
  syncResultPreview();
  $('#preview-status').textContent = t('previewReady');
  document.body.classList.remove('previewing');
}
async function ensureExternalBytes(id: string) {
  const external = externalSource(id);
  if (external && !external.bytes) {
    const saved = await localAudio(external.record);
    if (!saved) throw Error('Matching source audio unavailable');
    external.bytes = saved.bytes;
  }
}
async function prepare(attempt: StartupAttempt) {
  if (!clock) clock = new AudioClock();
  const audio = clock;
  await attempt.wait(audio.context.resume());
  const song = SONGS[songIndex];
  await attempt.wait(ensureExternalBytes(song.id));
  let track =
    cache.get(song.id) ??
    (externalSource(song.id)
      ? { buffer: externalAudio(song.id, audio.context), peak: 1 }
      : await attempt.wait(cachedAudio(song.id, audio.context)));
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
$('#cancel-startup').onclick = () => startup?.cancel();
async function start() {
  if (screen === 'home') {
    $('#home-start').click();
    return;
  }
  if (preparing || active || regenerating) return;
  if (matchMedia('(pointer: coarse)').matches && innerWidth < 900) {
    toast(t('unsupported'));
    return;
  }
  preparing = true;
  const attempt = new StartupAttempt();
  startup = attempt;
  const loadingSong = SONGS[songIndex];
  const wallpaper = $<HTMLImageElement>('#loading-wallpaper');
  // Changing src may leave the last decoded image painted until the new decode.
  // Hide it before the overlay can be visible, then reveal only the new image.
  wallpaper.hidden = true;
  wallpaper.referrerPolicy = 'no-referrer';
  wallpaper.src = songArt(loadingSong.id);
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
    const wallpaperAt = performance.now();
    const track = await prepare(attempt);
    $('#lobby').classList.add('hidden');
    $('#game').classList.remove('hidden');
    // Keep renderer resources local to one play session so a later start
    // cannot reuse stale lane geometry from a previous sprite batch.
    field?.dispose();
    field = new Playfield();
    await attempt.wait(field.init($('#highway'), attempt.signal));
    const song = SONGS[songIndex];
    engine = new Engine(
      transformChart(
        makeChart(song, settings.difficulty, settings.lanes),
        settings.lanes,
        settings.shuffle,
        shuffleSeed,
      ),
      playReplay
        ? playReplay.fever
        : { ...CURRENT_FEVER, auto: settings.feverAuto },
    );
    seenEvents = 0;
    sequence = 0;
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
          fever: { ...CURRENT_FEVER, auto: settings.feverAuto },
        };
    replayCursor = 0;
    lastRecordedSpeed = settings.speed;
    lastRecordedFader = settings.fader;
    replayAudioQueue = Promise.resolve();
    document.body.classList.toggle('replay-view', !!playReplay);
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
    // Reserve the longest supported travel window (1x), regardless of the
    // starting speed. Live speed changes cannot bring a note onto the field
    // before this countdown ends. No hidden-note gate or shifted chart times.
    const cd = startupCountdownTiming(
      song.bpm,
      engine!.states[0]?.note.time ?? (4 * 60) / song.bpm,
    );
    countdownFallAt = cd.firstFall;
    countdownBeat = cd.beat;
    countdownLegacy = !!playReplay && playReplay.audioLeadIn === undefined;
    // New recordings stamp their exact lead-in; watching a pre-A5 replay
    // restores the fixed 0.15s anchor its wall-scheduled ops were made on.
    if (sessionReplay) sessionReplay.audioLeadIn = cd.leadIn;
    await attempt.wait(
      clock.play(
        track.buffer,
        playReplay ? (playReplay.audioLeadIn ?? 0.15) : cd.leadIn,
        attempt.signal,
      ),
    );
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
              filter: 'brightness(2)',
            },
            {
              transform: 'scale(.98) skewX(-3deg)',
              filter: 'brightness(1.2)',
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
    $('#progress > div').style.width =
      Math.min(100, Math.max(0, (time / duration(SONGS[songIndex])) * 100)) +
      '%';
    const recent = field.frames.slice(-60);
    $('#fps').textContent = recent.length
      ? Math.round(1000 / (recent.reduce((a, b) => a + b, 0) / recent.length)) +
        ' FPS'
      : '-- FPS';
  }
  if (
    playReplay
      ? performance.now() - sessionWallAt >= playReplay.end
      : time >= duration(SONGS[songIndex])
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
          toast(externalLabels(settings.language).failed);
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
  if (externalSource(result.song))
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
  screen = 'select';
  delete $('#share-status').dataset.message;
  $('#share-status').textContent = '';
  $('#share-status').classList.add('hidden');
  lastResult = result;
  const sharedURL = resultLink(result);
  history.replaceState(null, '', sharedURL);
  document.body.classList.remove('home-screen', 'ready-screen');
  document.body.classList.add('results-screen');
  $('#share-result').innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8"/></svg>';
  $('#share-result').setAttribute('aria-label', t('shareResult'));
  $('#share-result').title = t('shareResult');

  stopPreview();
  $('#result-song').textContent =
    SONGS.find((s) => s.id === result.song)?.title ?? result.song;
  $<HTMLButtonElement>('#share-result').hidden = !!externalSource(result.song);
  resultOptions(result);
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
    replayMatches(savedReplay, result)
  ) {
    const verified = replayEngine(savedReplay);
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
}

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
  resultArt.src = songArt(song.id);
  const count = makeChart(song, result.difficulty, result.lanes).length;
  $('#result-metadata').textContent =
    `${song.genre} · ${song.bpm} BPM · ${count} ${t('notes')}`;
  $('#result-metadata').title = RESULT_LABELS[settings.language][2];
  syncResultPreview();
  syncReplayButton();
  $('#result-options').innerHTML = resultBadges(result, {
    keys: 'KEY',
    difficulty: chartLevel(song, result.difficulty, result.lanes),
    speed: t('speed'),
    shuffle: t('shuffle'),
    fader: t('fader'),
  });
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
  screen = 'select';
  if (!readingRoute) history.pushState(null, '', selectionPath());
  selectedSong();
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
      importController?.abort();
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
    if (
      (e.target as HTMLElement)?.matches('button,input,select,a') &&
      e.code === 'Enter'
    )
      return;
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      e.preventDefault();
      selectSong(songIndex + (e.code === 'ArrowDown' ? 1 : -1));
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
  if (!active || !engine || e.repeat) return;
  const lane = settings.keys[settings.lanes].indexOf(e.code);
  if (lane < 0) return;
  e.preventDefault();
  field.pressed.add(lane);
  recordInput(lane, keyTime(e), true);
});
window.addEventListener('keyup', (e) => {
  if (editableTarget(e.target)) return;
  if (playReplay) return;
  if (!active || !engine) return;
  const lane = settings.keys[settings.lanes].indexOf(e.code);
  if (lane < 0) return;
  e.preventDefault();
  field.pressed.delete(lane);
  recordInput(lane, paused ? clock.now() : keyTime(e), false);
});
window.addEventListener('blur', () => {
  stopPreview();
  if (active && !paused) {
    void pauseGame();
  }
});
document.addEventListener('visibilitychange', () => {
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
  $<HTMLInputElement>('#fever-auto').disabled = true;
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
  if (lastResult && externalSource(lastResult.song)) return;
  if (!lastResult || shareBusy) return;
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
    if (replayExpected && (!savedReplay || !replayText || replayIssue))
      throw new ShareError(400);
    const fragment = new URL(resultLink(lastResult!)).hash.slice(1);
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
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': link.then(
            (url) => new Blob([url], { type: 'text/plain' }),
          ),
        }),
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
$('#watch-replay').onclick = () => {
  if (!savedReplay || !lastResult || !replayMatches(savedReplay, lastResult)) {
    toast(REPLAY_LABELS[settings.language][2]);
    return;
  }
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
};
$('#start').onclick = () => void start();
$('#exit').onclick = () => void pauseGame();
$('#retry').onclick = () => {
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
  $<HTMLInputElement>('#fever-auto').disabled = false;
  $<HTMLDialogElement>('#settings').showModal();
  syncSettings();
};
$('#about-button').onclick = () => $<HTMLDialogElement>('#about').showModal();
let previewRequest = 0;
async function previewSong() {
  const request = ++previewRequest;
  const song = SONGS[songIndex];
  if (!clock) clock = new AudioClock();
  try {
    // resume is called during the selection key/click gesture, before rendering.
    await clock.context.resume();
    await ensureExternalBytes(song.id);
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
  $('#preview-status').textContent = t(preview ? 'nowPlaying' : 'previewReady');
};
$('#fever-auto').onchange = (e) => {
  if (active || preparing) return;
  settings.feverAuto = (e.target as HTMLInputElement).checked;
  persist();
};
$('#reduced-motion').onchange = (e) => {
  settings.reducedMotion = (e.target as HTMLInputElement).checked;
  localize();
  persist();
  if (!readingRoute && screen === 'select')
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
  return `/play/${SONGS[songIndex].id}/${settings.lanes}/${settings.difficulty}/?speed=${settings.speed.toFixed(1)}&fader=${settings.fader}&shuffle=${settings.shuffle}&seed=${shuffleSeed}`;
}
function selectionPath() {
  return `/select/?song=${SONGS[songIndex].id}&lanes=${settings.lanes}&difficulty=${settings.difficulty}&speed=${settings.speed.toFixed(1)}&fader=${settings.fader}&shuffle=${settings.shuffle}&seed=${shuffleSeed}`;
}
function readRoute() {
  readingRoute = true;
  document
    .querySelectorAll<HTMLDialogElement>('dialog[open]')
    .forEach((d) => d.close());
  if (active || paused) exit();
  const parts = location.pathname.split('/').filter(Boolean);
  const q = new URLSearchParams(location.search);
  const speed = Number(q.get('speed'));
  if (q.has('speed') && Number.isFinite(speed) && speed >= 1 && speed <= 9)
    settings.speed = Math.round(speed * 10) / 10;
  if ((FADERS as readonly string[]).includes(q.get('fader') || ''))
    settings.fader = q.get('fader') as Fader;
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
  const shared =
    parts[0] === 'result'
      ? readResult(
          location.hash ? new URLSearchParams(location.hash.slice(1)) : q,
        )
      : null;
  if (shared) {
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
  const id = shared
    ? shared.song
    : parts[0] === 'play'
      ? parts[1]
      : q.get('song');
  const idx = SONGS.findIndex((s) => s.id === id);
  if (idx >= 0) songIndex = idx;
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
    parts[0] === 'play' ? 'ready' : parts[0] === 'select' ? 'select' : 'home';
  document.body.classList.toggle('home-screen', screen === 'home');
  document.body.classList.toggle('ready-screen', screen === 'ready');
  $('#home-screen').classList.toggle('hidden', screen !== 'home');
  $('#ready-screen').classList.toggle('hidden', screen !== 'ready');
  $('#lobby').classList.toggle('hidden', screen !== 'select');
  $('#game').classList.add('hidden');
  $('#ready-title').textContent = SONGS[songIndex].title;
  $('#ready-detail').textContent =
    `${settings.lanes} KEY / ${chartLevel(SONGS[songIndex], settings.difficulty, settings.lanes)} / ENTER`;
  localize();
  songCards();
  selectedSong();
  syncSettings();
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
  document.body.classList.remove('ready-screen');
  void start();
};
window.addEventListener('popstate', () => {
  if (startup) {
    startup.cancel();
    return;
  }
  readRoute();
});
async function readInitialRoute() {
  const id = new URLSearchParams(location.search).get('s');
  if (!id) {
    readRoute();
    await replayEncoding;
    document.documentElement.removeAttribute('data-result-pending');
    return;
  }
  const labels = shareLabels(settings.language);
  try {
    const loaded = await loadSharedReplay(id),
      params = new URLSearchParams(loaded.fragment);
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
      if (!replay || !replayMatches(replay, readResult(params)!))
        throw new ShareError(400);
    }
    if (params.get('rp') === '1' && !encoded) throw new ShareError(400);
    shortCache.set(loaded.fragment, { id, expiresAt: loaded.expiresAt });
    history.replaceState(null, '', '/result/#' + loaded.fragment);
    readRoute();
  } catch (error) {
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
  initialQuery.has('local');
if (!deferredLibraryRoute) void readInitialRoute();
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
    }
  } catch {
    toast(externalLabels(settings.language).failed);
  }
  if (deferredLibraryRoute) await readInitialRoute();
  else if (screen === 'select' && !active) {
    songCards();
    selectedSong();
  }
  const local = new URLSearchParams(location.search).get('local');
  if (local) {
    try {
      const session = await readLocalSession(local);
      if (!session) throw Error();
      savedReplay = session.replay;
      lastResult = session.result;
      replayExpected = false;
      replayIssue = false;
      songIndex = SONGS.findIndex((s) => s.id === session.replay.song);
      localSessionKey = session.key;
      settings.lanes = session.replay.lanes;
      settings.difficulty = session.replay.difficulty;
      showResult(session.result);
    } catch {
      toast(externalLabels(settings.language).failed);
    }
  }
}
void initializeLibrary();

// Read-only diagnostics. Never includes credentials, account identifiers, or private source paths.
Object.defineProperty(window, 'orvioDiagnostics', {
  get: () => ({
    version: '0.2.21',
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
