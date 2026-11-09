import { it, expect, vi, afterEach } from 'vitest';
const api = vi.hoisted(() => ({
  read: vi.fn(),
  create: vi.fn(),
  prepare: vi.fn(),
}));
vi.mock('../src/opus/opus35-api', () => ({
  readOpus35Job: api.read,
  createOpus35Job: api.create,
  prepareOpus35Job: api.prepare,
}));
import { importOpus35 } from '../src/opus/opus35-import';
const base = {
  jobId: '11111111-2222-4333-8444-555555555555',
  videoId: 'DIPxnt5vnhU',
};
afterEach(() => vi.clearAllMocks());
it('known terminal backend error keeps service attribution without retrying', async () => {
  api.read.mockResolvedValue({
    ...base,
    status: 'error',
    phase: 'FAILED',
    code: 'unavailable',
    stage: 'codec',
    canRetry: false,
  });
  await expect(
    importOpus35(base.videoId, AbortSignal.timeout(1000), {
      jobId: base.jobId,
      retryFailed: true,
    }),
  ).rejects.toMatchObject({ code: 'unavailable', stage: 'service' });
  expect(api.create).not.toHaveBeenCalled();
  expect(api.prepare).not.toHaveBeenCalled();
});
it('unknown collecting never invents a reason or creates another job', async () => {
  api.read.mockResolvedValue({
    ...base,
    status: 'unknown',
    phase: 'COLLECTING',
    canRetry: false,
  });
  await expect(
    importOpus35(base.videoId, AbortSignal.timeout(1000), {
      jobId: base.jobId,
      retryFailed: true,
    }),
  ).rejects.toMatchObject({ code: 'unavailable', stage: undefined });
  expect(api.create).not.toHaveBeenCalled();
  expect(api.prepare).not.toHaveBeenCalled();
});
it('durable source rejection preserves the too-long fact and cannot retry POST', async () => {
  api.read.mockResolvedValue({
    ...base,
    status: 'failed',
    phase: 'SOURCE_REJECTED',
    canRetry: false,
    error: {
      code: 'duration_exceeded',
      stage: 'source',
      durationSec: 450.06079166666666,
      maxDurationSec: 300,
    },
  });
  await expect(
    importOpus35(base.videoId, AbortSignal.timeout(1000), {
      jobId: base.jobId,
      retryFailed: true,
    }),
  ).rejects.toMatchObject({ code: 'too_long', stage: 'service' });
  expect(api.create).not.toHaveBeenCalled();
  expect(api.prepare).not.toHaveBeenCalled();
});
it('ready same-job reads trace the existing handle and pass accurate later stages without POST', async () => {
  const { beginTrace, endTrace } = await import('../src/import-trace');
  const trace = beginTrace();
  const stages: string[] = [];
  api.read.mockResolvedValue({ ...base, status: 'verified' });
  api.prepare.mockImplementation(async (_job, _signal, options) => {
    options.onStage('charting');
    options.onStage('saving');
    return { record: {} };
  });
  await importOpus35(base.videoId, AbortSignal.timeout(1000), {
    jobId: base.jobId,
    trace,
    onStage: (stage) => stages.push(stage),
  });
  endTrace(trace, 'ok');
  expect(api.create).not.toHaveBeenCalled();
  expect(stages).toEqual(['downloading', 'charting', 'saving']);
  expect(trace?.events.map((e) => e.stage)).toEqual([
    'opus-job-read:begin',
    'opus-job-read:end',
  ]);
  expect(api.prepare.mock.calls[0][2].trace).toBe(trace);
});
it('create-only durable queued receipt reaches onJob before the first advancing GET', async () => {
  vi.useFakeTimers();
  try {
    const order: string[] = [];
    api.create.mockImplementation(async () => {
      order.push('create');
      return { ...base, status: 'pending', phase: 'QUEUED', retryAfterSec: 5 };
    });
    api.read.mockImplementation(async () => {
      order.push('get');
      return { ...base, status: 'verified' };
    });
    api.prepare.mockResolvedValue({ record: {} });
    const result = importOpus35(base.videoId, new AbortController().signal, {
      onJob: () => {
        order.push('persist');
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(order).toEqual(['create', 'persist']);
    await vi.advanceTimersByTimeAsync(5000);
    await result;
    expect(order).toEqual(['create', 'persist', 'get', 'persist']);
    expect(api.create).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
it('failed durable receipt callback prevents the first advancing GET without a replacement POST', async () => {
  api.create.mockResolvedValue({
    ...base,
    status: 'pending',
    phase: 'QUEUED',
    retryAfterSec: 5,
  });
  const failure = Error('durable receipt blocked');
  await expect(
    importOpus35(base.videoId, new AbortController().signal, {
      onJob: () => {
        throw failure;
      },
    }),
  ).rejects.toBe(failure);
  expect(api.create).toHaveBeenCalledTimes(1);
  expect(api.read).not.toHaveBeenCalled();
});
it('aborted advancing GET retains a known handle and a later resume does not create', async () => {
  const control = new AbortController();
  api.read.mockImplementationOnce(async () => {
    control.abort();
    throw control.signal.reason;
  });
  await expect(
    importOpus35(base.videoId, control.signal, { jobId: base.jobId }),
  ).rejects.toMatchObject({ name: 'AbortError' });
  api.read.mockResolvedValue({ ...base, status: 'verified' });
  api.prepare.mockResolvedValue({ record: {} });
  await importOpus35(base.videoId, new AbortController().signal, {
    jobId: base.jobId,
  });
  expect(api.create).not.toHaveBeenCalled();
  expect(api.read).toHaveBeenCalledTimes(2);
});
