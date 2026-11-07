import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = 'dist';
async function walk(dir) {
  const all = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) all.push(...(await walk(p)));
    else if (!p.endsWith('/sw.js')) all.push(p);
  }
  return all;
}
const paths = await walk(root);
const hash = createHash('sha256');
for (const p of paths) hash.update(await readFile(p));
const version = hash.digest('hex').slice(0, 16);
const urls = paths
  .map((p) => '/' + relative(root, p))
  .map((p) => (p.endsWith('/index.html') ? p.slice(0, -10) : p));
await writeFile(
  join(root, 'sw.js'),
  `const CACHE='orvio-static-${version}';const ASSETS=${JSON.stringify(urls)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('orvio-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(u.pathname).then(r=>r||caches.match('/'))));return;}e.respondWith(caches.match(u.pathname).then(r=>r||fetch(e.request)));});`,
);
console.log(
  'Static offline shell',
  version,
  urls.length,
  'assets; update waits for old app windows to close.',
);
