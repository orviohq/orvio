// Research-only, on-device preparation. Dependencies are the existing source
// validators, injected to keep this unused prototype outside product wiring.
export function manifestTools({ hash, inspectWav, makeSegments, validateManifest,
  manifestSha256, checkManifestBinding, verifySegment }) {
  async function accept(manifest, record, pin) {
    validateManifest(manifest, record); // geometry before hash binding
    if (pin?.videoId !== record.videoId || pin?.audioSha256 !== record.audioSha256 ||
        pin?.chartSetSha256 !== record.chartSetSha256)
      throw Error('Frozen pin identity mismatch');
    if (await checkManifestBinding(manifest, pin) !== 'verified')
      throw Error('Missing trusted manifest binding');
  }
  return {
    async prepare(bytes, validatedRecord, expectedVideoId) {
      // Snapshot inputs before awaits; caller supplies an already validated record.
      const record = structuredClone(validatedRecord);
      const owned = bytes.slice(0);
      if (record.videoId !== expectedVideoId) throw Error('Video identity mismatch');
      if (await hash(owned) !== record.audioSha256) throw Error('Full audio SHA mismatch');
      const wav = inspectWav(owned);
      if (wav.frames !== record.frames || wav.sampleRate !== record.sampleRate)
        throw Error('WAV geometry mismatch');
      const generated = await makeSegments(owned, record.videoId, 2);
      const manifest = { ...generated, parts: generated.parts.map(({ bytes, ...part }) => part) };
      validateManifest(manifest, record);
      const pin = { videoId: record.videoId, audioSha256: record.audioSha256,
        chartSetSha256: record.chartSetSha256, manifestSha256: await manifestSha256(manifest) };
      await accept(manifest, record, pin);
      return { manifest, pin };
    },
    async scheduleFirst({ manifest, record, pin, bytes, clock, leadIn = 0.15 }) {
      // pin MUST originate from a separately accepted new-share commitment.
      // This prototype does not create recipient trust from an untrusted response.
      const m = structuredClone(manifest), r = structuredClone(record), p = structuredClone(pin);
      const owned = bytes.slice(0);
      await accept(m, r, p);
      const part = m.parts[0];
      const channels = await verifySegment(part, owned);
      await clock.begin(leadIn);
      clock.scheduleSegment(part, channels, m);
    },
  };
}
