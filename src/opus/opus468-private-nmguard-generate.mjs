// PRIVATE separately named build. Qualification remains false; no caller code/root overrides.
import manifestUrl from './private-nmguard-build/manifest.json?url';
import {generateNmGuardExtensionInOwnedWorker} from './private-nmguard-build/nmguard-generate-loader.mjs';
import {readFixedManifest} from './opus468-fixed-manifest.mjs';
export async function generatePrivateNmGuardExtension(args){
 await readFixedManifest(manifestUrl,{size:15535,sha256:'f07b226346becdef2d12eda7b37c0278011f9bd35b3c348acb97412a50a6cddf',code:'nmguard_manifest',signal:args.signal});
 return generateNmGuardExtensionInOwnedWorker(args);
}
