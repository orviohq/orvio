import{FORMAT}from'./opus-descriptor.mjs';
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function validateOpusJob(body){
 if(!body||body.audioFormat!==FORMAT||body.generationMode!=='client'||typeof body.jobId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(body.jobId)||!['queued','running','done','error'].includes(body.status))throw Error('opus_job_shape');
 if(body.status==='done'){const a=body.audio;if(!a||!sha(a.sha256)||!sha(a.descriptorSha256)||!sha(a.oggSha256)||!Number.isSafeInteger(a.sizeBytes)||a.sizeBytes<1||a.sizeBytes>6000000||a.contentType!=='audio/ogg'||a.contractVersion!==FORMAT||a.expiresAt!==null||body.canonical?.status!=='client_generation'||body.canonical.audioSha256!==a.sha256)throw Error('opus_job_binding');}
 else if(body.audio!==undefined)throw Error('opus_pending_audio');
 return body;
}
