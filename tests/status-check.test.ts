import { readFile, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assessFunctional, buildReport, classifyApi, classifyWebsite, main } from '../scripts/status-check.mjs';

vi.mock('node:fs/promises', () => ({ readFile: vi.fn(), writeFile: vi.fn() }));

const nowIso = '2026-01-01T00:00:00.000Z';
const earlierIso = '2025-12-31T23:00:00.000Z';
const successfulRun = {
  id: 1234,
  head_branch: 'main',
  head_sha: 'abcdef1234567890abcdef1234567890abcdef12',
  status: 'completed',
  conclusion: 'success',
  run_started_at: '2025-12-31T23:45:00.000Z',
  created_at: '2025-12-31T23:44:00.000Z',
  updated_at: '2025-12-31T23:50:00.000Z',
};
const noProductionRun = { state: 'unknown', detail: 'no production run on main' };
const historicalSuccess = {
  state: 'unknown',
  detail: `CI main@abcdef1 success ${successfulRun.updated_at} (historical; current live release unverified)`,
};
const results = {
  websiteStatic: { state: 'operational', detail: 'static asset served', latencyMs: 10 },
  websiteFunctional: historicalSuccess,
  shareApiRead: { state: 'reachable', detail: 'request validation answered (404); storage not probed', latencyMs: 20 },
};
const historyEntry = {
  checkedAt: earlierIso,
  overall: 'unknown',
  latencyMs: { websiteStatic: 1, shareApiRead: 2 },
};
const previous = (history: unknown[] = [historyEntry]) => ({
  version: 1,
  checkedAt: earlierIso,
  components: {},
  history,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('classifyWebsite', () => {
  it('returns operational for 200', () => {
    expect(classifyWebsite(200, 50)).toEqual({
      state: 'operational',
      detail: 'static asset served',
    });
  });

  it('returns degraded for 500', () => {
    expect(classifyWebsite(500, 50)).toEqual({
      state: 'degraded',
      detail: 'HTTP 500',
    });
  });

  it('returns degraded unreachable on throw', () => {
    expect(classifyWebsite(undefined, 50, true)).toEqual({
      state: 'degraded',
      detail: 'unreachable',
    });
  });
});

describe('classifyApi', () => {
  it('returns reachable for 404', () => {
    expect(classifyApi(404, 30)).toEqual({
      state: 'reachable',
      detail: 'request validation answered (404); storage not probed',
    });
  });

  it('returns degraded for 500', () => {
    expect(classifyApi(500, 30)).toEqual({
      state: 'degraded',
      detail: 'HTTP 500',
    });
  });

  it('returns degraded for 200 unexpected', () => {
    expect(classifyApi(200, 30)).toEqual({
      state: 'degraded',
      detail: 'unexpected HTTP 200',
    });
  });

  it('returns degraded unreachable on throw', () => {
    expect(classifyApi(undefined, 30, true)).toEqual({
      state: 'degraded',
      detail: 'unreachable',
    });
  });

  it('returns degraded unreachable for null', () => {
    expect(classifyApi(null, 30)).toEqual({ state: 'degraded', detail: 'unreachable' });
  });
});

describe('assessFunctional', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const mockRuns = (runs: unknown[]) => fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ workflow_runs: runs })),
  );

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(nowIso));
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('DEPLOY_BRANCH', undefined);
    vi.stubEnv('GITHUB_API_URL', 'https://github.example/api');
    vi.stubEnv('GITHUB_REPOSITORY', 'owner/repo');
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    vi.stubEnv('SITE_BASE_URL', 'https://site.example');
  });

  it('returns unknown when there are no relevant runs', async () => {
    mockRuns([]);
    expect(await assessFunctional()).toEqual(noProductionRun);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      'https://github.example/api/repos/owner/repo/actions/workflows/production.yml/runs?per_page=10',
      {
        headers: { Authorization: 'Bearer test-token', 'User-Agent': 'orvio-status-check' },
        signal: expect.any(AbortSignal),
      },
    );
  });

  it('returns unknown when only another branch has runs', async () => {
    mockRuns([{ ...successfulRun, head_branch: 'feature' }]);
    expect(await assessFunctional()).toEqual(noProductionRun);
  });

  it.each(['queued', 'in_progress'])('does not mask the latest %s run with older success', async (status) => {
    mockRuns([
      { ...successfulRun, head_branch: 'feature' },
      { ...successfulRun, id: 1235, status, conclusion: null },
      successfulRun,
    ]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `latest production run ${status} (run 1235, main@abcdef1, started ${successfulRun.run_started_at})`,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses created_at when a pending run has not started', async () => {
    mockRuns([{ ...successfulRun, status: 'queued', run_started_at: null }]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `latest production run queued (run 1234, main@abcdef1, started ${successfulRun.created_at})`,
    });
  });

  it.each(['failure', 'cancelled', 'timed_out'])('returns degraded for latest %s despite older success', async (conclusion) => {
    mockRuns([{ ...successfulRun, id: 1235, conclusion }, successfulRun]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `production check failed; current functionality unverified (${conclusion}, run 1235, main@abcdef1, ${successfulRun.updated_at})`,
    });
  });

  it.each([null, 'neutral', 'skipped', 'unexpected'])('returns unknown with evidence for %s', async (conclusion) => {
    mockRuns([{ ...successfulRun, conclusion }]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `production run ${conclusion} (run 1234, main@abcdef1, ${successfulRun.updated_at})`,
    });
  });

  it.each(['success', 'failure'])('returns unknown for a stale %s run', async (conclusion) => {
    const updated_at = new Date(Date.parse(nowIso) - 90 * 60 * 1000 - 1).toISOString();
    mockRuns([{ ...successfulRun, conclusion, updated_at }]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `latest production run stale (run 1234, main@abcdef1, ${updated_at}); historical conclusion: ${conclusion}`,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns unknown with historical evidence for fresh success', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    mockRuns([successfulRun]);
    expect(await assessFunctional()).toEqual(historicalSuccess);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(timeout.mock.calls).toEqual([[10000]]);
  });

  it.each(['success', 'failure'])('returns unknown for a future %s run beyond clock skew', async (conclusion) => {
    const updated_at = new Date(Date.parse(nowIso) + 5 * 60 * 1000 + 1).toISOString();
    mockRuns([{ ...successfulRun, conclusion, updated_at }]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `latest production run has future timestamp (run 1234, main@abcdef1, ${updated_at})`,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('allows five minutes of clock skew while keeping success historical', async () => {
    const updated_at = new Date(Date.parse(nowIso) + 5 * 60 * 1000).toISOString();
    mockRuns([{ ...successfulRun, updated_at }]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `CI main@abcdef1 success ${updated_at} (historical; current live release unverified)`,
    });
  });

  it.each([undefined, null, 1234, '', 'abcdef1', 'abcdef1234567890', 'g'.repeat(40), 'a'.repeat(41)])(
    'returns unknown missing evidence for invalid head_sha %s', async (head_sha) => {
      mockRuns([{ ...successfulRun, head_sha }]);
      const shortSha = typeof head_sha === 'string' ? head_sha.slice(0, 7) : '';
      expect(await assessFunctional()).toEqual({
        state: 'unknown',
        detail: `latest production run missing evidence (run 1234, main@${shortSha}, ${successfulRun.updated_at})`,
      });
    },
  );

  it('accepts a full uppercase hexadecimal SHA as historical evidence', async () => {
    mockRuns([{ ...successfulRun, head_sha: successfulRun.head_sha.toUpperCase() }]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `CI main@ABCDEF1 success ${successfulRun.updated_at} (historical; current live release unverified)`,
    });
  });

  it('honors DEPLOY_BRANCH and ignores newer runs on other branches', async () => {
    vi.stubEnv('DEPLOY_BRANCH', 'release');
    mockRuns([successfulRun, { ...successfulRun, head_branch: 'release' }]);
    expect(await assessFunctional()).toEqual({
      state: 'unknown',
      detail: `CI release@abcdef1 success ${successfulRun.updated_at} (historical; current live release unverified)`,
    });
  });
});

describe('buildReport', () => {
  it('reports four components and remains unknown while transcription is not monitored', () => {
    const report = buildReport(null, results, nowIso);
    expect(report.overall).toBe('unknown');
    expect(report.version).toBe(1);
    expect(report.checkedAt).toBe(nowIso);
    expect(report.components).toEqual({
      ...results,
      transcription: { state: 'not_monitored', detail: 'external provider, not probed by the monitor' },
    });
    expect(buildReport(null, {
      ...results,
      shareApiRead: { state: 'operational' },
    }, nowIso).overall).toBe('unknown');
  });

  it.each(['websiteStatic', 'websiteFunctional', 'shareApiRead'])('degraded wins for %s', (name) => {
    const report = buildReport({ ...previous(), overall: 'operational' }, {
      ...results,
      overall: 'operational',
      [name]: { state: 'degraded', detail: 'failing' },
    }, nowIso);
    expect(report.overall).toBe('degraded');
    expect(report.history.at(-1).overall).toBe('degraded');
  });

  it('computes overall from components rather than trusting input states', () => {
    const report = buildReport({ ...previous(), overall: 'degraded' }, {
      ...results,
      overall: 'operational',
      transcription: { state: 'operational' },
      websiteFunctional: noProductionRun,
    }, nowIso);
    expect(report.overall).toBe('unknown');
    expect(report.components.transcription.state).toBe('not_monitored');
  });

  it('sanitizes carried history with a field allowlist', () => {
    const report = buildReport(previous([
      { ...historyEntry, id: 'stray-id', extra: { secret: 'drop' } },
      null,
      { ...historyEntry, checkedAt: 'invalid' },
      { ...historyEntry, checkedAt: '2999-01-01T00:00:00.000Z' },
      { ...historyEntry, overall: 'reachable' },
      { ...historyEntry, latencyMs: null },
      { ...historyEntry, latencyMs: [1, 2] },
    ]), results, nowIso);
    expect(report.history).toHaveLength(2);
    expect(report.history[0]).toEqual(historyEntry);
  });

  it('allowlists latency keys in carried history without changing other entry fields', () => {
    const entry = {
      ...historyEntry,
      overall: 'degraded',
      latencyMs: { id: 0, websiteStatic: 5, shareApiRead: 9, transcription: 1, evil: 'x' },
    };
    const report = buildReport(previous([entry]), results, nowIso);
    expect(report.history).toHaveLength(2);
    expect(report.history[0]).toEqual({
      ...entry,
      latencyMs: { websiteStatic: 5, shareApiRead: 9 },
    });
  });

  it.each([-1, Infinity, -Infinity, NaN, '1', null, undefined])(
    'drops invalid latency %s from carried and new history', (latencyMs) => {
      for (const name of ['websiteStatic', 'shareApiRead'] as const) {
        const otherName = name === 'websiteStatic' ? 'shareApiRead' : 'websiteStatic';
        const entry = { ...historyEntry, latencyMs: { [name]: latencyMs, [otherName]: 0 } };
        const report = buildReport(previous([entry]), {
          ...results,
          [name]: { ...results[name], latencyMs },
          [otherName]: { ...results[otherName], latencyMs: 0 },
        }, nowIso);
        expect(report.history).toEqual([
          { ...historyEntry, latencyMs: { [otherName]: 0 } },
          { checkedAt: nowIso, overall: 'unknown', latencyMs: { [otherName]: 0 } },
        ]);
      }
    },
  );

  it('keeps empty latency objects when no allowed values survive', () => {
    const report = buildReport(previous([
      { ...historyEntry, latencyMs: { websiteStatic: -1, shareApiRead: Infinity, id: 0 } },
    ]), {
      ...results,
      websiteStatic: { ...results.websiteStatic, latencyMs: -1 },
      shareApiRead: { ...results.shareApiRead, latencyMs: NaN },
      websiteFunctional: { ...results.websiteFunctional, latencyMs: 5 },
    }, nowIso);
    expect(report.history).toEqual([
      { ...historyEntry, latencyMs: {} },
      { checkedAt: nowIso, overall: 'unknown', latencyMs: {} },
    ]);
  });

  it.each([
    null,
    { ...previous(), version: 2 },
    { ...previous(), checkedAt: 'invalid' },
    { ...previous(), checkedAt: '2999-01-01T00:00:00.000Z' },
    { ...previous(), components: [] },
    { ...previous(), components: null },
    { ...previous(), components: 'invalid' },
    { ...previous(), history: {} },
  ])('discards history from an invalid previous artifact: %j', (prev) => {
    expect(buildReport(prev, results, nowIso).history).toHaveLength(1);
  });

  it('keeps the last 95 valid previous entries plus the new entry', () => {
    const prevHistory = Array.from({ length: 100 }, (_, i) => ({
      ...historyEntry,
      checkedAt: new Date(Date.parse(earlierIso) + i * 1000).toISOString(),
    }));
    const report = buildReport(previous([...prevHistory, { id: 'invalid' }]), results, nowIso);
    expect(report.history).toHaveLength(96);
    expect(report.history[0]).toEqual(prevHistory[5]);
    expect(report.history[95]).toEqual({
      checkedAt: nowIso,
      overall: 'unknown',
      latencyMs: { websiteStatic: 10, shareApiRead: 20 },
    });
  });

  it('uses only CI environment variables for producer metadata', () => {
    vi.stubEnv('GITHUB_REPOSITORY', 'owner/repo');
    vi.stubEnv('GITHUB_SHA', 'abc123');
    vi.stubEnv('GITHUB_RUN_ID', '1234');
    vi.stubEnv('GITHUB_WORKFLOW', 'status');
    const report = buildReport({ ...previous(), producer: { repo: 'invented' } }, results, nowIso);
    expect(report.producer).toEqual({ repo: 'owner/repo', revision: 'abc123', runId: '1234', workflow: 'status' });
  });

  it('omits missing producer fields instead of inventing values', () => {
    for (const name of ['GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_WORKFLOW']) {
      vi.stubEnv(name, undefined);
    }
    expect(buildReport(previous(), results, nowIso).producer).toEqual({});
    vi.stubEnv('GITHUB_REPOSITORY', 'owner/repo');
    expect(buildReport(previous(), results, nowIso).producer).toEqual({ repo: 'owner/repo' });
  });
});

describe('main', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const writtenReport = () => JSON.parse(String(vi.mocked(writeFile).mock.calls[0][1]));

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(nowIso));
    vi.stubEnv('DEPLOY_BRANCH', undefined);
    vi.mocked(readFile).mockReset().mockResolvedValue(JSON.stringify(previous()));
    vi.mocked(writeFile).mockReset().mockResolvedValue(undefined);
    fetchMock.mockReset()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [successfulRun] })))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('STATUS_PREV_PATH', 'status-prev.json');
    vi.stubEnv('STATUS_JSON_PATH', 'status.json');
    vi.stubEnv('GITHUB_API_URL', 'https://github.example/api');
    vi.stubEnv('GITHUB_REPOSITORY', 'owner/repo');
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    vi.stubEnv('SITE_BASE_URL', 'https://site.example');
    vi.stubEnv('SHARE_API_BASE', 'https://share.example');
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('loads previous history before fetching E2E and probing only static/read endpoints', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(previous([
      { ...historyEntry, id: 'strip-me', extra: true },
      { ...historyEntry, latencyMs: { websiteStatic: 'bad' } },
    ])));
    await main();
    expect(readFile).toHaveBeenCalledExactlyOnceWith('status-prev.json', 'utf8');
    expect(vi.mocked(readFile).mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(1,
      'https://github.example/api/repos/owner/repo/actions/workflows/production.yml/runs?per_page=10',
      expect.objectContaining({ headers: { Authorization: 'Bearer test-token', 'User-Agent': 'orvio-status-check' } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2,
      expect.stringMatching(/^https:\/\/site\.example\/manifest\.webmanifest\?status-check=\d+$/),
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(3,
      'https://share.example/v1/replays/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', expect.any(Object),
    );
    expect(writeFile).toHaveBeenCalledWith('status.json', expect.any(String), 'utf8');
    const report = writtenReport();
    expect(report.history).toHaveLength(3);
    expect(report.history[0]).toEqual(historyEntry);
    expect(report.history[1]).toEqual({ ...historyEntry, latencyMs: {} });
    expect(report.components.websiteFunctional).toEqual(historicalSuccess);
    expect(report.components.shareApiRead.state).toBe('reachable');
    expect(report.overall).toBe('unknown');
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it.each(['missing', 'invalid JSON', 'invalid schema'])('tolerates %s previous artifacts and exits zero', async (kind) => {
    if (kind === 'missing') vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));
    else vi.mocked(readFile).mockResolvedValue(kind === 'invalid JSON' ? '{' : JSON.stringify({ ...previous(), components: [] }));
    await main();
    expect(writtenReport().history).toHaveLength(1);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('uses default paths and the default GitHub API URL', async () => {
    vi.stubEnv('STATUS_PREV_PATH', undefined);
    vi.stubEnv('STATUS_JSON_PATH', undefined);
    vi.stubEnv('GITHUB_API_URL', undefined);
    await main();
    expect(readFile).toHaveBeenCalledWith('./status-prev.json', 'utf8');
    expect(writeFile).toHaveBeenCalledWith('./status.json', expect.any(String), 'utf8');
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.github.com/repos/owner/repo/actions/workflows/production.yml/runs?per_page=10',
    );
  });

  it.each(['network', 'HTTP', 'invalid JSON', 'no runs'])('tolerates GitHub %s failure', async (kind) => {
    fetchMock.mockReset();
    if (kind === 'network') fetchMock.mockRejectedValueOnce(new Error('offline'));
    else fetchMock.mockResolvedValueOnce(kind === 'HTTP'
      ? new Response(null, { status: 503 })
      : new Response(kind === 'invalid JSON' ? '{' : JSON.stringify({ workflow_runs: [] })));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await main();
    expect(writtenReport().components.websiteFunctional).toEqual(noProductionRun);
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('reports failing E2E as degraded while exiting zero', async () => {
    fetchMock.mockReset()
      .mockResolvedValueOnce(new Response(JSON.stringify({ workflow_runs: [{ ...successfulRun, conclusion: 'failure' }] })))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await main();
    expect(writtenReport()).toMatchObject({
      overall: 'unknown',
      components: {
        websiteFunctional: {
          state: 'unknown',
          detail: `production check failed; current functionality unverified (failure, run 1234, main@abcdef1, ${successfulRun.updated_at})`,
        },
      },
    });
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('bounds loaded history to 96 entries', async () => {
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(previous(Array.from({ length: 120 }, () => historyEntry))));
    await main();
    expect(writtenReport().history).toHaveLength(96);
  });

  it('writes CI producer metadata and omits absent fields', async () => {
    vi.stubEnv('GITHUB_SHA', 'abc123');
    vi.stubEnv('GITHUB_RUN_ID', '1234');
    vi.stubEnv('GITHUB_WORKFLOW', undefined);
    await main();
    expect(writtenReport().producer).toEqual({
      repo: 'owner/repo', revision: 'abc123', runId: '1234',
    });
  });
});
