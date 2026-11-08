import type { Language } from './i18n';
export const REPLAY_LABELS: Record<Language, [string, string, string]> = {
  en: ['Watch replay', 'Replay', 'Replay unavailable'],
  ko: ['리플레이 보기', '리플레이', '리플레이를 불러올 수 없어요'],
  zh: ['观看回放', '回放', '无法加载回放'],
  ja: ['リプレイを見る', 'リプレイ', 'リプレイを読み込めません'],
  es: ['Ver repetición', 'Repetición', 'Repetición no disponible'],
  fr: ['Voir le replay', 'Replay', 'Replay indisponible'],
  de: ['Wiederholung ansehen', 'Wiederholung', 'Wiederholung nicht verfügbar'],
  pt: ['Ver replay', 'Replay', 'Replay indisponível'],
  it: ['Guarda replay', 'Replay', 'Replay non disponibile'],
  ru: ['Смотреть повтор', 'Повтор', 'Повтор недоступен'],
  id: ['Tonton ulang', 'Putar ulang', 'Putar ulang tidak tersedia'],
  tr: ['Tekrarı izle', 'Tekrar', 'Tekrar kullanılamıyor'],
  vi: ['Xem phát lại', 'Phát lại', 'Không thể tải phát lại'],
};

export const REPLAY_PLAYING: Record<Language, string> = {
  ko: '리플레이 재생 중',
  en: 'Replay playing',
  ja: 'リプレイ再生中',
  zh: '回放播放中',
  es: 'Reproduciendo repetición',
  fr: 'Lecture du replay',
  de: 'Wiederholung läuft',
  pt: 'Reproduzindo replay',
  it: 'Replay in riproduzione',
  ru: 'Воспроизведение повтора',
  id: 'Memutar ulang',
  tr: 'Tekrar oynatılıyor',
  vi: 'Đang phát lại',
};
