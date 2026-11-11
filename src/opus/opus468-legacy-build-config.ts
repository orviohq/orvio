// Explicit production build activation point.
export const GENERAL468_LEGACY_CONFIG:
  | { endpoint: string; fetchImpl?: typeof fetch }
  | undefined = {
  endpoint: 'https://orvio-share.pn-26f.workers.dev/v2/published-legacy-audio-projection',
};
