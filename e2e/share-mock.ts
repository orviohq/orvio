import type { BrowserContext } from '@playwright/test';
export async function mockShare(context: BrowserContext) {
  const records = new Map<string, string>();
  const requests: { method: string; body: any }[] = [];
  await context.route(
    'https://orvio-share.pn-26f.workers.dev/**',
    async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        requests.push({ method: 'POST', body });
        const id = 'replay' + String(records.size).padStart(18, '0');
        records.set(id, body.fragment);
        await route.fulfill({
          status: 201,
          json: {
            id,
            expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          },
        });
      } else {
        const id = new URL(req.url()).pathname.split('/').at(-1)!;
        requests.push({ method: 'GET', body: id });
        await route.fulfill({
          status: records.has(id) ? 200 : 404,
          json: records.has(id)
            ? {
                fragment: records.get(id),
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
              }
            : { error: 'not_found' },
        });
      }
    },
  );
  return { records, requests };
}
