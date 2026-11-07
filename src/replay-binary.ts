import type { ReplayData, ReplayOp } from './replay';
// XOR predictors preserve every IEEE-754 bit. No timing rounding or quantization.
export function packReplay(r: ReplayData): Uint8Array {
  const bytes: number[] = [82, 50];
  const view = new DataView(new ArrayBuffer(8));
  function variable(n: bigint) {
    while (n >= 128n) {
      bytes.push(Number(n & 127n) | 128);
      n >>= 7n;
    }
    bytes.push(Number(n));
  }
  function bits(n: number) {
    view.setFloat64(0, n, true);
    return view.getBigUint64(0, true);
  }
  function exact(n: number, prediction: number) {
    variable(bits(n) ^ bits(prediction));
  }
  // A 7th element carries the recording's audio lead-in. Pre-A5 replays have 6
  // elements and stay byte-identical; old decoders ignore the extra element.
  const meta = new TextEncoder().encode(
    JSON.stringify([
      r.song,
      r.lanes,
      r.difficulty,
      r.options,
      r.end,
      r.ops.length,
      ...(r.audioLeadIn !== undefined ? [r.audioLeadIn] : []),
    ]),
  );
  variable(BigInt(meta.length));
  bytes.push(...meta);
  let wall = 0,
    audio = 0;
  for (const op of r.ops) {
    bytes.push(op[0]);
    exact(op[1], wall);
    exact(op[2], audio + (op[1] - wall) / 1000);
    wall = op[1];
    audio = op[2];
    if (op[0] === 0) bytes.push(op[3] * 2 + op[4]);
    else if (op[0] === 2) bytes.push(op[3]);
    else if (op[0] === 3) {
      exact(op[3], 1);
      const f = new TextEncoder().encode(op[4]);
      bytes.push(f.length, ...f);
    }
  }
  return Uint8Array.from(bytes);
}
export function unpackReplay(bytes: Uint8Array): ReplayData {
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
  function exact(prediction: number) {
    view.setFloat64(0, prediction, true);
    view.setBigUint64(0, view.getBigUint64(0, true) ^ variable(), true);
    return view.getFloat64(0, true);
  }
  const len = Number(variable());
  if (len > 4096 || p + len > bytes.length)
    throw Error('Invalid replay header');
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(p, p + len)));
  p += len;
  const [song, lanes, difficulty, options, end, count, audioLeadIn] = meta;
  if (
    audioLeadIn !== undefined &&
    (typeof audioLeadIn !== 'number' || !Number.isFinite(audioLeadIn))
  )
    throw Error('Invalid replay audio lead-in');
  if (!Number.isInteger(count) || count < 0 || count > 12000)
    throw Error('Invalid replay count');
  const ops: ReplayOp[] = [];
  let wall = 0,
    audio = 0;
  for (let i = 0; i < count; i++) {
    const type = byte(),
      w = exact(wall),
      a = exact(audio + (w - wall) / 1000);
    wall = w;
    audio = a;
    if (type === 0) {
      const v = byte();
      ops.push([0, w, a, Math.floor(v / 2), (v % 2) as 0 | 1]);
    } else if (type === 1) ops.push([1, w, a]);
    else if (type === 2) ops.push([2, w, a, byte() as 0 | 1]);
    else if (type === 3) {
      const speed = exact(1),
        n = byte();
      if (p + n > bytes.length) throw Error('Truncated effect');
      const f = new TextDecoder().decode(bytes.subarray(p, p + n));
      p += n;
      ops.push([3, w, a, speed, f as ReplayData['options']['fader']]);
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
  };
}
