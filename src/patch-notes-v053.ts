import type { Language } from './i18n';
export const PATCH_V053 = {
  version: '0.2.53',
  date: '2026-11-09',
  notes: {
    en: [
      'Fixed an import timeout that could stop an already prepared YouTube song during download. Download, analysis and saving now have separate limits, with clearer timeout messages and the saved request kept for retry.',
    ],
    ko: [
      'YouTube 음원 준비가 끝났어도 내려받는 도중 시간 초과로 멈출 수 있던 문제를 고쳤습니다. 내려받기, 분석, 저장의 제한 시간을 나누고, 시간 초과 안내와 저장된 요청에서 다시 이어가는 동작을 다듬었습니다.',
    ],
    ja: [
      '準備済みのYouTube曲がダウンロード中に時間切れになる問題を修正しました。ダウンロード、解析、保存の制限時間を分け、案内を改善し、再試行用のリクエストを保持します。',
    ],
    zh: [
      '修复了已准备好的YouTube歌曲在下载时仍可能超时的问题。下载、分析和保存现在分别设有时限，超时提示更清楚，并保留请求以便重试。',
    ],
    es: [
      'Corregido un tiempo de espera que podía detener durante la descarga una canción de YouTube ya preparada. Descarga, análisis y guardado tienen límites separados, mensajes más claros y la solicitud guardada para reintentar.',
    ],
    fr: [
      "Correction d'un délai qui pouvait interrompre le téléchargement d'un morceau YouTube déjà préparé. Téléchargement, analyse et enregistrement ont des limites distinctes, des messages plus clairs et la demande est conservée pour réessayer.",
    ],
    de: [
      'Ein Zeitlimit konnte einen bereits vorbereiteten YouTube-Song beim Download stoppen. Download, Analyse und Speichern haben jetzt getrennte Grenzen, klarere Meldungen und die Anfrage bleibt für einen neuen Versuch gespeichert.',
    ],
    pt: [
      'Corrigido um limite de tempo que podia interromper o download de uma música do YouTube já preparada. Download, análise e salvamento têm limites separados, avisos mais claros e o pedido é mantido para tentar novamente.',
    ],
    it: [
      'Corretto un timeout che poteva interrompere il download di un brano YouTube già pronto. Download, analisi e salvataggio hanno limiti separati, messaggi più chiari e la richiesta viene conservata per riprovare.',
    ],
    ru: [
      'Исправлен тайм-аут, который мог прервать загрузку уже подготовленной песни YouTube. Для загрузки, анализа и сохранения заданы отдельные лимиты; сообщения стали понятнее, а запрос сохраняется для повтора.',
    ],
    id: [
      'Memperbaiki batas waktu yang dapat menghentikan unduhan lagu YouTube yang sudah siap. Unduhan, analisis, dan penyimpanan memiliki batas terpisah, pesan lebih jelas, dan permintaan tersimpan untuk dicoba lagi.',
    ],
    tr: [
      'Hazır bir YouTube şarkısının indirilmesini durdurabilen zaman aşımı düzeltildi. İndirme, analiz ve kaydetme için ayrı sınırlar, daha açık mesajlar ve yeniden denemek için kayıtlı istek korunur.',
    ],
    vi: [
      'Sửa lỗi hết thời gian có thể dừng tải một bài YouTube đã chuẩn bị xong. Tải xuống, phân tích và lưu có giới hạn riêng, thông báo rõ hơn và yêu cầu được giữ lại để thử tiếp.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
