import { mkdir, writeFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

interface AudioSnapshot {
  decodeAudioData: number;
  createBuffer: number;
  sources: {
    id: number;
    startArgs: (number | undefined)[] | null;
    stops: number;
    ended: boolean;
    bufferId: number | null;
    startBufferId: number | null;
    contextState: string;
    contextTime: number;
    loop: boolean;
    loopStart: number;
    loopEnd: number;
    duration: number | null;
  }[];
  loadingEvents: { reason: string; text: string; at: number }[];
  previewActive: boolean;
  previewing: boolean;
  lane: number;
}

type ObservedWindow = Window & {
  __orv80: { snapshot: () => AudioSnapshot };
  orvioDiagnostics?: { previewActive: boolean };
};

async function instrumentAudioAndLoading(page: Page) {
  // All instrumentation is installed before app code. Native calls retain their
  // receivers, arguments, return values and errors; no playback is synthesized.
  await page.addInitScript(() => {
    const w = window as unknown as ObservedWindow;
    let decodeAudioData = 0;
    let createBuffer = 0;
    const buffers = new WeakMap<AudioBuffer, number>();
    let nextBuffer = 1;
    const bufferId = (buffer: AudioBuffer | null) => {
      if (!buffer) return null;
      if (!buffers.has(buffer)) buffers.set(buffer, nextBuffer++);
      return buffers.get(buffer)!;
    };
    const sources: {
      node: AudioBufferSourceNode;
      startArgs: (number | undefined)[] | null;
      stops: number;
      ended: boolean;
      startBufferId: number | null;
    }[] = [];

    // Also observe offline synthesis, so built-in rendering cannot escape the
    // allocation counters. These prototypes inherit the native methods separately.
    for (const prototype of [
      AudioContext.prototype,
      OfflineAudioContext.prototype,
    ]) {
      const decode = prototype.decodeAudioData;
      const create = prototype.createBuffer;
      const createSource = prototype.createBufferSource;
      prototype.decodeAudioData = function (...args) {
        decodeAudioData++;
        return decode.apply(this, args);
      };
      prototype.createBuffer = function (...args) {
        createBuffer++;
        return create.apply(this, args);
      };
      prototype.createBufferSource = function () {
        const node = createSource.call(this);
        const record = {
          node,
          startArgs: null as (number | undefined)[] | null,
          stops: 0,
          ended: false,
          startBufferId: null as number | null,
        };
        const start = node.start;
        const stop = node.stop;
        node.start = function (...args) {
          record.startArgs = args;
          record.startBufferId = bufferId(this.buffer);
          return start.apply(this, args);
        };
        node.stop = function (...args) {
          record.stops++;
          return stop.apply(this, args);
        };
        node.addEventListener("ended", () => (record.ended = true));
        sources.push(record);
        return node;
      };
    }

    const loadingEvents: AudioSnapshot["loadingEvents"] = [];
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        element.getClientRects().length > 0
      );
    };
    const recordLoading = (reason: string, element: Element) => {
      loadingEvents.push({
        reason,
        text: element.textContent ?? "",
        at: performance.now(),
      });
    };
    const inspectLoading = () => {
      for (const element of document.querySelectorAll(
        "#song-loading, #loading-status",
      )) {
        if (visible(element)) recordLoading(element.id, element);
      }
      // main.ts also uses preparing text on #start and .song-note-count.
      for (const element of document.querySelectorAll(
        '#start, .song-note-count, [role="status"], [data-sonner-toast]',
      )) {
        if (
          visible(element) &&
          /preparing\s+(audio|chart)/i.test(element.textContent ?? "")
        )
          recordLoading("preparation text", element);
      }
    };
    new MutationObserver((mutations) => {
      // Retain even a show/hide pair within one task: the old class on the
      // second mutation exposes that the actual overlay lost its hidden class.
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          mutation.target instanceof Element &&
          mutation.target.id === "song-loading" &&
          mutation.oldValue !== null &&
          !mutation.oldValue.split(/\s+/).includes("hidden")
        )
          recordLoading("overlay was unhidden", mutation.target);
      }
      inspectLoading();
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeOldValue: true,
    });
    const sampleFrame = () => {
      inspectLoading();
      requestAnimationFrame(sampleFrame);
    };
    requestAnimationFrame(sampleFrame);

    w.__orv80 = {
      snapshot: () => ({
        decodeAudioData,
        createBuffer,
        sources: sources.map((record, id) => ({
          id,
          startArgs: record.startArgs,
          stops: record.stops,
          ended: record.ended,
          bufferId: bufferId(record.node.buffer),
          startBufferId: record.startBufferId,
          contextState: record.node.context.state,
          contextTime: record.node.context.currentTime,
          loop: record.node.loop,
          loopStart: record.node.loopStart,
          loopEnd: record.node.loopEnd,
          duration: record.node.buffer?.duration ?? null,
        })),
        loadingEvents: [...loadingEvents],
        previewActive: w.orvioDiagnostics?.previewActive === true,
        previewing: document.body.classList.contains("previewing"),
        lane: Number(
          document.querySelector<HTMLElement>("#lanes .selected")?.dataset
            .lanes,
        ),
      }),
    };
  });
}

const snapshot = (page: Page) =>
  page.evaluate(() => (window as unknown as ObservedWindow).__orv80.snapshot());

test("built-in preview stays on the same source and buffer through every lane click", async ({
  page,
}, testInfo) => {
  await mkdir("qa-evidence", { recursive: true });
  await instrumentAudioAndLoading(page);
  await page.goto("/select/");
  await page.waitForFunction(
    () => !!(window as unknown as ObservedWindow).orvioDiagnostics,
  );
  const selected = page.locator(".song-card.selected");
  await expect(selected).toBeVisible();
  await selected.click();
  await expect(page.locator("body")).toHaveClass(/previewing/);
  await page.waitForFunction(
    () => (window as unknown as ObservedWindow).orvioDiagnostics?.previewActive,
  );
  // Allow initial render/cache persistence to finish before the switch baseline.
  await page.waitForTimeout(1000);
  const baseline = await snapshot(page);
  const playing = baseline.sources.filter(
    (source) => source.startArgs && !source.ended && source.stops === 0,
  );
  expect(playing).toHaveLength(1);
  const preview = playing[0];
  expect(preview.contextState).toBe("running");
  expect(preview.bufferId).not.toBeNull();
  expect(preview.startArgs).toEqual([0, 8]);
  expect(preview.loop).toBe(true);
  expect(preview.loopStart).toBe(8);
  expect(preview.loopEnd).toBe(Math.min(24, preview.duration!));
  await expect(page.locator("#song-loading")).toBeHidden();
  await expect(page.locator("#loading-status")).toBeHidden();

  const evidence = {
    scope:
      "Built-in preview only; no imported-song playback or file-import UI qualification.",
    baseline,
    switches: [] as {
      lane: number;
      screenshot: string;
      observed: AudioSnapshot;
    }[],
  };
  const saveEvidence = async () => {
    await writeFile(
      "qa-evidence/orv80-audio-continuity.json",
      JSON.stringify(evidence, null, 2) + "\n",
    );
  };
  console.log("ORV80 baseline", JSON.stringify(baseline));
  await page.screenshot({
    path: "qa-evidence/orv80-lanes-0.png",
    fullPage: true,
  });
  let previousTime = preview.contextTime;
  try {
    for (const [index, lane] of [baseline.lane, 4, 6, 8, 5, 7].entries()) {
      await test.step(`lane click ${index + 1}: ${lane} KEY`, async () => {
        const button = page.locator(`#lanes button[data-lanes="${lane}"]`);
        await button.click();
        await expect(button).toHaveClass(/selected/);
        // Deliberate observation window for delayed readiness/audio work.
        await page.waitForTimeout(1000);
        const screenshot = `qa-evidence/orv80-lanes-${index + 1}.png`;
        await page.screenshot({ path: screenshot, fullPage: true });
        const observed = await snapshot(page);
        evidence.switches.push({ lane, screenshot, observed });
        await saveEvidence();
        console.log("ORV80 lane", lane, JSON.stringify(observed));
        // Soft assertions collect all six switches on a real regression while
        // still failing the test. All comparisons use the original baseline.
        expect.soft(observed.lane).toBe(lane);
        expect.soft(observed.decodeAudioData).toBe(baseline.decodeAudioData);
        expect.soft(observed.createBuffer).toBe(baseline.createBuffer);
        expect.soft(observed.sources).toHaveLength(baseline.sources.length);
        const current = observed.sources[preview.id];
        expect.soft(current.stops).toBe(0);
        expect.soft(current.ended).toBe(false);
        expect.soft(current.bufferId).toBe(preview.bufferId);
        expect.soft(current.startBufferId).toBe(preview.bufferId);
        expect.soft(current.startArgs).toEqual(preview.startArgs);
        expect.soft(current.contextState).toBe("running");
        expect.soft(current.contextTime).toBeGreaterThan(previousTime);
        previousTime = current.contextTime;
        expect.soft(observed.previewActive).toBe(true);
        expect.soft(observed.previewing).toBe(true);
        expect
          .soft(observed.loadingEvents.slice(baseline.loadingEvents.length))
          .toEqual([]);
        await expect.soft(page.locator("#song-loading")).toBeHidden();
        await expect.soft(page.locator("#loading-status")).toBeHidden();
      });
    }
  } finally {
    await saveEvidence();
    await page.screenshot({
      path: "qa-evidence/orv80-lanes-7.png",
      fullPage: true,
    });
    await testInfo.attach("audio-continuity-observations", {
      path: "qa-evidence/orv80-audio-continuity.json",
      contentType: "application/json",
    });
  }
});
