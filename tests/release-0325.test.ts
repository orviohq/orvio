import{test,expect}from'vitest';import{PATCHES}from'../src/patch-notes';import{PATCH_V0325}from'../src/patch-notes-v0325';test('0325 notes retained',()=>expect(PATCHES).toContain(PATCH_V0325));
