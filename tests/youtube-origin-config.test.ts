import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
for (const origin of ['', 'http://provider.fixture.invalid', 'https://u:p@provider.fixture.invalid', 'https://provider.fixture.invalid/path', 'https://provider.fixture.invalid/?x=1', 'https://provider.fixture.invalid/#x']) {
 test(`fails closed for unsafe configuration ${origin}`, () => {
  const code = `import {acquireYoutubeAudio} from './src/youtube-direct-api.ts';let calls=0;try {await acquireYoutubeAudio('unitTest_01',{publicKey:'fixture',fetch:async()=>{calls++;throw Error('unexpected')}});process.exit(2)}catch(e){if(e.code!=='unavailable'||calls)process.exit(3)}`;
  const child=spawnSync(process.execPath,['--experimental-transform-types','--input-type=module','-e',code],{env:{...process.env,PUBLIC_YOUTUBE_API_ORIGIN:origin},encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);
 });
}
