import { noteLayout } from './note-layout';
import { Application, Graphics, Container, Sprite, Texture } from 'pixi.js';
import type { Engine } from './engine';
interface NoteVisual {
  head: Sprite;
  body?: Sprite;
  tail?: Sprite;
}
export class Playfield {
  readonly app = new Application();
  private notes = new Container();
  private grid = new Graphics();
  private hit = new Graphics();
  private keys: Sprite[] = [];
  private flashesSprites: Sprite[] = [];
  private hitBeams: Sprite[] = [];
  private hitSparks: Sprite[][] = [];
  private noteSprites: NoteVisual[] = [];
  private noteColor = 0x29d8ff;
  private lastLanes = 0;
  private host!: HTMLElement;
  private burstTexture!: Texture;
  reducedMotion = false;
  width = 440;
  height = 620;
  frames: number[] = [];
  work: number[] = [];
  private lastFrame = 0;
  pressed = new Set<number>();
  flashes = new Map<number, { at: number; ok: boolean }>();
  async init(host: HTMLElement) {
    this.host = host;
    await this.app.init({
      width: host.clientWidth,
      height: host.clientHeight,
      backgroundAlpha: 0,
      antialias: false,
      preference: 'webgl',
      autoStart: false,
      resolution: 1,
      autoDensity: true,
      powerPreference: 'high-performance',
    });
    // Original raster burst, generated locally once. No copied game texture.
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    for (let i = 0; i < 48; i++) {
      const angle = i * 2.3999632297;
      const radius = 8 + (i % 9) * 4;
      const x = 64 + Math.cos(angle) * radius,
        y = 86 - Math.abs(Math.sin(angle)) * radius * 1.8;
      ctx.fillStyle =
        i % 3 === 0 ? '#fff7d8' : i % 3 === 1 ? '#b4f7ff' : '#32cbef';
      ctx.globalAlpha = 0.3 + (i % 7) / 10;
      ctx.fillRect(x, y, 1 + (i % 3), 3 + (i % 8));
    }
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#eaffff';
    ctx.fillRect(20, 88, 88, 3);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(32, 84, 64, 10);
    this.burstTexture = Texture.from(c);
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.grid, this.notes, this.hit);
  }
  private rect(color: number) {
    const s = new Sprite(Texture.WHITE);
    s.tint = color;
    return s;
  }
  setup(engine: Engine, lanes: number, color: number) {
    this.noteColor = color;
    this.notes.removeChildren().forEach((c) => c.destroy());
    this.keys.forEach((s) => s.destroy());
    this.flashesSprites.forEach((s) => s.destroy());
    this.keys = [];
    this.flashesSprites = [];
    this.hitBeams.forEach((s) => s.destroy());
    this.hitSparks.flat().forEach((s) => s.destroy());
    this.hitBeams = [];
    this.hitSparks = [];
    this.noteSprites = [];
    this.frames = [];
    this.work = [];
    this.lastFrame = 0;
    for (const s of engine.states) {
      const head = this.rect(s.note.lane % 2 ? 0xebfaff : color);
      const visual: NoteVisual = { head };
      if (s.note.end) {
        visual.body = this.rect(color);
        visual.body.alpha = 0.36;
        visual.tail = this.rect(0xe5faff);
        this.notes.addChild(visual.body, visual.tail);
      }
      this.notes.addChild(head);
      this.noteSprites.push(visual);
    }
    for (let i = 0; i < lanes; i++) {
      const k = this.rect(color);
      k.alpha = 0.18;
      this.app.stage.addChild(k);
      this.keys.push(k);
      const f = this.rect(0xe5faff);
      this.app.stage.addChild(f);
      this.flashesSprites.push(f);
      const beam = new Sprite(this.burstTexture);
      this.app.stage.addChild(beam);
      this.hitBeams.push(beam);
      const sparks = Array.from({ length: 6 }, () => {
        const spark = this.rect(0xfff0ce);
        this.app.stage.addChild(spark);
        return spark;
      });
      this.hitSparks.push(sparks);
    }
    this.drawGrid(lanes);
  }
  private drawGrid(lanes: number) {
    this.lastLanes = lanes;
    this.width = this.app.screen.width;
    this.height = this.app.screen.height;
    const w = this.width / lanes;
    const y = this.height - 92;
    this.grid.clear();
    this.grid
      .rect(0, 0, this.width, this.height)
      .fill({ color: 0x070f19, alpha: 0.85 });
    for (let i = 0; i < lanes; i++) {
      if (i % 2 === 1)
        this.grid
          .rect(i * w, 0, w, this.height)
          .fill({ color: 0x172638, alpha: 0.45 });
      this.grid
        .moveTo(i * w, 0)
        .lineTo(i * w, this.height)
        .stroke({ color: 0xffffff, alpha: 0.07, width: 1 });
    }
    this.hit.clear();
    this.hit.rect(0, y - 1, this.width, 3).fill(0xbdefff);
    this.hit
      .rect(0, y + 2, this.width, 18)
      .fill({ color: 0x29d8ff, alpha: 0.08 });
  }
  draw(
    engine: Engine,
    lanes: number,
    time: number,
    travel: number,
    now: number,
  ) {
    const begin = performance.now();
    // Whole physical pixels per lane. Never clip the final lane at a fractional
    // canvas/backing-store boundary, including after a window resize.
    const targetWidth = Math.max(
      lanes,
      Math.floor(this.host.clientWidth / lanes) * lanes,
    );
    const targetHeight = Math.max(1, this.host.clientHeight);
    if (
      this.app.screen.width !== targetWidth ||
      this.app.screen.height !== targetHeight
    )
      this.app.renderer.resize(targetWidth, targetHeight);
    if (
      this.app.screen.width !== this.width ||
      this.app.screen.height !== this.height ||
      lanes !== this.lastLanes
    )
      this.drawGrid(lanes);
    if (this.lastFrame && now > this.lastFrame)
      this.frames.push(now - this.lastFrame);
    this.lastFrame = now;
    const width = this.width / lanes;
    const target = this.height - 92;
    const px = target / travel;
    for (let lane = 0; lane < lanes; lane++) {
      const k = this.keys[lane];
      k.visible = this.pressed.has(lane);
      k.x = lane * width + 2;
      k.y = target + 4;
      k.width = width - 4;
      k.height = 78;
      const f = this.flashesSprites[lane];
      const flash = this.flashes.get(lane);
      const age = flash ? now - flash.at : 1000;
      f.visible = age < 200;
      if (f.visible) {
        f.x = lane * width;
        f.y = target - 5;
        f.width = width;
        f.height = 10;
        f.alpha = (1 - age / 200) * 0.7;
        f.tint = flash!.ok ? 0xe5faff : 0xff334d;
      }
      const life = Math.min(1, age / 170);
      const hit = !!flash?.ok && age < 170 && !this.reducedMotion;
      const beam = this.hitBeams[lane];
      beam.visible = hit;
      if (hit) {
        beam.x = lane * width + width * 0.05;
        beam.y = target - 76 + life * 10;
        beam.width = width * 0.9;
        beam.height = 96;
        beam.alpha = (1 - life) * 0.8;
      }
      this.hitSparks[lane].forEach((spark, index) => {
        spark.visible = false;
        if (!hit) return;
        const angle = (index / 5) * Math.PI;
        spark.x =
          lane * width + width / 2 + Math.cos(angle) * width * 0.42 * life;
        spark.y = target - 8 - Math.sin(angle) * 65 * life - life * 16;
        spark.width = 3 * (1 - life) + 1;
        spark.height = 8 * (1 - life) + 2;
        spark.rotation = (index - 2.5) * 0.32;
        spark.alpha = 1 - life;
      });
    }
    engine.states.forEach((s, i) => {
      const v = this.noteSprites[i];
      const n = s.note;
      const layout = noteLayout(s, target, time, px, this.height);
      const { visible, headY: y, endY } = layout;
      v.head.visible = layout.showHead;
      const x = n.lane * width + 5;
      const nw = width - 10;
      if (v.head.visible) {
        v.head.x = x;
        v.head.y = y - 5;
        v.head.width = nw;
        v.head.height = 10;
      }
      if (v.body && v.tail && n.end) {
        v.body.visible = visible;
        v.tail.visible = visible;
        if (visible) {
          v.body.tint = layout.failed ? 0x66747e : this.noteColor;
          v.body.alpha = layout.failed ? 0.2 : 0.36;
          v.tail.tint = layout.failed ? 0x88949b : 0xe5faff;
          v.tail.alpha = layout.failed ? 0.45 : 1;
          v.body.x = x + nw * 0.23;
          v.body.y = endY;
          v.body.width = nw * 0.54;
          v.body.height = layout.bodyHeight;
          v.tail.x = x;
          v.tail.y = endY;
          v.tail.width = nw;
          v.tail.height = 5;
        }
      }
    });
    this.app.renderer.render(this.app.stage);
    this.work.push(performance.now() - begin);
  }
  stats() {
    const a = this.frames.slice(60).sort((a, b) => a - b);
    const cpu = this.work.slice(60).sort((a, b) => a - b);
    const sum = a.reduce((x, y) => x + y, 0);
    return {
      samples: a.length,
      averageFps: a.length ? 1000 / (sum / a.length) : 0,
      p95FrameMs: a[Math.floor(a.length * 0.95)] ?? 0,
      maxFrameMs: a.at(-1) ?? 0,
      over25ms: a.filter((x) => x > 25).length,
      p95CpuMs: cpu[Math.floor(cpu.length * 0.95)] ?? 0,
      renderer: this.app.renderer.name,
    };
  }
}
