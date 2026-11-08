import { audioLimitMessage } from './audio-limit-message';
import { AudioJobError } from './external-audio-api';
import type { Language } from './i18n';
const errors: Record<Language, string[]> = {
  en: [
    'Enter a valid YouTube link.',
    'Choose a video up to 5 minutes.',
    'The daily or request limit has been reached. Try again later.',
    'Audio is busy. Try again in 30 seconds.',
    'Audio is unavailable. Try another link.',
    'The audio has changed. Your saved chart was kept.',
    'Audio expired. Add the same link to try again.',
    'Audio could not be checked. Your saved chart was kept.',
  ],
  ko: [
    '올바른 YouTube 링크를 입력하세요.',
    '5분 이하의 영상을 선택하세요.',
    '일일 또는 요청 한도에 도달했습니다. 나중에 다시 시도하세요.',
    '다른 음원을 준비 중입니다. 30초 후 다시 시도하세요.',
    '음원을 불러올 수 없습니다. 다른 링크를 시도하세요.',
    '음원이 변경되었습니다. 저장된 채보는 그대로 유지됩니다.',
    '음원이 만료되었습니다. 같은 링크를 다시 추가해 보세요.',
    '음원을 확인할 수 없습니다. 저장된 채보는 그대로 유지됩니다.',
  ],
  zh: [
    '请输入有效的 YouTube 链接。',
    '请选择不超过 5 分钟的视频。',
    '已达到每日或请求限额。请稍后重试。',
    '音频服务正忙。请在 30 秒后重试。',
    '音频不可用。请尝试其他链接。',
    '音频已更改。已保留保存的谱面。',
    '音频已过期。请重新添加相同链接。',
    '无法验证音频。已保留保存的谱面。',
  ],
  ja: [
    '有効な YouTube リンクを入力してください。',
    '5分以内の動画を選んでください。',
    '1日またはリクエストの上限に達しました。後でお試しください。',
    '別の音源を準備中です。30秒後にお試しください。',
    '音源を取得できません。別のリンクをお試しください。',
    '音源が変更されました。保存済みの譜面は保持されます。',
    '音源の期限が切れました。同じリンクを再追加してください。',
    '音源を確認できません。保存済みの譜面は保持されます。',
  ],
  es: [
    'Introduce un enlace válido de YouTube.',
    'Elige un vídeo de hasta 5 minutos.',
    'Se alcanzó el límite diario o de solicitudes. Inténtalo más tarde.',
    'El audio está ocupado. Reinténtalo en 30 segundos.',
    'Audio no disponible. Prueba otro enlace.',
    'El audio cambió. Tu mapa guardado se conserva.',
    'El audio caducó. Añade el mismo enlace de nuevo.',
    'No se pudo verificar el audio. Tu mapa se conserva.',
  ],
  fr: [
    'Saisissez un lien YouTube valide.',
    'Choisissez une vidéo de 5 minutes maximum.',
    'La limite quotidienne ou de requêtes est atteinte. Réessayez plus tard.',
    'Le service audio est occupé. Réessayez dans 30 secondes.',
    'Audio indisponible. Essayez un autre lien.',
    'Le fichier audio a changé. Votre partition est conservée.',
    'Le fichier audio a expiré. Ajoutez à nouveau le même lien.',
    'Vérification audio impossible. Votre partition est conservée.',
  ],
  de: [
    'Gib einen gültigen YouTube-Link ein.',
    'Wähle ein Video mit höchstens 5 Minuten.',
    'Das Tages- oder Anfragelimit wurde erreicht. Versuche es später erneut.',
    'Der Audiodienst ist beschäftigt. Versuche es in 30 Sekunden erneut.',
    'Audio nicht verfügbar. Versuche einen anderen Link.',
    'Das Audio hat sich geändert. Deine Notenkarte bleibt gespeichert.',
    'Das Audio ist abgelaufen. Füge denselben Link erneut hinzu.',
    'Audio konnte nicht geprüft werden. Deine Notenkarte bleibt gespeichert.',
  ],
  pt: [
    'Insira um link válido do YouTube.',
    'Escolha um vídeo de até 5 minutos.',
    'Limite diário ou de pedidos atingido. Tente mais tarde.',
    'O serviço de áudio está ocupado. Tente em 30 segundos.',
    'Áudio indisponível. Tente outro link.',
    'O áudio mudou. Seu mapa salvo foi mantido.',
    'O áudio expirou. Adicione o mesmo link novamente.',
    'Não foi possível verificar o áudio. Seu mapa foi mantido.',
  ],
  it: [
    'Inserisci un link YouTube valido.',
    'Scegli un video di massimo 5 minuti.',
    'Limite giornaliero o di richieste raggiunto. Riprova più tardi.',
    'Il servizio audio è occupato. Riprova tra 30 secondi.',
    'Audio non disponibile. Prova un altro link.',
    'Il file audio è cambiato. La mappa salvata è conservata.',
    'Il file audio è scaduto. Aggiungi di nuovo lo stesso link.',
    'Impossibile verificare il file audio. La mappa è conservata.',
  ],
  ru: [
    'Введите действительную ссылку YouTube.',
    'Выберите видео не длиннее 5 минут.',
    'Достигнут дневной лимит или лимит запросов. Попробуйте позже.',
    'Сервис аудио занят. Повторите через 30 секунд.',
    'Аудио недоступно. Попробуйте другую ссылку.',
    'Аудио изменилось. Сохранённая карта оставлена.',
    'Срок хранения аудио истёк. Добавьте ту же ссылку снова.',
    'Не удалось проверить аудио. Сохранённая карта оставлена.',
  ],
  id: [
    'Masukkan tautan YouTube yang valid.',
    'Pilih video maksimal 5 menit.',
    'Batas harian atau permintaan tercapai. Coba lagi nanti.',
    'Layanan audio sibuk. Coba lagi dalam 30 detik.',
    'Audio tidak tersedia. Coba tautan lain.',
    'Audio berubah. Chart tersimpan tetap dipertahankan.',
    'Audio kedaluwarsa. Tambahkan tautan yang sama lagi.',
    'Audio tidak dapat diperiksa. Chart tersimpan tetap dipertahankan.',
  ],
  tr: [
    'Geçerli bir YouTube bağlantısı girin.',
    'En fazla 5 dakikalık bir video seçin.',
    'Günlük veya istek sınırına ulaşıldı. Daha sonra deneyin.',
    'Ses hizmeti meşgul. 30 saniye sonra deneyin.',
    'Ses kullanılamıyor. Başka bir bağlantı deneyin.',
    'Ses değişti. Kayıtlı nota haritanız korundu.',
    'Sesin süresi doldu. Aynı bağlantıyı yeniden ekleyin.',
    'Ses doğrulanamadı. Kayıtlı nota haritanız korundu.',
  ],
  vi: [
    'Nhập liên kết YouTube hợp lệ.',
    'Chọn video dài tối đa 5 phút.',
    'Đã đạt giới hạn ngày hoặc yêu cầu. Hãy thử lại sau.',
    'Dịch vụ âm thanh đang bận. Hãy thử lại sau 30 giây.',
    'Không có âm thanh. Hãy thử liên kết khác.',
    'Âm thanh đã thay đổi. Bản nhạc đã lưu được giữ nguyên.',
    'Âm thanh đã hết hạn. Hãy thêm lại cùng liên kết.',
    'Không thể kiểm tra âm thanh. Bản nhạc đã lưu được giữ nguyên.',
  ],
};
export function externalError(error: unknown, language: Language) {
  if (
    error instanceof AudioJobError &&
    error.code === 'rate_limited' &&
    error.limit
  )
    return audioLimitMessage(error.limit, language);
  let index = 4;
  if (error instanceof AudioJobError)
    index =
      error.code === 'invalid_url'
        ? 0
        : error.code === 'too_long'
          ? 1
          : error.code === 'rate_limited'
            ? 2
            : error.code === 'unavailable' && error.status === 429
              ? 3
              : error.code === 'source_changed'
                ? 5
                : error.code === 'audio_expired'
                  ? 6
                  : ['integrity_failed', 'unsupported_format'].includes(
                        error.code,
                      )
                    ? 7
                    : 4;
  return errors[language][index];
}
