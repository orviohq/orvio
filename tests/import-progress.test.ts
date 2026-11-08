import { it, expect } from 'vitest';
import { LANGUAGES } from '../src/i18n';
import {
  IMPORT_STAGES,
  importStageLabel,
  jobImportStage,
} from '../src/import-progress';
import type { AudioJob } from '../src/external-audio-api';
it('only reports observable service stages, combining analysis/chart generation honestly', () => {
  const job = { jobId: 'known-job' };
  expect(jobImportStage({ ...job, status: 'queued' })).toBe('queued');
  expect(jobImportStage({ ...job, status: 'running' })).toBe('extracting');
  expect(jobImportStage({ ...job, status: 'done' })).toBe('checking');
  expect(
    jobImportStage({
      ...job,
      status: 'done',
      canonical: { status: 'generating' },
    }),
  ).toBe('charting');
  expect(
    jobImportStage({ ...job, status: 'done', canonical: { status: 'queued' } }),
  ).toBe('queued');
  expect(
    jobImportStage({
      ...job,
      status: 'done',
      canonical: { status: 'published' },
    }),
  ).toBe('downloading');
  expect(
    jobImportStage({ ...job, status: 'error', error: { code: 'unavailable' } }),
  ).toBeUndefined();
  for (const status of ['audio_changed', 'audio_expired'] as const)
    expect(
      jobImportStage({
        ...job,
        status: 'done',
        canonical: { status },
      } as AudioJob),
    ).toBe('checking');
});
it('every supported language has all actual stages and no invented percentage', () => {
  for (const lang of Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[])
    for (const stage of IMPORT_STAGES) {
      const text = importStageLabel(stage, lang);
      expect(text.length).toBeGreaterThan(3);
      expect(text).not.toContain('%');
    }
});
