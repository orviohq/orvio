/**
 * Replaceable visual parts of the playfield: the gear (the whole note area),
 * the notes, and the press effects. A skin is data plus one painter; swapping
 * `Playfield.skin` restyles those parts without touching the engine, timing,
 * scoring, or replay code. `defaultSkin()` reproduces the current appearance
 * exactly - every value below is the literal the renderer used before skins
 * existed.
 */
export interface GearSkin {
  /** Playfield backdrop fill, also the WebGL clear color. */
  background: number;
  backgroundAlpha: number;
  /** Alternating lane stripe (odd lanes). */
  laneStripe: number;
  laneStripeAlpha: number;
  /** Vertical lane separator stroke. */
  laneSeparator: number;
  laneSeparatorAlpha: number;
  laneSeparatorWidth: number;
  /** Judgment line, drawn at height - JUDGMENT_INSET. */
  judgmentLine: number;
  judgmentLineHeight: number;
  judgmentLineOffsetY: number;
  /** Soft glow band under the judgment line. */
  judgmentGlow: number;
  judgmentGlowAlpha: number;
  judgmentGlowHeight: number;
  judgmentGlowOffsetY: number;
}
export interface NoteSkin {
  /** Head tint on odd lanes; even lanes use the chart accent color. */
  headAlternate: number;
  headHeight: number;
  /** Horizontal inset from each lane edge for heads and tails. */
  headInsetX: number;
  /** Long-note body, tinted with the chart accent color. */
  bodyAlpha: number;
  /** Body horizontal inset and width, as fractions of the head width. */
  bodyInsetFraction: number;
  bodyWidthFraction: number;
  tail: number;
  tailHeight: number;
  /** Tints for a failed (dropped) long note. */
  failedBody: number;
  failedBodyAlpha: number;
  failedTail: number;
  failedTailAlpha: number;
}
export interface PressEffectSkin {
  /** Lane key highlight shown while a lane is pressed. */
  keyAlpha: number;
  keyHeight: number;
  keyInsetX: number;
  keyOffsetY: number;
  /** Judgment flash: tint by result, fades out over flashDurationMs. */
  flashOk: number;
  flashFail: number;
  flashDurationMs: number;
  flashMaxAlpha: number;
  flashHeight: number;
  flashOffsetY: number;
  /** Head/tail hit burst duration; the beam rises beamRise px over it. */
  burstDurationMs: number;
  beamWidthFraction: number;
  beamInsetFraction: number;
  beamHeight: number;
  beamOffsetY: number;
  beamRise: number;
  beamBurstAlpha: number;
  /** Sustained beam while a long note is held: gentle pulse. */
  holdAlphaBase: number;
  holdAlphaPulse: number;
  holdPulsePeriodMs: number;
  /** Spark fountain: sparkCount sprites per lane, burst then hold cycle. */
  sparkCount: number;
  spark: number;
  sparkHoldCycleMs: number;
  sparkHoldSize: number;
  sparkSpreadFraction: number;
  sparkArcHeight: number;
  sparkLift: number;
  sparkOffsetY: number;
}
export interface Skin {
  gear: GearSkin;
  note: NoteSkin;
  pressEffect: PressEffectSkin;
  /**
   * Paints the hit-burst sprite onto a fresh 128x128 canvas context. The
   * renderer calls this once at init and uploads the result as a texture.
   */
  paintBurst(ctx: CanvasRenderingContext2D): void;
}
/** The original raster burst, generated locally once. No copied game texture. */
function paintDefaultBurst(ctx: CanvasRenderingContext2D): void {
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
}
export function defaultSkin(): Skin {
  return {
    gear: {
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
    },
    note: {
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
    },
    pressEffect: {
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
    },
    paintBurst: paintDefaultBurst,
  };
}
