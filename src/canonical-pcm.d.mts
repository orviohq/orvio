export interface ParsedWav {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  frames: number;
  samples: Float32Array;
}
export function parseWav(buf: ArrayBuffer | Uint8Array): ParsedWav;
export function toMono(parsed: ParsedWav): Float32Array;
export function resampleLinear(
  mono: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array;
