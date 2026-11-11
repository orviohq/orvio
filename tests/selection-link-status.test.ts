import { describe, expect, it } from "vitest";
import { selectionLinkStatus } from "../src/selection-song-route";

describe("recipient selection link status", () => {
  it("clears on a resolved or absent selection", () => {
    expect(
      selectionLinkStatus({ kind: "selected", id: "private-source" }, "", "en"),
    ).toBe("");
    expect(selectionLinkStatus({ kind: "none" }, "", "ko")).toBe("");
  });
  it.each(["ko", "en", "ja"])(
    "distinguishes Add invitation from missing/invalid/device in %s",
    (language) => {
      const invitation = selectionLinkStatus(
        { kind: "invitation", video: "ZZZZZZZZZZZ" },
        "?youtube=ZZZZZZZZZZZ",
        language,
      );
      const reasons = [
        "?song=unavailable-secret-source",
        "?youtube=bad",
        "?song=local:private-token",
      ].map((search) =>
        selectionLinkStatus({ kind: "missing" }, search, language),
      );
      expect(new Set([invitation, ...reasons]).size).toBe(4);
      for (const text of [invitation, ...reasons]) {
        expect(text.length).toBeGreaterThan(20);
        expect(text).not.toMatch(/ZZZZ|private|secret|hash|policy|local:/);
      }
    },
  );
  it("uses English fallback and describes duplicate links as invalid", () => {
    expect(
      selectionLinkStatus({ kind: "missing" }, "?song=a&song=b", "fr"),
    ).toContain("invalid");
    expect(
      selectionLinkStatus({ kind: "missing" }, "?song=a&youtube=b", "en"),
    ).toContain("invalid");
    expect(selectionLinkStatus({ kind: "pending" }, "", "ko")).toContain(
      "확인",
    );
  });
});
