import { describe, expect, it } from 'vitest';
import { LANGUAGES, type Language } from '../src/i18n';
import { AudioJobError, type AudioFailureStage } from '../src/external-audio-api';
import { audioFailureMessage } from '../src/audio-failure-message';
import { externalError } from '../src/external-errors';

const languages = Object.keys(LANGUAGES) as Language[];
const stages: readonly (AudioFailureStage | undefined)[] = [
  undefined,
  'service',
  'response',
  'analysis',
  'storage',
  'browser',
];

const network: Record<Language, string> = {
  en: 'No response was received from the audio service. Please try the same link again shortly. A new request is not sent automatically.',
  ko: '음원 서비스에서 응답을 받지 못했습니다. 잠시 후 같은 링크로 다시 시도해 주세요. 자동으로 새 요청을 보내지 않습니다.',
  zh: '未收到音频服务的响应。请稍后用同一链接重试。不会自动发送新请求。',
  ja: '音源サービスから応答がありませんでした。しばらくしてから同じリンクで再度お試しください。新しいリクエストは自動で送信されません。',
  es: 'No se recibió respuesta del servicio de audio. Prueba el mismo enlace de nuevo en un momento. No se envía una nueva solicitud automáticamente.',
  fr: 'Aucune réponse n’a été reçue du service audio. Réessayez le même lien dans un instant. Aucune nouvelle demande n’est envoyée automatiquement.',
  de: 'Vom Audiodienst wurde keine Antwort erhalten. Versuche denselben Link gleich noch einmal. Eine neue Anfrage wird nicht automatisch gesendet.',
  pt: 'Nenhuma resposta foi recebida do serviço de áudio. Tente o mesmo link novamente em instantes. Não é enviado um novo pedido automaticamente.',
  it: 'Nessuna risposta ricevuta dal servizio audio. Riprova lo stesso link tra poco. Nessuna nuova richiesta viene inviata automaticamente.',
  ru: 'Ответ от аудиосервиса не получен. Повторите ту же ссылку чуть позже. Новый запрос не отправляется автоматически.',
  id: 'Tidak ada respons yang diterima dari layanan audio. Coba lagi tautan yang sama sebentar lagi. Permintaan baru tidak dikirim secara otomatis.',
  tr: 'Ses hizmetinden yanıt alınamadı. Aynı bağlantıyı birazdan yeniden deneyin. Otomatik olarak yeni istek gönderilmez.',
  vi: 'Không nhận được phản hồi từ dịch vụ âm thanh. Hãy thử lại cùng liên kết sau một lát. Không tự động gửi yêu cầu mới.',
};

const other: Record<Language, string[]> = {
  en: [
    'Audio preparation failed, but the service did not provide a specific cause. Open the video on YouTube to check it is playable; if it plays, try this link again later. No automatic retry is made.',
    'The service reported a regional restriction. Check whether this video plays on YouTube in your region; use an accessible version you have permission to use.',
    'This audio request could not be found. Add the same link again to create a new request.',
    'The returned audio format is not supported. Your saved chart is unchanged; try preparing the same link again later.',
    'The downloaded audio did not pass its integrity check and was not used. Your saved chart is unchanged; check your connection and try again.',
    'Audio preparation did not finish within 90 seconds. It may still be running; wait before submitting the same link again.',
  ],
  ko: [
    '음원 준비에 실패했지만 서비스가 구체적인 원인을 알려주지 않았습니다. YouTube에서 영상이 재생되는지 확인하세요. 재생된다면 잠시 뒤 같은 링크로 다시 시도하세요. 자동으로 재요청하지는 않습니다.',
    '서비스에서 지역 제한을 알렸습니다. 현재 지역의 YouTube에서 영상이 재생되는지 확인하고, 사용 권한이 있는 재생 가능한 버전을 선택하세요.',
    '이 음원 요청을 찾을 수 없습니다. 같은 링크를 다시 추가해 새로 요청하세요.',
    '받은 음원 형식을 지원하지 않습니다. 저장된 채보는 유지됩니다. 잠시 뒤 같은 링크의 음원 준비를 다시 시도하세요.',
    '받은 음원이 무결성 검사를 통과하지 못해 사용하지 않았습니다. 저장된 채보는 유지됩니다. 연결 상태를 확인하고 다시 시도하세요.',
    '90초 안에 음원 준비가 끝나지 않았습니다. 서버에서 준비 중일 수 있으니 잠시 기다린 뒤 같은 링크를 다시 요청하세요.',
  ],
  zh: [
    '音频准备失败，但服务未提供具体原因。请先在 YouTube 检查视频能否播放；若能播放，请稍后重试同一链接。不会自动重试。',
    '服务报告地区限制。请检查视频在当地 YouTube 能否播放，并选择有权使用且可播放的版本。',
    '找不到此音频请求。请重新添加相同链接以创建新请求。',
    '收到的音频格式不受支持。已保存的谱面不变；请稍后重新准备相同链接。',
    '下载的音频未通过完整性检查，未被使用。已保存的谱面不变；请检查网络后重试。',
    '音频准备在90秒内未完成，服务器可能仍在处理。请先等待，再重新提交相同链接。',
  ],
  ja: [
    '音源の準備に失敗しましたが、サービスから詳しい原因は届いていません。YouTubeで再生できるか確認し、再生できる場合は後ほど同じリンクをお試しください。自動再送はしません。',
    'サービスが地域制限を報告しました。現在の地域のYouTubeで再生できるか確認し、使用許可のある再生可能な版を選んでください。',
    'この音源リクエストが見つかりません。同じリンクを追加して再リクエストしてください。',
    '受信した音源形式に対応していません。保存済み譜面は保持されます。後ほど同じリンクをお試しください。',
    '受信した音源が整合性検査に通らず使用されませんでした。保存済み譜面は保持されます。接続を確認して再試行してください。',
    '90秒以内に音源の準備が終わりませんでした。サーバーで処理中の可能性があります。少し待ってから同じリンクを再送してください。',
  ],
  es: [
    'La preparación falló sin una causa concreta del servicio. Comprueba si el vídeo se reproduce en YouTube; si funciona, prueba este enlace más tarde. No se reintenta automáticamente.',
    'El servicio indicó una restricción regional. Comprueba YouTube en tu región y elige una versión accesible que tengas permiso para usar.',
    'No se encontró esta solicitud de audio. Añade el mismo enlace para crear otra.',
    'El formato recibido no es compatible. Tu mapa se conserva; prueba el mismo enlace más tarde.',
    'El audio no pasó la comprobación de integridad y no se usó. Tu mapa se conserva; comprueba la conexión y reintenta.',
    'La preparación no terminó en 90 segundos. Puede seguir en curso; espera antes de volver a enviar el enlace.',
  ],
  fr: [
    'La préparation a échoué sans cause précise fournie par le service. Vérifiez la lecture sur YouTube ; si elle fonctionne, réessayez ce lien plus tard. Aucun nouvel essai automatique.',
    'Le service signale une restriction régionale. Vérifiez YouTube dans votre région et choisissez une version accessible dont vous avez les droits.',
    'Cette demande audio est introuvable. Ajoutez le même lien pour créer une nouvelle demande.',
    'Le format reçu est incompatible. Votre partition est conservée ; réessayez ce lien plus tard.',
    'Le fichier a échoué au contrôle d’intégrité et n’a pas été utilisé. Votre partition est conservée ; vérifiez la connexion et réessayez.',
    'La préparation dépasse 90 secondes. Elle peut encore être en cours ; patientez avant de renvoyer le lien.',
  ],
  de: [
    'Die Vorbereitung ist fehlgeschlagen, ohne dass der Dienst einen genauen Grund nannte. Prüfe die Wiedergabe auf YouTube. Funktioniert sie, versuche diesen Link später erneut. Kein automatischer Neuversuch.',
    'Der Dienst meldet eine regionale Sperre. Prüfe YouTube in deiner Region und wähle eine zugängliche Version, die du verwenden darfst.',
    'Diese Audioanfrage wurde nicht gefunden. Füge denselben Link für eine neue Anfrage hinzu.',
    'Das empfangene Audioformat wird nicht unterstützt. Deine Notenkarte bleibt erhalten; versuche denselben Link später erneut.',
    'Das Audio hat die Integritätsprüfung nicht bestanden und wurde nicht verwendet. Deine Notenkarte bleibt erhalten; prüfe die Verbindung und versuche es erneut.',
    'Die Vorbereitung dauerte länger als 90 Sekunden. Sie läuft möglicherweise noch; warte vor einer erneuten Anfrage.',
  ],
  pt: [
    'A preparação falhou sem motivo específico informado pelo serviço. Verifique se o vídeo toca no YouTube; se tocar, tente este link mais tarde. Sem nova tentativa automática.',
    'O serviço informou uma restrição regional. Verifique o YouTube na sua região e escolha uma versão acessível que tenha permissão para usar.',
    'Este pedido de áudio não foi encontrado. Adicione o mesmo link para criar outro.',
    'O formato recebido não é compatível. Seu mapa foi mantido; tente o mesmo link mais tarde.',
    'O áudio falhou na verificação de integridade e não foi usado. Seu mapa foi mantido; verifique a conexão e tente novamente.',
    'A preparação não terminou em 90 segundos. Pode continuar em andamento; aguarde antes de reenviar o link.',
  ],
  it: [
    'Preparazione non riuscita senza una causa specifica dal servizio. Verifica la riproduzione su YouTube; se funziona, riprova questo link più tardi. Nessun nuovo tentativo automatico.',
    'Il servizio segnala una restrizione regionale. Controlla YouTube nella tua regione e scegli una versione accessibile che puoi usare.',
    'Questa richiesta audio non è stata trovata. Aggiungi lo stesso link per crearne una nuova.',
    'Il formato ricevuto non è supportato. La mappa è conservata; riprova lo stesso link più tardi.',
    'Il file non ha superato il controllo di integrità e non è stato usato. La mappa è conservata; controlla la connessione e riprova.',
    'La preparazione non è terminata entro 90 secondi. Potrebbe essere ancora in corso; attendi prima di inviare di nuovo il link.',
  ],
  ru: [
    'Подготовка аудио не удалась, но сервис не сообщил точную причину. Проверьте воспроизведение на YouTube; если оно работает, повторите эту ссылку позже. Автоматического повтора нет.',
    'Сервис сообщил о региональном ограничении. Проверьте YouTube в своём регионе и выберите доступную версию, которую вам разрешено использовать.',
    'Этот запрос аудио не найден. Добавьте ту же ссылку для нового запроса.',
    'Полученный формат не поддерживается. Сохранённая карта не изменена; повторите ту же ссылку позже.',
    'Аудио не прошло проверку целостности и не использовалось. Карта сохранена; проверьте соединение и повторите.',
    'Подготовка не завершилась за 90 секунд. Она может ещё продолжаться; подождите перед повторной отправкой ссылки.',
  ],
  id: [
    'Persiapan audio gagal tanpa penyebab khusus dari layanan. Periksa apakah video dapat diputar di YouTube; jika bisa, coba tautan ini nanti. Tidak ada percobaan ulang otomatis.',
    'Layanan melaporkan batas wilayah. Periksa YouTube di wilayah Anda dan pilih versi yang dapat diakses serta boleh Anda gunakan.',
    'Permintaan audio ini tidak ditemukan. Tambahkan tautan yang sama untuk membuat permintaan baru.',
    'Format audio yang diterima tidak didukung. Chart tersimpan tidak berubah; coba tautan yang sama nanti.',
    'Audio gagal pemeriksaan integritas dan tidak digunakan. Chart tersimpan tidak berubah; periksa koneksi lalu coba lagi.',
    'Persiapan belum selesai dalam 90 detik. Proses mungkin masih berjalan; tunggu sebelum mengirim tautan yang sama lagi.',
  ],
  tr: [
    'Ses hazırlığı başarısız oldu ancak hizmet kesin neden bildirmedi. Videonun YouTube’da oynadığını kontrol edin; oynuyorsa aynı bağlantıyı daha sonra deneyin. Otomatik yeniden deneme yapılmaz.',
    'Hizmet bölgesel kısıtlama bildirdi. Bölgenizde YouTube oynatımını kontrol edin ve kullanma izniniz olan erişilebilir bir sürüm seçin.',
    'Bu ses isteği bulunamadı. Yeni istek için aynı bağlantıyı ekleyin.',
    'Gelen ses biçimi desteklenmiyor. Kayıtlı haritanız korunur; aynı bağlantıyı daha sonra deneyin.',
    'Ses bütünlük kontrolünü geçmedi ve kullanılmadı. Kayıtlı haritanız korunur; bağlantıyı kontrol edip yeniden deneyin.',
    'Ses hazırlığı 90 saniyede bitmedi. İşlem sürüyor olabilir; aynı bağlantıyı yeniden göndermeden önce bekleyin.',
  ],
  vi: [
    'Chuẩn bị âm thanh thất bại nhưng dịch vụ không cung cấp nguyên nhân cụ thể. Kiểm tra video có phát trên YouTube không; nếu có, thử lại liên kết này sau. Không tự động thử lại.',
    'Dịch vụ báo hạn chế khu vực. Kiểm tra YouTube tại khu vực của bạn và chọn bản có thể truy cập mà bạn được phép dùng.',
    'Không tìm thấy yêu cầu âm thanh này. Thêm lại cùng liên kết để tạo yêu cầu mới.',
    'Định dạng nhận được không được hỗ trợ. Bản nhạc đã lưu không đổi; thử lại cùng liên kết sau.',
    'Âm thanh không qua kiểm tra tính toàn vẹn và không được dùng. Bản nhạc đã lưu không đổi; kiểm tra kết nối rồi thử lại.',
    'Chuẩn bị chưa xong trong 90 giây. Máy chủ có thể vẫn xử lý; hãy đợi trước khi gửi lại liên kết.',
  ],
};

const otherCodes = [
  'unavailable',
  'region_blocked',
  'not_found',
  'unsupported_format',
  'integrity_failed',
  'request_timeout',
] as const;

describe('audio network failure copy', () => {
  it('uses the service-no-response wording in all 13 languages at every stage', () => {
    expect(languages).toHaveLength(13);
    for (const language of languages) {
      for (const stage of stages) {
        const error = new AudioJobError(
          'network_error',
          undefined,
          undefined,
          undefined,
          stage,
        );
        expect(externalError(error, language)).toBe(network[language]);
        expect(audioFailureMessage('network_error', language)).toBe(
          network[language],
        );
      }
    }
  });

  it('never blames the user internet connection', () => {
    const blame =
      /인터넷|internet|네트 ?워크|网络连接|ネット接続|kết nối mạng|интернет/i;
    for (const language of languages)
      expect(network[language]).not.toMatch(blame);
  });

  it('leaves every other failure-code copy unchanged', () => {
    for (const language of languages) {
      otherCodes.forEach((code, index) => {
        expect(audioFailureMessage(code, language)).toBe(
          other[language][index],
        );
        expect(audioFailureMessage(code, language)).not.toBe(
          network[language],
        );
      });
    }
  });
});
