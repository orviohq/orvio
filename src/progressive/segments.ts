// @ts-nocheck
// ISOLATED DESIGN PROTOTYPE. No network, no production import, no new endpoint.
// Trust precondition: an immutable server manifest bound to the frozen identity.
// Per-segment hashes do not derive mathematically from the whole-file SHA.
// Browser-safe hashing: subtle when present, node:crypto otherwise.
import { inspectWav } from '../canonical-pcm.mjs';
export async function hash(bytes) {
  const h = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(h), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
export async function verifySegmentAsync(s, bytes) {
  if (bytes.byteLength !== s.byteLength || (await hash(bytes)) !== s.sha256)
    throw Error('Segment integrity');
  const v = new DataView(bytes),
    channels = [new Float32Array(s.frameCount), new Float32Array(s.frameCount)];
  for (let f = 0; f < s.frameCount; f++)
    for (let c = 0; c < 2; c++)
      channels[c][f] =
        v.getInt16(s.pcmOffsetWithinSegment + f * 4 + c * 2, true) / 32768;
  return channels;
}
export async function makeSegments(wav, videoId, seconds = 2) {
  const p = inspectWav(wav);
  const framesPerSegment = p.sampleRate * seconds;
  if (!Number.isSafeInteger(framesPerSegment) || framesPerSegment <= 0)
    throw Error('Invalid segment duration');
  const blockAlign = p.channels * 2,
    parts = [];
  for (
    let startFrame = 0;
    startFrame < p.frames;
    startFrame += framesPerSegment
  ) {
    const frameCount = Math.min(framesPerSegment, p.frames - startFrame);
    const pcmOffset = p.dataOffset + startFrame * blockAlign;
    const byteOffset = startFrame === 0 ? 0 : pcmOffset;
    const endFrame = startFrame + frameCount;
    const byteEnd =
      endFrame === p.frames
        ? wav.byteLength
        : p.dataOffset + endFrame * blockAlign;
    const bytes = wav.slice(byteOffset, byteEnd);
    parts.push({
      startFrame,
      frameCount,
      byteOffset,
      byteLength: byteEnd - byteOffset,
      pcmOffsetWithinSegment: pcmOffset - byteOffset,
      sha256: await hash(bytes),
      bytes,
    });
  }
  return {
    videoId,
    audioSha256: await hash(wav),
    sampleRate: p.sampleRate,
    channels: p.channels,
    frames: p.frames,
    dataOffset: p.dataOffset,
    byteLength: wav.byteLength,
    parts,
  };
}
export function validateManifest(m, frozen) {
  if (
    m.videoId !== frozen.videoId ||
    m.audioSha256 !== frozen.audioSha256 ||
    m.frames !== frozen.frames ||
    m.sampleRate !== frozen.sampleRate ||
    m.channels !== 2 ||
    ![44100, 48000].includes(m.sampleRate)
  )
    throw Error('Identity mismatch');
  if (
    !Number.isSafeInteger(m.dataOffset) ||
    m.dataOffset < 44 ||
    !Number.isSafeInteger(m.byteLength) ||
    m.byteLength < m.dataOffset + m.frames * 4 ||
    m.byteLength > 57800000 ||
    !m.parts.length
  )
    throw Error('Invalid WAV bounds');
  let frame = 0,
    offset = 0;
  for (const s of m.parts) {
    if (
      !Number.isSafeInteger(s.frameCount) ||
      s.frameCount <= 0 ||
      s.startFrame !== frame ||
      s.byteOffset !== offset ||
      !Number.isSafeInteger(s.byteLength) ||
      s.byteLength <= 0 ||
      s.pcmOffsetWithinSegment !== (frame === 0 ? m.dataOffset : 0) ||
      s.pcmOffsetWithinSegment + s.frameCount * 4 > s.byteLength ||
      !/^[a-f0-9]{64}$/.test(s.sha256)
    )
      throw Error('Invalid coverage');
    const expectedOffset = frame === 0 ? 0 : m.dataOffset + frame * 4;
    const endFrame = frame + s.frameCount;
    const expectedEnd =
      endFrame === m.frames ? m.byteLength : m.dataOffset + endFrame * 4;
    if (
      s.byteOffset !== expectedOffset ||
      s.byteOffset + s.byteLength !== expectedEnd
    )
      throw Error('Invalid PCM mapping');
    frame = endFrame;
    offset += s.byteLength;
  }
  if (frame !== m.frames || offset !== m.byteLength)
    throw Error('Incomplete coverage');
}
export async function verifySegment(s, bytes) {
  if (bytes.byteLength !== s.byteLength || (await hash(bytes)) !== s.sha256)
    throw Error('Segment integrity');
  const v =
      bytes instanceof ArrayBuffer
        ? new DataView(bytes)
        : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    channels = [new Float32Array(s.frameCount), new Float32Array(s.frameCount)];
  for (let f = 0; f < s.frameCount; f++)
    for (let c = 0; c < 2; c++)
      channels[c][f] =
        v.getInt16(s.pcmOffsetWithinSegment + f * 4 + c * 2, true) / 32768;
  return channels;
}
// Planner only. Not an AudioClock implementation or underrun solution.
export function scheduleFromFrame(m, startFrame, contextAnchor) {
  if (
    !Number.isSafeInteger(startFrame) ||
    startFrame < 0 ||
    startFrame >= m.frames
  )
    throw Error('Invalid seek');
  return m.parts
    .filter((s) => s.startFrame + s.frameCount > startFrame)
    .map((s) => {
      const first = Math.max(startFrame, s.startFrame),
        offsetFrames = first - s.startFrame;
      return {
        segmentFrame: s.startFrame,
        offsetFrames,
        frames: s.frameCount - offsetFrames,
        when: contextAnchor + (first - startFrame) / m.sampleRate,
      };
    });
}
