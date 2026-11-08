import type { Judgment } from './engine';
export type FeverRulesId =
  'legacy-off-v1' | 'djmax-current-pending-v1' | 'orvio-auto-v1';
export interface FeverReplayMetadata {
  version: 1;
  rulesId: FeverRulesId;
  auto: boolean;
}
export const CURRENT_FEVER: Readonly<FeverReplayMetadata> = Object.freeze({
  version: 1,
  rulesId: 'orvio-auto-v1',
  auto: true,
});
export function validFeverMetadata(raw: unknown): raw is FeverReplayMetadata {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as FeverReplayMetadata;
  return (
    r.version === 1 &&
    ['legacy-off-v1', 'djmax-current-pending-v1', 'orvio-auto-v1'].includes(
      r.rulesId,
    ) &&
    typeof r.auto === 'boolean'
  );
}
export interface FeverRules {
  id: string;
  threshold: number;
  chargeByJudgment: Readonly<Record<Judgment, number>>;
  headWeight: number;
  tailWeight: number;
  holdTicks: {
    seconds: number;
    phase: number;
    charge: number;
    combo: number;
  } | null;
  thresholdNote: 'before' | 'after';
  overflow: 'carry' | 'discard';
  breakStage: 1 | 2 | 3 | 4 | 5;
  breakCharge: 'reset' | 'keep';
  breakHolds: 'keep' | 'clear';
}
/** Orvio's approved independent coefficients, not measured DJMAX constants.
 * Forty-six perfect taps fill a stage. Hold bodies charge half a tap every
 * quarter-second; tails do not charge twice. A BREAK resets stage and charge.
 * The threshold judgment receives the old multiplier, overflow carries, and
 * other held notes continue. This ID is immutable for saved replays.
 */
const ORVIO_AUTO_V1: Readonly<FeverRules> = Object.freeze({
  id: 'orvio-auto-v1',
  threshold: 46,
  chargeByJudgment: Object.freeze({
    100: 1,
    90: 0.9,
    80: 0.8,
    70: 0.7,
    60: 0.6,
    50: 0.5,
    40: 0.4,
    30: 0.3,
    20: 0.2,
    10: 0.1,
    1: 0.01,
    0: 0,
  }),
  headWeight: 1,
  tailWeight: 0,
  holdTicks: Object.freeze({
    seconds: 0.25,
    phase: 0.25,
    charge: 0.5,
    combo: 1,
  }),
  thresholdNote: 'after',
  overflow: 'carry',
  breakStage: 1,
  breakCharge: 'reset',
  breakHolds: 'keep',
});
export function registeredFeverRules(id: FeverRulesId): FeverRules | null {
  return id === 'orvio-auto-v1' ? structuredClone(ORVIO_AUTO_V1) : null;
}
export interface FeverJudgment {
  sequence: number;
  noteId: number;
  time: number;
  value: Judgment;
  tail: boolean;
  holdEnd?: number;
}
export interface FeverJournalEntry {
  kind: 'judgment' | 'hold-tick';
  sequence: number;
  noteId: number;
  time: number;
  stage: number;
  charge: number;
  displayCombo: number;
  activations: number;
}
export class FeverTracker {
  stage = 1;
  charge = 0;
  displayCombo = 0;
  maxDisplayCombo = 0;
  activations = 0;
  readonly journal: FeverJournalEntry[] = [];
  private holds = new Map<number, { next: number; end: number }>();
  private lastSequence = -1;
  readonly status: 'off' | 'pending' | 'ready';
  constructor(
    readonly metadata: FeverReplayMetadata = {
      version: 1,
      rulesId: 'legacy-off-v1',
      auto: false,
    },
    private rules: FeverRules | null = registeredFeverRules(metadata.rulesId),
  ) {
    this.metadata = structuredClone(metadata);
    this.rules = rules = rules ? structuredClone(rules) : null;
    if (
      rules &&
      (!Number.isFinite(rules.threshold) ||
        rules.threshold <= 0 ||
        [
          rules.headWeight,
          rules.tailWeight,
          ...[100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 1, 0].map(
            (v) => rules.chargeByJudgment[v as Judgment],
          ),
        ].some((x) => !Number.isFinite(x) || x < 0) ||
        (rules.holdTicks &&
          (!Number.isFinite(rules.holdTicks.seconds) ||
            rules.holdTicks.seconds <= 0 ||
            !Number.isFinite(rules.holdTicks.phase) ||
            rules.holdTicks.phase <= 0 ||
            !Number.isFinite(rules.holdTicks.charge) ||
            rules.holdTicks.charge < 0 ||
            !Number.isFinite(rules.holdTicks.combo) ||
            rules.holdTicks.combo < 0)))
    )
      throw Error('Invalid fever rules');
    this.status =
      !metadata.auto || metadata.rulesId === 'legacy-off-v1'
        ? 'off'
        : rules
          ? 'ready'
          : 'pending';
  }
  get progress() {
    return this.rules ? this.charge / this.rules.threshold : 0;
  }
  private chargeBy(amount: number) {
    if (this.status !== 'ready' || !this.rules) return;
    this.charge += amount;
    while (this.charge >= this.rules.threshold) {
      this.stage = Math.min(5, this.stage + 1);
      this.activations++;
      this.charge =
        this.rules.overflow === 'carry'
          ? this.charge - this.rules.threshold
          : 0;
    }
  }
  private push(
    kind: FeverJournalEntry['kind'],
    sequence: number,
    noteId: number,
    time: number,
  ) {
    this.maxDisplayCombo = Math.max(this.maxDisplayCombo, this.displayCombo);
    this.journal.push({
      kind,
      sequence,
      noteId,
      time,
      stage: this.stage,
      charge: this.charge,
      displayCombo: this.displayCombo,
      activations: this.activations,
    });
  }
  advance(time: number) {
    if (this.status !== 'ready' || !this.rules?.holdTicks) return;
    const tick = this.rules.holdTicks;
    // Merge held-note clocks by exact timestamp and note id, independent of frame rate.
    while (true) {
      const due = [...this.holds]
        .filter(([, h]) => h.next <= time && h.next < h.end)
        .sort((a, b) => a[1].next - b[1].next || a[0] - b[0])[0];
      if (!due) break;
      const [id, h] = due,
        t = h.next;
      this.chargeBy(tick.charge);
      this.displayCombo += tick.combo * this.stage;
      h.next += tick.seconds;
      this.push('hold-tick', this.lastSequence, id, t);
    }
  }
  judgment(event: FeverJudgment) {
    if (event.sequence <= this.lastSequence) return;
    this.lastSequence = event.sequence;
    const r = this.status === 'ready' ? this.rules : null;
    if (event.value === 0) {
      this.displayCombo = 0;
      if (r?.breakHolds === 'clear') this.holds.clear();
      if (r) {
        this.stage = r.breakStage;
        if (r.breakCharge === 'reset') this.charge = 0;
      }
    } else {
      const charge = r
        ? r.chargeByJudgment[event.value] *
          (event.tail ? r.tailWeight : r.headWeight)
        : 0;
      if (r?.thresholdNote === 'before') this.chargeBy(charge);
      this.displayCombo += r ? this.stage : 1;
      if (r?.thresholdNote === 'after') this.chargeBy(charge);
      if (r?.holdTicks && event.holdEnd !== undefined && !event.tail)
        this.holds.set(event.noteId, {
          next: event.time + r.holdTicks.phase,
          end: event.holdEnd,
        });
    }
    if (event.tail) this.holds.delete(event.noteId);
    this.push('judgment', event.sequence, event.noteId, event.time);
  }
}
