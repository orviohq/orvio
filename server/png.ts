import glyphs from './glyphs.json';
import { SHARED_SONGS, type SharedResult } from '../src/share';
const W = 1200,
  H = 630;
function crc32(a: Uint8Array) {
  let c = 0xffffffff;
  for (const b of a) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function u32(n: number) {
  return new Uint8Array([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}
function join(parts: Uint8Array[]) {
  const a = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    a.set(p, o);
    o += p.length;
  }
  return a;
}
function chunk(type: string, data: Uint8Array) {
  const t = new TextEncoder().encode(type);
  return join([u32(data.length), t, data, u32(crc32(join([t, data])))]);
}
export async function resultPNG(r: SharedResult) {
  const rgb = new Uint8Array(W * H);
  const rect = (x: number, y: number, w: number, h: number, c: number[]) => {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const color = c[0] === 238 ? 1 : c[0] === 41 ? 2 : c[0] === 160 ? 3 : 4;
    for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++)
      rgb.fill(color, yy * W + Math.max(0, x), yy * W + Math.min(W, x + w));
  };
  const text = (
    s: string,
    x: number,
    y: number,
    scale: number,
    color: number[],
  ) => {
    for (const c of s) {
      const g = (glyphs as Record<string, { w: number; rows: number[][] }>)[c];
      if (!g) continue;
      for (const row of g.rows)
        for (let i = 1; i < row.length; i += 2)
          rect(
            x + row[i] * scale,
            y + row[0] * scale,
            row[i + 1] * scale,
            scale,
            color,
          );
      x += (g.w + 1) * scale;
    }
  };
  const white = [238, 237, 242],
    cyan = [41, 216, 255],
    muted = [160, 155, 174];
  text('orvio', 60, 24, 1, white);
  text('LOCAL PLAY / UNVERIFIED', 650, 36, 0.5, muted);
  text(SHARED_SONGS[r.song], 60, 106, 1, white);
  text(`${r.lanes} KEY / ${r.difficulty.toUpperCase()}`, 62, 177, 0.5, cyan);
  rect(60, 248, 1080, 2, [57, 54, 68]);
  text(r.score.toLocaleString('en-US'), 60, 270, 2, white);
  text('SCORE', 65, 401, 0.5, muted);
  text('ACCURACY', 510, 425, 0.5, muted);
  text('MAX COMBO', 850, 425, 0.5, muted);
  text(`${r.accuracy.toFixed(2)}%`, 510, 463, 1, cyan);
  text(String(r.combo), 850, 463, 1, white);
  text('SHARED RESULT / NOT A VERIFIED RANKING', 60, 562, 0.5, muted);
  const raw = new Uint8Array((W + 1) * H);
  for (let y = 0; y < H; y++)
    raw.set(rgb.subarray(y * W, (y + 1) * W), y * (W + 1) + 1);
  const compressed = new Uint8Array(
    await new Response(
      new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate')),
    ).arrayBuffer(),
  );
  return join([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', join([u32(W), u32(H), new Uint8Array([8, 3, 0, 0, 0])])),
    chunk(
      'PLTE',
      new Uint8Array([
        20, 19, 26, 238, 237, 242, 41, 216, 255, 160, 155, 174, 57, 54, 68,
      ]),
    ),
    chunk('IDAT', compressed),
    chunk('IEND', new Uint8Array()),
  ]);
}
