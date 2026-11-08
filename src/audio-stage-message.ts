import type { Language } from './i18n';
import type { AudioFailureStage } from './external-audio-api';
const copy: Record<Language, string[]> = {
  en: [
    'The audio service could not prepare this song. No new request was sent automatically.',
    'The audio service returned a response this app could not use. No new request was sent automatically.',
    'This browser could not analyze the audio. No new request was sent automatically.',
    'This browser could not read or save the song. Check browser storage space and permissions.',
    'This song could not be prepared. The cause could not be confirmed. No new request was sent automatically.',
  ],
  ko: [
    '음원 서비스에서 이 곡을 준비하지 못했습니다. 새 요청을 자동으로 보내지는 않았습니다.',
    '음원 서비스의 응답을 처리할 수 없었습니다. 새 요청을 자동으로 보내지는 않았습니다.',
    '이 브라우저에서 음원 분석을 완료하지 못했습니다. 새 요청을 자동으로 보내지는 않았습니다.',
    '이 브라우저에서 곡을 읽거나 저장하지 못했습니다. 브라우저 저장 공간과 저장 권한을 확인하세요.',
    '곡 준비를 완료하지 못했습니다. 원인은 확인되지 않았습니다. 새 요청을 자동으로 보내지는 않았습니다.',
  ],
  ja: [
    '音源サービスでこの曲を準備できませんでした。新しいリクエストは自動送信していません。',
    '音源サービスの応答を処理できませんでした。新しいリクエストは自動送信していません。',
    'このブラウザで音源の解析を完了できませんでした。新しいリクエストは自動送信していません。',
    'このブラウザで曲を読み込み、または保存できませんでした。空き容量と保存権限を確認してください。',
    '曲の準備を完了できませんでした。原因は未確認です。新しいリクエストは自動送信していません。',
  ],
  zh: [
    '音源服务未能准备这首歌曲。未自动发送新请求。',
    '无法处理音源服务的响应。未自动发送新请求。',
    '此浏览器未能完成音源分析。未自动发送新请求。',
    '此浏览器无法读取或保存歌曲。请检查浏览器存储空间和权限。',
    '未能完成歌曲准备。原因尚未确认。未自动发送新请求。',
  ],
  es: [
    'El servicio de audio no pudo preparar esta canción. No se envió otra solicitud automáticamente.',
    'No se pudo procesar la respuesta del servicio de audio. No se envió otra solicitud automáticamente.',
    'Este navegador no pudo analizar el audio. No se envió otra solicitud automáticamente.',
    'Este navegador no pudo leer o guardar la canción. Revisa el espacio y los permisos de almacenamiento.',
    'No se pudo preparar la canción. La causa no está confirmada. No se envió otra solicitud automáticamente.',
  ],
  fr: [
    "Le service audio n'a pas pu préparer ce morceau. Aucune nouvelle demande automatique.",
    "La réponse du service audio n'a pas pu être traitée. Aucune nouvelle demande automatique.",
    "Ce navigateur n'a pas pu analyser l'audio. Aucune nouvelle demande automatique.",
    "Ce navigateur n'a pas pu lire ou enregistrer le morceau. Vérifiez l'espace et les autorisations de stockage.",
    'La préparation du morceau a échoué. La cause reste inconnue. Aucune nouvelle demande automatique.',
  ],
  de: [
    'Der Audiodienst konnte diesen Song nicht vorbereiten. Keine neue automatische Anfrage.',
    'Die Antwort des Audiodienstes konnte nicht verarbeitet werden. Keine neue automatische Anfrage.',
    'Dieser Browser konnte das Audio nicht analysieren. Keine neue automatische Anfrage.',
    'Dieser Browser konnte den Song nicht lesen oder speichern. Speicherplatz und Berechtigungen prüfen.',
    'Der Song konnte nicht vorbereitet werden. Die Ursache ist nicht bestätigt. Keine neue automatische Anfrage.',
  ],
  pt: [
    'O serviço de áudio não conseguiu preparar esta música. Nenhum novo pedido automático.',
    'Não foi possível processar a resposta do serviço de áudio. Nenhum novo pedido automático.',
    'Este navegador não conseguiu analisar o áudio. Nenhum novo pedido automático.',
    'Este navegador não conseguiu ler ou salvar a música. Verifique o espaço e as permissões de armazenamento.',
    'Não foi possível preparar a música. A causa não foi confirmada. Nenhum novo pedido automático.',
  ],
  it: [
    'Il servizio audio non ha potuto preparare questo brano. Nessuna nuova richiesta automatica.',
    'Impossibile elaborare la risposta del servizio audio. Nessuna nuova richiesta automatica.',
    "Questo browser non ha potuto analizzare l'audio. Nessuna nuova richiesta automatica.",
    'Questo browser non ha potuto leggere o salvare il brano. Controlla spazio e permessi di archiviazione.',
    'Impossibile preparare il brano. La causa non è confermata. Nessuna nuova richiesta automatica.',
  ],
  ru: [
    'Аудиосервис не смог подготовить эту песню. Новый запрос автоматически не отправлен.',
    'Не удалось обработать ответ аудиосервиса. Новый запрос автоматически не отправлен.',
    'Браузер не смог проанализировать аудио. Новый запрос автоматически не отправлен.',
    'Браузер не смог прочитать или сохранить песню. Проверьте место и разрешения хранилища.',
    'Не удалось подготовить песню. Причина не подтверждена. Новый запрос автоматически не отправлен.',
  ],
  id: [
    'Layanan audio tidak dapat menyiapkan lagu ini. Tidak ada permintaan baru otomatis.',
    'Respons layanan audio tidak dapat diproses. Tidak ada permintaan baru otomatis.',
    'Browser ini tidak dapat menganalisis audio. Tidak ada permintaan baru otomatis.',
    'Browser ini tidak dapat membaca atau menyimpan lagu. Periksa ruang dan izin penyimpanan.',
    'Lagu tidak dapat disiapkan. Penyebab belum dipastikan. Tidak ada permintaan baru otomatis.',
  ],
  tr: [
    'Ses hizmeti bu şarkıyı hazırlayamadı. Otomatik yeni istek gönderilmedi.',
    'Ses hizmetinin yanıtı işlenemedi. Otomatik yeni istek gönderilmedi.',
    'Bu tarayıcı sesi analiz edemedi. Otomatik yeni istek gönderilmedi.',
    'Bu tarayıcı şarkıyı okuyamadı veya kaydedemedi. Depolama alanını ve izinlerini kontrol edin.',
    'Şarkı hazırlanamadı. Neden doğrulanamadı. Otomatik yeni istek gönderilmedi.',
  ],
  vi: [
    'Dịch vụ âm thanh không thể chuẩn bị bài này. Không tự gửi yêu cầu mới.',
    'Không thể xử lý phản hồi từ dịch vụ âm thanh. Không tự gửi yêu cầu mới.',
    'Trình duyệt này không thể phân tích âm thanh. Không tự gửi yêu cầu mới.',
    'Trình duyệt này không thể đọc hoặc lưu bài. Kiểm tra dung lượng và quyền lưu trữ.',
    'Không thể chuẩn bị bài. Chưa xác nhận được nguyên nhân. Không tự gửi yêu cầu mới.',
  ],
};
export function audioStageMessage(
  stage: AudioFailureStage | undefined,
  language: Language,
) {
  return copy[language][
    stage === 'service'
      ? 0
      : stage === 'response'
        ? 1
        : stage === 'analysis'
          ? 2
          : stage === 'storage'
            ? 3
            : 4
  ];
}
