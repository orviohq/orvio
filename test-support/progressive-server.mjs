import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
const f = JSON.parse(
    fs.readFileSync('tests/fixtures/progressive-browser.json'),
  ),
  audio = gunzipSync(Buffer.from(f.audioGzip64, 'base64')),
  root = path.resolve('dist');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
};
http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    if (u.pathname.startsWith('/__test/')) {
      if (req.method !== 'GET') {
        res.writeHead(405);
        return res.end();
      }
      if (u.pathname.endsWith('/metadata')) {
        res.setHeader('Content-Type', 'application/json');
        return res.end(
          JSON.stringify({
            videoId: f.record.videoId,
            title: 'Verified stream fixture',
            audioSha256: f.record.audioSha256,
            chartSetSha256: f.record.chartSetSha256,
            source: 'audio-manifest',
          }),
        );
      }
      if (u.pathname.endsWith('/progressive-manifest')) {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(f.manifestBody));
      }
      if (u.pathname.endsWith('/audio')) {
        const bytes = Buffer.from(audio);
        if (u.searchParams.get('mode') === 'corrupt')
          bytes[f.manifest.parts[1].byteOffset + 100] ^= 255;
        res.writeHead(200, f.audioHeaders);
        res.write(bytes.subarray(0, f.manifest.parts[0].byteLength));
        const timer = setTimeout(
          () => res.end(bytes.subarray(f.manifest.parts[0].byteLength)),
          u.searchParams.get('mode') === 'fast' ? 20 : 6000,
        );
        res.on('close', () => clearTimeout(timer));
        return;
      }
      res.writeHead(200, f.recordHeaders);
      return res.end(f.recordBody);
    }
    let file = path.join(root, decodeURIComponent(u.pathname));
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, 'index.html');
    let status = 200;
    if (!fs.existsSync(file)) {
      file = path.join(root, '404.html');
      status = 404;
    }
    res.writeHead(status, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(4199, '127.0.0.1');
