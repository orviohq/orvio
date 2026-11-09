import { traceMark, type ImportTrace } from '../import-trace';
const LABELS = new Set([
  'opus_provider_wait',
  'opus_source_collect',
  'opus_encode',
  'opus_staged_verify',
  'opus_kv_write',
  'opus_durable_verify',
]);
/** Request-local server evidence only. No arbitrary header strings enter traces. */
export function traceOpusServerTiming(
  trace: ImportTrace | null | undefined,
  header: string | null,
) {
  if (!trace || !header || header.length > 4096) return;
  const seen = new Set<string>();
  for (const entry of header.split(',')) {
    const match = /^\s*([a-z_]+)\s*;\s*dur\s*=\s*(\d+(?:\.\d+)?)\s*$/.exec(
      entry,
    );
    if (!match || !LABELS.has(match[1]) || seen.has(match[1])) continue;
    const ms = Number(match[2]);
    if (!Number.isFinite(ms) || ms > 3600000) continue;
    seen.add(match[1]);
    traceMark(trace, 'backend-' + match[1], { ms: Math.round(ms * 10) / 10 });
  }
}
