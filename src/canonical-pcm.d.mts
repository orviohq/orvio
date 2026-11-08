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

export interface WavInfo extends Omit<ParsedWav, 'samples'> {
  view: DataView;
  dataOffset: number;
}
export function inspectWav(buf: ArrayBuffer | Uint8Array): WavInfo;
export function parseWavMono(
  buf: ArrayBuffer | Uint8Array,
): Pick<ParsedWav, 'sampleRate' | 'frames' | 'samples'>;
