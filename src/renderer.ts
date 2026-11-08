import { VisualClock } from './visual-clock';
import { blinkAlpha, fadeAlpha, type Fader } from './game-options';
import { noteLayout } from './note-layout';
import { JUDGMENT_INSET, scrollPixels, visibleTravel } from './note-scroll';
import { Application, Graphics, Container, Sprite, Texture } from 'pixi.js';
import type { Engine } from './engine';
import { defaultSkin, type Skin } from './skin';
interface NoteVisual {
  head: Sprite;
  body?: Sprite;
  tail?: Sprite;
}
export class Playfield {
  readonly app = new Application();
  /** Replaceable gear/note/press-effect parts. Defaults to the current look. */
  skin: Skin = defaultSkin();
  setSkin(skin: Skin) {
    this.skin = skin;
  }
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
  private hostWidth = 440;
  private hostHeight = 620;
  private resizeObserver?: ResizeObserver;
  private visualClock = new VisualClock();
  private burstTexture!: Texture;
  private fadeMask!: Sprite;
  private fadeMaskMode: Fader = 'off';
  reducedMotion = false;
  fader: Fader = 'off';
  bpm = 120;
  private fog!: Sprite;
  private pixelStep = 1;
  width = 440;
  height = 620;
  get startupTravel() {
    return visibleTravel(
      Math.max(this.hostHeight, this.host?.clientHeight ?? 0),
    );
  }
  frames: number[] = [];
  work: number[] = [];
  private lastFrame = 0;
  pressed = new Set<number>();
  flashes = new Map<number, { at: number; ok: boolean }>();
  private heldLanes = new Set<number>();
  private disposed = false;
  private initialized = false;
  dispose() {
    this.disposed = true;
    this.resizeObserver?.disconnect();
    if (this.initialized) {
      this.notes.mask = null;
      const ownedTextures = [
        this.burstTexture,
        this.fog?.texture,
        this.fadeMask?.texture,
      ];
      this.app.destroy(true, { children: true });
      // Release our generated textures, never the shared Texture.WHITE.
      ownedTextures.forEach((texture) => {
        if (texture !== Texture.WHITE) texture?.destroy(true);
      });
      this.initialized = false;
    }
  }
  async init(host: HTMLElement, signal?: AbortSignal) {
    this.host = host;
    this.hostWidth = host.clientWidth;
    this.hostHeight = host.clientHeight;
    this.resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        this.hostWidth = rect.width;
        this.hostHeight = rect.height;
      }
    });
    this.resizeObserver.observe(host);
    await this.app.init({
      width: host.clientWidth,
      height: host.clientHeight,
      background: this.skin.gear.background,
      backgroundAlpha: 1,
      clearBeforeRender: true,
      antialias: false,
      preference: 'webgl',
      autoStart: false,
      resolution: 1,
      autoDensity: true,
      powerPreference: 'high-performance',
    });
    this.initialized = true;
    if (this.disposed || signal?.aborted) {
      this.dispose();
      throw new Error('Startup cancelled');
    }
    // The skin paints the burst sprite; uploaded once, never shared state.
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    this.skin.paintBurst(ctx);
    this.burstTexture = Texture.from(c);
    host.appendChild(this.app.canvas);

    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = 4;
    fogCanvas.height = 128;
    const fogBrush = fogCanvas.getContext('2d')!,
      mist = fogBrush.createLinearGradient(0, 0, 0, 128);
    mist.addColorStop(0, 'rgba(193,211,224,0)');
    mist.addColorStop(0.55, 'rgba(193,211,224,.95)');
    mist.addColorStop(1, 'rgba(193,211,224,.65)');
    fogBrush.fillStyle = mist;
    fogBrush.fillRect(0, 0, 4, 128);
    this.fog = new Sprite(Texture.from(fogCanvas));
    this.fog.visible = false;
    this.fadeMask = new Sprite(Texture.WHITE);
    this.app.stage.addChild(
      this.grid,
      this.notes,
      this.hit,
      this.fog,
      this.fadeMask,
    );
    this.fadeMask.visible = false;
  }
  private rect(color: number) {
    const s = new Sprite(Texture.WHITE);
    s.tint = color;
    s.roundPixels = true;
    return s;
  }
  /** Submit the initial GPU resources under the loading overlay, before audio.
   * Does not update the engine or advance the gameplay clock.
   */
  async warmup(engine: Engine, lanes: number, travel: number) {
    this.draw(engine, lanes, -0.2, travel, performance.now());
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    this.visualClock.reset();
    this.lastFrame = 0;
    this.frames = [];
    this.work = [];
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
    this.visualClock.reset();
    for (const s of engine.states) {
      const head = this.rect(
        s.note.lane % 2 ? this.skin.note.headAlternate : color,
      );
      const visual: NoteVisual = { head };
      if (s.note.end) {
        visual.body = this.rect(color);
        visual.body.alpha = this.skin.note.bodyAlpha;
        visual.tail = this.rect(this.skin.note.tail);
        this.notes.addChild(visual.body, visual.tail);
      }
      this.notes.addChild(head);
      this.noteSprites.push(visual);
    }
    for (let i = 0; i < lanes; i++) {
      const k = this.rect(color);
      k.alpha = this.skin.pressEffect.keyAlpha;
      this.app.stage.addChild(k);
      this.keys.push(k);
      const f = this.rect(this.skin.pressEffect.flashOk);
      this.app.stage.addChild(f);
      this.flashesSprites.push(f);
      const beam = new Sprite(this.burstTexture);
      this.app.stage.addChild(beam);
      this.hitBeams.push(beam);
      const sparks = Array.from(
        { length: this.skin.pressEffect.sparkCount },
        () => {
          const spark = this.rect(this.skin.pressEffect.spark);
          this.app.stage.addChild(spark);
          return spark;
        },
      );
      this.hitSparks.push(sparks);
    }
    this.drawGrid(lanes);
  }
  private drawGrid(lanes: number) {
    this.lastLanes = lanes;
    this.width = this.app.screen.width;
    this.height = this.app.screen.height;
    const w = this.width / lanes;
    const y = this.height - JUDGMENT_INSET;
    const gear = this.skin.gear;
    this.grid.clear();
    this.grid
      .rect(0, 0, this.width, this.height)
      .fill({ color: gear.background, alpha: gear.backgroundAlpha });
    for (let i = 0; i < lanes; i++) {
      if (i % 2 === 1)
        this.grid
          .rect(i * w, 0, w, this.height)
          .fill({ color: gear.laneStripe, alpha: gear.laneStripeAlpha });
      this.grid
        .moveTo(i * w, 0)
        .lineTo(i * w, this.height)
        .stroke({
          color: gear.laneSeparator,
          alpha: gear.laneSeparatorAlpha,
          width: gear.laneSeparatorWidth,
        });
    }
    this.hit.clear();
    this.hit
      .rect(
        0,
        y + gear.judgmentLineOffsetY,
        this.width,
        gear.judgmentLineHeight,
      )
      .fill(gear.judgmentLine);
    this.hit
      .rect(
        0,
        y + gear.judgmentGlowOffsetY,
        this.width,
        gear.judgmentGlowHeight,
      )
      .fill({ color: gear.judgmentGlow, alpha: gear.judgmentGlowAlpha });
  }
  draw(
    engine: Engine,
    lanes: number,
    time: number,
    travel: number,
    now: number,
  ) {
    const begin = performance.now();
    const step = this.fader.startsWith('pixel')
      ? Math.min(
          this.fader === 'pixel2' ? 16 : 8,
          1 + Math.ceil(engine.combo / 4),
        )
      : 1;
    if (step !== this.pixelStep) {
      this.pixelStep = step;
      this.app.renderer.resolution = 1 / step;
      this.app.renderer.resize(this.width, this.height);
      this.app.canvas.style.imageRendering = step > 1 ? 'pixelated' : 'auto';
    }
    time = this.visualClock.sample(now, time);
    // Whole physical pixels per lane. Never clip the final lane at a fractional
    // canvas/backing-store boundary, including after a window resize.
    const targetWidth = Math.max(
      lanes,
      Math.floor(this.hostWidth / lanes) * lanes,
    );
    const targetHeight = Math.max(1, Math.round(this.hostHeight));
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
    const frameMs =
      this.lastFrame && now > this.lastFrame ? now - this.lastFrame : 0;
    if (frameMs) this.frames.push(frameMs);
    this.lastFrame = now;
    const blink = blinkAlpha(time, this.bpm);
    this.notes.alpha =
      this.fader === 'blind' ? 0 : this.fader === 'blink' ? blink : 1;
    this.app.canvas.style.opacity =
      this.fader === 'blink2' ? String(blink) : '1';
    this.fog.visible = this.fader === 'fog';
    if (this.fog.visible) {
      this.fog.x = 0;
      this.fog.y = this.height * 0.5;
      this.fog.width = this.width;
      this.fog.height = this.height * 0.5;
    }
    const width = this.width / lanes;
    const target = this.height - JUDGMENT_INSET;
    const px = scrollPixels(travel);
    const spatialFade = ['out', 'out2'].includes(this.fader);
    if (this.fadeMaskMode !== this.fader) {
      this.notes.mask = null;
      if (this.fadeMask.texture !== Texture.WHITE)
        this.fadeMask.texture.destroy(true);
      this.fadeMask.texture = Texture.WHITE;
      this.fadeMask.visible = spatialFade;
      if (spatialFade) {
        // One screen-anchored alpha ramp fades every pixel of a long body.
        // Its position never switches from head to tail when a hold begins.
        const ramp = document.createElement('canvas');
        ramp.width = 4;
        ramp.height = 2048;
        const brush = ramp.getContext('2d')!;
        const image = brush.createImageData(ramp.width, ramp.height);
        for (let y = 0; y < ramp.height; y++) {
          const alpha = Math.round(
            255 * fadeAlpha(this.fader, ((y + 0.5) * 2) / ramp.height),
          );
          for (let x = 0; x < ramp.width; x++) {
            const i = (y * ramp.width + x) * 4;
            image.data.set([255, 255, 255, alpha], i);
          }
        }
        brush.putImageData(image, 0, 0);
        this.fadeMask.texture = Texture.from(ramp);
        this.notes.setMask({ mask: this.fadeMask, channel: 'alpha' });
      }
      this.fadeMaskMode = this.fader;
    }
    this.fadeMask.width = this.width;
    this.fadeMask.height = target * 2;
    // Lanes with an actively held long note; drives the sustained effect.
    this.heldLanes.clear();
    if (!this.reducedMotion)
      engine.states.forEach((s) => {
        if (s.held && !s.done && s.note.end !== undefined)
          this.heldLanes.add(s.note.lane);
      });
    const fx = this.skin.pressEffect;
    for (let lane = 0; lane < lanes; lane++) {
      const k = this.keys[lane];
      k.visible = this.pressed.has(lane);
      k.x = lane * width + fx.keyInsetX;
      k.y = target + fx.keyOffsetY;
      k.width = width - fx.keyInsetX * 2;
      k.height = fx.keyHeight;
      const f = this.flashesSprites[lane];
      const flash = this.flashes.get(lane);
      const age = flash ? now - flash.at : 1000;
      f.visible = age < fx.flashDurationMs;
      if (f.visible) {
        f.x = lane * width;
        f.y = target + fx.flashOffsetY;
        f.width = width;
        f.height = fx.flashHeight;
        f.alpha = (1 - age / fx.flashDurationMs) * fx.flashMaxAlpha;
        f.tint = flash!.ok ? fx.flashOk : fx.flashFail;
      }
      const life = Math.min(1, age / fx.burstDurationMs);
      const burst =
        !!flash?.ok && age < fx.burstDurationMs && !this.reducedMotion;
      const holding = this.heldLanes.has(lane);
      const beam = this.hitBeams[lane];
      beam.visible = burst || holding;
      if (beam.visible) {
        beam.x = lane * width + width * fx.beamInsetFraction;
        beam.y = target + fx.beamOffsetY + (burst ? life * fx.beamRise : 0);
        beam.width = width * fx.beamWidthFraction;
        beam.height = fx.beamHeight;
        // A held long note keeps a soft, gently pulsing beam until release;
        // the head/tail burst simply outshines it while it plays.
        const burstAlpha = burst ? (1 - life) * fx.beamBurstAlpha : 0;
        const holdAlpha = holding
          ? fx.holdAlphaBase +
            fx.holdAlphaPulse * Math.sin(now / fx.holdPulsePeriodMs)
          : 0;
        beam.alpha = Math.max(burstAlpha, holdAlpha);
      }
      const sparkLast = fx.sparkCount - 1;
      this.hitSparks[lane].forEach((spark, index) => {
        spark.visible = false;
        if (!burst && !holding) return;
        // While held (after the burst), each spark loops on its own staggered
        // cycle: a quiet continuous fountain instead of head/tail-only bursts.
        const l = burst
          ? life
          : (now / fx.sparkHoldCycleMs + index / fx.sparkCount) % 1;
        spark.visible = true;
        const size = burst ? 1 : fx.sparkHoldSize;
        const angle = (index / sparkLast) * Math.PI;
        spark.x =
          lane * width +
          width / 2 +
          Math.cos(angle) * width * fx.sparkSpreadFraction * l;
        spark.y =
          target +
          fx.sparkOffsetY -
          Math.sin(angle) * fx.sparkArcHeight * l -
          l * fx.sparkLift;
        spark.width = (3 * (1 - l) + 1) * size;
        spark.height = (8 * (1 - l) + 2) * size;
        spark.rotation = (index - sparkLast / 2) * 0.32;
        spark.alpha = (1 - l) * (burst ? 1 : 0.85);
      });
    }
    engine.states.forEach((s, i) => {
      const v = this.noteSprites[i];
      const n = s.note;
      const layout = noteLayout(s, target, time, px, this.height);
      const { visible, headY: y, endY } = layout;
      const noteSkin = this.skin.note;
      v.head.visible = layout.showHead;
      v.head.alpha = spatialFade ? 1 : fadeAlpha(this.fader, y / target);
      const x = n.lane * width + noteSkin.headInsetX;
      const nw = width - noteSkin.headInsetX * 2;
      if (v.head.visible) {
        v.head.x = x;
        v.head.y = y - noteSkin.headHeight / 2;
        v.head.width = nw;
        v.head.height = noteSkin.headHeight;
      }
      if (v.body && v.tail && n.end) {
        v.body.visible = visible;
        v.tail.visible = visible;
        if (visible) {
          v.body.tint = layout.failed ? noteSkin.failedBody : this.noteColor;
          v.body.alpha = layout.failed
            ? noteSkin.failedBodyAlpha
            : noteSkin.bodyAlpha;
          const bodyTrueBottom = endY + layout.bodyHeight;
          v.tail.tint = layout.failed ? noteSkin.failedTail : noteSkin.tail;
          v.tail.alpha =
            (layout.failed ? noteSkin.failedTailAlpha : 1) *
            (spatialFade ? 1 : fadeAlpha(this.fader, endY / target));
          v.body.x = x + nw * noteSkin.bodyInsetFraction;
          const inStart =
            this.fader === 'in'
              ? target * 0.5
              : this.fader === 'in2'
                ? (target * 2) / 3
                : 0;
          const bodyTop = Math.max(endY, inStart);
          const bodyBottom = Math.min(bodyTrueBottom, this.height);
          v.body.y = bodyTop;
          v.body.width = nw * noteSkin.bodyWidthFraction;
          v.body.height = Math.max(0, bodyBottom - bodyTop);
          v.body.visible = bodyBottom > bodyTop;
          v.tail.x = x;
          v.tail.y = endY;
          v.tail.width = nw;
          v.tail.height = noteSkin.tailHeight;
        }
      }
    });
    // A frame replaces the previous image; never accumulate transparent frames.
    this.app.renderer.render({ container: this.app.stage, clear: true });
    this.work.push(performance.now() - begin);
  }
  // Read-only window for the opt-in ?perf=1 overlay. Returns the raw recent
  // samples; callers must not mutate them.
  recentPerf() {
    let visible = 0;
    for (const v of this.noteSprites)
      if (v.head.visible || v.body?.visible) visible++;
    return {
      intervals: this.frames.slice(-120),
      works: this.work.slice(-120),
      visible,
    };
  }
  stats() {
    const a = this.frames.slice(60).sort((a, b) => a - b);
    const cpu = this.work.slice(60).sort((a, b) => a - b);
    const sum = a.reduce((x, y) => x + y, 0);
    return {
      effects: {
        fader: this.fader,
        noteAlpha: this.notes.alpha,
        gearAlpha: Number(this.app.canvas.style.opacity || 1),
        fog: this.fog.visible,
        pixelStep: this.pixelStep,
      },
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
