import LocalAllKeysWorker from "./local-allkeys-chart.worker?worker";
import {
  validateLocalAllKeysRecord,
  type LocalAllKeysEnvelope,
} from "./local-allkeys-record";

export async function prepareLocalAllKeysOwned({
  bytes,
  videoId,
  signal,
}: {
  bytes: ArrayBuffer;
  videoId: string;
  signal?: AbortSignal;
}): Promise<{ bytes: ArrayBuffer; envelope: LocalAllKeysEnvelope }> {
  if (signal?.aborted) throw signal.reason;
  if (!(bytes instanceof ArrayBuffer)) {
    throw new TypeError("Expected audio bytes to be an ArrayBuffer");
  }

  return new Promise((resolve, reject) => {
    let worker: InstanceType<typeof LocalAllKeysWorker> | undefined;
    let settled = false;
    let received = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      if (worker) {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        worker.removeEventListener("messageerror", onMessageError);
        try {
          worker.terminate();
        } catch {
          // Cleanup must not replace the result or the original abort reason.
        }
      }
    };

    const fail = (reason: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(reason);
    };

    const onAbort = () => fail(signal?.reason);

    const onError = (event: ErrorEvent) => {
      fail(
        event.error ??
          new Error(event.message || "Local all-keys worker failed"),
      );
    };

    const onMessageError = () => {
      fail(
        new Error("Could not deserialize the local all-keys worker response"),
      );
    };

    const onMessage = (event: MessageEvent<unknown>) => {
      if (settled || received) return;
      received = true;

      void (async () => {
        try {
          const response = event.data;
          if (
            typeof response !== "object" ||
            response === null ||
            !("id" in response) ||
            response.id !== 1
          ) {
            throw new Error("Invalid local all-keys worker response");
          }

          if (!("ok" in response) || response.ok !== true) {
            const error = new Error(
              "error" in response && typeof response.error === "string"
                ? response.error.slice(0, 500)
                : "Local all-keys worker failed",
            );
            if ("bytes" in response && response.bytes instanceof ArrayBuffer) {
              Object.assign(error, { returnedBytes: response.bytes });
            }
            fail(error);
            return;
          }

          if (
            !("bytes" in response) ||
            !(response.bytes instanceof ArrayBuffer) ||
            !("envelope" in response)
          ) {
            throw new Error("Invalid local all-keys worker response");
          }

          const returnedBytes = response.bytes;
          const envelope = response.envelope;
          const validated = await validateLocalAllKeysRecord(envelope, {
            signal,
          });
          if (settled) return;
          if (validated.record.videoId !== videoId) {
            throw new Error("Invalid local all-keys record");
          }

          const expectedSha256 = validated.record.audioSha256;
          const digest = await crypto.subtle.digest("SHA-256", returnedBytes);
          if (settled) return;
          if (signal?.aborted) {
            onAbort();
            return;
          }

          const actualSha256 = Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join("");
          if (actualSha256 !== expectedSha256) {
            throw new Error("Local all-keys audio SHA-256 mismatch");
          }

          settled = true;
          cleanup();
          resolve({
            bytes: returnedBytes,
            envelope: validated,
          });
        } catch (error) {
          fail(error);
        }
      })();
    };

    try {
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }

      worker = new LocalAllKeysWorker();
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.addEventListener("messageerror", onMessageError);
      worker.postMessage({ id: 1, bytes, videoId }, [bytes]);
    } catch (error) {
      fail(error);
    }
  });
}
