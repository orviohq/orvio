import { LANGUAGES, translate, type Language } from './i18n';
import { resolvedLanguage } from './language';
import {
  APP_VERSION,
  overallServiceState,
  probeApi,
  probeProvider,
  probeWebsite,
  type ServiceArea,
  type ServiceResult,
} from './status-service';
import { STATUS_LABELS } from './status-labels';

const MONITOR_URL =
  'https://raw.githubusercontent.com/orviohq/orvio/status/public/status.json';

type MonitorComponentState =
  | 'operational'
  | 'reachable'
  | 'degraded'
  | 'unknown'
  | 'not_monitored';
const monitorComponentNames = [
  'websiteStatic',
  'websiteFunctional',
  'shareApiRead',
  'transcription',
] as const;
interface MonitorComponent {
  state: MonitorComponentState;
  detail: string;
}
interface MonitorReport {
  version: 1;
  checkedAt: string;
  components: Record<(typeof monitorComponentNames)[number], MonitorComponent>;
}

const areas: ServiceArea[] = ['website', 'api', 'provider'];
const snapshots: Partial<Record<ServiceArea, ServiceResult>> = {};
let browserSnapshots: Partial<Record<ServiceArea, ServiceResult>> = {};
let monitorReport: MonitorReport | null = null;
let monitorLoaded = false;
let checking = false;

const select = document.querySelector<HTMLSelectElement>('#status-language')!;
const refresh = document.querySelector<HTMLButtonElement>('#status-refresh')!;

let saved: { language?: string; languageMode?: string } = {};
try {
  saved = JSON.parse(localStorage.getItem('orvio.settings.v1') || '{}') ?? {};
} catch {}
const requested = new URLSearchParams(location.search).get('lang');
let language: Language =
  requested && Object.hasOwn(LANGUAGES, requested)
    ? (requested as Language)
    : resolvedLanguage(saved, navigator.languages);

function formatCheckedAt(checkedAt: string | undefined): string {
  if (!checkedAt) return '—';
  return new Date(checkedAt).toLocaleTimeString(language);
}

function isMonitorStale(checkedAt: string): boolean {
  const t = new Date(checkedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > 90 * 60 * 1000;
}

function monitorComponent(area: ServiceArea): MonitorComponent | undefined {
  if (!monitorReport) return undefined;
  if (area === 'website') {
    const { websiteStatic, websiteFunctional } = monitorReport.components;
    return {
      state: monitorOverall([websiteStatic, websiteFunctional]),
      detail: [websiteStatic.detail, websiteFunctional.detail].filter(Boolean).join(' · '),
    };
  }
  if (area === 'api') return monitorReport.components.shareApiRead;
  return monitorReport.components.transcription;
}

function monitorOverall(components: MonitorComponent[]): 'operational' | 'degraded' | 'unknown' {
  if (components.some((component) => component.state === 'degraded')) return 'degraded';
  if (components.every((component) => component.state === 'operational')) return 'operational';
  return 'unknown';
}

function monitorStateToCard(state: MonitorComponentState | undefined): {
  state: string;
  dataState: 'healthy' | 'degraded' | 'unknown';
} {
  if (state === 'operational') return { state: 'operational', dataState: 'healthy' };
  if (state === 'degraded') return { state: 'degraded', dataState: 'degraded' };
  return { state: state ?? 'unknown', dataState: 'unknown' };
}

function browserDetailText(area: ServiceArea, labels: any): string {
  const snapshot = browserSnapshots[area];
  if (!snapshot) return '';
  if (area === 'provider') return labels.statusProviderDetail ?? '';
  if (area === 'website') {
    if (snapshot.state === 'reachable') {
      return (
        (labels.statusWebsiteDetail ?? '') +
        (snapshot.detail ? ' (' + snapshot.detail + ')' : '')
      );
    }
    if (snapshot.state === 'degraded') {
      return (
        (labels.statusDegraded ?? '') + (snapshot.detail ? ' (' + snapshot.detail + ')' : '')
      );
    }
    return snapshot.detail ? String(snapshot.detail) : '';
  }
  if (area === 'api') {
    if (snapshot.state === 'reachable') {
      return (
        (labels.statusApiDetail ?? '') + (snapshot.detail ? ' (' + snapshot.detail + ')' : '')
      );
    }
    if (snapshot.state === 'degraded') {
      return labels.statusApiUnreachable ?? '';
    }
    return snapshot.detail ? String(snapshot.detail) : '';
  }
  return '';
}

function render() {
  const labels = (STATUS_LABELS[language] ?? STATUS_LABELS.en) as any;
  const monitorStale = monitorReport ? isMonitorStale(monitorReport.checkedAt) : false;
  const staleSuffix = monitorStale ? ' (' + labels.statusStale + ')' : '';
  document.documentElement.lang = language;
  document.title = labels.statusTitle + ' · orvio';

  const title = document.querySelector<HTMLElement>('#status-title');
  if (title) title.textContent = labels.statusTitle;
  select.value = language;
  select.setAttribute('aria-label', translate(language, 'language'));
  refresh.textContent = labels.statusRefresh;

  const titles: Record<ServiceArea, string> = {
    website: labels.statusWebsite,
    api: labels.statusApi,
    provider: labels.statusProvider,
  };
  const stateTexts: Record<string, string> = {
    operational: labels.statusHealthy,
    reachable: labels.statusReachable,
    degraded: labels.statusDegraded,
    not_monitored: labels.statusNotMonitored,
    unknown: labels.statusUnknown,
  };

  areas.forEach((area) => {
    const card = document.querySelector<HTMLElement>(`[data-area="${area}"]`);
    if (!card) return;
    const heading = card.querySelector<HTMLElement>('h2[data-area-title]');
    if (heading) heading.textContent = titles[area];

    const stateEl = card.querySelector<HTMLElement>('.state[data-state]');
    const checkedAtEl = card.querySelector<HTMLElement>('[data-checked-at]');
    const detailEl = card.querySelector<HTMLElement>('[data-detail]');

    if (monitorLoaded && monitorReport) {
      const comp = monitorComponent(area);
      const { state, dataState } = monitorStateToCard(monitorStale ? 'unknown' : comp?.state);
      if (stateEl) {
        stateEl.dataset.state = dataState;
        stateEl.textContent = stateTexts[state] ?? labels.statusUnknown;
      }
      if (checkedAtEl) {
        checkedAtEl.textContent = formatCheckedAt(monitorReport.checkedAt) + ' (monitor)';
      }
      const parts: string[] = [];
      if (area === 'website') {
        const prefix = (labels as any).statusMonitorPrefix;
        const detail = comp?.detail ?? '';
        if (detail) parts.push(prefix + ': ' + detail);
      } else if (area === 'api') {
        const prefix = (labels as any).statusMonitorPrefix;
        const detail = comp?.detail ?? '';
        if (detail) parts.push(prefix + ': ' + detail);
      } else if (area === 'provider') {
        parts.push(labels.statusProviderDetail ?? '');
      }
      const browser = browserDetailText(area, labels);
      if (browser && area !== 'provider') {
        parts.push((labels as any).statusBrowserPrefix + ': ' + browser);
      } else if (browser && area === 'provider' && parts.length === 0) {
        parts.push(browser);
      }
      if (detailEl) detailEl.textContent = parts.join(' · ') + staleSuffix;
      return;
    }

    // Fallback: browser probes only (original behavior)
    const snapshot = snapshots[area];
    let state = snapshot?.state ?? 'unknown';
    let dataState: 'healthy' | 'degraded' | 'unknown' =
      state === 'operational'
        ? 'healthy'
        : state === 'degraded'
          ? 'degraded'
          : state === 'reachable'
            ? 'unknown'
            : 'unknown';
    if (area === 'provider') {
      state = 'not_monitored';
      dataState = 'unknown';
    }
    if (stateEl) {
      stateEl.dataset.state = dataState;
      stateEl.textContent = stateTexts[state] ?? labels.statusUnknown;
    }
    if (checkedAtEl) checkedAtEl.textContent = formatCheckedAt(snapshot?.checkedAt);
    if (detailEl) {
      let detail = '';
      if (area === 'website') {
        if (snapshot?.state === 'reachable') {
          detail =
            labels.statusWebsiteDetail +
            (snapshot.detail ? ' (' + snapshot.detail + ')' : '');
        } else if (snapshot?.state === 'degraded') {
          detail =
            labels.statusDegraded +
            (snapshot.detail ? ' (' + snapshot.detail + ')' : '');
        }
      } else if (area === 'api') {
        if (snapshot?.state === 'reachable') {
          detail =
            labels.statusApiDetail + (snapshot.detail ? ' (' + snapshot.detail + ')' : '');
        } else if (snapshot?.state === 'degraded') {
          detail = labels.statusApiUnreachable;
        }
      } else if (area === 'provider') {
        detail = labels.statusProviderDetail;
      }
      detailEl.textContent = detail;
    }
  });

  const overallBanner = document.querySelector<HTMLElement>('#overall');
  const overallText = overallBanner?.querySelector<HTMLElement>('[data-overall-text]');
  const overallAt = overallBanner?.querySelector<HTMLElement>('[data-overall-at]');
  const versionEl = overallBanner?.querySelector<HTMLElement>('[data-version]');

  if (monitorLoaded && monitorReport) {
    const overall = monitorStale
      ? 'unknown'
      : monitorOverall(monitorComponentNames.map((name) => monitorReport!.components[name]));
    if (overallText) {
      if (overall === 'operational') {
        overallText.dataset.state = 'healthy';
        overallText.textContent = labels.statusAllOperational;
      } else if (overall === 'degraded') {
        overallText.dataset.state = 'degraded';
        overallText.textContent = labels.statusIssueDetected;
      } else {
        overallText.dataset.state = 'unknown';
        overallText.textContent = labels.statusPartiallyVerified;
      }
    }
    if (overallAt) {
      overallAt.textContent = formatCheckedAt(monitorReport.checkedAt) + staleSuffix;
    }
  } else {
    const overall = overallServiceState(snapshots);
    if (overallText) {
      if (overall === 'operational') {
        overallText.dataset.state = 'healthy';
        overallText.textContent = labels.statusAllOperational;
      } else if (overall === 'degraded') {
        overallText.dataset.state = 'degraded';
        overallText.textContent = labels.statusIssueDetected;
      } else {
        overallText.dataset.state = 'unknown';
        overallText.textContent = labels.statusPartiallyVerified;
      }
    }
    if (overallAt) {
      const times = [snapshots.website?.checkedAt, snapshots.api?.checkedAt]
        .filter((v): v is string => !!v)
        .map((v) => new Date(v).getTime())
        .filter((v) => !Number.isNaN(v));
      if (times.length > 0) {
        overallAt.textContent = new Date(Math.max(...times)).toLocaleTimeString(language);
      } else {
        overallAt.textContent = '—';
      }
    }
  }

  if (versionEl) {
    versionEl.textContent = labels.statusVersion + ' ' + APP_VERSION;
  }

  const probeNoteEl = overallBanner?.querySelector<HTMLElement>('[data-probe-note]');
  if (probeNoteEl) {
    probeNoteEl.textContent = monitorLoaded
      ? (labels as any).statusMonitorNote
      : labels.statusProbeNote;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function isValidMonitorReport(data: unknown): data is MonitorReport {
  if (!isPlainObject(data) || data.version !== 1 || typeof data.checkedAt !== 'string') {
    return false;
  }
  const checkedAt = Date.parse(data.checkedAt);
  const age = Date.now() - checkedAt;
  if (!Number.isFinite(checkedAt) || age < -5 * 60 * 1000 || age > 24 * 60 * 60 * 1000) {
    return false;
  }
  const components = data.components;
  if (!isPlainObject(components)) return false;
  return monitorComponentNames.every((name) => {
    const component = components[name];
    return Object.hasOwn(components, name) && isPlainObject(component) &&
      typeof component.state === 'string' &&
      ['operational', 'reachable', 'degraded', 'not_monitored', 'unknown'].includes(component.state) &&
      typeof component.detail === 'string';
  });
}

async function fetchMonitorReport(): Promise<MonitorReport | null> {
  try {
    const sep = MONITOR_URL.includes('?') ? '&' : '?';
    const url = MONITOR_URL + sep + 'cb=' + Date.now();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!isValidMonitorReport(data)) return null;
    return data;
  } catch {
    return null;
  }
}

async function check() {
  if (checking) return;
  checking = true;
  refresh.disabled = true;
  try {
    const monitorPromise = fetchMonitorReport();
    const browserPromise = Promise.allSettled([probeWebsite(), probeApi()]);
    const [monitor, browser] = await Promise.all([monitorPromise, browserPromise]);
    const [website, api] = browser;
    const provider = probeProvider();

    if (website.status === 'fulfilled') {
      browserSnapshots.website = website.value;
      snapshots.website = website.value;
    } else {
      const reason = website.reason as any;
      if (!(reason && (reason.name === 'AbortError' || reason?.aborted))) {
        const failed = {
          state: 'degraded' as const,
          checkedAt: new Date().toISOString(),
          detail: 'unreachable',
        };
        browserSnapshots.website = failed;
        snapshots.website = failed;
      }
    }

    if (api.status === 'fulfilled') {
      browserSnapshots.api = api.value;
      snapshots.api = api.value;
    } else {
      const reason = api.reason as any;
      if (!(reason && (reason.name === 'AbortError' || reason?.aborted))) {
        const failed = {
          state: 'degraded' as const,
          checkedAt: new Date().toISOString(),
          detail: 'unreachable',
        };
        browserSnapshots.api = failed;
        snapshots.api = failed;
      }
    }

    browserSnapshots.provider = provider;
    snapshots.provider = provider;

    if (monitor) {
      monitorReport = monitor;
      monitorLoaded = true;
    } else {
      monitorReport = null;
      monitorLoaded = false;
    }
    render();
  } finally {
    checking = false;
    refresh.disabled = false;
  }
}

select.addEventListener('change', () => {
  language = select.value as Language;
  render();
});
refresh.addEventListener('click', () => void check());

render();
void check();
