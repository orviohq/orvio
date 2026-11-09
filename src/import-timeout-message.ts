import type { Language } from './i18n';
import type { AudioFailureStage } from './external-audio-api';
import { importStageLabel } from './import-progress';
const copy: Record<Language, string> = {
  en: 'This step took too long. Retry to continue the saved request. No new request was sent automatically.',
  ko: '이 단계가 제한 시간 안에 끝나지 않았습니다. 다시 시도하면 저장된 요청에서 이어갑니다. 새 요청을 자동으로 보내지는 않았습니다.',
  zh: '此步骤未在时限内完成。重试将继续已保存的请求。未自动发送新请求。',
  ja: 'この段階が制限時間内に終わりませんでした。再試行すると保存済みリクエストから続行します。新しいリクエストは自動送信していません。',
  es: 'Este paso tardó demasiado. Reintenta para continuar la solicitud guardada. No se envió otra solicitud automáticamente.',
  fr: 'Cette étape a pris trop de temps. Réessayez pour continuer la demande enregistrée. Aucune nouvelle demande automatique.',
  de: 'Dieser Schritt dauerte zu lange. Erneut versuchen, um die gespeicherte Anfrage fortzusetzen. Keine neue automatische Anfrage.',
  pt: 'Esta etapa demorou demais. Tente novamente para continuar o pedido salvo. Nenhum novo pedido automático.',
  it: 'Questo passaggio ha richiesto troppo tempo. Riprova per continuare la richiesta salvata. Nessuna nuova richiesta automatica.',
  ru: 'Этот этап занял слишком много времени. Повторите, чтобы продолжить сохранённый запрос. Новый запрос автоматически не отправлен.',
  id: 'Tahap ini terlalu lama. Coba lagi untuk melanjutkan permintaan tersimpan. Tidak ada permintaan baru otomatis.',
  tr: 'Bu adım çok uzun sürdü. Kayıtlı isteğe devam etmek için tekrar deneyin. Otomatik yeni istek gönderilmedi.',
  vi: 'Bước này mất quá nhiều thời gian. Thử lại để tiếp tục yêu cầu đã lưu. Không tự gửi yêu cầu mới.',
};
export function importCompletionTimeout(
  stage: AudioFailureStage,
  language: Language,
) {
  const label =
    stage === 'response'
      ? 'downloading'
      : stage === 'analysis'
        ? 'charting'
        : 'saving';
  return importStageLabel(label, language) + ' ' + copy[language];
}
