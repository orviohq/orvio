import { readFile, writeFile } from 'node:fs/promises';

/**
 * @param {number | null | undefined} status
 * @param {number} latencyMs
 * @param {boolean} [threw]
 */
export function classifyWebsite(status, latencyMs, threw = false) {
  if (threw || status == null) {
    return { state: 'degraded', detail: 'unreachable' };
  }
  if (status === 200) {
    return { state: 'operational', detail: 'static asset served' };
  }
  return { state: 'degraded', detail: `HTTP ${status}` };
}

/**
 * @param {number | null | undefined} status
 * @param {number} latencyMs
 * @param {boolean} [threw]
 */
export function classifyApi(status, latencyMs, threw = false) {
  if (threw || status == null) {
    return { state: 'degraded', detail: 'unreachable' };
  }
  if (status === 404) {
    return { state: 'reachable', detail: 'request validation answered (404); storage not probed' };
  }
  if (status >= 500) {
    return { state: 'degraded', detail: `HTTP ${status}` };
  }
  return { state: 'degraded', detail: `unexpected HTTP ${status}` };
}

/** @param {typeof fetch} [fetchImpl] */
export async function assessFunctional(fetchImpl = globalThis.fetch, siteBase = process.env.SITE_BASE_URL || 'https://orvio-play.pages.dev') {
  const deployBranch = process.env.DEPLOY_BRANCH || 'main';
  let runs = [];
  try {
    const githubBase = process.env.GITHUB_API_URL || 'https://api.github.com';
    const response = await fetchImpl(
      `${githubBase}/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/production.yml/runs?per_page=10`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'User-Agent': 'orvio-status-check',
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.workflow_runs)) runs = data.workflow_runs;
    }
  } catch {
    // Missing CI evidence must never produce a green result.
  }

  const run = runs.find((candidate) => candidate?.head_branch === deployBranch);
  if (!run) {
    return { state: 'unknown', detail: `no production run on ${deployBranch}` };
  }
  const shortSha = typeof run.head_sha === 'string' ? run.head_sha.slice(0, 7) : '';
  const revision = `${run.head_branch}@${shortSha}`;
  if (run.status !== 'completed') {
    return {
      state: 'unknown',
      detail: `latest production run ${run.status} (run ${run.id}, ${revision}, started ${run.run_started_at || run.created_at})`,
    };
  }

  const evidence = `run ${run.id}, ${revision}, ${run.updated_at}`;
  const updatedAt = Date.parse(run.updated_at);
  if (!Number.isFinite(updatedAt) || typeof run.head_sha !== 'string' || !/^[0-9a-f]{40}$/i.test(run.head_sha) || run.id == null) {
    return { state: 'unknown', detail: `latest production run missing evidence (${evidence})` };
  }
  const age = Date.now() - updatedAt;
  if (age < -5 * 60 * 1000) {
    return { state: 'unknown', detail: `latest production run has future timestamp (${evidence})` };
  }
  if (age > 90 * 60 * 1000) {
    return { state: 'unknown', detail: `latest production run stale (${evidence}); historical conclusion: ${run.conclusion}` };
  }
  if (run.conclusion !== 'success') {
    return {
      state: 'unknown',
      detail: ['failure', 'cancelled', 'timed_out'].includes(run.conclusion)
        ? `production check failed; current functionality unverified (${run.conclusion}, ${evidence})`
        : `production run ${run.conclusion} (${evidence})`,
    };
  }

  return {
    state: 'unknown',
    detail: `CI ${revision} success ${run.updated_at} (historical; current live release unverified)`,
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function validatePrevious(prev, nowIso) {
  const now = Date.parse(nowIso);
  const validTime = (value) => typeof value === 'string' &&
    Number.isFinite(Date.parse(value)) && Date.parse(value) <= now;
  if (prev?.version !== 1 || !validTime(prev.checkedAt) || !isPlainObject(prev.components)) {
    return null;
  }
  const history = (Array.isArray(prev.history) ? prev.history : [])
    .filter((entry) => isPlainObject(entry) && validTime(entry.checkedAt) &&
      ['operational', 'degraded', 'unknown'].includes(entry.overall) &&
      isPlainObject(entry.latencyMs))
    .map((entry) => ({
      checkedAt: entry.checkedAt,
      overall: entry.overall,
      latencyMs: Object.fromEntries(
        ['websiteStatic', 'shareApiRead']
          .map((name) => [name, entry.latencyMs[name]])
          .filter(([, latencyMs]) => Number.isFinite(latencyMs) && latencyMs >= 0),
      ),
    }));
  return { version: 1, checkedAt: prev.checkedAt, components: prev.components, history };
}

/**
 * @param {any} prev
 * @param {{ websiteStatic: any, websiteFunctional: any, shareApiRead: any }} results
 * @param {string} nowIso
 */
export function buildReport(prev, results, nowIso) {
  const components = {
    websiteStatic: results.websiteStatic,
    websiteFunctional: results.websiteFunctional,
    shareApiRead: results.shareApiRead,
    transcription: {
      state: 'not_monitored',
      detail: 'external provider, not probed by the monitor',
    },
  };

  const values = Object.values(components).map((component) => component.state);
  let overall;
  if (values.includes('degraded')) {
    overall = 'degraded';
  } else if (values.every((s) => s === 'operational')) {
    overall = 'operational';
  } else {
    overall = 'unknown';
  }

  const prevHistory = validatePrevious(prev, nowIso)?.history ?? [];
  const entry = {
    checkedAt: nowIso,
    overall,
    latencyMs: Object.fromEntries(
      ['websiteStatic', 'shareApiRead']
        .map((name) => [name, components[name].latencyMs])
        .filter(([, latencyMs]) => Number.isFinite(latencyMs) && latencyMs >= 0),
    ),
  };
  const history = [...prevHistory.slice(-95), entry];
  const producer = Object.fromEntries(Object.entries({
    repo: process.env.GITHUB_REPOSITORY,
    revision: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    workflow: process.env.GITHUB_WORKFLOW,
  }).filter(([, value]) => value !== undefined));

  return {
    version: 1,
    checkedAt: nowIso,
    overall,
    producer,
    components,
    history,
  };
}

async function probe(fetchImpl, url) {
  const start = Date.now();
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
    const latencyMs = Date.now() - start;
    return { status: res.status, latencyMs, threw: false };
  } catch {
    const latencyMs = Date.now() - start;
    return { status: undefined, latencyMs, threw: true };
  }
}

async function probeWebsite(fetchImpl, base) {
  const url = `${base}/manifest.webmanifest?status-check=${Date.now()}`;
  const r = await probe(fetchImpl, url);
  return { ...classifyWebsite(r.status, r.latencyMs, r.threw), latencyMs: r.latencyMs };
}

async function probeShareApi(fetchImpl, apiBase) {
  const url = `${apiBase}/v1/replays/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
  const r = await probe(fetchImpl, url);
  return { ...classifyApi(r.status, r.latencyMs, r.threw), latencyMs: r.latencyMs };
}

export async function main() {
  let prev = null;
  try {
    const raw = await readFile(process.env.STATUS_PREV_PATH || './status-prev.json', 'utf8');
    prev = validatePrevious(JSON.parse(raw), new Date().toISOString());
  } catch {
    prev = null;
  }

  const statusPath = process.env.STATUS_JSON_PATH || './status.json';
  const siteBase = process.env.SITE_BASE_URL || 'https://orvio-play.pages.dev';
  const apiBase = process.env.SHARE_API_BASE || 'https://orvio-share.pn-26f.workers.dev';
  const fetchImpl = globalThis.fetch;

  const websiteFunctional = await assessFunctional(fetchImpl, siteBase);
  const websiteStatic = await probeWebsite(fetchImpl, siteBase);
  const shareApiRead = await probeShareApi(fetchImpl, apiBase);
  const nowIso = new Date().toISOString();

  const report = buildReport(prev, { websiteStatic, websiteFunctional, shareApiRead }, nowIso);

  try {
    await writeFile(statusPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  } catch (err) {
    console.error(`Failed to write status artifact: ${err?.message || err}`);
    process.exit(1);
  }

  console.log(
    `status=${report.overall} checkedAt=${report.checkedAt} websiteStatic=${websiteStatic.state}(${websiteStatic.latencyMs}ms) websiteFunctional=${websiteFunctional.state} shareApiRead=${shareApiRead.state}(${shareApiRead.latencyMs}ms) transcription=${report.components.transcription.state}`,
  );
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
  });
}
