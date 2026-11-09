import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { build } from '/downloads/orvio-opus049/node_modules/rolldown/dist/index.mjs';
const root = process.cwd(),
  out = path.join(root, 'src/opus/unified'),
  sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const sources = [
  'src/chart-core/index.mjs',
  'src/chart-core/all-keys.mjs',
  'src/chart-core/shared.mjs',
  'src/chart-core/tables.mjs',
  'src/opus/opus468-version-dispatch.mjs',
  'src/opus/unified/core-adapter.mjs',
  'src/opus/unified/extension-constants.mjs',
  'src/opus/unified/record.mjs',
  'src/opus/unified/derivation.mjs',
  'src/opus/unified/operation.mjs',
  'src/opus/unified/worker.mjs',
  'src/opus/opus-descriptor.mjs',
  'src/opus/opus-record.ts',
  'src/opus/opus-pcm-analysis.mjs',
  'src/opus-codec/verified-opus-client.mjs',
  'src/opus-codec/ogg-artifact.mjs',
  'src/external-source.ts',
  'src/chart-rating.mjs',
  'src/chart-difficulty.ts',
  'src/audio-limits.mjs',
];
const rows = sources.map((p) => [p, sha(fs.readFileSync(p))]);
const recipeSha256 = sha(rows.map(([p, h]) => p + ' ' + h).join('\n') + '\n');
const content = Object.fromEntries(
  sources.map((p) => [p, fs.readFileSync(p, 'utf8')]),
);
const recipe = {
  generatorVersion: 'orvio-autochart468-c3unified-v1',
  recipeSha256,
  sources: rows,
};
fs.writeFileSync(
  path.join(out, 'recipe.generated.mjs'),
  `import {sha256Hex} from './record.mjs';\nexport const UNIFIED_RECIPE=Object.freeze(${JSON.stringify(recipe)});\nconst sources=Object.freeze(${JSON.stringify(content)});\nexport function verifyUnifiedRecipe(){return UNIFIED_RECIPE.sources.every(([p,h])=>sha256Hex(new TextEncoder().encode(sources[p]))===h)&&sha256Hex(new TextEncoder().encode(UNIFIED_RECIPE.sources.map(([p,h])=>p+' '+h).join('\\n')+'\\n'))===UNIFIED_RECIPE.recipeSha256;}\n`,
);
const files = [];
const result = await build({
  input: 'src/opus/unified/worker.mjs',
  platform: 'browser',
  output: { format: 'es' },
  logLevel: 'warn',
  plugins: [
    {
      name: 'source-closure',
      transform(code, id) {
        if (!id.startsWith('\0') && fs.existsSync(id))
          files.push({
            path: path.relative(root, id),
            sha256: sha(fs.readFileSync(id)),
            bytes: fs.statSync(id).size,
          });
      },
    },
  ],
});
const worker = Buffer.from(result.output[0].code);
const manifest = {
  version: 1,
  kind: 'orvio-autochart468-c3unified-build-v1',
  worker: { sha256: sha(worker), bytes: worker.length },
  recipe,
  files: files.sort((a, b) => a.path.localeCompare(b.path)),
  admission: 'PENDING_RELEASE',
  publicPolicyEnabled: false,
};
const mb = Buffer.from(JSON.stringify(manifest));
const identity = {
  generatorVersion: recipe.generatorVersion,
  producerSha256: sha(worker),
  workerBytes: worker.length,
  manifestSha256: sha(mb),
  manifestBytes: mb.length,
  recipeSha256,
  sourceCount: rows.length,
};
fs.mkdirSync('qualification-local/build0113', { recursive: true });
fs.writeFileSync('qualification-local/build0113/worker.mjs', worker);
fs.writeFileSync('qualification-local/build0113/manifest.json', mb);
fs.writeFileSync(
  'qualification-local/build0113/identity.json',
  JSON.stringify(identity, null, 2),
);
fs.writeFileSync(
  path.join(out, 'build.generated.mjs'),
  `export const UNIFIED_BUILD=Object.freeze(${JSON.stringify(identity)});\nexport const workerBase64=${JSON.stringify(worker.toString('base64'))};\nexport const manifestBase64=${JSON.stringify(mb.toString('base64'))};\n`,
);
console.log(identity);
