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
  private noteSprites: NoteVisual[] = [];
  private lastLanes = 0;
  width = 440;
  height = 620;
  frames: number[] = [];
  work: number[] = [];
  private lastFrame = 0;
  pressed = new Set<number>();
  flashes = new Map<number, { at: number; ok: boolean }>();
  async init(host: HTMLElement) {
    await this.app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: false,
      preference: 'webgl',
      autoStart: false,
      resolution: 0.75,
      autoDensity: true,
      powerPreference: 'high-performance',
    });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.grid, this.notes, this.hit);
  }
  private rect(color: number) {
    const s = new Sprite(Texture.WHITE);
    s.tint = color;
    return s;
  }
  setup(engine: Engine, lanes: number, color: number) {
    this.notes.removeChildren().forEach((c) => c.destroy());
    this.keys.forEach((s) => s.destroy());
    this.flashesSprites.forEach((s) => s.destroy());
    this.keys = [];
    this.flashesSprites = [];
    this.noteSprites = [];
    this.frames = [];
    this.work = [];
    this.lastFrame = 0;
    for (const s of engine.states) {
      const head = this.rect(s.note.lane % 2 ? 0xf5e5ff : color);
      const visual: NoteVisual = { head };
      if (s.note.end) {
        visual.body = this.rect(color);
        visual.body.alpha = 0.36;
        visual.tail = this.rect(0xe7d9ff);
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
      const f = this.rect(0xe7d9ff);
      this.app.stage.addChild(f);
      this.flashesSprites.push(f);
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
      .fill({ color: 0x0e0e16, alpha: 0.85 });
    for (let i = 0; i < lanes; i++) {
      if (i % 2 === 1)
        this.grid
          .rect(i * w, 0, w, this.height)
          .fill({ color: 0x20202c, alpha: 0.45 });
      this.grid
        .moveTo(i * w, 0)
        .lineTo(i * w, this.height)
        .stroke({ color: 0xffffff, alpha: 0.07, width: 1 });
    }
    this.hit.clear();
    this.hit.rect(0, y - 1, this.width, 3).fill(0xe8deff);
    this.hit
      .rect(0, y + 2, this.width, 18)
      .fill({ color: 0xbda9ff, alpha: 0.08 });
  }
  draw(
    engine: Engine,
    lanes: number,
    time: number,
    travel: number,
    now: number,
  ) {
    const begin = performance.now();
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
        f.tint = flash!.ok ? 0xe7d9ff : 0xff927f;
      }
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
