import fs from 'node:fs';
import crypto from 'node:crypto';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const identity = JSON.parse(
  fs.readFileSync('qualification-local/build0113/identity.json'),
);
const tracks = [
  'KQIsk0ba5q0',
  '1bZNp9d7pLM',
  'wallpaper',
  'frost',
  'volatile',
  'gymnopedie',
  'WGm2HmXeeRI',
];
const corpus = {
  version: 1,
  kind: 'orvio-autochart468-c3unified-seven-input-corpus-v1',
  generatorVersion: identity.generatorVersion,
  recipeSha256: identity.recipeSha256,
  fixtures: tracks.map((name) => {
    const output = JSON.parse(
      fs.readFileSync('/dev/shm/quality0052/' + name + '.owned0114.json'),
    );
    const e = output.extension;
    if (
      output.proof?.regenerationLevel !== 2 ||
      output.proof?.canonicalRecordMatch !== true
    )
      throw Error('unverified');
    return {
      name,
      baseSourceRecordSha256: e.baseSourceRecordSha256,
      encodedAudioSha256: e.encodedAudioSha256,
      audioSha256: e.audioSha256,
      extensionSha256: e.extensionSha256,
      slots: Object.fromEntries(
        Object.entries(e.charts).map(([k, v]) => [
          k,
          v.notes
            ? {
                sha256: v.sha256,
                count: v.notes.length,
                first: v.notes[0]?.time,
                last: v.notes.at(-1)?.time,
              }
            : v,
        ]),
      ),
    };
  }),
};
const bytes = Buffer.from(JSON.stringify(corpus));
fs.writeFileSync('qualification-local/build0113/corpus.json', bytes);
const binding = {
  version: 1,
  kind: 'orvio-autochart468-public-release-candidate-binding-v1',
  scope: 'private-integration-only-unqualified',
  publicRollout: false,
  activation: 'HOLD_PENDING_REVIEW_CUSTODY_PUBLIC_COMPOSITION',
  ...identity,
  corpusSha256: sha(bytes),
  localValidatorSha256: sha(
    fs.readFileSync('src/opus/unified/local-binding-v2.mjs'),
  ),
  splitReaderSha256: sha(
    fs.readFileSync('src/opus/unified/split-projection-reader.mjs'),
  ),
  ownerCurrentnessContract: 'orvio-opus-owner-audio-projection-v2',
  ownerCurrentnessRequired: true,
};
fs.writeFileSync(
  'src/opus/unified/release-binding.generated.mjs',
  `// PROVISIONAL PRIVATE integration binding, not release authority.\nexport const PUBLIC_CANDIDATE_BINDING=Object.freeze(${JSON.stringify(binding)});\nexport const PUBLIC_CANDIDATE_POLICY=Object.freeze(${JSON.stringify(Object.fromEntries(['generatorVersion', 'producerSha256', 'recipeSha256', 'corpusSha256'].map((k) => [k, binding[k]])))});\nexport const PUBLIC_CANDIDATE_LOADED_IDENTITY=Object.freeze(${JSON.stringify({ producerSha256: binding.producerSha256, recipeSha256: binding.recipeSha256 })});\n`,
);
console.log(binding);
