import type { Language } from './i18n';
import { youtubeWatchUrl } from './youtube-song-link';

const labels: Record<Language, string> = {
  en: 'Open original on YouTube',
  ko: '원곡 열기',
  zh: '打开原曲',
  ja: '原曲を開く',
  es: 'Abrir original',
  fr: 'Ouvrir l’original',
  de: 'Original öffnen',
  pt: 'Abrir original',
  it: 'Apri originale',
  ru: 'Открыть оригинал',
  id: 'Buka asli',
  tr: 'Orijinali aç',
  vi: 'Mở bản gốc',
};

export interface LibrarySourceAction {
  label: string;
  url: string;
}

export function librarySourceAction(
  videoId: string | null | undefined,
  language: Language,
): LibrarySourceAction | null {
  if (!videoId) return null;
  try {
    return { label: labels[language], url: youtubeWatchUrl(videoId) };
  } catch {
    return null;
  }
}

export function openSourceInNewTab(
  url: string,
  open: (
    url: string,
    target: string,
    features: string,
  ) => Window | null = window.open.bind(window),
) {
  const opened = open(url, '_blank', 'noopener,noreferrer');
  if (opened) opened.opener = null;
  return opened;
}
