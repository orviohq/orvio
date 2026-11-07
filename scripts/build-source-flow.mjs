import { build } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await build({
  root,
  configFile: false,
  build: {
    outDir: path.join(root, 'source-harness'),
    lib: {
      entry: path.join(root, 'src/external-source-flow.ts'),
      name: 'ExternalFlow',
      formats: ['iife'],
      fileName: 'flow',
    },
  },
});
