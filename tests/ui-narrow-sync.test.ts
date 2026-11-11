import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { createContext, runInContext } from "node:vm";
import { expect, test, vi } from "vitest";
import { enhanceSelects } from "../src/select-ui";

const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
function section(start: string, end: string) {
  const offset = main.indexOf(start);
  expect(offset).toBeGreaterThanOrEqual(0);
  const finish = main.indexOf(end, offset);
  expect(finish).toBeGreaterThan(offset);
  return main.slice(offset, finish);
}
function evaluate(source: string, globals: Record<string, unknown>) {
  const context = createContext(globals);
  runInContext(stripTypeScriptTypes(source), context);
  return () => runInContext("run()", context);
}

test("persistence skips only successful identical snapshots and retries failed writes immediately", () => {
  const settings = { song: "full-identity", speed: 1.5 };
  const setItem = vi.fn();
  const run = evaluate(
    section("let persistedSettings:", "\nconst app =") +
      "\nfunction run() { persist(); }",
    { settings, localStorage: { setItem } },
  );
  run();
  run();
  expect(setItem).toHaveBeenCalledTimes(1);
  settings.speed = 2;
  setItem.mockImplementationOnce(() => {
    throw new Error("quota");
  });
  run();
  run();
  run();
  expect(setItem).toHaveBeenCalledTimes(3);
  expect(setItem).toHaveBeenLastCalledWith(
    "orvio.settings.v1",
    JSON.stringify(settings),
  );
  settings.speed = 1.5;
  run();
  expect(setItem).toHaveBeenCalledTimes(4);
});

test("selection URL writes preserve distinct songs, skip unchanged settings URLs and remove stale fragments", () => {
  const location = {
    pathname: "/select/",
    search: "?song=first-light",
    hash: "",
  };
  let path = "/select/?song=first-light";
  const replaceState = vi.fn((_state, _unused, next: string) => {
    const url = new URL(next, "https://example.com");
    Object.assign(location, {
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    });
  });
  const run = evaluate(
    section("function replaceSelectionPath()", "function selectionPath()") +
      "\nfunction run() { replaceSelectionPath(); }",
    {
      location,
      history: { replaceState },
      selectionPath: () => path,
      selectionRouteUnresolved: false,
      libraryHydrated: true,
    },
  );
  run();
  expect(replaceState).not.toHaveBeenCalled();
  for (const next of [
    "?youtube=dQw4w9WgXcQ",
    "?youtube=AAAAAAAAAAA",
    "?song=first-light",
  ]) {
    path = "/select/" + next;
    run();
    run();
  }
  expect(replaceState).toHaveBeenCalledTimes(3);
  location.hash = "#stale";
  run();
  expect(replaceState).toHaveBeenCalledTimes(4);
});

test("pending hydration and unresolved invitations never rewrite the requested song", () => {
  for (const [hydrated, unresolved] of [
    [false, false],
    [true, true],
  ]) {
    const replaceState = vi.fn();
    const run = evaluate(
      section("function replaceSelectionPath()", "function selectionPath()") +
        "\nfunction run() { replaceSelectionPath(); }",
      {
        location: {
          pathname: "/select/",
          search: "?youtube=dQw4w9WgXcQ",
          hash: "",
        },
        history: { replaceState },
        selectionPath: () => {
          throw Error("must not serialize a fallback");
        },
        selectionRouteUnresolved: unresolved,
        libraryHydrated: hydrated,
        hasSelectionSong: () => true,
      },
    );
    run();
    expect(replaceState).not.toHaveBeenCalled();
  }
});

test("speed options retain nodes for normal value changes, rebuild for legacy value and language", () => {
  let builds = 0;
  const speed = {
    set innerHTML(_value: string) {
      builds++;
    },
    value: "",
    prepend: vi.fn(),
  };
  const settings = { speed: 1.5, language: "en" };
  const run = evaluate(
    "let speedOptionsSignature; function run() {\n" +
      section(
        '  const speed = $<HTMLSelectElement>("#speed");',
        '  $<HTMLInputElement>("#volume")',
      ) +
      "}",
    {
      settings,
      $: () => speed,
      document: { createElement: () => ({}) },
      t: () => settings.language,
    },
  );
  run();
  run();
  settings.speed = 2;
  run();
  expect(builds).toBe(1);
  expect(speed.value).toBe("2");
  settings.speed = 2.3;
  run();
  run();
  expect(builds).toBe(2);
  expect(speed.prepend).toHaveBeenLastCalledWith({
    value: "2.3",
    textContent: "2.3× · en",
  });
  settings.language = "ko";
  run();
  expect(speed.prepend).toHaveBeenLastCalledWith({
    value: "2.3",
    textContent: "2.3× · ko",
  });
  settings.speed = 2.7;
  run();
  settings.speed = 3;
  run();
  expect(builds).toBe(5);
  expect(speed.value).toBe("3");
});

test("binding controls retain handlers on song sync and refresh for all binding inputs", () => {
  let builds = 0;
  const nodes = {
    "#bind-hint": { textContent: "" },
    "#bindings": {
      set innerHTML(_value: string) {
        builds++;
      },
    },
  };
  const slot = {
    dataset: { slot: "0" },
    onclick: undefined as undefined | (() => void),
  };
  const common = { onclick: undefined as undefined | (() => void) };
  const settings = {
    language: "en",
    bindingProfile: {
      master: ["A", "B", "C", "D"],
      overrides: {} as Record<number, string[]>,
    },
    keys: { 4: ["A", "B", "C", "D"], 5: ["A", "B", "C", "D", "E"] },
  };
  const globals = {
    settings,
    binding: -1,
    bindingPreviewLanes: 4,
    bindingLanes: 4,
    bindingLegacy: false,
    KEY_MODES: [4, 5],
    modePositions: () => [0, 1, 2, 3],
    keyLabel: (s: string) => s,
    t: (s: string) => s,
    $: (s: keyof typeof nodes) => nodes[s],
    syncSettings: vi.fn(),
    document: {
      querySelectorAll: (s: string) => (s === "[data-slot]" ? [slot] : []),
      querySelector: () => common,
    },
  };
  const run = evaluate(
    "let bindingsSignature; function run() {\n" +
      section('  const hint = $("#bind-hint");', "  persist();") +
      "}",
    globals,
  );
  run();
  const handler = slot.onclick;
  run();
  expect(builds).toBe(1);
  expect(slot.onclick).toBe(handler);
  settings.language = "ko";
  run();
  globals.binding = 0;
  run();
  globals.bindingPreviewLanes = 5;
  run();
  globals.bindingLanes = 5;
  run();
  globals.bindingLegacy = true;
  run();
  settings.bindingProfile.master[0] = "Z";
  run();
  settings.bindingProfile.overrides[5] = ["X"];
  run();
  settings.keys[5] = ["Y"];
  run();
  expect(builds).toBe(9);
  // Equal replacement profiles must not leave a callback pointing at the old object.
  const old = settings.bindingProfile;
  settings.bindingProfile = structuredClone(old);
  run();
  common.onclick!();
  expect(settings.bindingProfile.overrides[5]).toBeUndefined();
  expect(old.overrides[5]).toEqual(["X"]);
});

// Minimal event/element model: exercise the real select renderer without a browser.
class Element extends EventTarget {
  dataset: Record<string, string> = {};
  children: Element[] = [];
  attributes = new Map<string, string>();
  classList = { add: vi.fn(), toggle: vi.fn() };
  style = {};
  id = "language";
  textContent = "";
  disabled = false;
  hidden = false;
  tabIndex = 0;
  className = "";
  type = "";
  focused = false;
  onclick?: () => void;
  onpointermove?: () => void;
  replaceChildren = vi.fn(() => {
    this.children = [];
  });
  append(...children: Element[]) {
    this.children.push(...children);
  }
  before = vi.fn();
  closest() {
    return null;
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
  }
  getAttribute(key: string) {
    return this.attributes.get(key);
  }
  removeAttribute(key: string) {
    this.attributes.delete(key);
  }
  focus() {
    this.focused = true;
  }
  scrollIntoView() {}
  showPopover() {}
  hidePopover() {}
  getBoundingClientRect() {
    return { left: 20, top: 20, bottom: 40, width: 100 };
  }
}

test("select reuses rows, keeps keyboard choice/focus, and rebuilds only for full option changes", () => {
  const select = new Element();
  const options = [
    {
      value: "a:|",
      textContent: "English",
      text: "English",
      disabled: false,
      hidden: false,
      selected: true,
    },
    {
      value: "b",
      textContent: "한국어",
      text: "한국어",
      disabled: false,
      hidden: false,
      selected: false,
    },
  ];
  Object.assign(select, { options });
  Object.defineProperty(select, "selectedOptions", {
    get: () => options.filter((o) => o.selected),
  });
  Object.defineProperty(select, "value", {
    get: () => options.find((o) => o.selected)?.value,
    set: (value) =>
      options.forEach((o) => {
        o.selected = o.value === value;
      }),
  });
  const elements: Element[] = [];
  const document = Object.assign(new EventTarget(), {
    querySelectorAll: () => [select],
    querySelector: () => null,
    createElement: () => {
      const el = new Element();
      elements.push(el);
      return el;
    },
  });
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("innerHeight", 600);
  vi.stubGlobal("innerWidth", 800);
  vi.stubGlobal(
    "MutationObserver",
    class {
      observe() {}
    },
  );
  try {
    enhanceSelects();
    const [, button, panel] = elements;
    const rows = [...panel.children];
    const sync = () => document.dispatchEvent(new Event("orvio:select-sync"));
    sync();
    sync();
    expect(panel.replaceChildren).toHaveBeenCalledTimes(1);
    expect(panel.children[0]).toBe(rows[0]);
    button.onclick!();
    panel.children[1].onpointermove!();
    sync(); // A harmless sync must not discard the highlighted choice.
    button.dispatchEvent(Object.assign(new Event("keydown"), { key: "Enter" }));
    expect(options[1].selected).toBe(true);
    expect(button.focused).toBe(true);
    expect(button.textContent).toBe("한국어");
    expect(rows[1].getAttribute("aria-selected")).toBe("true");
    expect(panel.replaceChildren).toHaveBeenCalledTimes(1);
    select.disabled = true;
    sync();
    expect(button.disabled).toBe(true);
    options[0].textContent = "영어";
    sync();
    options[0].value = "new:|value";
    sync();
    options[0].disabled = true;
    sync();
    expect(panel.children).toHaveLength(1);
    options[0].disabled = false;
    options[0].hidden = true;
    sync();
    expect(panel.children).toHaveLength(1);
    options[0].hidden = false;
    sync();
    expect(panel.children).toHaveLength(2);
    expect(panel.replaceChildren).toHaveBeenCalledTimes(6);
    panel.children[0].onclick!();
    expect(options[0].selected).toBe(true);
  } finally {
    vi.unstubAllGlobals();
  }
});
