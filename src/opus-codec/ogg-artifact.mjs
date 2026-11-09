// Private admission preflight. Validates container integrity, NOT decoded PCM.
const text = new TextDecoder();
export function oggCrc(bytes) {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    const x = i >= 22 && i < 26 ? 0 : bytes[i];
    crc ^= x << 24;
    for (let n = 0; n < 8; n++)
      crc = crc & 0x80000000 ? (crc << 1) ^ 0x04c11db7 : crc << 1;
  }
  return crc >>> 0;
}
export function inspectOpusOgg(
  bytes,
  { expectedFrames, expectedChannels, expectedPreSkip } = {},
) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 47)
    throw Error('ogg_bytes');
  let off = 0,
    serial,
    seq = 0,
    pages = 0,
    ended = false,
    continued = false,
    packet = 0,
    packetSize = 0,
    head = [],
    preSkip,
    channels,
    lastGranule = null;
  while (off < bytes.length) {
    if (ended || off + 27 > bytes.length)
      throw Error('ogg_trailing_or_truncated');
    const d = new DataView(bytes.buffer, bytes.byteOffset + off),
      flags = bytes[off + 5],
      laces = bytes[off + 26];
    if (
      text.decode(bytes.subarray(off, off + 4)) !== 'OggS' ||
      bytes[off + 4] !== 0 ||
      flags & ~7
    )
      throw Error('ogg_header');
    if (off + 27 + laces > bytes.length) throw Error('ogg_laces');
    let size = 27 + laces;
    for (let i = 0; i < laces; i++) size += bytes[off + 27 + i];
    if (off + size > bytes.length) throw Error('ogg_body');
    const page = bytes.subarray(off, off + size);
    if (d.getUint32(22, true) !== oggCrc(page)) throw Error('ogg_crc');
    const s = d.getUint32(14, true),
      q = d.getUint32(18, true);
    if (pages === 0) {
      serial = s;
      if (!(flags & 2) || flags & 1) throw Error('ogg_bos');
    } else if (s !== serial || flags & 2) throw Error('ogg_multiplex');
    if (q !== seq++ || Boolean(flags & 1) !== continued)
      throw Error('ogg_sequence_or_continuation');
    const granule = d.getBigUint64(6, true);
    if (granule !== 0xffffffffffffffffn) {
      if (lastGranule !== null && granule < lastGranule)
        throw Error('ogg_granule_order');
      lastGranule = granule;
    }
    let p = off + 27 + laces;
    for (let i = 0; i < laces; i++) {
      const n = bytes[off + 27 + i];
      if (packet < 2 && head.length < 64) {
        const take = Math.min(n, 64 - head.length);
        for (let j = 0; j < take; j++) head.push(bytes[p + j]);
      }
      p += n;
      packetSize += n;
      continued = n === 255;
      if (!continued) {
        if (packet === 0) {
          const h = Uint8Array.from(head),
            v = new DataView(h.buffer);
          if (
            packetSize !== 19 ||
            text.decode(h.subarray(0, 8)) !== 'OpusHead' ||
            h[8] !== 1 ||
            ![1, 2].includes(h[9]) ||
            h[18] !== 0
          )
            throw Error('opus_head');
          channels = h[9];
          preSkip = v.getUint16(10, true);
        } else if (
          packet === 1 &&
          text.decode(Uint8Array.from(head).subarray(0, 8)) !== 'OpusTags'
        )
          throw Error('opus_tags');
        packet++;
        head = [];
        packetSize = 0;
      }
    }
    if (flags & 4) {
      if (continued || packet < 3 || granule === 0xffffffffffffffffn)
        throw Error('ogg_eos');
      ended = true;
    }
    off += size;
    pages++;
  }
  if (
    !ended ||
    lastGranule === null ||
    lastGranule < BigInt(preSkip) ||
    lastGranule - BigInt(preSkip) > 14400000n
  )
    throw Error('opus_duration');
  const frames = Number(lastGranule - BigInt(preSkip));
  if (
    frames < 1 ||
    (expectedFrames !== undefined && frames !== expectedFrames) ||
    (expectedChannels !== undefined && channels !== expectedChannels) ||
    (expectedPreSkip !== undefined && preSkip !== expectedPreSkip)
  )
    throw Error('opus_timing_mismatch');
  return {
    bytes: bytes.length,
    pages,
    serial,
    frames,
    sampleRate: 48000,
    channels,
    preSkip,
  };
}
export function checkStoredReduction(sourceBytes, objects) {
  if (
    !Number.isSafeInteger(sourceBytes) ||
    sourceBytes < 44 ||
    !Array.isArray(objects) ||
    !objects.length
  )
    throw Error('size_input');
  const seen = new Set();
  let total = 0;
  const te = new TextEncoder();
  for (const o of objects) {
    if (
      !o ||
      typeof o.key !== 'string' ||
      !o.key.length ||
      seen.has(o.key) ||
      !Number.isSafeInteger(o.valueBytes) ||
      o.valueBytes < 1 ||
      !Number.isSafeInteger(o.metadataBytes ?? 0) ||
      (o.metadataBytes ?? 0) < 0
    )
      throw Error('size_object');
    seen.add(o.key);
    total += te.encode(o.key).length + o.valueBytes + (o.metadataBytes ?? 0);
    if (!Number.isSafeInteger(total)) throw Error('size_overflow');
  }
  return {
    sourceBytes,
    storedBytes: total,
    maxStoredBytes: Math.floor(sourceBytes / 10),
    meets90Percent: total <= Math.floor(sourceBytes / 10),
  };
}
