import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { APP_VERSION } from '../src/app-version';
import { LANGUAGES } from '../src/i18n';
import { PATCHES } from '../src/patch-notes';
import { PATCH_V0324 } from '../src/patch-notes-v0324';
import { PATCH_V0323 } from '../src/patch-notes-v0323';
import { patchGroups } from '../src/patch-groups';
test('0.3.24 notes retained',()=>{expect(PATCHES).toContain(PATCH_V0324);expect(Object.keys(PATCH_V0324.notes).sort()).toEqual(Object.keys(LANGUAGES).sort())});
