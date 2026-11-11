import { LANGUAGES, translate, type Language } from './i18n';
import { resolvedLanguage } from './language';
import { checkArea, type HealthArea, type HealthResult } from './status-health';
import { acknowledgeFailures, readFailures } from './status-failures';
import { STATUS_LABELS, statusReasonText } from './status-labels';

const areas: HealthArea[] = ['access', 'playback', 'youtube-add'];
const snapshots: Partial<Record<HealthArea, HealthResult>> = {};
const select = document.querySelector<HTMLSelectElement>('#status-language')!;
const refresh = document.querySelector<HTMLButtonElement>('#status-refresh')!;
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem('orvio.settings.v1') || '{}') ?? {};
} catch {}
const requested = new URLSearchParams(location.search).get('lang');
let language: Language =
  requested && Object.hasOwn(LANGUAGES, requested)
    ? (requested as Language)
    : resolvedLanguage(saved, navigator.languages);

function render() {
  const labels = STATUS_LABELS[language] ?? STATUS_LABELS.en;
  document.documentElement.lang = language;
  document.title = labels.statusTitle + ' · orvio';
  document.querySelector('#status-title')!.textContent = labels.statusTitle;
  select.value = language;
  select.setAttribute('aria-label', translate(language, 'language'));
  refresh.textContent = labels.statusRefresh;
  const titles = {
    access: labels.statusAccess,
    playback: labels.statusPlayback,
    'youtube-add': labels.statusYouTubeAdd,
  };
  const states = {
    healthy: labels.statusHealthy,
    degraded: labels.statusDegraded,
    unknown: labels.statusUnknown,
  };
  const failures = readFailures();
  areas.forEach((area) => {
    const card = document.querySelector<HTMLElement>(`[data-area="${area}"]`)!;
    const snapshot = snapshots[area];
    const state = snapshot?.state ?? 'unknown';
    card.querySelector('h2')!.textContent = titles[area];
    const region = card.querySelector<HTMLElement>('[data-state]')!;
    region.dataset.state = state;
    region.textContent = states[state];
    card.querySelector('[data-checked-label]')!.textContent =
      labels.statusCheckedAt;
    card.querySelector('[data-checked-at]')!.textContent = snapshot
      ? new Date(snapshot.checkedAt).toLocaleString(language)
      : '—';
    card.querySelector('[data-detail]')!.textContent = statusReasonText(
      language,
      snapshot?.detail,
    );
    card.querySelector('[data-failure-label]')!.textContent =
      labels.statusLastFailure;
    const failure = failures
      .slice()
      .reverse()
      .find((item) => item.area === area);
    card.querySelector('[data-failure]')!.textContent = failure
      ? `${new Date(failure.at).toLocaleString(language)} · ${statusReasonText(language, failure.message)}`
      : labels.statusNoFailure;
  });
}

async function runChecks() {
  if (refresh.disabled) return;
  refresh.disabled = true;
  try {
    await Promise.all(
      areas.map(async (area) => {
        snapshots[area] = await checkArea(area);
        render();
      }),
    );
  } finally {
    refresh.disabled = false;
  }
}

select.addEventListener('change', () => {
  language = select.value as Language;
  history.replaceState(null, '', '?lang=' + language);
  render();
});
refresh.addEventListener('click', () => void runChecks());
render();
acknowledgeFailures();
void runChecks();
