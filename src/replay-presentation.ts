import type { Language } from './i18n';
export const archiveLabels: Record<
  Language,
  { played: string; duration: string; unrecorded: string }
> = {
  ko: {
    played: '플레이',
    duration: '곡 길이',
    unrecorded: '플레이 시각 미기록',
  },
  en: {
    played: 'Played',
    duration: 'Length',
    unrecorded: 'Play time not recorded',
  },
  ja: {
    played: 'プレイ',
    duration: '曲の長さ',
    unrecorded: 'プレイ日時未記録',
  },
  zh: { played: '游玩', duration: '时长', unrecorded: '未记录游玩时间' },
  es: {
    played: 'Jugado',
    duration: 'Duración',
    unrecorded: 'Fecha de juego no registrada',
  },
  fr: {
    played: 'Joué',
    duration: 'Durée',
    unrecorded: 'Date de jeu non enregistrée',
  },
  de: {
    played: 'Gespielt',
    duration: 'Länge',
    unrecorded: 'Spielzeit nicht aufgezeichnet',
  },
  pt: {
    played: 'Jogado',
    duration: 'Duração',
    unrecorded: 'Data de jogo não registrada',
  },
  it: {
    played: 'Giocato',
    duration: 'Durata',
    unrecorded: 'Data di gioco non registrata',
  },
  ru: {
    played: 'Игра',
    duration: 'Длина',
    unrecorded: 'Время игры не записано',
  },
  id: {
    played: 'Dimainkan',
    duration: 'Durasi',
    unrecorded: 'Waktu bermain tidak tercatat',
  },
  tr: {
    played: 'Oynandı',
    duration: 'Süre',
    unrecorded: 'Oyun zamanı kaydedilmedi',
  },
  vi: {
    played: 'Đã chơi',
    duration: 'Độ dài',
    unrecorded: 'Chưa ghi thời gian chơi',
  },
};
export function recordedTime(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 8640000000000000
    ? value
    : null;
}
export function archiveDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0)
    return '--:--';
  const n = Math.floor(seconds);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}
export function archiveTime(ms: number, language: Language): string {
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

/* Intl date format glyphs: 년 월 일 오전 오후 年 月 日 午前 午後 上午 下午 */
