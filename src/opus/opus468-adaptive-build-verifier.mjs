// Fixed private build closure, not producer qualification.
import manifestUrl from './private-adaptive-build/manifest.json?url';
import {verifyCandidateInOwnedWorker} from './private-adaptive-build/adaptive-loader.mjs';
import {readFixedManifest} from './opus468-fixed-manifest.mjs';
export async function verifyPrivateAdaptiveBuildInOwnedWorker(args){
 await readFixedManifest(manifestUrl,{size:14206,sha256:'add7dcf6482092a41a7d193e98e891547498f42ca26a87144500b5c78cb615a2',code:'adaptive_manifest',signal:args.signal});
 return verifyCandidateInOwnedWorker(args);
}
