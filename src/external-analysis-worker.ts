import { generateSourceRecord } from './external-source-provider';
self.onmessage = async (
  event: MessageEvent<{ bytes: ArrayBuffer; videoId: string; hash: string }>,
) => {
  try {
    const { bytes, videoId, hash } = event.data;
    const record = await generateSourceRecord(bytes, videoId, hash);
    self.postMessage({ record });
  } catch {
    self.postMessage({ error: 'unavailable' });
  }
};
