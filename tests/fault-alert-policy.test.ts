import { expect, it } from "vitest";

it("ignores accessors and selects immutable newest-ten copies", () => {
  let getterCalls = 0;
  const getter = () => {
    getterCalls++;
    return "network_error";
  };
  const item = {
    area: "playback",
    reasonCode: "network_error",
    observedAt: 0,
    occurrenceId: "id_0",
  };
  expect(
    normalizeFaultOccurrence(
      Object.defineProperty({ ...item }, "reasonCode", { get: getter }),
    ),
  ).toBeNull();
  const extra = normalizeFaultOccurrence(
    Object.defineProperty({ ...item }, "secret", { get: getter }),
  );
  expect(extra).toEqual(item);
  expect(extra).not.toHaveProperty("secret");
  expect(
    normalizeFaultOccurrence(
      Object.assign(Object.create({ marker: true }), item),
    ),
  ).toBeNull();
  expect(normalizeFaultOccurrence(Object.create(item))).toBeNull();
  const input = Object.freeze(
    Array.from({ length: 12 }, (_, observedAt) =>
      Object.freeze({ ...item, observedAt, occurrenceId: `id_${observedAt}` }),
    ),
  );
  const snapshot = input.map((value) => ({ ...value }));
  const sparse = [...input];
  sparse.length = 14;
  Object.defineProperty(sparse, "13", { get: getter });
  const result = selectFaultOccurrences(sparse);
  expect(result.map((value) => value.observedAt)).toEqual([
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  ]);
  expect(selectFaultOccurrences(input)).toEqual(result);
  expect(input).toEqual(snapshot);
  expect(Object.getOwnPropertyDescriptor(sparse, "13")?.get).toBe(getter);
  expect(Object.hasOwn(sparse, "12")).toBe(false);
  expect(
    result.every(
      (value) =>
        !input.some((original) => original === value) && Object.isFrozen(value),
    ),
  ).toBe(true);
  expect(Object.isFrozen(result)).toBe(true);
  const empty = selectFaultOccurrences({});
  expect(empty).toEqual([]);
  expect(Object.isFrozen(empty)).toBe(true);
  expect(getterCalls).toBe(0);
});
import { selectFaultOccurrences } from "../src/fault-alert-policy";
import {
  normalizeFaultReason,
  normalizeFaultOccurrence,
} from "../src/fault-alert-policy";

it("deduplicates exact IDs by earliest time with deterministic frozen output", () => {
  const occurrence = (occurrenceId: string, observedAt: number) => ({
    area: "playback" as const,
    reasonCode: "network_error" as const,
    occurrenceId,
    observedAt,
  });
  const input = [
    occurrence("same", 30),
    occurrence("distinct", 20),
    occurrence("same", 10),
    occurrence("Same", 20),
  ];
  const result = selectFaultOccurrences(input);
  expect(result).toEqual([
    occurrence("same", 10),
    occurrence("Same", 20),
    occurrence("distinct", 20),
  ]);
  const reversed = selectFaultOccurrences([...input].reverse());
  expect(reversed).toEqual(result);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(reversed)).toBe(true);
  expect(result.every(Object.isFrozen)).toBe(true);
});

it("normalizes safe reasons and rejects invalid occurrence data", () => {
  expect(normalizeFaultReason("playback", "network_error")).toBe(
    "network_error",
  );
  for (const raw of [
    "https://example.test/private",
    "healthy",
    new Error("private"),
  ]) {
    expect(normalizeFaultReason("playback", raw)).toBe("playback_failed");
  }
  const input = {
    area: "playback",
    reasonCode: "network_error",
    observedAt: 0,
    occurrenceId: "valid_1",
    secret: "private",
  };
  for (const observedAt of [NaN, Infinity, 0.5, -1]) {
    expect(normalizeFaultOccurrence({ ...input, observedAt })).toBeNull();
  }
  expect(
    normalizeFaultOccurrence({
      ...input,
      occurrenceId: "https://example.test/id",
    }),
  ).toBeNull();
  const result = normalizeFaultOccurrence(input);
  expect(result).toEqual({
    area: "playback",
    reasonCode: "network_error",
    observedAt: 0,
    occurrenceId: "valid_1",
  });
  expect(result).not.toBe(input);
  expect(result).not.toHaveProperty("secret");
  expect(Object.isFrozen(result)).toBe(true);
});
