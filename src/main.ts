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
  lanes: Lanes;
  difficulty: Difficulty;
  position: 'left' | 'center' | 'right';
  speed: number;
  offset: number;
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
  return {
    lanes: 5,
    difficulty: 'low',
    position: 'center',
    speed: 1.6,
    offset: 0,
    volume: 0.7,
    keys: structuredClone(defaults),
    ...saved,
  };
}
let settings = getSettings();
let songIndex = 0;
let engine: Engine | null = null;
let clock: AudioClock;
let field: Playfield;
let active = false;
let sequence = 0;
let frame = 0;
let seenEvents = 0;
let binding = -1;
let rendered: Soundtrack | undefined;
let preview: AudioBufferSourceNode | undefined;
let preparing = false;
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
function keyLabel(code: string) {
  return code === 'Space' ? 'SPACE' : code.replace(/^(Key|Digit)/, '');
}
const app = $('#app');
app.innerHTML = `
<header><a class="brand" href="/" aria-label="orvio home"><img class="brand-symbol" src="/favicon.png" alt=""><img src="/wordmark.svg" alt="orvio"></a><span class="edition">PLAY LAB <i></i> 0.1</span><nav><button id="open-settings" class="quiet">설정 <span>↗</span></button><a href="https://github.com/orviohq/orvio" target="_blank" rel="noreferrer">GitHub ↗</a></nav></header>
<main id="lobby"><section class="intro"><div class="eyebrow">A LITTLE RHYTHM. A DIFFERENT WORLD.</div><h1>한 박자,<br><em>다른 세계.</em></h1><p>손끝으로 찾는 나만의 흐름.<br>헤드폰을 쓰고, 첫 노트를 만나보세요.</p><div class="mobile-note">모바일에서는 곡과 설정을 둘러볼 수 있어요.<br>플레이는 키보드가 연결된 데스크톱에서.</div><div class="tiny-note">3 ORIGINAL TRACKS · 5 / 7 KEYS · NO ACCOUNT</div></section>
<section class="library" aria-label="곡 선택"><div class="section-title"><span>SELECT YOUR FREQUENCY</span><span>01 — 03</span></div><div id="songs"></div><div class="selection"><div class="segmented" id="difficulty" aria-label="난이도"><button data-diff="low">하 <small>EASY</small></button><button data-diff="mid">중 <small>NORMAL</small></button><button data-diff="high">상 <small>HARD</small></button></div><div class="segmented compact" id="lanes"><button data-lanes="5">5 KEY</button><button data-lanes="7">7 KEY</button></div></div><div class="start-row"><button id="preview" class="round" aria-label="선택곡 미리듣기">▷</button><button id="start" class="primary">플레이 <span>↗</span></button></div><div class="under-start"><span id="chart-info"></span><span>ENTER TO PLAY</span></div></section>
<section class="footer-strip"><span><i></i> LOCAL-FIRST RHYTHM ENGINE</span><p>귀로 듣고, 손으로 느끼세요.</p><button id="about-button" class="quiet">프로토타입 노트 ↗</button></section></main>
<section id="game" class="hidden" aria-label="리듬 게임"><div class="game-top"><button id="exit" class="quiet">← 나가기 <small>ESC</small></button><div class="song-now"><strong id="now-title"></strong><span id="now-detail"></span></div><div class="perf"><span id="fps">-- FPS</span><i></i></div></div><div id="progress"><div></div></div><div id="arena" data-position="center"><aside class="score-block"><span class="eyebrow">SCORE</span><strong id="score">0000000</strong><div><b id="rate">100.00</b><span>% ACCURACY</span></div><p id="live-note">헤드폰을 쓰고, 흐름을 따라가세요.</p></aside><div id="highway-wrap"><div id="highway"></div><div id="judge" aria-live="off"></div><div id="combo"></div><div id="keycaps"></div><div id="countdown"></div></div><aside class="track-block"><div class="orb-mini"></div><span class="eyebrow">FIND YOUR FLOW</span><h2 id="side-title"></h2><p>음악의 시간 위로<br>노트가 흐릅니다.</p><div id="lane-detail"></div></aside></div><div class="game-footer"><span>HOLD NOTES: 누르고 있다가 끝에서 놓으세요</span><span id="clock-info">AUDIO CLOCK · OUTPUT ALIGNED</span></div></section>
<dialog id="settings"><form method="dialog"><div class="dialog-title"><div><span class="eyebrow">MAKE IT YOURS</span><h2>플레이 설정</h2></div><button class="close" aria-label="닫기">×</button></div></form><label>노트 영역 위치</label><div class="segmented" id="position"><button data-pos="left">왼쪽</button><button data-pos="center">중앙</button><button data-pos="right">오른쪽</button></div><label for="speed">스크롤 속도 <output id="speed-value"></output></label><input id="speed" type="range" min="0.8" max="3" step="0.1"><label for="offset">입력 보정 <output id="offset-value"></output></label><input id="offset" type="range" min="-150" max="150" step="1"><p class="hint">늦게 누르는 편이면 +, 빠르면 −. 블루투스 대신 유선 헤드폰을 권장해요.</p><label for="volume">음악 볼륨</label><input id="volume" type="range" min="0" max="1" step="0.05"><label>키 배치 <span id="binding-mode"></span></label><div id="bindings"></div><p class="hint" id="bind-hint">버튼을 선택하고 원하는 키를 누르세요. 중복 키는 사용할 수 없어요.</p><button id="reset" class="quiet">기본값으로 되돌리기</button><p class="local-note">설정은 이 브라우저에만 저장돼요. 서버 전송 없음.</p></dialog>
<dialog id="results"><span class="eyebrow">YOU FOUND YOUR FLOW</span><div class="result-heading"><h2 id="result-song"></h2><span id="result-rank"></span></div><div id="result-badge"></div><div class="result-score" id="result-score"></div><div class="result-stats"><div><span>ACCURACY</span><strong id="result-rate"></strong></div><div><span>MAX COMBO</span><strong id="result-combo"></strong></div><div><span>BREAK</span><strong id="result-break"></strong></div></div><div id="judgment-list"></div><p id="result-perf" class="hint"></p><div class="result-actions"><button id="back" class="quiet">곡 선택</button><button id="retry" class="primary">한 번 더 ↗</button></div></dialog>
<dialog id="about"><form method="dialog"><div class="dialog-title"><h2>Prototype notes</h2><button class="close" aria-label="닫기">×</button></div></form><p>orvio 0.1 · 오픈소스 키보드 리듬게임</p><p>세 곡은 이 프로젝트를 위해 만든 오리지널 신스 트랙입니다. 5키 / 7키와 곡별 상·중·하, 롱노트를 지원해요.</p><p>판정 표기는 DJMAX RESPECT V의 MAX 100%~10%, MAX 1%, BREAK를 참고합니다. 1,000,000점 만점·정확도 기반 점수를 사용합니다.</p><p>전체 판정 시간표와 내부 반올림은 공식 공개자료에서 확인되지 않았어요. 이 버전의 세부 시간창·롱노트 처리는 프로토타입 규칙이며 DJMAX와 완전히 같다는 의미는 아닙니다.</p><p>브라우저의 주사율·기기·오디오 경로에 따라 지연과 프레임은 달라집니다. 무지연·모든 환경의 60fps 보장은 하지 않아요. 탭이 숨겨지면 플레이를 중단합니다.</p><a href="https://github.com/orviohq/orvio" target="_blank" rel="noreferrer">코드 · 테스트 · 판정 근거 ↗</a></dialog><div id="toast" role="status"></div>`;
function songCards() {
  $('#songs').innerHTML = SONGS.map(
    (s, i) =>
      `<button class="song-card ${i === songIndex ? 'selected' : ''}" data-song="${i}" style="--accent:${s.color}"><span class="cover cover-${i}"><span class="orb"></span><span class="cover-number">0${i + 1}</span></span><span class="song-copy"><small>${s.genre} <i>·</i> ${s.bpm} BPM</small><strong>${s.title}</strong><span>${s.subtitle}</span></span><span class="song-time">${Math.floor(duration(s) / 60)}:${Math.floor(
        duration(s) % 60,
      )
        .toString()
        .padStart(2, '0')} <b>↗</b></span></button>`,
  ).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-song]').forEach(
    (b) =>
      (b.onclick = () => {
        songIndex = Number(b.dataset.song);
        stopPreview();
        rendered = cache.get(SONGS[songIndex].id);
        songCards();
        syncSettings();
      }),
  );
}
function syncSettings() {
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
  document
    .querySelectorAll('[data-pos]')
    .forEach((b) =>
      b.classList.toggle(
        'selected',
        (b as HTMLElement).dataset.pos === settings.position,
      ),
    );
  $('#chart-info').textContent =
    `${makeChart(SONGS[songIndex], settings.difficulty, settings.lanes).length} NOTES · ORIGINAL SYNTH`;
  for (const id of ['speed', 'offset', 'volume'] as const)
    $<HTMLInputElement>('#' + id).value = String(settings[id]);
  $('#speed-value').textContent = settings.speed.toFixed(1) + '×';
  $('#offset-value').textContent =
    (settings.offset >= 0 ? '+' : '') + settings.offset + ' ms';
  $('#binding-mode').textContent = settings.lanes + ' KEY';
  $('#bindings').innerHTML = settings.keys[settings.lanes]
    .map(
      (k, i) =>
        `<button data-bind="${i}" class="key-bind">${keyLabel(k)}</button>`,
    )
    .join('');
  document.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(
    (b) =>
      (b.onclick = () => {
        binding = Number(b.dataset.bind);
        b.classList.add('listening');
        b.textContent = '…';
      }),
  );
  persist();
}
function toast(s: string) {
  $('#toast').textContent = s;
  $('#toast').classList.add('visible');
  setTimeout(() => $('#toast').classList.remove('visible'), 3000);
}
function stopPreview() {
  try {
    preview?.stop();
  } catch {
    /* Preview ended. */
  }
  preview = undefined;
  $('#preview').textContent = '▷';
}
async function prepare() {
  if (!clock) clock = new AudioClock();
  await clock.context.resume();
  const song = SONGS[songIndex];
  rendered = cache.get(song.id);
  if (!rendered) {
    $('#start').textContent = '사운드 준비 중…';
    rendered = await renderSong(song);
    cache.set(song.id, rendered);
  }
  $('#start').innerHTML = '플레이 <span>↗</span>';
  return rendered;
}
async function start() {
  if (preparing || active) return;
  if (matchMedia('(pointer: coarse)').matches && innerWidth < 900) {
    toast('플레이는 키보드가 연결된 데스크톱에서 열어주세요.');
    return;
  }
  preparing = true;
  stopPreview();
  $('#start').setAttribute('disabled', '');
  try {
    const track = await prepare();
    $('#lobby').classList.add('hidden');
    $('#game').classList.remove('hidden');
    if (!field) {
      field = new Playfield();
      await field.init($('#highway'));
    }
    const song = SONGS[songIndex];
    engine = new Engine(makeChart(song, settings.difficulty, settings.lanes));
    seenEvents = 0;
    sequence = 0;
    sessionId = crypto.randomUUID();
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
    $('#now-detail').textContent = `${song.genre} · ${song.bpm} BPM`;
    $('#lane-detail').textContent =
      `${settings.lanes} KEY · ${{ low: 'EASY', mid: 'NORMAL', high: 'HARD' }[settings.difficulty]}`;
    $('#keycaps').innerHTML = settings.keys[settings.lanes]
      .map((k) => `<span>${keyLabel(k)}</span>`)
      .join('');
    $('#judge').textContent = '';
    $('#combo').textContent = '';
    $('#clock-info').textContent = 'AUDIO CLOCK · OUTPUT ALIGNED';
    clock.setVolume(settings.volume);
    await clock.play(track.buffer);
    active = true;
    frame = requestAnimationFrame(loop);
  } catch (e) {
    toast('시작하지 못했어요. 오디오 권한을 확인하고 다시 눌러주세요.');
    console.error(e);
    exit();
  } finally {
    preparing = false;
    $('#start').removeAttribute('disabled');
  }
}
function judgment(e: JudgmentEvent) {
  const j = $('#judge');
  j.textContent = e.value ? 'MAX ' + e.value + '%' : 'BREAK';
  j.className = e.value === 0 ? 'break' : e.value === 100 ? 'perfect' : '';
  j.style.animation = 'none';
  void j.offsetWidth;
  j.style.animation = 'judge-in .25s ease-out';
  field.flashes.set(e.lane, { at: performance.now(), ok: e.value > 0 });
  if (e.value === 100) clock.click();
}
let hudAt = 0;
function loop(now: number) {
  if (!active || !engine) return;
  const time = clock.now();
  engine.update(time);
  for (; seenEvents < engine.events.length; seenEvents++)
    judgment(engine.events[seenEvents]);
  field.draw(engine, settings.lanes, time, 2 / settings.speed, now);
  if (now - hudAt > 50) {
    hudAt = now;
    $('#score').textContent = engine.score.toString().padStart(7, '0');
    $('#rate').textContent = engine.rate.toFixed(2);
    $('#combo').textContent = engine.combo > 1 ? engine.combo + '' : '';
    $('#progress > div').style.width =
      Math.min(100, Math.max(0, (time / duration(SONGS[songIndex])) * 100)) +
      '%';
    $('#countdown').textContent =
      time < 0
        ? 'READY'
        : time < (4 * 60) / SONGS[songIndex].bpm
          ? String(
              Math.max(1, 4 - Math.floor(time / (60 / SONGS[songIndex].bpm))),
            )
          : '';
    const recent = field.frames.slice(-60);
    $('#fps').textContent = recent.length
      ? Math.round(1000 / (recent.reduce((a, b) => a + b, 0) / recent.length)) +
        ' FPS'
      : '-- FPS';
  }
  if (time >= duration(SONGS[songIndex])) {
    finish();
    return;
  }
  frame = requestAnimationFrame(loop);
}
function finish() {
  if (!engine) return;
  active = false;
  cancelAnimationFrame(frame);
  clock.stop();
  field.pressed.clear();
  engine.update(9999);
  latestMetrics = field.stats();
  const stats = field.stats();
  $('#result-song').textContent = SONGS[songIndex].title;
  $('#result-rank').textContent = engine.rank;
  $('#result-badge').textContent =
    engine.sum === engine.total * 100
      ? 'PERFECT PLAY'
      : engine.breaks === 0
        ? 'MAX COMBO'
        : 'SESSION COMPLETE';
  $('#result-score').textContent = engine.score.toLocaleString('en-US');
  $('#result-rate').textContent = (engine.sum / engine.total).toFixed(2) + '%';
  $('#result-combo').textContent = String(engine.maxCombo);
  $('#result-break').textContent = String(engine.breaks);
  $('#judgment-list').innerHTML = [
    100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0,
  ]
    .map(
      (v) =>
        `<div><span>${v ? 'MAX ' + v + '%' : 'BREAK'}</span><b>${engine!.events.filter((e) => e.value === v).length}</b></div>`,
    )
    .join('');
  $('#result-perf').textContent =
    `이 세션 ${stats.averageFps.toFixed(1)} FPS 평균 · P95 ${stats.p95FrameMs.toFixed(1)} ms · ${stats.samples} frames · ${stats.renderer}`;
  $<HTMLDialogElement>('#results').showModal();
}
function exit() {
  active = false;
  cancelAnimationFrame(frame);
  clock?.stop();
  field?.pressed.clear();
  $('#game').classList.add('hidden');
  $('#lobby').classList.remove('hidden');
}
function keyTime(e: KeyboardEvent) {
  let stamp = e.timeStamp;
  if (stamp > 1e12) stamp -= performance.timeOrigin;
  return clock.now(stamp) - settings.offset / 1000;
}
window.addEventListener('keydown', (e) => {
  if (binding >= 0) {
    e.preventDefault();
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
      toast('다른 키를 선택해주세요.');
      return;
    }
    if (
      settings.keys[settings.lanes].some(
        (k, i) => k === e.code && i !== binding,
      )
    ) {
      toast('이미 사용 중인 키예요.');
      return;
    }
    settings.keys[settings.lanes][binding] = e.code;
    binding = -1;
    syncSettings();
    return;
  }
  if (e.code === 'Escape' && active) {
    exit();
    toast('플레이를 중단했어요. 다시 시작하면 점수가 초기화돼요.');
    return;
  }
  if (
    e.code === 'Enter' &&
    !active &&
    !document.querySelector('dialog[open]')
  ) {
    e.preventDefault();
    void start();
    return;
  }
  if (!active || !engine || e.repeat) return;
  const lane = settings.keys[settings.lanes].indexOf(e.code);
  if (lane < 0) return;
  e.preventDefault();
  field.pressed.add(lane);
  engine.input({ lane, time: keyTime(e), down: true, sequence: sequence++ });
});
window.addEventListener('keyup', (e) => {
  if (!active || !engine) return;
  const lane = settings.keys[settings.lanes].indexOf(e.code);
  if (lane < 0) return;
  e.preventDefault();
  field.pressed.delete(lane);
  engine.input({ lane, time: keyTime(e), down: false, sequence: sequence++ });
});
window.addEventListener('blur', () => {
  if (active) {
    exit();
    toast('포커스가 바뀌어 안전하게 중단했어요.');
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && active) {
    exit();
  }
});
$('#settings').addEventListener('close', () => {
  binding = -1;
  syncSettings();
});
$('#start').onclick = () => void start();
$('#exit').onclick = exit;
$('#retry').onclick = () => {
  $<HTMLDialogElement>('#results').close();
  exit();
  void start();
};
$('#back').onclick = () => {
  $<HTMLDialogElement>('#results').close();
  exit();
};
$('#open-settings').onclick = () => {
  if (active) return;
  $<HTMLDialogElement>('#settings').showModal();
  syncSettings();
};
$('#about-button').onclick = () => $<HTMLDialogElement>('#about').showModal();
$('#preview').onclick = async () => {
  if (preview) {
    stopPreview();
    return;
  }
  if (preparing) return;
  preparing = true;
  try {
    const t = await prepare();
    preview = clock.context.createBufferSource();
    preview.buffer = t.buffer;
    const gain = clock.context.createGain();
    gain.gain.value = settings.volume * 0.5;
    preview.connect(gain);
    gain.connect(clock.context.destination);
    preview.start(0, 8, 12);
    const source = preview;
    preview.onended = () => {
      if (preview === source) {
        preview = undefined;
        $('#preview').textContent = '▷';
      }
    };
    $('#preview').textContent = 'Ⅱ';
  } finally {
    preparing = false;
  }
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
for (const id of ['speed', 'offset', 'volume'] as const)
  $<HTMLInputElement>('#' + id).oninput = (e) => {
    settings[id] = Number((e.target as HTMLInputElement).value);
    syncSettings();
  };
$('#reset').onclick = () => {
  settings = {
    lanes: settings.lanes,
    difficulty: settings.difficulty,
    position: 'center',
    speed: 1.6,
    offset: 0,
    volume: 0.7,
    keys: structuredClone(defaults),
  };
  syncSettings();
};
songCards();
syncSettings();
// Read-only diagnostics. Never includes credentials, account identifiers, or private source paths.
Object.defineProperty(window, 'orvioDiagnostics', {
  get: () => ({
    version: '0.1.0',
    active,
    sessionId,
    song: SONGS[songIndex].id,
    settings: {
      lanes: settings.lanes,
      difficulty: settings.difficulty,
      offset: settings.offset,
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
    audioContextState: clock?.context.state,
    outputLatency: clock?.context.outputLatency,
    baseLatency: clock?.context.baseLatency,
  }),
});
