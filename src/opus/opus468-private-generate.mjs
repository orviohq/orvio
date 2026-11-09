// Fixed private build closure, not producer qualification.
import manifestUrl from './private-generate-build/manifest.json?url';
import {generateExtensionInOwnedWorker} from './private-generate-build/generate-loader.mjs';
import {readFixedManifest} from './opus468-fixed-manifest.mjs';
export async function generatePrivateOpus468Extension(args){
 await readFixedManifest(manifestUrl,{size:15194,sha256:'06b2e11582e4ec93784d733275bcef1c71d039def60efe218897c27f1323f6f5',code:'generate_manifest',signal:args.signal});
 return generateExtensionInOwnedWorker(args);
}
