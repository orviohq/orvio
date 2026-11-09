// Exact producer JSON only. Prevent dropped duplicate/unknown raw payloads.
export function parseOpus35Canonical(text) {
  if (typeof text !== 'string') throw Error('opus35_canonical_json');
  const value = JSON.parse(text);
  if (JSON.stringify(value) !== text) throw Error('opus35_canonical_json');
  return value;
}
