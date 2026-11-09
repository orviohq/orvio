import { test, expect, vi } from 'vitest';
import { createOpus468ShareRouteOwner } from '../src/opus/opus468-share-route-owner';
test('replacing route aborts old work and only latest can publish', () => {
  const owner = createOpus468ShareRouteOwner(),
    a = owner.begin('/one', () => true),
    b = owner.begin('/two', () => true);
  expect(a.signal.aborted).toBe(true);
  expect(() => a.finish({ revoke() {} })).toThrow();
  const revoke = vi.fn();
  b.finish({ revoke });
  owner.close();
  expect(b.signal.aborted).toBe(true);
  expect(revoke).toHaveBeenCalledTimes(1);
  a.dispose();
  b.dispose();
});
test('same epoch but changed href cannot publish', () => {
  const owner = createOpus468ShareRouteOwner();
  let current = true;
  const a = owner.begin('/one', () => current);
  current = false;
  expect(() => a.finish({ revoke() {} })).toThrow('stale');
  a.dispose();
});
test('late disposal never aborts a newer route', () => {
  const owner = createOpus468ShareRouteOwner(),
    a = owner.begin('/one', () => true),
    b = owner.begin('/two', () => true);
  a.dispose();
  expect(b.signal.aborted).toBe(false);
  b.dispose();
});
test('finished service remains live until navigation, not as result of readiness', () => {
  const owner = createOpus468ShareRouteOwner(),
    a = owner.begin('/one', () => true),
    revoke = vi.fn();
  a.finish({ revoke });
  expect(a.signal.aborted).toBe(false);
  expect(revoke).not.toHaveBeenCalled();
  owner.close();
  expect(revoke).toHaveBeenCalledTimes(1);
});
