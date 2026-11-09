// ../../tmp/a29-production1831/node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abytes(value, length, title = "") {
  const bytes = isBytes(value);
  const len = value?.length;
  const needsLen = length !== void 0;
  if (!bytes || needsLen && len !== length) {
    const prefix = title && `"${title}" `;
    const ofLen = needsLen ? ` of length ${length}` : "";
    const got = bytes ? `length=${len}` : `type=${typeof value}`;
    throw new Error(prefix + "expected Uint8Array" + ofLen + ", got " + got);
  }
  return value;
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "digestInto() output");
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error('"digestInto() output" expected to be of length >=' + min);
  }
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function createHasher(hashCons, info = {}) {
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var oidNist = (suffix) => ({
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
});

// ../../tmp/a29-production1831/node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class {
  blockLen;
  outputLen;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = false;
  length = 0;
  pos = 0;
  destroyed = false;
  constructor(blockLen, outputLen, padOffset, isLE) {
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    clean(this.buffer.subarray(pos));
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    view.setBigUint64(blockLen - 8, BigInt(this.length * 8), isLE);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen must be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    to ||= new this.constructor();
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);

// ../../tmp/a29-production1831/node_modules/@noble/hashes/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA2_32B = class extends HashMD {
  constructor(outputLen) {
    super(64, outputLen, 8, false);
  }
  get() {
    const { A, B, C, D, E, F, G, H: H2 } = this;
    return [A, B, C, D, E, F, G, H2];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H2) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H2 | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H: H2 } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H2 + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H2 = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H2 = H2 + this.H | 0;
    this.set(A, B, C, D, E, F, G, H2);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var _SHA256 = class extends SHA2_32B {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = SHA256_IV[0] | 0;
  B = SHA256_IV[1] | 0;
  C = SHA256_IV[2] | 0;
  D = SHA256_IV[3] | 0;
  E = SHA256_IV[4] | 0;
  F = SHA256_IV[5] | 0;
  G = SHA256_IV[6] | 0;
  H = SHA256_IV[7] | 0;
  constructor() {
    super(32);
  }
};
var sha256 = /* @__PURE__ */ createHasher(
  () => new _SHA256(),
  /* @__PURE__ */ oidNist(1)
);

// ../../tmp/a29-production1831/worker/src/opus-descriptor.mjs
var FORMAT = "orvio-opus-v1";
var ENCODER = "4b0b17e171bb7469e1e32e7d3bb85ca59b4b89d0b2cd1a7a5d90e4c03ae04c09";
var DECODER = "8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b";
var PCM_RULE = "s16le scale=32768 half-to-even-ties saturate-after-quantize reject-nonfinite";
var H = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
var V = (x) => typeof x === "string" && /^[A-Za-z0-9_-]{11}$/.test(x);
var N = (x, min, max) => Number.isSafeInteger(x) && x >= min && x <= max;
var hash = (b) => Array.from(sha256(b), (x) => x.toString(16).padStart(2, "0")).join("");
var exact = (o, keys2) => o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).length === keys2.length && keys2.every((k) => Object.hasOwn(o, k));
var fields = ["schemaVersion", "audioFormat", "videoId", "oggSha256", "oggBytes", "pcm16Sha256", "sampleRate", "channels", "frames", "preSkip", "bitrateTargetKbps", "encoderWasmSha256", "decoderWasmSha256", "pcm16Rule", "source", "parts"];
function validateOpusDescriptor(d, videoId, oggSha) {
  if (!exact(d, fields) || d.schemaVersion !== 1 || d.audioFormat !== FORMAT || !V(d.videoId) || videoId !== void 0 && d.videoId !== videoId || !H(d.oggSha256) || oggSha !== void 0 && d.oggSha256 !== oggSha || !H(d.pcm16Sha256) || !N(d.oggBytes, 1, 6e6) || d.sampleRate !== 48e3 || d.channels !== 2 || !N(d.frames, 1, 144e5) || !N(d.preSkip, 0, 65535) || ![96, 80, 64].includes(d.bitrateTargetKbps) || d.encoderWasmSha256 !== ENCODER || d.decoderWasmSha256 !== DECODER || d.pcm16Rule !== PCM_RULE) throw Error("invalid_opus_descriptor");
  const s = d.source;
  if (!exact(s, ["sha256", "bytes", "sampleRate", "channels", "frames"]) || !H(s.sha256) || !N(s.bytes, 44, 578e5) || ![44100, 48e3].includes(s.sampleRate) || s.channels !== 2 || !N(s.frames, 1, s.sampleRate * 300) || s.bytes < s.frames * 4 + 44) throw Error("invalid_opus_source");
  if (Math.abs(d.frames - s.frames * 48e3 / s.sampleRate) > 1) throw Error("opus_duration_mismatch");
  if (!Array.isArray(d.parts) || !d.parts.length || d.parts.length > 6) throw Error("invalid_opus_parts");
  let bytes = 0;
  for (let i = 0; i < d.parts.length; i++) {
    const p = d.parts[i];
    if (!exact(p, ["index", "bytes", "sha256"]) || p.index !== i || !H(p.sha256) || !N(p.bytes, 1, 1048576) || i < d.parts.length - 1 && p.bytes !== 1048576) throw Error("invalid_opus_part");
    bytes += p.bytes;
  }
  if (bytes !== d.oggBytes) throw Error("opus_part_total");
  return d;
}
function descriptorBytes(d) {
  validateOpusDescriptor(d);
  return new TextEncoder().encode(JSON.stringify(Object.fromEntries(fields.map((k) => [k, d[k]]))));
}

// ../../tmp/a29-production1831/worker/src/external-source.mjs
var AUDIO_MAX_SECONDS = 300;
var HASH_RE = /^[a-f0-9]{64}$/;
var BASE_CHART_KEYS = ["5:low", "5:mid", "5:high", "7:low", "7:mid", "7:high"];
function presentChartKeys(record) {
  return [...BASE_CHART_KEYS, ...["5:sc", "7:sc"].filter((key) => record.charts[key] !== void 0)];
}
var CHART_FAMILIES = ["NM", "HD", "MX", "SC"];
function familyForKey(key) {
  const tier = key.slice(2);
  return tier === "low" ? "NM" : tier === "mid" ? "HD" : tier === "high" ? "MX" : "SC";
}
function validDifficultyMetadata(raw) {
  if (!raw || typeof raw !== "object") return false;
  const m = raw;
  if (m.version !== 1 || m.family !== null && !CHART_FAMILIES.includes(m.family)) return false;
  if (m.status === "unrated") return m.rating === null;
  if (m.status !== "rated" || m.family === null || !m.rating) return false;
  return Number.isInteger(m.rating.level) && m.rating.level >= 1 && m.rating.level <= 15 && m.rating.scale === (m.family === "SC" ? "sc" : "standard");
}
function validSourceRecord(raw) {
  if (!raw || typeof raw !== "object") return false;
  const r = raw;
  if (r.version !== 1 || !Number.isFinite(r.estimatedBpm) || r.estimatedBpm < 0 || r.estimatedBpm > 400 || !/^[A-Za-z0-9_-]{11}$/.test(r.videoId) || !HASH_RE.test(r.audioSha256) || !Number.isInteger(r.frames) || r.frames <= 0 || !Number.isInteger(r.sampleRate) || r.sampleRate < 8e3 || r.sampleRate > 192e3 || r.frames / r.sampleRate > AUDIO_MAX_SECONDS || typeof r.pipelineVersion !== "string" || !r.pipelineVersion || r.pipelineVersion.length > 128 || typeof r.analyzerVersion !== "string" || !r.analyzerVersion || r.analyzerVersion.length > 128 || typeof r.config !== "string" || r.config.length > 4096 || r.chartSetSha256 !== void 0 && !HASH_RE.test(r.chartSetSha256) || !r.charts)
    return false;
  for (const key of presentChartKeys(r)) {
    const c = r.charts[key];
    const lanes = Number(key[0]);
    if (!c || !HASH_RE.test(c.sha256) || !Array.isArray(c.notes) || c.notes.length === 0 || c.notes.length > 1e4)
      return false;
    if (r.chartMetadata && (!validDifficultyMetadata(r.chartMetadata[key]) || r.chartMetadata[key].family !== familyForKey(key)))
      return false;
    const ids = /* @__PURE__ */ new Set();
    let previous = -Infinity;
    for (const n of c.notes) {
      if (!n || !Number.isInteger(n.id) || ids.has(n.id) || !Number.isInteger(n.lane) || n.lane < 0 || n.lane >= lanes || !Number.isFinite(n.time) || n.time < 0 || n.time < previous || n.time >= r.frames / r.sampleRate || n.end !== void 0 && (!Number.isFinite(n.end) || n.end <= n.time || n.end > r.frames / r.sampleRate))
        return false;
      ids.add(n.id);
      previous = n.time;
    }
  }
  return true;
}
var hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function chartSetHash(record) {
  const bytes = new TextEncoder().encode(
    JSON.stringify({
      analyzer: record.analyzerVersion,
      config: record.config,
      charts: presentChartKeys(record).map((key) => [key, record.charts[key].sha256]),
      ...record.chartMetadata ? { chartMetadata: record.chartMetadata } : {}
    })
  );
  return hex(await crypto.subtle.digest("SHA-256", bytes));
}
async function verifyChartHashes(record) {
  if (!validSourceRecord(record)) return false;
  if (record.chartSetSha256 !== void 0 && record.chartSetSha256 !== await chartSetHash(record)) return false;
  for (const key of presentChartKeys(record)) {
    const bytes = new TextEncoder().encode(JSON.stringify(record.charts[key].notes));
    const actual = hex(await crypto.subtle.digest("SHA-256", bytes));
    if (actual !== record.charts[key].sha256) return false;
  }
  return true;
}
function validOpusSourceRecord(r) {
  if (!r || typeof r !== "object" || Array.isArray(r) || r.version !== 2 || r.audioFormat !== "orvio-opus-v1" || r.pipelineVersion !== "orvio-opus-pinned-pcm16-48k-v1" || r.sourceProvenance !== "local-opus35-v1" || r.sampleRate !== 48e3 || r.decoderWasmSha256 !== "8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b" || ![r.audioDescriptorSha256, r.encodedAudioSha256, r.audioSha256, r.chartSetSha256].every((v) => typeof v === "string" && HASH_RE.test(v)) || r.manifestSha256 !== void 0) return false;
  return validSourceRecord({ ...r, version: 1 });
}
async function verifyOpusChartHashes(r) {
  return validOpusSourceRecord(r) && verifyChartHashes({ ...r, version: 1 });
}

// ../../tmp/a29-split1838/opus468-local-binding-v2.mjs
var TE = new TextEncoder();
var PIPELINE = "orvio-opus-pinned-pcm16-48k-v1";
var OPUS_EXTENSION_KIND = "orvio-opus-chart-extension-v1";
var OPUS_EXTENSION_FAMILY = "468-v1";
var OPUS_EXTENSION_KEYS = Object.freeze([4, 6, 8].flatMap((n) => ["low", "mid", "high", "sc"].map((t) => `${n}:${t}`)));
var BASE_KEYS = ["5:low", "5:mid", "5:high", "7:low", "7:mid", "7:high"];
var SC_KEYS = ["5:sc", "7:sc"];
var ROOTS = ["videoId", "baseSourceRecordSha256", "baseChartSetSha256", "audioSha256", "audioDescriptorSha256", "encodedAudioSha256", "decoderWasmSha256", "pipelineVersion", "frames", "sampleRate", "channels"];
var FIELDS = ["kind", "version", "family", ...ROOTS, "generatorVersion", "config", "charts", "chartMeta"];
var HASH = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
var obj = (o) => !!o && typeof o === "object" && !Array.isArray(o);
var shape = (o, required, optional = []) => obj(o) && required.every((k) => Object.hasOwn(o, k)) && Object.keys(o).every((k) => required.includes(k) || optional.includes(k));
var fail = (e) => {
  throw Error(e);
};
var sha = (s) => hash(TE.encode(s));
var tierFamily = { low: "NM", mid: "HD", high: "MX", sc: "SC" };
var caps = { low: 910, mid: 1270, high: 2770, sc: 3130 };
function note(n, lanes, duration) {
  if (!shape(n, ["id", "time", "lane"], ["end"]) || !Number.isSafeInteger(n.id) || n.id < 0 || !Number.isSafeInteger(n.lane) || n.lane < 0 || n.lane >= lanes || !Number.isFinite(n.time) || n.time < 0 || n.time >= duration || Object.hasOwn(n, "end") && (!Number.isFinite(n.end) || n.end <= n.time || n.end > duration)) fail("extension_note");
  return { id: n.id, time: n.time, lane: n.lane, ...Object.hasOwn(n, "end") ? { end: n.end } : {} };
}
function notes(raw, lanes, duration, { sequential = false, limit = 1e4 } = {}) {
  if (!Array.isArray(raw) || !raw.length || raw.length > limit) fail("extension_note_count");
  const out = raw.map((n) => note(n, lanes, duration)), ids = /* @__PURE__ */ new Set(), until = /* @__PURE__ */ new Map();
  let previous = -Infinity;
  for (let i = 0; i < out.length; i++) {
    const n = out[i];
    if (ids.has(n.id) || sequential && n.id !== i || n.time < previous || (until.get(n.lane) ?? -Infinity) >= n.time) fail("extension_note_order");
    ids.add(n.id);
    previous = n.time;
    until.set(n.lane, n.end ?? n.time);
  }
  return out;
}
function metadata(m, tier, available) {
  if (!shape(m, ["family", "rating", "scAvailable"]) || m.family !== tierFamily[tier] || m.scAvailable !== available) fail("extension_metadata");
  if (!available) {
    if (m.rating !== null) fail("extension_metadata");
    return { family: m.family, rating: null, scAvailable: false };
  }
  if (!shape(m.rating, ["scale", "level"]) || m.rating.scale !== (tier === "sc" ? "sc" : "standard") || !Number.isInteger(m.rating.level) || m.rating.level < 1 || m.rating.level > 15) fail("extension_metadata");
  return { family: m.family, rating: { scale: m.rating.scale, level: m.rating.level }, scAvailable: true };
}
async function baseRecord(raw) {
  if (typeof raw !== "string" || TE.encode(raw).length > 1572864) fail("base_record_bytes");
  let r;
  try {
    r = JSON.parse(raw);
  } catch {
    fail("base_record_json");
  }
  if (!shape(r, ["version", "videoId", "audioSha256", "sampleRate", "estimatedBpm", "frames", "pipelineVersion", "analyzerVersion", "config", "chartSetSha256", "charts", "audioFormat", "audioDescriptorSha256", "encodedAudioSha256", "decoderWasmSha256", "sourceProvenance"], ["chartMetadata"])) fail("base_record_shape");
  if (!shape(r.charts, BASE_KEYS, SC_KEYS)) fail("base_chart_shape");
  const keys2 = [...BASE_KEYS, ...SC_KEYS.filter((k) => Object.hasOwn(r.charts, k))];
  for (const key of keys2) {
    const c = r.charts[key];
    if (!shape(c, ["notes", "sha256"]) || !HASH(c.sha256)) fail("base_chart_shape");
    notes(c.notes, Number(key[0]), r.frames / r.sampleRate);
  }
  if (r.chartMetadata !== void 0) {
    if (!shape(r.chartMetadata, keys2)) fail("base_metadata");
    for (const key of keys2) {
      const m = r.chartMetadata[key];
      if (!shape(m, ["version", "family", "status", "rating"]) || m.version !== 1 || m.family !== tierFamily[key.slice(2)] || !["rated", "unrated"].includes(m.status)) fail("base_metadata");
      if (m.status === "unrated") {
        if (m.rating !== null) fail("base_metadata");
      } else if (!shape(m.rating, ["scale", "level"])) fail("base_metadata");
    }
  }
  if (!await verifyOpusChartHashes(r)) fail("base_record_invalid");
  return r;
}
async function validateOpusExtensionLocalBinding({ extension: e, baseSourceRecordJson, descriptor: d, qualifiedGeneratorVersions = [] } = {}) {
  try {
    if (!shape(e, [...FIELDS, "extensionSha256"]) || e.kind !== OPUS_EXTENSION_KIND || e.version !== 1 || e.family !== OPUS_EXTENSION_FAMILY) fail("extension_shape");
    if (!Array.isArray(qualifiedGeneratorVersions) || !qualifiedGeneratorVersions.every((v) => typeof v === "string") || typeof e.generatorVersion !== "string" || !e.generatorVersion || e.generatorVersion.length > 128 || !qualifiedGeneratorVersions.includes(e.generatorVersion) || e.generatorVersion.startsWith("research-c3") || e.generatorVersion === "orvio-current35-v1") fail("unqualified_generator");
    const r = await baseRecord(baseSourceRecordJson), rawBaseSha = sha(baseSourceRecordJson), db = descriptorBytes(d), dh = hash(db);
    if (e.generatorVersion === r.analyzerVersion) fail("base_analyzer_is_not_extension_generator");
    if (r.videoId !== d.videoId || r.audioSha256 !== d.pcm16Sha256 || r.audioDescriptorSha256 !== dh || r.encodedAudioSha256 !== d.oggSha256 || r.decoderWasmSha256 !== DECODER || r.pipelineVersion !== PIPELINE || r.frames !== d.frames || r.sampleRate !== d.sampleRate || d.channels !== 2) fail("base_audio_binding");
    const bound = { videoId: r.videoId, baseSourceRecordSha256: rawBaseSha, baseChartSetSha256: r.chartSetSha256, audioSha256: r.audioSha256, audioDescriptorSha256: dh, encodedAudioSha256: r.encodedAudioSha256, decoderWasmSha256: DECODER, pipelineVersion: PIPELINE, frames: d.frames, sampleRate: 48e3, channels: 2 };
    if (ROOTS.some((k) => e[k] !== bound[k]) || ROOTS.filter((k) => k.endsWith("Sha256")).some((k) => !HASH(e[k])) || typeof e.config !== "string" || e.config !== r.config) fail("extension_base_binding");
    if (!shape(e.charts, OPUS_EXTENSION_KEYS) || !shape(e.chartMeta, OPUS_EXTENSION_KEYS)) fail("extension_slots");
    let total = 0;
    const charts = {}, chartMeta = {};
    for (const key of OPUS_EXTENSION_KEYS) {
      const c = e.charts[key], tier = key.slice(2);
      if (shape(c, ["unavailable"])) {
        if (tier !== "sc" || c.unavailable !== "sc_collapsed_into_mx") fail("extension_unavailable");
        charts[key] = { unavailable: "sc_collapsed_into_mx" };
        chartMeta[key] = metadata(e.chartMeta[key], tier, false);
        continue;
      }
      if (!shape(c, ["notes", "sha256"]) || !HASH(c.sha256)) fail("extension_chart_shape");
      const nn = notes(c.notes, Number(key[0]), d.frames / 48e3, { sequential: true, limit: caps[tier] });
      if (sha(JSON.stringify(nn)) !== c.sha256) fail("extension_chart_hash");
      total += nn.length;
      charts[key] = { notes: nn, sha256: c.sha256 };
      chartMeta[key] = metadata(e.chartMeta[key], tier, true);
    }
    if (total > 24300) fail("extension_note_count");
    for (const mode of [4, 6, 8]) if (charts[`${mode}:sc`].notes && JSON.stringify(charts[`${mode}:sc`].notes) === JSON.stringify(charts[`${mode}:high`].notes)) fail("extension_sc_duplicate");
    const canonical = { kind: OPUS_EXTENSION_KIND, version: 1, family: OPUS_EXTENSION_FAMILY, ...bound, generatorVersion: e.generatorVersion, config: e.config, charts, chartMeta };
    const extensionSha256 = sha(JSON.stringify(canonical));
    if (!HASH(e.extensionSha256) || e.extensionSha256 !== extensionSha256) fail("extension_hash");
    const storedBytes = TE.encode(JSON.stringify({ ...canonical, extensionSha256 }));
    if (storedBytes.length > 1572864) fail("extension_bytes");
    return { ok: true, canonical, extensionSha256, storedBytes, storedBytesSha256: hash(storedBytes), playableKeys: OPUS_EXTENSION_KEYS.filter((k) => !!charts[k].notes) };
  } catch (error) {
    return { ok: false, error: error?.message || "extension_invalid" };
  }
}

// ../../tmp/a29-owned1755/src/opus/opus35-canonical.mjs
function parseOpus35Canonical(text) {
  if (typeof text !== "string") throw Error("opus35_canonical_json");
  const value = JSON.parse(text);
  if (JSON.stringify(value) !== text) throw Error("opus35_canonical_json");
  return value;
}

// ../../tmp/a29-owned1755/src/opus/opus-descriptor.mjs
var FORMAT2 = "orvio-opus-v1";
var ENCODER2 = "4b0b17e171bb7469e1e32e7d3bb85ca59b4b89d0b2cd1a7a5d90e4c03ae04c09";
var DECODER2 = "8b67eda2a46e478f65c24c467dae9eac26293efae6484bfe762b9d1086058b4b";
var RULE = "s16le scale=32768 half-to-even-ties saturate-after-quantize reject-nonfinite";
var hash2 = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
var int = (x, a, b) => Number.isSafeInteger(x) && x >= a && x <= b;
var keys = [
  "schemaVersion",
  "audioFormat",
  "videoId",
  "oggSha256",
  "oggBytes",
  "pcm16Sha256",
  "sampleRate",
  "channels",
  "frames",
  "preSkip",
  "bitrateTargetKbps",
  "encoderWasmSha256",
  "decoderWasmSha256",
  "pcm16Rule",
  "source",
  "parts"
];
var exact2 = (o, k) => o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).length === k.length && k.every((x) => Object.hasOwn(o, x));
function validOpusDescriptor(d) {
  if (!exact2(d, keys) || d.schemaVersion !== 1 || d.audioFormat !== FORMAT2 || typeof d.videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(d.videoId) || !hash2(d.oggSha256) || !hash2(d.pcm16Sha256) || !int(d.oggBytes, 1, 6e6) || d.sampleRate !== 48e3 || d.channels !== 2 || !int(d.frames, 1, 144e5) || !int(d.preSkip, 0, 65535) || ![96, 80, 64].includes(d.bitrateTargetKbps) || d.encoderWasmSha256 !== ENCODER2 || d.decoderWasmSha256 !== DECODER2 || d.pcm16Rule !== RULE)
    return false;
  const s = d.source;
  if (!exact2(s, ["sha256", "bytes", "sampleRate", "channels", "frames"]) || !hash2(s.sha256) || ![44100, 48e3].includes(s.sampleRate) || s.channels !== 2 || !int(s.frames, 1, s.sampleRate * 300) || !int(s.bytes, 44, 578e5) || s.bytes < s.frames * 4 + 44 || Math.abs(d.frames - s.frames * 48e3 / s.sampleRate) > 1)
    return false;
  if (!Array.isArray(d.parts) || d.parts.length < 1 || d.parts.length > 6)
    return false;
  let sum = 0;
  for (let i = 0; i < d.parts.length; i++) {
    const p = d.parts[i];
    if (!exact2(p, ["index", "bytes", "sha256"]) || p.index !== i || !int(p.bytes, 1, 1048576) || i < d.parts.length - 1 && p.bytes !== 1048576 || !hash2(p.sha256))
      return false;
    sum += p.bytes;
  }
  return sum === d.oggBytes;
}
async function sha2562(bytes) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0")
  ).join("");
}
async function parseVerifiedDescriptor(bytes, expectedSha) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 32768 || !hash2(expectedSha) || await sha2562(bytes) !== expectedSha)
    throw Error("opus_descriptor_identity");
  const d = parseOpus35Canonical(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  );
  if (!validOpusDescriptor(d)) throw Error("opus_descriptor_shape");
  return d;
}

// ../../tmp/a29-owned1755/src/fever.ts
var CURRENT_FEVER = Object.freeze({
  version: 1,
  rulesId: "orvio-auto-v1",
  auto: true
});
function validFeverMetadata(raw) {
  if (!raw || typeof raw !== "object") return false;
  const r = raw;
  return r.version === 1 && ["legacy-off-v1", "djmax-current-pending-v1", "orvio-auto-v1"].includes(
    r.rulesId
  ) && typeof r.auto === "boolean";
}
var ORVIO_AUTO_V1 = Object.freeze({
  id: "orvio-auto-v1",
  threshold: 46,
  chargeByJudgment: Object.freeze({
    100: 1,
    90: 0.9,
    80: 0.8,
    70: 0.7,
    60: 0.6,
    50: 0.5,
    40: 0.4,
    30: 0.3,
    20: 0.2,
    10: 0.1,
    1: 0.01,
    0: 0
  }),
  headWeight: 1,
  tailWeight: 0,
  holdTicks: Object.freeze({
    seconds: 0.25,
    phase: 0.25,
    charge: 0.5,
    combo: 1
  }),
  thresholdNote: "after",
  overflow: "carry",
  breakStage: 1,
  breakCharge: "reset",
  breakHolds: "keep"
});

// ../../tmp/a29-owned1755/src/chart-difficulty.ts
var UNRATED_CHART = Object.freeze({
  version: 1,
  family: null,
  rating: null,
  status: "unrated"
});

// ../../tmp/a29-owned1755/src/game-options.ts
var FADERS = [
  "off",
  "in",
  "in2",
  "out",
  "out2",
  "blink",
  "blink2",
  "fog",
  "pixel",
  "pixel2",
  "blind"
];

// ../../tmp/a29-owned1755/src/replay.ts
var faders = FADERS;
var shuffles = ["off", "mirror", "random"];
function validateRuntimeReplay(raw, allowed) {
  if (!raw || typeof raw !== "object") return null;
  const r = raw;
  if (r.fever !== void 0 && !validFeverMetadata(r.fever) || r.version !== 1 || typeof r.song !== "string" || !allowed(r.song) || ![4, 5, 6, 7, 8].includes(r.lanes) || !["low", "mid", "high", "sc"].includes(r.difficulty) || !r.options || !Array.isArray(r.ops) || r.ops.length > 12e3 || !Number.isFinite(r.end) || r.end < 0 || r.end > 6e5 || r.audioLeadIn !== void 0 && (!Number.isFinite(r.audioLeadIn) || r.audioLeadIn < 0 || r.audioLeadIn > 10))
    return null;
  const o = r.options;
  if (!Number.isFinite(o.speed) || o.speed < 1 || o.speed > 9 || !faders.includes(o.fader) || !shuffles.includes(o.shuffle) || !Number.isInteger(o.seed) || o.seed < 0 || o.seed > 4294967295)
    return null;
  let prev = 0;
  for (let i = 0; i < r.ops.length; i++) {
    const op = r.ops[i];
    if (!Array.isArray(op) || ![0, 1, 2, 3].includes(op[0]) || !Number.isFinite(op[1]) || op[1] < prev || op[1] > r.end || !Number.isFinite(op[2]) || op[2] < (r.audioLeadIn === void 0 ? -2 : -(r.audioLeadIn + 1)) || op[2] > 600 && !(op[0] === 1 && op[2] === 9999 && i === r.ops.length - 1))
      return null;
    prev = op[1];
    if (op[0] === 0 && (op.length !== 5 || !Number.isInteger(op[3]) || op[3] < 0 || op[3] >= r.lanes || ![0, 1].includes(op[4])))
      return null;
    if (op[0] === 1 && op.length !== 3) return null;
    if (op[0] === 2 && (op.length !== 4 || ![0, 1].includes(op[3])))
      return null;
    if (op[0] === 3 && (op.length !== 5 || !Number.isFinite(op[3]) || op[3] < 1 || op[3] > 9 || !faders.includes(op[4])))
      return null;
  }
  return {
    version: 1,
    song: r.song,
    lanes: r.lanes,
    difficulty: r.difficulty,
    options: {
      speed: o.speed,
      fader: o.fader,
      shuffle: o.shuffle,
      seed: o.seed
    },
    ops: r.ops.map((op) => [...op]),
    end: r.end,
    ...r.audioLeadIn !== void 0 ? { audioLeadIn: r.audioLeadIn } : {},
    ...r.fever !== void 0 ? {
      fever: {
        version: 1,
        rulesId: r.fever.rulesId,
        auto: r.fever.auto
      }
    } : {}
  };
}

// ../../tmp/a29-owned1755/src/opus/opus-acquired-v2-artifacts.mjs
function waitAcquired(promise, signal, onLate) {
  if (!signal) return Promise.resolve(promise);
  return new Promise((resolve, reject) => {
    let settled = false;
    const abort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(
      (x) => {
        if (settled) {
          if (signal.aborted)
            try {
              onLate?.(x);
            } catch {
            }
          return;
        }
        settled = true;
        signal.removeEventListener("abort", abort);
        resolve(x);
      },
      (e) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", abort);
        reject(e);
      }
    );
    if (signal.aborted) abort();
  });
}

// ../../tmp/a29-share1935/public468-v7.ts
var V7_COMPRESSED_MAX = 524288;
var V7_INFLATED_MAX = 4194304;
var V7_FRAGMENT_MAX = 699058;
var TE2 = new TextEncoder();
var TD = new TextDecoder("utf-8", { fatal: true });
var KIND = "orvio-autochart468-shared-replay-v7";
var GENERATOR = "orvio-autochart468-nmguard-v1";
var fail2 = (s) => {
  throw Error("share468_" + s);
};
var exact3 = (o, k) => o && typeof o === "object" && !Array.isArray(o) && Object.keys(o).length === k.length && k.every((x) => Object.hasOwn(o, x));
var b64 = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
var unb64 = (s) => {
  if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) fail2("base64");
  let out;
  try {
    out = Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  } catch {
    fail2("base64");
  }
  if (b64(out) !== s) fail2("base64_noncanonical");
  return out;
};
async function transform(bytes, compress, signal) {
  signal?.throwIfAborted();
  const stream = new Blob([bytes]).stream().pipeThrough(compress ? new CompressionStream("deflate") : new DecompressionStream("deflate")), r = stream.getReader(), chunks = [];
  let size = 0;
  try {
    for (; ; ) {
      signal?.throwIfAborted();
      const q = await waitAcquired(r.read(), signal);
      signal?.throwIfAborted();
      if (q.done) break;
      size += q.value.length;
      if (size > (compress ? V7_COMPRESSED_MAX : V7_INFLATED_MAX)) fail2("size");
      chunks.push(q.value);
    }
  } finally {
    try {
      void r.cancel().catch(() => {
      });
    } catch {
    }
    try {
      r.releaseLock();
    } catch {
    }
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
async function structural(input, signal) {
  signal?.throwIfAborted();
  if (!exact3(input, ["version", "kind", "baseSourceRecordJson", "extension", "descriptor", "replay", "title", "author"]) || input.version !== 7 || input.kind !== KIND || typeof input.baseSourceRecordJson !== "string" || typeof input.descriptor !== "string" || input.descriptor.length > 43691 || typeof input.title !== "string" || TE2.encode(input.title).length > 1200 || input.title.length > 300 || !/^[^\u0000-\u001f\u007f-\u009f]{1,300}$/u.test(input.title) || !(input.author === null || typeof input.author === "string" && input.author.length <= 100 && TE2.encode(input.author).length <= 400 && /^[^\u0000-\u001f\u007f-\u009f]{1,100}$/u.test(input.author))) fail2("shape");
  const descriptorBytes2 = unb64(input.descriptor);
  if (!descriptorBytes2.length || descriptorBytes2.length > 32768) fail2("descriptor_size");
  const e = input.extension;
  if (e?.generatorVersion !== GENERATOR) fail2("generator");
  const descriptor = await parseVerifiedDescriptor(descriptorBytes2, e.audioDescriptorSha256);
  signal?.throwIfAborted();
  const verdict = await validateOpusExtensionLocalBinding({ extension: e, baseSourceRecordJson: input.baseSourceRecordJson, descriptor, qualifiedGeneratorVersions: [GENERATOR] });
  signal?.throwIfAborted();
  if (verdict?.ok !== true) fail2("local_binding_" + (verdict?.error ?? "missing"));
  const song = `yt-opus-${e.videoId}-${e.audioSha256}-c${e.baseChartSetSha256}-x${e.extensionSha256}`;
  if (!exact3(input.replay, ["version", "song", "lanes", "difficulty", "options", "ops", "end"])) {
    const keys2 = Object.keys(input.replay ?? {});
    if (!["version", "song", "lanes", "difficulty", "options", "ops", "end"].every((k) => Object.hasOwn(input.replay ?? {}, k)) || keys2.some((k) => !["version", "song", "lanes", "difficulty", "options", "ops", "end", "audioLeadIn", "fever"].includes(k))) fail2("replay_shape");
  }
  if (!exact3(input.replay?.options, ["speed", "fader", "shuffle", "seed"]) || input.replay?.fever !== void 0 && !exact3(input.replay.fever, ["version", "rulesId", "auto"])) fail2("replay_shape");
  const replay = validateRuntimeReplay(input.replay, (id) => id === song);
  if (!replay || ![4, 6, 8].includes(replay.lanes) || !verdict.playableKeys.includes(`${replay.lanes}:${replay.difficulty}`)) fail2("replay");
  return structuredClone({ baseSourceRecordJson: input.baseSourceRecordJson, extension: e, descriptorBytes: descriptorBytes2, replay, title: input.title, author: input.author });
}
async function parseV7Bootstrap(fragment, { signal } = {}) {
  if (typeof fragment !== "string" || fragment.length > V7_FRAGMENT_MAX || !/^v=7&d=[A-Za-z0-9_-]+$/.test(fragment)) fail2("fragment");
  const compressed = unb64(fragment.slice(6));
  if (compressed.length > V7_COMPRESSED_MAX) fail2("size");
  const bytes = await transform(compressed, false, signal);
  let envelope;
  try {
    const raw = TD.decode(bytes);
    envelope = JSON.parse(raw);
    if (JSON.stringify(envelope) !== raw) fail2("json_noncanonical");
  } catch {
    fail2("json");
  }
  const candidate = await structural(envelope, signal);
  return { kind: "untrusted-share468-bootstrap-candidate", candidate, admitted: false };
}
async function encodeV7SharedReplay(input, localCodec, { signal } = {}) {
  const captured = structuredClone(input);
  signal?.throwIfAborted();
  if (typeof localCodec?.encode !== "function") fail2("codec");
  await waitAcquired(localCodec.encode({ baseSourceRecordJson: captured.baseSourceRecordJson, extension: captured.extension, descriptorBytes: captured.descriptorBytes, replay: captured.replay }, { signal }), signal);
  signal?.throwIfAborted();
  const envelope = { version: 7, kind: KIND, baseSourceRecordJson: captured.baseSourceRecordJson, extension: captured.extension, descriptor: b64(captured.descriptorBytes), replay: captured.replay, title: captured.title, author: captured.author };
  await structural(envelope, signal);
  const raw = TE2.encode(JSON.stringify(envelope));
  if (raw.length > V7_INFLATED_MAX) fail2("size");
  const compressed = await transform(raw, true, signal), fragment = "v=7&d=" + b64(compressed);
  if (fragment.length > V7_FRAGMENT_MAX) fail2("size");
  return fragment;
}
async function validateRecoveredV7(candidate, localCodec, { signal } = {}) {
  const c = structuredClone(candidate);
  signal?.throwIfAborted();
  if (typeof localCodec?.encode !== "function") fail2("codec");
  return waitAcquired(localCodec.encode({ baseSourceRecordJson: c.baseSourceRecordJson, extension: c.extension, descriptorBytes: c.descriptorBytes, replay: c.replay }, { signal }), signal);
}
export {
  V7_COMPRESSED_MAX,
  V7_FRAGMENT_MAX,
  V7_INFLATED_MAX,
  encodeV7SharedReplay,
  parseV7Bootstrap,
  validateRecoveredV7
};
/*! Bundled license information:

@noble/hashes/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
