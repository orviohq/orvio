import { enableGeneral468Candidate } from './main';
import { createPublic468Candidate } from './opus/public468-candidate1901.mjs';
import { createUnified468Candidate } from './opus/unified/factory';
import { createVersioned468Runtime } from './opus/opus468-versioned-runtime.mjs';
import { createVersionedV7Parser } from './opus/opus468-versioned-v7.mjs';
import { readOpus35Artifact } from './opus/opus35-api';
import { createPrivateOpusV2ProjectionTransport } from './opus/opus-projection-v2-transport-private.mjs';
const transport = createPrivateOpusV2ProjectionTransport();
const dependencies = {
  readArtifact: readOpus35Artifact,
  exchangeProjection: transport.exchange,
};
const legacy = createPublic468Candidate(dependencies);
const unified = createUnified468Candidate(dependencies);
const runtime = createVersioned468Runtime({
  legacy,
  unified,
  parseSharedV7: createVersionedV7Parser({
    legacy: legacy.parseSharedV7,
    unified: unified.parseSharedV7,
  }),
});
void enableGeneral468Candidate(runtime).catch(() => {
  // Keep existing songs usable. Each source/replay path fails visibly without
  // accepting unverified data or silently falling back to a different engine.
});
