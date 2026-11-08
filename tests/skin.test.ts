import { test, expect } from 'vitest';
import { defaultSkin, type Skin } from '../src/skin';
import { Playfield } from '../src/renderer';

// The default skin must reproduce the pre-skin renderer byte-for-byte: every
// color, alpha, and geometry constant below is the literal the renderer used
// before the parts became replaceable. Changing any of them changes the
// current appearance, which the modularity work must not do.
test('default gear skin keeps the current playfield appearance', () => {
  expect(defaultSkin().gear).toEqual({
    background: 0x070f19,
    backgroundAlpha: 0.85,
    laneStripe: 0x172638,
    laneStripeAlpha: 0.45,
    laneSeparator: 0xffffff,
    laneSeparatorAlpha: 0.07,
    laneSeparatorWidth: 1,
    judgmentLine: 0xbdefff,
    judgmentLineHeight: 3,
    judgmentLineOffsetY: -1,
    judgmentGlow: 0x29d8ff,
    judgmentGlowAlpha: 0.08,
    judgmentGlowHeight: 18,
    judgmentGlowOffsetY: 2,
  });
});

test('default note skin keeps the current note colors and geometry', () => {
  expect(defaultSkin().note).toEqual({
    headAlternate: 0xebfaff,
    headHeight: 10,
    headInsetX: 5,
    bodyAlpha: 0.36,
    bodyInsetFraction: 0.23,
    bodyWidthFraction: 0.54,
    tail: 0xe5faff,
    tailHeight: 5,
    failedBody: 0x66747e,
    failedBodyAlpha: 0.2,
    failedTail: 0x88949b,
    failedTailAlpha: 0.45,
  });
});

test('default press-effect skin keeps the current effect timing and geometry', () => {
  expect(defaultSkin().pressEffect).toEqual({
    keyAlpha: 0.18,
    keyHeight: 78,
    keyInsetX: 2,
    keyOffsetY: 4,
    flashOk: 0xe5faff,
    flashFail: 0xff334d,
    flashDurationMs: 200,
    flashMaxAlpha: 0.7,
    flashHeight: 10,
    flashOffsetY: -5,
    burstDurationMs: 170,
    beamWidthFraction: 0.9,
    beamInsetFraction: 0.05,
    beamHeight: 96,
    beamOffsetY: -76,
    beamRise: 10,
    beamBurstAlpha: 0.8,
    holdAlphaBase: 0.38,
    holdAlphaPulse: 0.12,
    holdPulsePeriodMs: 140,
    sparkCount: 6,
    spark: 0xfff0ce,
    sparkHoldCycleMs: 260,
    sparkHoldSize: 1.35,
    sparkSpreadFraction: 0.42,
    sparkArcHeight: 65,
    sparkLift: 16,
    sparkOffsetY: -8,
  });
});

// The original burst painter ran a fixed sequence over a 128x128 canvas.
// Replay it against a recording stub and compare every call in order.
test('default burst painter reproduces the original raster sequence', () => {
  const calls: unknown[][] = [];
  const styles: string[] = [];
  const ctx = {
    set fillStyle(v: string) {
      styles.push(v);
    },
    set globalAlpha(v: number) {
      calls.push(['alpha', v]);
    },
    fillRect: (...args: number[]) => calls.push(['rect', ...args]),
  } as unknown as CanvasRenderingContext2D;
  defaultSkin().paintBurst(ctx);
  const expected: unknown[][] = [];
  for (let i = 0; i < 48; i++) {
    const angle = i * 2.3999632297;
    const radius = 8 + (i % 9) * 4;
    const x = 64 + Math.cos(angle) * radius;
    const y = 86 - Math.abs(Math.sin(angle)) * radius * 1.8;
    expected.push(['alpha', 0.3 + (i % 7) / 10]);
    expected.push(['rect', x, y, 1 + (i % 3), 3 + (i % 8)]);
  }
  expected.push(['alpha', 0.8], ['rect', 20, 88, 88, 3]);
  expected.push(['alpha', 0.35], ['rect', 32, 84, 64, 10]);
  expect(calls).toEqual(expected);
  expect(styles.filter((s, i) => styles.indexOf(s) === i).sort()).toEqual(
    ['#32cbef', '#b4f7ff', '#eaffff', '#fff7d8'].sort(),
  );
});

test('skins are per-instance data: defaultSkin never shares mutable state', () => {
  const a: Skin = defaultSkin();
  a.gear.background = 0x111111;
  a.pressEffect.sparkCount = 1;
  const b = defaultSkin();
  expect(b.gear.background).toBe(0x070f19);
  expect(b.pressEffect.sparkCount).toBe(6);
  // The playfield exposes the seam and starts from the current look.
  expect(typeof Playfield.prototype.setSkin).toBe('function');
});
