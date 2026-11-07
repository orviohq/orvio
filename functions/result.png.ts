import { readResult, resultParams, SHARED_SONGS } from '../src/share';
import { resultPNG } from '../server/png';
export const onRequest = async ({ request }: { request: Request }) => {
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response('Method not allowed', { status: 405 });
  const url = new URL(request.url),
    r = readResult(url.searchParams);
  if (!r)
    return new Response('Invalid result', {
      status: 400,
      headers: { 'cache-control': 'no-store' },
    });
  const params = resultParams(r);
  const shared = new URL('/result/?' + params, url.origin).href;
  if (url.pathname.endsWith('.png'))
    return new Response(request.method === 'HEAD' ? null : await resultPNG(r), {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public,max-age=31536000,immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  const image = new URL('/result.png?' + params, url.origin).href,
    title = `${SHARED_SONGS[r.song]} - ${r.score.toLocaleString('en-US')} | orvio`;
  const desc = `${r.accuracy.toFixed(2)}% accuracy / ${r.combo} max combo / ${r.lanes} KEY. Local play, unverified.`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><meta name="description" content="${desc}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${shared.replaceAll('&', '&amp;')}"><meta property="og:image" content="${image.replaceAll('&', '&amp;')}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${image.replaceAll('&', '&amp;')}"><style>body{margin:0;background:#14131a;color:#eeedf2;font:16px system-ui}main{max-width:1050px;margin:6vh auto;padding:24px}img{width:100%;height:auto;border:1px solid #393644}p{color:#aaa5b8}a{color:#29d8ff;display:inline-block;padding:16px 0;margin-right:24px}</style></head><body><main><h1>${SHARED_SONGS[r.song]}</h1><img src="${image.replaceAll('&', '&amp;')}" width="1200" height="630" alt="${desc}"><p>Shared local play. This result is not verified and is not a leaderboard record. No player identity is included.</p><a href="/play/${r.song}/${r.lanes}/${r.difficulty}/">Play this chart</a><a href="${image.replaceAll('&', '&amp;')}" download="orvio-result.png">Save image</a><a href="/">orvio home</a></main></body></html>`;
  return new Response(request.method === 'HEAD' ? null : html, {
    headers: {
      'content-type': 'text/html;charset=utf-8',
      'cache-control': 'public,max-age=3600',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'content-security-policy':
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
};
