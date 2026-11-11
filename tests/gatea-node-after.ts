import assert from 'node:assert/strict';
import { after } from 'node:test';
import { globalFetchCalls } from './youtube-direct-bootstrap.ts';

after(() => {
  assert.equal(globalFetchCalls, 0, 'Gate A must use only injected fetch');
  console.log('Gate A after-hook: globalFetchCalls=0');
});
