import type { OpusRecord } from './opus-record';
// Full descriptor binds video, encoded bytes, decoder and PCM roots. Chart root
// is separate so frozen charts cannot silently change under one song identity.
export const opus35AudioId = (r: OpusRecord) =>
  `yt-opus35-${r.videoId}-${r.audioDescriptorSha256}`;
export const opus35SourceId = (r: OpusRecord) =>
  `${opus35AudioId(r)}-c${r.chartSetSha256}`;
