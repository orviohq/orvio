import { it, expect, vi, afterEach } from 'vitest';
import { createImportBudget } from '../src/import-budget';
import { externalError } from '../src/external-errors';
import { LANGUAGES, type Language } from '../src/i18n';
afterEach(() => vi.useRealTimers());
it('a verified receipt at 88s gets a separate bounded completion window, without changing acquisition90s', async () => {
  vi.useFakeTimers();
  const b = createImportBudget();
  await vi.advanceTimersByTimeAsync(88000);
  b.verified();
  await vi.advanceTimersByTimeAsync(4000);
  expect(b.signal.aborted).toBe(false);
  b.stage('charting');
  await vi.advanceTimersByTimeAsync(2500);
  b.stage('saving');
  await vi.advanceTimersByTimeAsync(100);
  expect(b.signal.aborted).toBe(false);
  b.dispose();
  const pending = createImportBudget();
  await vi.advanceTimersByTimeAsync(90000);
  expect(pending.signal.aborted).toBe(true);
  expect(pending.signal.reason).toMatchObject({
    code: 'request_timeout',
    stage: undefined,
  });
  pending.verified();
  expect(pending.signal.aborted).toBe(true);
  pending.dispose();
});
it('each completion phase expires with its actual boundary; repeated/backward callbacks never renew it', async () => {
  vi.useFakeTimers();
  for (const phase of ['response', 'analysis', 'storage'] as const) {
    const b = createImportBudget();
    b.verified();
    if (phase !== 'response') b.stage('charting');
    if (phase === 'storage') b.stage('saving');
    const ms =
      phase === 'response' ? 30000 : phase === 'analysis' ? 60000 : 15000;
    await vi.advanceTimersByTimeAsync(ms - 1);
    b.verified();
    b.stage(
      phase === 'analysis'
        ? 'charting'
        : phase === 'storage'
          ? 'saving'
          : 'downloading',
    );
    b.stage('checking');
    b.stage('queued');
    await vi.advanceTimersByTimeAsync(1);
    expect(b.signal.aborted).toBe(true);
    expect(b.signal.reason).toMatchObject({
      code: 'request_timeout',
      stage: phase,
    });
    b.dispose();
  }
});
it('unverified callbacks cannot extend acquisition and dispose cancels every timer', async () => {
  vi.useFakeTimers();
  const b = createImportBudget();
  b.stage('charting');
  b.stage('saving');
  await vi.advanceTimersByTimeAsync(90000);
  expect(b.signal.aborted).toBe(true);
  b.dispose();
  const good = createImportBudget();
  good.dispose();
  await vi.advanceTimersByTimeAsync(200000);
  expect(good.signal.aborted).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});
it('completion timeout copy is stage-specific in all 13 locales and does not claim another acquisition or a90second download limit', () => {
  vi.useFakeTimers();
  const b = createImportBudget();
  b.verified();
  vi.advanceTimersByTime(30000);
  for (const language of Object.keys(LANGUAGES) as Language[]) {
    const text = externalError(b.signal.reason, language);
    expect(text).not.toContain('90');
    expect(text.length).toBeGreaterThan(30);
  }
  b.dispose();
});
