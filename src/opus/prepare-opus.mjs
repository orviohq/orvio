import{loadVerifiedOpus,opusCacheKey}from'./opus-loader.mjs';import{prepareOpusOwned}from'./opus-chart-worker-client.mjs';import{readVerifiedOpus,saveVerifiedOpus}from'./opus-cache.mjs';import{verifyOpusRecord}from'./opus-record.ts';
// Explicit new-format workflow. Does not replace PreparedSource v1/WAV.
export async function prepareOpusSource({base,videoId,oggSha256,descriptorSha256,workerUrl,wasmBytes,signal,fetcher=fetch,cachedDescriptor,onStage,expectedPcmSha,expectedOggBytes,frozenRecord}){
 signal?.throwIfAborted();let artifact=null,restored=false;
 if(cachedDescriptor){if(cachedDescriptor.videoId!==videoId||cachedDescriptor.oggSha256!==oggSha256)throw Error('opus_restore_binding');const cached=await readVerifiedOpus(cachedDescriptor,descriptorSha256,signal);if(cached){artifact=cached;restored=true;}}
 if(!artifact){onStage?.('downloading');artifact=await loadVerifiedOpus({base,videoId,oggSha256,descriptorSha256,signal,fetcher});}
 // Keep only encoded retained bytes for persistence. Worker transfer owns a copy
 // of the small compressed artifact, never a second full WAV/PCM allocation.
 const bound=artifact.descriptor||await (await import('./opus-descriptor.mjs')).parseVerifiedDescriptor(artifact.descriptorBytes,descriptorSha256);
 if(expectedPcmSha!==undefined&&bound.pcm16Sha256!==expectedPcmSha||expectedOggBytes!==undefined&&bound.oggBytes!==expectedOggBytes)throw Error('opus_job_descriptor_binding');
 onStage?.('charting');const descriptorBytes=artifact.descriptorBytes.slice(),encoded=artifact.bytes.slice();
 const result=await prepareOpusOwned({workerUrl,bytes:encoded.buffer,wasmBytes,descriptorBytes:descriptorBytes.buffer,descriptorSha256,signal,frozenRecord:frozenRecord||artifact.record});
 signal?.throwIfAborted();if(!await verifyOpusRecord(result.record,result.descriptor,descriptorSha256))throw Error('opus_prepared_record');
 if(artifact.record&&artifact.record.chartSetSha256!==result.record.chartSetSha256)throw Error('opus_restore_chart_changed');
 if(!restored){onStage?.('storage');await saveVerifiedOpus({...artifact,record:result.record},signal);}
 signal?.throwIfAborted();return {kind:'orvio-opus-v1',record:result.record,descriptor:result.descriptor,descriptorSha256,encodedBytes:artifact.bytes,pcm16:result.pcm16,restored,cacheKey:opusCacheKey(result.descriptor,descriptorSha256),legacyReplayShareAllowed:false};
}
