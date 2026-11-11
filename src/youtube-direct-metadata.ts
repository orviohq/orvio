import { configuredYoutubeOrigin } from './youtube-direct-api';
export interface DirectYoutubeMetadata {
  title: string;
  author?: string;
}

export function directYoutubeMetadataUrl(videoId: string): string {
  return `${configuredYoutubeOrigin()}/v1/videos/${videoId}`;
}

/** Optional display metadata from the documented GET /v1/videos/{id}. */
export async function readDirectYoutubeMetadata(
  videoId: string,
  options: {
    publicKey: string;
    signal: AbortSignal;
    fetch?: typeof fetch;
  },
): Promise<DirectYoutubeMetadata | null> {
  if (
    !/^[A-Za-z0-9_-]{11}$/.test(videoId) ||
    !options.publicKey ||
    options.signal.aborted
  )
    return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal.addEventListener('abort', abort, { once: true });
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, 8000);
  });
  const work = async (): Promise<DirectYoutubeMetadata | null> => {
    try {
      const response = await (options.fetch ?? fetch)(
        directYoutubeMetadataUrl(videoId),
        {
          method: 'GET',
          credentials: 'omit',
          redirect: 'error',
          headers: { Authorization: `Bearer ${options.publicKey}` },
          signal: controller.signal,
        },
      );
      if (!response.ok || !response.body || controller.signal.aborted) {
        void response.body?.cancel().catch(() => {});
        return null;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '',
        size = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 1024 * 1024 || controller.signal.aborted) return null;
          text += decoder.decode(part.value, { stream: true });
        }
        text += decoder.decode();
      } finally {
        void reader.cancel().catch(() => {});
      }
      const value = JSON.parse(text);
      if (
        value?.id !== videoId ||
        typeof value.title !== 'string' ||
        !value.title.trim()
      )
        return null;
      const author =
        typeof value.channel === 'string' && value.channel.trim()
          ? value.channel
          : typeof value.uploader === 'string'
            ? value.uploader
            : undefined;
      return {
        title: value.title.trim().slice(0, 300),
        ...(author?.trim() ? { author: author.trim().slice(0, 100) } : {}),
      };
    } catch {
      return null;
    }
  };
  try {
    return await Promise.race([work(), deadline]);
  } finally {
    clearTimeout(timer!);
    options.signal.removeEventListener('abort', abort);
  }
}
