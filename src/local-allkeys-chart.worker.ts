import {
  generateLocalAllKeysRecord,
  type LocalAllKeysEnvelope,
} from "./local-allkeys-record";

const worker = self as unknown as {
  onmessage: ((event: MessageEvent<unknown>) => Promise<void>) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

worker.onmessage = async ({ data }) => {
  let id: unknown;
  let bytes: unknown;

  try {
    if (typeof data !== "object" || data === null) {
      throw new TypeError("Expected a worker request object");
    }

    const request = data as {
      id?: unknown;
      bytes?: unknown;
      videoId?: unknown;
    };
    id = request.id;
    bytes = request.bytes;
    const videoId = request.videoId;

    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      throw new TypeError("id must be a positive integer");
    }
    if (!(bytes instanceof ArrayBuffer)) {
      throw new TypeError("bytes must be an ArrayBuffer");
    }
    if (typeof videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      throw new TypeError("videoId must be an 11-character YouTube ID");
    }

    const envelope: LocalAllKeysEnvelope = await generateLocalAllKeysRecord({
      bytes,
      videoId,
    });
    worker.postMessage({ id, ok: true, bytes, envelope }, [bytes]);
  } catch (error) {
    if (bytes instanceof ArrayBuffer) {
      worker.postMessage({ id, ok: false, error: String(error), bytes }, [
        bytes,
      ]);
    } else {
      worker.postMessage({ id, ok: false, error: String(error) }, []);
    }
  }
};
