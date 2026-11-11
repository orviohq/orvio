import { assertRuntimeFetch } from "../client-only-runtime";
import {
  createPrivateOpusV2ProjectionTransport as createRawPrivateOpusV2ProjectionTransport,
  OPUS_PROJECTION_V2_CANDIDATE_ENDPOINT,
} from "./opus-projection-v2-transport-private.mjs";

export function createPrivateOpusV2ProjectionTransport(
  ...args: Parameters<typeof createRawPrivateOpusV2ProjectionTransport>
): ReturnType<typeof createRawPrivateOpusV2ProjectionTransport> {
  const transport = createRawPrivateOpusV2ProjectionTransport(...args);
  return {
    ...transport,
    exchange(
      input: Parameters<typeof transport.exchange>[0],
      options?: { signal?: AbortSignal },
    ) {
      options?.signal?.throwIfAborted();
      assertRuntimeFetch(OPUS_PROJECTION_V2_CANDIDATE_ENDPOINT, "POST");
      return transport.exchange(input, options);
    },
  };
}
