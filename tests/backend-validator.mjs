// orvio-share fragment + replay validator. Faithful JS port of the frontend's
// share.ts / replay.ts / replay-binary.ts / engine.ts / chart.ts / game-options.ts
// pure validation code (same algorithms, same constants, no runtime deps).
// Backend uses it so a stored link is always a replay the frontend can verify.

export const SHARED_SONGS = {
  'first-light': 1,
  afterimage: 1,
  'violet-drive': 1,
};
const FADERS = [
  'off',
  'in',
  'in2',
  'out',
  'out2',
  'blink',
  'blink2',
  'fog',
  'pixel',
  'pixel2',
  'blind',
];
const SHUFFLES = ['off', 'mirror', 'random'];
export const ALLOWED_KEYS = [
  'v',
  'song',
  'keys',
  'diff',
  'score',
  'acc',
  'combo',
  'j',
  'speed',
  'fade',
  'shuffle',
  'seed',
  'rp',
  'rn',
  'r',
];

// A7 frozen fever replay metadata (port of the frontend's fever.ts). Optional on
// replays; legacy replays without it stay byte-identical and unchanged.
const FEVER_RULES_IDS = [
  'legacy-off-v1',
  'djmax-current-pending-v1',
  'orvio-auto-v1',
];
function validFeverMetadata(raw) {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw;
  return (
    r.version === 1 &&
    FEVER_RULES_IDS.includes(r.rulesId) &&
    typeof r.auto === 'boolean'
  );
}

const SONGS = [
  { id: 'first-light', bpm: 110, root: 57, scale: [0, 2, 4, 7, 9], bars: 16 },
  { id: 'afterimage', bpm: 128, root: 50, scale: [0, 3, 5, 7, 10], bars: 20 },
  { id: 'violet-drive', bpm: 150, root: 45, scale: [0, 2, 3, 7, 10], bars: 24 },
];

function melodyIndex(step, song) {
  const motif = [0, 2, 4, 2, 1, 3, 2, 0, 4, 3, 1, 2, 0, 1, 3, 4];
  return motif[
    (step +
      Math.max(
        0,
        SONGS.findIndex((s) => s.id === song.id),
      ) *
        3) %
      16
  ];
}

function makeChart(song, difficulty, lanes) {
  const beat = 60 / song.bpm;
  const notes = [];
  const divisions = difficulty === 'low' ? 1 : difficulty === 'mid' ? 2 : 4;
  const totalBeats = song.bars * 4;
  for (let b = 4; b < totalBeats; b += 1 / divisions) {
    const step = Math.round(b * divisions);
    const inBar = Math.floor(b) % 4;
    if (difficulty === 'low' && inBar === 3 && Math.floor(b / 4) % 2 === 0)
      continue;
    if (
      difficulty === 'high' &&
      step % 4 !== 0 &&
      (step * 7 + Math.floor(b / 4)) % 5 === 0
    )
      continue;
    const lane =
      (melodyIndex(Math.floor(b * 2), song) +
        Math.floor(b / 8) * 2 +
        (step % 2)) %
      lanes;
    notes.push({ id: notes.length, lane, time: b * beat });
    if (difficulty !== 'low' && step % (divisions * 8) === 0) {
      const other = (lane + Math.ceil(lanes / 2)) % lanes;
      notes.push({ id: notes.length, lane: other, time: b * beat });
    }
  }
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (i % 17 !== 3) continue;
    const next = notes.slice(i + 1).find((x) => x.lane === n.lane);
    const length = beat * (difficulty === 'low' ? 1.5 : 0.75);
    if (!next || next.time - n.time > length + 0.3) n.end = n.time + length;
  }
  return notes
    .sort((a, b) => a.time - b.time || a.lane - b.lane)
    .map((n, id) => ({ ...n, id }));
}

function laneOrder(lanes, shuffle, seed) {
  const normal = Array.from({ length: lanes }, (_, i) => i);
  if (shuffle === 'off') return normal;
  if (shuffle === 'mirror') return normal.map((i) => lanes - 1 - i);
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let attempt = 0; attempt < 1000; attempt++) {
    const order = [...normal];
    for (let i = lanes - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (
      order.every((v, i) => v !== i) &&
      order.some((v, i) => v !== lanes - 1 - i)
    )
      return order;
  }
  return normal.map((i) => (i + 1) % lanes);
}

function transformChart(notes, lanes, shuffle, seed) {
  const order = laneOrder(lanes, shuffle, seed);
  return notes.map((n) => ({ ...n, lane: order[n.lane] }));
}

const JUDGMENTS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0];
const WINDOWS_MS = [
  41.67, 50, 58.33, 66.67, 75, 83.33, 91.67, 100, 108.33, 116.67, 150,
];

function judge(deltaMs) {
  const idx = WINDOWS_MS.findIndex((w) => Math.abs(deltaMs) <= w + 1e-6);
  return idx < 0 ? 0 : JUDGMENTS[idx];
}

class Engine {
  constructor(notes) {
    this.states = notes.map((note) => ({ note, held: false, done: false }));
    this.total = notes.reduce((n, x) => n + (x.end ? 2 : 1), 0);
    this.events = [];
    this.combo = 0;
    this.maxCombo = 0;
    this.sum = 0;
    this.resolved = 0;
    this.breaks = 0;
    this.lastSequence = -1;
  }
  get score() {
    return Math.min(
      1000000,
      Math.floor((1000000 * this.sum) / (100 * this.total)),
    );
  }
  record(s, value, delta, time, tail = false) {
    if (tail) s.tail = value;
    else s.head = value;
    this.sum += value;
    this.resolved++;
    if (value === 0) {
      this.combo = 0;
      this.breaks++;
    } else {
      this.combo++;
      this.maxCombo = Math.max(this.combo, this.maxCombo);
    }
    if (!s.note.end || tail) s.done = true;
    this.events.push({
      noteId: s.note.id,
      lane: s.note.lane,
      value,
      delta,
      tail,
      time,
    });
  }
  input(event) {
    if (event.sequence <= this.lastSequence) return;
    this.lastSequence = event.sequence;
    this.update(event.time);
    if (event.down) {
      const s = this.states.find(
        (s) =>
          s.note.lane === event.lane &&
          s.head === undefined &&
          !s.done &&
          Math.abs(s.note.time - event.time) <= 0.15,
      );
      if (!s) return;
      const value = judge((event.time - s.note.time) * 1000);
      this.record(s, value, (event.time - s.note.time) * 1000, event.time);
      s.held = !!s.note.end && value > 0;
      if (s.note.end && value === 0) this.record(s, 0, 0, event.time, true);
    } else {
      const s = this.states.find(
        (s) => s.note.lane === event.lane && s.held && !s.done,
      );
      if (!s || !s.note.end) return;
      const delta = (event.time - s.note.end) * 1000;
      const value = delta < -116.67 ? 0 : delta > 116.67 ? 1 : (s.head ?? 0);
      s.held = false;
      this.record(s, value, delta, event.time, true);
    }
  }
  update(time) {
    for (const s of this.states) {
      if (s.done) continue;
      if (s.head === undefined && time - s.note.time > 0.15) {
        this.record(s, 0, 150, time);
        if (s.note.end) this.record(s, 0, 150, time, true);
      } else if (s.held && s.note.end && time - s.note.end > 0.15) {
        s.held = false;
        this.record(s, 1, 150, time, true);
      }
    }
  }
}

function replayEngine(r) {
  return new Engine(
    transformChart(
      makeChart(
        SONGS.find((s) => s.id === r.song),
        r.difficulty,
        r.lanes,
      ),
      r.lanes,
      r.options.shuffle,
      r.options.seed,
    ),
  );
}

function applyReplayOp(engine, op, sequence) {
  if (op[0] === 0)
    engine.input({ lane: op[3], time: op[2], down: !!op[4], sequence });
  else if (op[0] === 1) engine.update(op[2]);
}

function validateReplay(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw;
  if (
    (r.fever !== undefined && !validFeverMetadata(r.fever)) ||
    r.version !== 1 ||
    !SONGS.some((s) => s.id === r.song) ||
    ![5, 7].includes(r.lanes) ||
    !['low', 'mid', 'high'].includes(r.difficulty) ||
    !r.options ||
    !Array.isArray(r.ops) ||
    r.ops.length > 12000 ||
    !Number.isFinite(r.end) ||
    r.end < 0 ||
    r.end > 600000 ||
    (r.audioLeadIn !== undefined &&
      (!Number.isFinite(r.audioLeadIn) ||
        r.audioLeadIn < 0 ||
        r.audioLeadIn > 10))
  )
    return null;
  const o = r.options;
  if (
    !Number.isFinite(o.speed) ||
    o.speed < 1 ||
    o.speed > 9 ||
    !FADERS.includes(o.fader) ||
    !SHUFFLES.includes(o.shuffle) ||
    !Number.isInteger(o.seed) ||
    o.seed < 0 ||
    o.seed > 0xffffffff
  )
    return null;
  let prev = 0;
  for (let i = 0; i < r.ops.length; i++) {
    const op = r.ops[i];
    if (
      !Array.isArray(op) ||
      ![0, 1, 2, 3].includes(op[0]) ||
      !Number.isFinite(op[1]) ||
      op[1] < prev ||
      op[1] > r.end ||
      !Number.isFinite(op[2]) ||
      op[2] < (r.audioLeadIn === undefined ? -2 : -(r.audioLeadIn + 1)) ||
      (op[2] > 600 &&
        !(op[0] === 1 && op[2] === 9999 && i === r.ops.length - 1))
    )
      return null;
    prev = op[1];
    if (
      op[0] === 0 &&
      (op.length !== 5 ||
        !Number.isInteger(op[3]) ||
        op[3] < 0 ||
        op[3] >= r.lanes ||
        ![0, 1].includes(op[4]))
    )
      return null;
    if (op[0] === 1 && op.length !== 3) return null;
    if (op[0] === 2 && (op.length !== 4 || ![0, 1].includes(op[3])))
      return null;
    if (
      op[0] === 3 &&
      (op.length !== 5 ||
        !Number.isFinite(op[3]) ||
        op[3] < 1 ||
        op[3] > 9 ||
        !FADERS.includes(op[4]))
    )
      return null;
  }
  return {
    version: 1,
    song: r.song,
    lanes: r.lanes,
    difficulty: r.difficulty,
    options: {
      speed: o.speed,
      fader: o.fader,
      shuffle: o.shuffle,
      seed: o.seed,
    },
    ops: r.ops.map((op) => [...op]),
    end: r.end,
    ...(r.audioLeadIn !== undefined ? { audioLeadIn: r.audioLeadIn } : {}),
    ...(r.fever !== undefined
      ? { fever: { version: 1, rulesId: r.fever.rulesId, auto: r.fever.auto } }
      : {}),
  };
}

function unpackReplay(bytes) {
  let p = 2;
  const view = new DataView(new ArrayBuffer(8));
  function byte() {
    if (p >= bytes.length) throw Error('Truncated replay');
    return bytes[p++];
  }
  function variable() {
    let n = 0n;
    for (let shift = 0n; shift < 70n; shift += 7n) {
      const b = byte();
      n |= BigInt(b & 127) << shift;
      if (!(b & 128)) return n;
    }
    throw Error('Invalid replay integer');
  }
  function exact(prediction) {
    view.setFloat64(0, prediction, true);
    view.setBigUint64(0, view.getBigUint64(0, true) ^ variable(), true);
    return view.getFloat64(0, true);
  }
  const len = Number(variable());
  if (len > 4096 || p + len > bytes.length)
    throw Error('Invalid replay header');
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(p, p + len)));
  p += len;
  // A5: optional 7th element carries the recording's audio lead-in (pre-A5
  // replays have 6 elements and stay byte-identical). A7: optional 8th element
  // carries frozen fever metadata; the 7th is null when fever is present on a
  // recording without a lead-in. Old decoders ignore the extra elements.
  const [song, lanes, difficulty, options, end, count, leadIn, fever] = meta;
  const audioLeadIn =
    leadIn === null && fever !== undefined ? undefined : leadIn;
  if (
    audioLeadIn !== undefined &&
    (typeof audioLeadIn !== 'number' || !Number.isFinite(audioLeadIn))
  )
    throw Error('Invalid replay audio lead-in');
  if (!Number.isInteger(count) || count < 0 || count > 12000)
    throw Error('Invalid replay count');
  const ops = [];
  let wall = 0,
    audio = 0;
  for (let i = 0; i < count; i++) {
    const type = byte();
    const w = exact(wall);
    const a = exact(audio + (w - wall) / 1000);
    wall = w;
    audio = a;
    if (type === 0) {
      const v = byte();
      ops.push([0, w, a, Math.floor(v / 2), v % 2]);
    } else if (type === 1) ops.push([1, w, a]);
    else if (type === 2) ops.push([2, w, a, byte()]);
    else if (type === 3) {
      const speed = exact(1);
      const n = byte();
      if (p + n > bytes.length) throw Error('Truncated effect');
      const f = new TextDecoder().decode(bytes.subarray(p, p + n));
      p += n;
      ops.push([3, w, a, speed, f]);
    } else throw Error('Unknown replay operation');
  }
  if (p !== bytes.length) throw Error('Trailing replay data');
  return {
    version: 1,
    song,
    lanes,
    difficulty,
    options,
    end,
    ops,
    ...(audioLeadIn !== undefined ? { audioLeadIn } : {}),
    ...(fever !== undefined ? { fever } : {}),
  };
}

async function inflate(bytes) {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1000000) {
      await reader.cancel();
      throw new Error('Replay too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function b64urlDecode(text) {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function decodeReplay(text) {
  try {
    if (text.length > 120000 || !text || !/^[A-Za-z0-9_-]+$/.test(text))
      return null;
    const raw = await inflate(b64urlDecode(text));
    return validateReplay(
      raw[0] === 82 && raw[1] === 50
        ? unpackReplay(raw)
        : JSON.parse(new TextDecoder().decode(raw)),
    );
  } catch {
    return null;
  }
}

function replayMatches(r, result) {
  if (
    r.song !== result.song ||
    r.lanes !== result.lanes ||
    r.difficulty !== result.difficulty
  )
    return false;
  const engine = replayEngine(r);
  r.ops.forEach((op, i) => applyReplayOp(engine, op, i));
  engine.update(9999);
  const counts = JUDGMENTS.map(
    (v) => engine.events.filter((e) => e.value === v).length,
  );
  return (
    engine.score === result.score &&
    Math.abs(engine.sum / engine.total - result.accuracy) < 0.011 &&
    engine.maxCombo === result.combo &&
    !!result.judgments &&
    counts.every((v, i) => v === result.judgments[i])
  );
}

// Test-only exports for fixture generation (same code path as production validation).
export const __test__ = {
  SONGS,
  makeChart,
  transformChart,
  Engine,
  replayEngine,
  applyReplayOp,
  JUDGMENTS,
  replayMatches,
  decodeReplay,
  validFeverMetadata,
};

// Strict fragment validation per the frontend contract: the same criteria as the
// frontend's readResult, per version. v1/v2: base result only. v3: + judgments.
// v4: + options + replay attachment. Missing judgments/options are NEVER fabricated.
// Replay keys are accepted only on v=4.
export function validateFragmentSchema(fragment) {
  const params = new URLSearchParams(fragment);
  const seen = new Set();
  for (const k of [...params.keys()]) {
    if (!ALLOWED_KEYS.includes(k) || seen.has(k))
      return { error: 'bad_fragment_format' };
    seen.add(k);
  }
  const ver = params.get('v') || '';
  if (!['1', '2', '3', '4'].includes(ver))
    return { error: 'bad_fragment_format' };
  const song = params.get('song');
  const lanes = Number(params.get('keys'));
  const difficulty = params.get('diff');
  const score = Number(params.get('score'));
  const accuracy = Number(params.get('acc'));
  const combo = Number(params.get('combo'));
  if (
    !Object.hasOwn(SHARED_SONGS, song) ||
    ![5, 7].includes(lanes) ||
    !['low', 'mid', 'high'].includes(difficulty) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 1000000 ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > 100 ||
    !Number.isInteger(combo) ||
    combo < 0 ||
    combo > 10000 ||
    ['score', 'acc', 'combo'].some((k) => !params.has(k))
  )
    return { error: 'bad_fragment_format' };
  let judgments;
  if (['3', '4'].includes(ver)) {
    const raw = params.get('j') || '';
    if (!/^\d+(,\d+){11}$/.test(raw)) return { error: 'bad_fragment_format' };
    judgments = raw.split(',').map(Number);
    const total = judgments.reduce((a, b) => a + b, 0);
    if (
      total <= 0 ||
      total > 10000 ||
      judgments.some((v) => v < 0 || v > 10000) ||
      combo > total
    )
      return { error: 'bad_fragment_format' };
    const weighted = judgments.reduce(
      (sum, count, i) => sum + count * JUDGMENTS[i],
      0,
    );
    if (
      Math.abs(Math.round((weighted / total) * 100) / 100 - accuracy) > 0.011 ||
      Math.floor((1000000 * weighted) / (100 * total)) !== score
    )
      return { error: 'bad_fragment_format' };
  }
  let options;
  if (ver === '4') {
    const speed = Number(params.get('speed'));
    const fader = params.get('fade');
    const shuffle = params.get('shuffle');
    const seed = Number(params.get('seed'));
    if (
      !params.has('speed') ||
      !params.has('seed') ||
      !Number.isFinite(speed) ||
      speed < 1 ||
      speed > 9 ||
      !FADERS.includes(fader || '') ||
      !SHUFFLES.includes(shuffle || '') ||
      !Number.isInteger(seed) ||
      seed < 0 ||
      seed > 4294967295 ||
      !/^\d+(\.\d{1,2})?$/.test(params.get('acc') || '')
    )
      return { error: 'bad_fragment_format' };
    options = { speed, fader, shuffle, seed };
  }
  // Replay attachment: v=4 only. rp='1' marks an attached original replay; rn is the
  // compressed r char count; r is base64url 1..120000.
  const rp = params.get('rp');
  const rn = params.get('rn');
  const r = params.get('r');
  if (ver !== '4' && (rp !== null || rn !== null || r !== null))
    return { error: 'bad_fragment_format' };
  if (rp !== null && rp !== '1') return { error: 'bad_fragment_format' };
  if (rp === null && (rn !== null || r !== null))
    return { error: 'bad_fragment_format' };
  if (rp === '1') {
    if (r === null || rn === null) return { error: 'bad_fragment_format' };
    if (!/^[A-Za-z0-9_-]{1,120000}$/.test(r))
      return { error: 'bad_fragment_format' };
    if (String(r.length) !== rn) return { error: 'bad_fragment_format' };
  }
  return {
    result: {
      song,
      lanes,
      difficulty,
      score,
      accuracy: Math.round(accuracy * 100) / 100,
      combo,
      judgments,
      options,
      replay: rp === '1' ? r : null,
    },
  };
}

// Full replay verification (heavy: chart build + engine recompute). Runs in the DO.
export async function verifyReplay(replayText, result) {
  const data = await decodeReplay(replayText);
  if (!data) return { ok: false, error: 'replay_corrupt' };
  if (!replayMatches(data, result))
    return { ok: false, error: 'replay_mismatch' };
  return { ok: true };
}
