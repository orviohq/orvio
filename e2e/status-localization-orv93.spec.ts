import { mkdir } from "node:fs/promises";
import {
  test as base,
  expect,
  type Page,
  type TestInfo,
} from "@playwright/test";
import type { Language } from "../src/i18n";
import { statusReasonText } from "../src/status-labels";

const languages = [
  "en",
  "ko",
  "zh",
  "ja",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "ru",
  "id",
  "tr",
  "vi",
] as const satisfies readonly Language[];

const failureMessages = {
  access: "IndexedDB unavailable",
  playback: "ARBITRARY_PRIVATE_ERROR_XYZ <img src=x onerror=alert(1)>",
  "youtube-add": "Metadata HTTP 503",
} as const;

// Expected observations from real probes in a fresh Chromium context with no key.
// These are assertions only: no probe, browser capability, DOM or CSS is replaced.
const probeDetails = {
  access: "Local cache not initialized",
  playback: "AudioContext + PCM decode; output untested",
  "youtube-add": "Metadata API key not configured",
} as const;
const areas = ["access", "playback", "youtube-add"] as const;
const cjkFonts = {
  ko: { family: "OrvioKR", paths: ["/korean.ttf", "/korean-supplement.woff2"] },
  zh: { family: "OrvioZH", paths: ["/chinese.ttf"] },
  ja: { family: "OrvioJP", paths: ["/japanese.ttf"] },
} as const;
const jargon =
  /IndexedDB|AudioContext|\bPCM\b|decodeAudioData|\bAPI[\s_-]*key\b|\bHTTP\b|\b\d{3}\b|Error\.message|ARBITRARY_PRIVATE_ERROR_XYZ|<img|onerror|Local cache|Metadata|output untested|audio import untested|\b[a-z]+(?:_[a-z]+)+\b/i;

type BrowserEvidence = {
  pageErrors: string[];
  externalRequests: string[];
  dialogs: string[];
  fontResponses: { url: string; status: number }[];
  loadedFonts: { language: Language; family: string; unicodeRange: string }[];
};

const test = base.extend<{ browserEvidence: BrowserEvidence }>({
  browserEvidence: [
    async ({ page, context, baseURL }, use, testInfo) => {
      const evidence: BrowserEvidence = {
        pageErrors: [],
        externalRequests: [],
        dialogs: [],
        fontResponses: [],
        loadedFonts: [],
      };
      page.on("response", (response) => {
        if (response.request().resourceType() === "font") {
          evidence.fontResponses.push({
            url: response.url(),
            status: response.status(),
          });
        }
      });
      page.on("pageerror", (error) => evidence.pageErrors.push(error.message));
      page.on("dialog", async (dialog) => {
        evidence.dialogs.push(dialog.message());
        await dialog.dismiss();
      });
      // A network boundary, not a response fixture. All app traffic stays real;
      // any attempted off-origin request is blocked and fails qualification.
      await context.route(
        (url) => /^https?:$/.test(url.protocol) && url.origin !== baseURL,
        async (route) => {
          const url = new URL(route.request().url());
          evidence.externalRequests.push(url.origin + url.pathname);
          await route.abort("blockedbyclient");
        },
      );
      await context.addInitScript((messages) => {
        const at = new Date().toISOString();
        localStorage.setItem(
          "orvio-status-failures",
          JSON.stringify(
            Object.entries(messages).map(([area, message]) => ({
              area,
              message,
              at,
            })),
          ),
        );
      }, failureMessages);
      await mkdir("qa-evidence", { recursive: true });
      try {
        await use(evidence);
      } finally {
        await testInfo.attach("browser-evidence", {
          body: JSON.stringify(evidence, null, 2),
          contentType: "application/json",
        });
        expect(evidence.pageErrors, "uncaught browser errors").toEqual([]);
        expect(
          evidence.externalRequests,
          "attempted external requests",
        ).toEqual([]);
        expect(
          evidence.dialogs,
          "unexpected dialogs / injected script",
        ).toEqual([]);
      }
    },
    { auto: true },
  ],
});

async function waitForChecks(page: Page) {
  // The server-rendered refresh button starts enabled. Completed timestamps
  // prevent that initial state from being mistaken for finished probes.
  await expect(page.locator("[data-checked-at]")).toHaveCount(3);
  for (const area of areas) {
    await expect(
      page.locator(`[data-area="${area}"] [data-checked-at]`),
    ).toHaveText(/\d/);
  }
  await expect(page.locator("#status-refresh")).toBeEnabled();
}

async function assertBundledFonts(
  page: Page,
  language: Language,
  evidence: BrowserEvidence,
) {
  // Observe the real renderer after locale text/styles settle; never load fonts
  // from the test, since that would conceal a missing product font stack.
  await page.evaluate(() => document.fonts.ready);
  const cjk = cjkFonts[language as keyof typeof cjkFonts];
  const expectedFonts = [
    { family: "Outfit", paths: ["/outfit.ttf"] },
    ...(cjk ? [cjk] : []),
  ];
  const faces = await page.evaluate(() =>
    Array.from(document.fonts, (face) => ({
      family: face.family,
      status: face.status,
      unicodeRange: face.unicodeRange,
    })),
  );
  for (const { family, paths } of expectedFonts) {
    for (const path of paths) {
      const url = new URL(path, page.url()).href;
      const responses = evidence.fontResponses.filter((item) => item.url === url);
      expect(responses, `renderer requested ${url}`).not.toHaveLength(0);
      expect(responses.every((item) => item.status === 200), url).toBe(true);
    }
    const matching = faces.filter((face) => face.family === family);
    expect(matching, `${family} FontFace declarations`).toHaveLength(paths.length);
    for (const face of matching) {
      expect(face.status, `${family}: ${face.unicodeRange}`).toBe("loaded");
      evidence.loadedFonts.push({
        language,
        family,
        unicodeRange: face.unicodeRange,
      });
    }
    if (language === "ko" && family === "OrvioKR") {
      expect(matching.some((face) => face.unicodeRange === "U+0-10FFFF")).toBe(true);
      expect(matching.some((face) => face.unicodeRange.includes("U+AC02-AC03"))).toBe(true);
    }
  }
  if (cjk) {
    for (const selector of ["body", "#status-language", "#status-refresh"]) {
      await expect(page.locator(selector)).toHaveCSS(
        "font-family",
        `Outfit, ${cjk.family}, system-ui, sans-serif`,
      );
      await expect(page.locator(selector)).toHaveCSS("word-break", "keep-all");
    }
  }
}

async function assertLocalized(
  page: Page,
  language: Language,
  evidence: BrowserEvidence,
) {
  await expect(page.locator("html")).toHaveAttribute("lang", language);
  await expect(page.locator("#status-language")).toHaveValue(language);
  await assertBundledFonts(page, language, evidence);
  await expect(page.locator("[data-detail]")).toHaveCount(3);
  await expect(page.locator("[data-failure]")).toHaveCount(3);
  for (const area of areas) {
    const card = page.locator(`[data-area="${area}"]`);
    const detail = card.locator("[data-detail]");
    const failure = card.locator("[data-failure]");
    await expect(detail).toBeVisible();
    await expect(detail).toHaveText(/\S/);
    await expect(detail).toHaveText(
      statusReasonText(language, probeDetails[area]),
    );
    await expect(card.locator("[data-state]")).toHaveAttribute(
      "data-state",
      area === "playback" ? "healthy" : "unknown",
    );
    await expect(failure).toBeVisible();
    const expectedFailure = statusReasonText(language, failureMessages[area]);
    await expect(failure).toContainText(expectedFailure);
    expect((await failure.innerText()).endsWith(` · ${expectedFailure}`)).toBe(
      true,
    );
    await expect(detail).not.toContainText(jargon);
    await expect(failure).not.toContainText(jargon);
    for (const raw of [
      ...Object.values(failureMessages),
      ...Object.values(probeDetails),
    ]) {
      await expect(detail).not.toContainText(raw);
      await expect(failure).not.toContainText(raw);
    }
    if (language !== "en") {
      await expect(detail).not.toContainText(
        statusReasonText("en", probeDetails[area]),
      );
      await expect(failure).not.toContainText(
        statusReasonText("en", failureMessages[area]),
      );
    }
  }
  await expect(page.locator("[data-failure] img")).toHaveCount(0);
  if (language === "ko") {
    await expect(page.locator("#status-title")).toHaveText("이 기기의 상태");
    await expect(page.locator('[data-area="access"] [data-detail]')).toHaveText(
      "이 기기의 곡 저장 공간이 아직 준비되지 않았어요; 곡을 재생한 뒤 다시 확인해 주세요.",
    );
    await expect(
      page.locator('[data-area="playback"] [data-failure]'),
    ).toContainText("상태를 확인하지 못했어요; 잠시 후 다시 확인해 주세요.");
    await expect(
      page.locator('[data-area="youtube-add"] [data-failure]'),
    ).toContainText(
      "곡 정보 서비스에서 요청한 정보를 받지 못했어요; 잠시 후 다시 시도해 주세요.",
    );
  }
}

async function assertWidth(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document, JSON.stringify(widths)).toBeLessThanOrEqual(
    widths.viewport,
  );
  expect(widths.body, JSON.stringify(widths)).toBeLessThanOrEqual(
    widths.viewport,
  );
}

async function capture(
  page: Page,
  language: Language,
  width: number,
  info: TestInfo,
) {
  await assertWidth(page);
  const path = `qa-evidence/orv93-status-${language}-${width}.png`;
  await page.screenshot({ path, fullPage: true });
  await info.attach("localized-status", { path, contentType: "image/png" });
  await info.attach("rendered-status", {
    body: JSON.stringify(
      await page.locator("[data-area]").allInnerTexts(),
      null,
      2,
    ),
    contentType: "application/json",
  });
}

for (const language of languages) {
  test(`${language}: real probes and safe localized history at 1280x900`, async ({
    page,
    browserEvidence,
  }, info) => {
    await page.goto(`/status/?lang=${language}`);
    await waitForChecks(page);
    await assertLocalized(page, language, browserEvidence);
    await capture(page, language, 1280, info);
  });
}

test.describe("narrow viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const language of ["ko", "de"] as const) {
    test(`${language}: real localized status fits 390x844`, async ({
      page,
      browserEvidence,
    }, info) => {
      await page.goto(`/status/?lang=${language}`);
      await waitForChecks(page);
      await assertLocalized(page, language, browserEvidence);
      await capture(page, language, 390, info);
    });
  }
});

test("real selector changes Korean details and history to English", async ({
  page,
  browserEvidence,
}) => {
  await page.goto("/status/?lang=ko");
  await waitForChecks(page);
  await assertLocalized(page, "ko", browserEvidence);
  const koreanDetails = await page.locator("[data-detail]").allTextContents();
  const koreanFailures = await page.locator("[data-failure]").allTextContents();
  const history = await page.evaluate(() =>
    localStorage.getItem("orvio-status-failures"),
  );

  await page.locator("#status-language").selectOption("en");
  await expect(page).toHaveURL(/\/status\/\?lang=en$/);
  await expect(page.locator("#status-title")).toHaveText(
    "Status on this device",
  );
  await assertLocalized(page, "en", browserEvidence);
  for (let index = 0; index < areas.length; index++) {
    await expect(page.locator("[data-detail]").nth(index)).not.toHaveText(
      koreanDetails[index],
    );
    await expect(page.locator("[data-failure]").nth(index)).not.toHaveText(
      koreanFailures[index],
    );
  }
  expect(
    await page.evaluate(() => localStorage.getItem("orvio-status-failures")),
  ).toBe(history);
  await expect(page.locator("#status-refresh")).toBeEnabled();
  await assertWidth(page);
});
