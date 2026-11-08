import type { Language } from './i18n';
export const LIMIT_SCOPES = [
  'ip_10m',
  'ip_day',
  'global_jobs_day',
  'global_writes_day',
] as const;
export type LimitScope = (typeof LIMIT_SCOPES)[number];
export interface AudioLimit {
  limitScope: LimitScope;
  resetAtUnixSec: number;
}
export function readAudioLimit(raw: unknown): AudioLimit | undefined {
  if (!raw || typeof raw !== 'object') return;
  const r = raw as AudioLimit;
  if (
    !LIMIT_SCOPES.includes(r.limitScope) ||
    !Number.isSafeInteger(r.resetAtUnixSec) ||
    r.resetAtUnixSec <= 0 ||
    r.resetAtUnixSec > 8640000000000
  )
    return;
  return { limitScope: r.limitScope, resetAtUnixSec: r.resetAtUnixSec };
}
const labels = {
  en: [
    'Too many requests from this IP in 10 minutes.',
    'This IP has reached its daily request limit.',
    "Today's audio request limit has been reached across the service.",
    "Today's storage-write limit has been reached across the service.",
    'Try again at',
  ],
  ko: [
    '이 IP의 10분 요청 한도에 도달했습니다.',
    '이 IP의 일일 요청 한도에 도달했습니다.',
    '서비스 전체의 오늘 음원 요청 한도에 도달했습니다.',
    '서비스 전체의 오늘 저장 처리 한도에 도달했습니다.',
    '다시 시도할 수 있는 시간:',
  ],
  zh: [
    '此 IP 已达到 10 分钟请求上限。',
    '此 IP 已达到每日请求上限。',
    '服务今日的音频请求总量已达上限。',
    '服务今日的存储写入总量已达上限。',
    '可重试时间：',
  ],
  ja: [
    'このIPの10分間のリクエスト上限に達しました。',
    'このIPの1日のリクエスト上限に達しました。',
    'サービス全体の本日の音源リクエスト上限に達しました。',
    'サービス全体の本日の保存処理上限に達しました。',
    '再試行できる時刻：',
  ],
  es: [
    'Se alcanzó el límite de solicitudes de esta IP en 10 minutos.',
    'Se alcanzó el límite diario de solicitudes de esta IP.',
    'Se alcanzó el límite diario de solicitudes de audio del servicio.',
    'Se alcanzó el límite diario de escritura del servicio.',
    'Vuelve a intentarlo a las',
  ],
  fr: [
    'La limite de requêtes de cette IP sur 10 minutes est atteinte.',
    'La limite quotidienne de requêtes de cette IP est atteinte.',
    'La limite quotidienne de requêtes audio du service est atteinte.',
    'La limite quotidienne des écritures du service est atteinte.',
    'Réessayez à',
  ],
  de: [
    'Das Anfragelimit dieser IP für 10 Minuten ist erreicht.',
    'Das tägliche Anfragelimit dieser IP ist erreicht.',
    'Das tägliche Audio-Anfragelimit des Dienstes ist erreicht.',
    'Das tägliche Speicher-Schreiblimit des Dienstes ist erreicht.',
    'Erneut versuchen ab',
  ],
  pt: [
    'Esta IP atingiu o limite de pedidos em 10 minutos.',
    'Esta IP atingiu o limite diário de pedidos.',
    'O serviço atingiu o limite diário de pedidos de áudio.',
    'O serviço atingiu o limite diário de gravações no armazenamento.',
    'Tente novamente às',
  ],
  it: [
    'Questa IP ha raggiunto il limite di richieste in 10 minuti.',
    'Questa IP ha raggiunto il limite giornaliero di richieste.',
    'Il servizio ha raggiunto il limite giornaliero di richieste audio.',
    'Il servizio ha raggiunto il limite giornaliero di scritture.',
    'Riprova alle',
  ],
  ru: [
    'Достигнут лимит запросов с этого IP за 10 минут.',
    'Достигнут суточный лимит запросов с этого IP.',
    'Достигнут суточный лимит аудиозапросов всего сервиса.',
    'Достигнут суточный лимит записей в хранилище сервиса.',
    'Повторить можно в',
  ],
  id: [
    'Batas permintaan IP ini dalam 10 menit tercapai.',
    'Batas permintaan harian IP ini tercapai.',
    'Batas permintaan audio harian seluruh layanan tercapai.',
    'Batas penulisan penyimpanan harian seluruh layanan tercapai.',
    'Coba lagi pada',
  ],
  tr: [
    'Bu IP için 10 dakikalık istek sınırına ulaşıldı.',
    'Bu IP için günlük istek sınırına ulaşıldı.',
    'Hizmetin günlük ses isteği sınırına ulaşıldı.',
    'Hizmetin günlük depolama yazma sınırına ulaşıldı.',
    'Tekrar deneme zamanı:',
  ],
  vi: [
    'IP này đã đạt giới hạn yêu cầu trong 10 phút.',
    'IP này đã đạt giới hạn yêu cầu hằng ngày.',
    'Toàn dịch vụ đã đạt giới hạn yêu cầu âm thanh hôm nay.',
    'Toàn dịch vụ đã đạt giới hạn ghi lưu trữ hôm nay.',
    'Có thể thử lại lúc',
  ],
} satisfies Record<Language, string[]>;
export function audioLimitMessage(limit: AudioLimit, language: Language) {
  const text = labels[language],
    i = LIMIT_SCOPES.indexOf(limit.limitScope);
  const reset = new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(limit.resetAtUnixSec * 1000));
  return `${text[i]} ${text[4]} ${reset}`;
}
