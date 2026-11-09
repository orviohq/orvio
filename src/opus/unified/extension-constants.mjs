// Frozen transport limits retained from the existing extension wire contract.
export const OPUS468_CHART_KEYS = Object.freeze(
  [4, 6, 8].flatMap((n) =>
    ['low', 'mid', 'high', 'sc'].map((t) => `${n}:${t}`),
  ),
);
export const OPUS468_TIER_NOTE_CAP = Object.freeze({
  low: 910,
  mid: 1270,
  high: 2770,
  sc: 3130,
});
export const OPUS468_MAX_TOTAL_NOTES = 24300;
export const OPUS468_SC_MARKER = 'sc_collapsed_into_mx';
