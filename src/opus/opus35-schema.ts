import { parseOpus35Canonical } from './opus35-canonical.mjs';
// New codec wire privacy boundary. Legacy validators are intentionally untouched.
export function exactKeys(o: any, keys: readonly string[]) {
  return (
    !!o &&
    typeof o === 'object' &&
    !Array.isArray(o) &&
    Object.keys(o).length === keys.length &&
    keys.every((k) => Object.hasOwn(o, k))
  );
}
export const OPTIONS_KEYS = ['speed', 'fader', 'shuffle', 'seed'] as const;
export function strictOpus35Record(r: any) {
  const fields = [
    'version',
    'audioFormat',
    'videoId',
    'audioSha256',
    'sampleRate',
    'estimatedBpm',
    'frames',
    'pipelineVersion',
    'analyzerVersion',
    'config',
    'chartSetSha256',
    'charts',
    'chartMetadata',
    'audioDescriptorSha256',
    'encodedAudioSha256',
    'decoderWasmSha256',
    'sourceProvenance',
  ];
  const charts = [
    '5:low',
    '5:mid',
    '5:high',
    '5:sc',
    '7:low',
    '7:mid',
    '7:high',
    '7:sc',
  ];
  if (
    !exactKeys(r, fields) ||
    !exactKeys(r.charts, charts) ||
    !exactKeys(r.chartMetadata, charts)
  )
    return false;
  if (
    r.analyzerVersion !==
    'research-c3-c2-a35local-fill-lanev3-budget-v1-jackrepair150-hold-chord-tail20-union-v3'
  )
    return false;
  const config = {
    mono: 'left-to-right-mean',
    analysisSampleRate: 22050,
    hop: 512,
    window: 1024,
    onset: 'table-stft-band-flux-c2-a35localfloor',
    selection: 'nested-c2-high-gap0.10-burst8-a35poolfill-pace',
    grid: 'none',
    decoration: 'm17c-band-sustain-hold-chord-tail20',
    tailClipMargin: 0.2,
    lanePlacement:
      'a35-lanev3-budget-v1-adaptive-share-lru-guard120ms+jackrepair150-postpass',
    highMode: 'c2',
    sc: 'a4-sc-chordcap30-hold-emphasis-v1',
  };
  let c: any;
  try {
    c = parseOpus35Canonical(r.config);
  } catch {
    return false;
  }
  if (
    !exactKeys(c, Object.keys(config)) ||
    Object.entries(config).some(([k, v]) => c[k] !== v)
  )
    return false;
  for (const key of charts) {
    const chart = r.charts[key],
      meta = r.chartMetadata[key];
    if (
      !exactKeys(chart, ['notes', 'sha256']) ||
      !Array.isArray(chart.notes) ||
      !chart.notes.every((n: any) =>
        exactKeys(
          n,
          Object.hasOwn(n ?? {}, 'end')
            ? ['id', 'time', 'lane', 'end']
            : ['id', 'time', 'lane'],
        ),
      )
    )
      return false;
    if (
      !exactKeys(meta, ['version', 'family', 'rating', 'status']) ||
      (meta.rating !== null && !exactKeys(meta.rating, ['scale', 'level']))
    )
      return false;
  }
  return true;
}
export function strictOpus35Result(r: any) {
  return (
    exactKeys(r, [
      'song',
      'lanes',
      'difficulty',
      'options',
      'score',
      'accuracy',
      'combo',
      'judgments',
    ]) &&
    exactKeys(r.options, OPTIONS_KEYS) &&
    typeof r.score === 'number' &&
    typeof r.accuracy === 'number' &&
    typeof r.combo === 'number' &&
    Array.isArray(r.judgments) &&
    r.judgments.length === 12 &&
    r.judgments.every(
      (n: any) => typeof n === 'number' && Number.isInteger(n) && n >= 0,
    )
  );
}
export function strictOpus35Replay(r: any) {
  if (!r || typeof r !== 'object') return false;
  const keys = [
    'version',
    'song',
    'lanes',
    'difficulty',
    'options',
    'ops',
    'end',
    ...(Object.hasOwn(r, 'audioLeadIn') ? ['audioLeadIn'] : []),
    ...(Object.hasOwn(r, 'fever') ? ['fever'] : []),
  ];
  return (
    exactKeys(r, keys) &&
    exactKeys(r.options, OPTIONS_KEYS) &&
    (r.fever === undefined ||
      exactKeys(r.fever, ['version', 'rulesId', 'auto']))
  );
}
