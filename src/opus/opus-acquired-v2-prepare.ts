import { audioAtStage } from '../audio-error-stage';
// Private actual Response-artifact preparation. No legacy source route used.
import ChartWorkerUrl from './opus-chart.worker.mjs?worker&url';
import DecoderUrl from '../opus-codec/opus-decoder.wasm?url';
import { prepareOpusOwned } from './opus-chart-worker-client.mjs';
import { saveVerifiedOpus } from './opus-cache.mjs';
import { verifyOpusRecord } from './opus-record';
import {
  createAcquiredOpusV2Artifacts,
  captureAcquiredOpusV2,
  waitAcquired,
  detachCancel,
} from './opus-acquired-v2-artifacts.mjs';
import { DECODER, sha256 } from './opus-descriptor.mjs';
export type AcquiredArtifactCapability = (
  input: unknown,
  options: { method: 'GET'; signal?: AbortSignal },
) => Promise<Response>;
export function createAcquiredOpusV2Preparer({
  readArtifact,
}: {
  readArtifact: AcquiredArtifactCapability;
}) {
  const artifacts = createAcquiredOpusV2Artifacts({ readArtifact });
  return async function prepare(input: unknown, signal: AbortSignal) {
    signal.throwIfAborted();
    const job = captureAcquiredOpusV2(input),
      artifact = await audioAtStage<any>('response', () =>
        artifacts.load(job, { signal }),
      );
    const r = await waitAcquired(
      fetch(DecoderUrl, { signal }),
      signal,
      (r: Response) => detachCancel(r.body),
    );
    if (signal.aborted) {
      detachCancel(r.body);
      signal.throwIfAborted();
    }
    if (!r.ok) {
      detachCancel(r.body);
      throw Error('opus_decoder_unavailable');
    }
    const wasmBytes = await waitAcquired(r.arrayBuffer(), signal);
    signal.throwIfAborted();
    if ((await sha256(new Uint8Array(wasmBytes))) !== DECODER)
      throw Error('opus_decoder_identity');
    const result = await audioAtStage<any>('analysis', () =>
      prepareOpusOwned({
        workerUrl: ChartWorkerUrl,
        bytes: artifact.bytes.slice().buffer,
        wasmBytes,
        descriptorBytes: artifact.descriptorBytes.slice().buffer,
        descriptorSha256: artifact.descriptorSha256,
        signal,
      }),
    );
    signal.throwIfAborted();
    if (
      !(await verifyOpusRecord(
        result.record,
        result.descriptor,
        artifact.descriptorSha256,
      ))
    )
      throw Error('acquired_v2_prepared_record');
    signal.throwIfAborted();
    await audioAtStage('storage', () =>
      saveVerifiedOpus({ ...artifact, record: result.record }, signal),
    );
    signal.throwIfAborted();
    return {
      kind: 'orvio-opus-v1',
      record: result.record,
      bytes: result.pcm16,
      restored: false,
      descriptor: result.descriptor,
      descriptorSha256: artifact.descriptorSha256,
    };
  };
}
