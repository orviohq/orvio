import { enableGeneral468Candidate } from './main';
import { createPublic468Candidate } from './opus/public468-candidate1901.mjs';
import { readOpus35Artifact } from './opus/opus35-api';
import { createPrivateOpusV2ProjectionTransport } from './opus/opus-projection-v2-transport-private.mjs';

const transport = createPrivateOpusV2ProjectionTransport();
const runtime = createPublic468Candidate({
  readArtifact: readOpus35Artifact,
  exchangeProjection: transport.exchange,
});
void enableGeneral468Candidate(runtime).catch(() => {
  // Keep existing songs usable. The normal source/replay paths retain their
  // own bounded, visible failures rather than accepting unverified data.
});
