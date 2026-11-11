import {
  createYoutubeSongLink,
  parseYoutubeSongInvitation,
} from "./youtube-song-link";

const BUILTINS = new Set(["first-light", "afterimage", "violet-drive"]);
const ALIASES = "orvio.selection-source-aliases.v1";
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
type Aliases = Record<string, string>;
function aliases(storage: Storage): Aliases {
  try {
    const value = JSON.parse(storage.getItem(ALIASES) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}
export function selectionSongPath(
  id: string,
  video: string | undefined,
  storage: Storage,
  uuid: () => string = () => crypto.randomUUID(),
) {
  if (video) {
    const url = new URL(createYoutubeSongLink(video, "https://local.invalid"));
    return url.pathname + url.search;
  }
  if (BUILTINS.has(id)) return `/select/?song=${id}`;
  const saved = aliases(storage);
  let token = Object.keys(saved).find(
    (key) => key.startsWith("local:") && saved[key] === id,
  );
  if (!token) {
    token = `local:${uuid()}`;
    if (Object.hasOwn(saved, token)) throw Error("Local song alias collision");
    saved[token] = id;
    storage.setItem(ALIASES, JSON.stringify(saved));
  }
  return `/select/?song=${token}`;
}
export function selectionRouteOptions(pathname: string, search: string) {
  return new URLSearchParams(/^\/select\/?$/.test(pathname) ? "" : search);
}
export function hasSelectionSong(search: string) {
  const q = new URLSearchParams(search);
  return q.has("youtube") || q.has("song");
}
export type SelectionResolution =
  | { kind: "selected"; id: string }
  | { kind: "invitation"; video: string }
  | { kind: "pending" | "missing" | "none" };
/** Plain recipient-facing copy; never expose a source identity in the UI. */
export function selectionLinkStatus(
  resolution: SelectionResolution,
  search: string,
  language: string,
): string {
  const ko = language === "ko";
  if (resolution.kind === "selected" || resolution.kind === "none") return "";
  if (resolution.kind === "pending")
    return ko
      ? "이 기기의 곡을 확인하고 있습니다."
      : "Checking songs on this device.";
  if (resolution.kind === "invitation")
    return ko
      ? "이 영상의 곡을 먼저 추가해 주세요. 또는 보관함에서 다른 곡을 선택하세요."
      : "Add this video's song first, or select another song from your library.";
  const q = new URLSearchParams(search);
  if (
    q.getAll("song").length > 1 ||
    q.getAll("youtube").length > 1 ||
    (q.has("song") && q.has("youtube")) ||
    q.has("youtube")
  )
    return ko
      ? "곡 링크가 올바르지 않습니다. 보관함에서 곡을 선택하세요."
      : "This song link is invalid. Select a song from your library.";
  if (q.get("song")?.startsWith("local:"))
    return ko
      ? "이 기기에서는 링크의 곡을 찾을 수 없습니다. 보관함에서 곡을 선택하세요."
      : "The linked song is not available on this device. Select a song from your library.";
  return ko
    ? "링크의 곡을 찾을 수 없습니다. 보관함에서 곡을 선택하세요."
    : "The linked song could not be found. Select a song from your library.";
}
export function resolveSelectionSong(input: {
  search: string;
  hydrated: boolean;
  installed: readonly string[];
  visible: readonly string[];
  videoId: (id: string) => string | undefined;
  preferred: (video: string) => string | undefined;
  storage: Storage;
}): SelectionResolution {
  const q = new URLSearchParams(input.search);
  if (!hasSelectionSong(input.search)) return { kind: "none" };
  if (
    q.getAll("song").length > 1 ||
    q.getAll("youtube").length > 1 ||
    (q.has("song") && q.has("youtube"))
  )
    return { kind: "missing" };
  if (!input.hydrated) return { kind: "pending" };
  if (q.has("youtube")) {
    const video = parseYoutubeSongInvitation(input.search);
    if (!video) return { kind: "missing" };
    const candidates = input.visible.filter(
      (id) => input.installed.includes(id) && input.videoId(id) === video,
    );
    const preferred = input.preferred(video);
    const id =
      preferred && candidates.includes(preferred)
        ? preferred
        : candidates.length === 1
          ? candidates[0]
          : undefined;
    return id ? { kind: "selected", id } : { kind: "invitation", video };
  }
  let id = q.get("song") ?? "";
  if (id.startsWith("local:")) {
    const saved = aliases(input.storage);
    id =
      Object.hasOwn(saved, id) && typeof saved[id] === "string"
        ? saved[id]
        : "";
  }
  return input.installed.includes(id)
    ? { kind: "selected", id }
    : { kind: "missing" };
}
