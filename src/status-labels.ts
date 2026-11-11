import type { Language } from './i18n';
import { healthReason, type HealthReason } from './status-reason-codes';

const en = {
  statusTitle: 'Service status',
  statusOverall: 'Overall status',
  statusAllOperational: 'All systems operational',
  statusIssueDetected: 'A problem was detected in some systems',
  statusPartiallyVerified: 'Some systems have not been verified',
  statusProbeNote:
    'Checks run live from your browser against the public site and share API; the transcription provider is not probed.',
  statusMonitorPrefix: 'Shared monitor',
  statusBrowserPrefix: 'This browser',
  statusStale: 'stale',
  statusMonitorNote:
    'Shared hourly CI monitor plus live checks from your browser; the transcription provider is not probed.',
  statusWebsite: 'Website',
  statusApi: 'Share & processing API',
  statusProvider: 'Transcription provider',
  statusNotMonitored: 'Not monitored',
  statusWebsiteDetail: 'Static assets respond from this browser',
  statusApiDetail: 'API responds; actual function is not verified from the browser',
  statusApiUnreachable: 'Cannot reach the API',
  statusProviderDetail: 'The external transcription provider is not probed directly by this page',
  statusVersion: 'App version',
  statusHealthy: 'Available',
  statusReachable: 'Responding',
  statusDegraded: 'Problem detected',
  statusUnknown: 'Not confirmed',
  statusCheckedAt: 'Checked at',
  statusRefresh: 'Check again',
  statusLastFailure: 'Last recorded failure',
  statusNoFailure: 'No failure recorded on this device',
};
type Words = typeof en;
const ko: Words = {
  statusTitle: '서비스 상태',
  statusOverall: '전체 상태',
  statusAllOperational: '모든 시스템 정상 운영 중',
  statusIssueDetected: '일부 시스템에 문제가 감지되었습니다',
  statusPartiallyVerified: '일부 기능은 아직 확인되지 않았습니다',
  statusProbeNote:
    '이 페이지는 현재 브라우저에서 공개 사이트와 공유 API를 실시간으로 확인하며, 전사 공급자는 직접 점검하지 않습니다',
  statusMonitorPrefix: '공유 모니터',
  statusBrowserPrefix: '이 브라우저',
  statusStale: '오래됨',
  statusMonitorNote:
    '시간별 공유 CI 모니터와 이 브라우저의 실시간 확인 결과이며, 전사 공급자는 직접 점검하지 않습니다',
  statusWebsite: '웹사이트',
  statusApi: '공유·처리 API',
  statusProvider: '전사 공급자',
  statusNotMonitored: '점검 대상 아님',
  statusWebsiteDetail: '이 브라우저에서 정적 자산 응답 확인',
  statusApiDetail: 'API가 응답하지만 실제 기능은 브라우저에서 검증하지 않습니다',
  statusApiUnreachable: 'API에 연결할 수 없습니다',
  statusProviderDetail: '외부 전사 공급자는 이 페이지에서 직접 점검하지 않습니다',
  statusVersion: '앱 버전',
  statusHealthy: '사용 가능',
  statusReachable: '응답 중',
  statusDegraded: '문제 감지',
  statusUnknown: '확인되지 않음',
  statusCheckedAt: '확인 시각',
  statusRefresh: '다시 확인',
  statusLastFailure: '마지막으로 기록된 오류',
  statusNoFailure: '이 기기에 기록된 오류가 없어요',
};
const zh: Words = {
  statusTitle: '服务状态',
  statusOverall: '整体状态',
  statusAllOperational: '所有系统运行正常',
  statusIssueDetected: '部分系统检测到问题',
  statusPartiallyVerified: '部分系统尚未验证',
  statusProbeNote:
    '本页面从您的浏览器实时检测公开网站与共享 API，不直接检测转录服务提供方',
  statusMonitorPrefix: '共享监控',
  statusBrowserPrefix: '此浏览器',
  statusStale: '已过期',
  statusMonitorNote:
    '每小时共享 CI 监控加您浏览器的实时检测，不直接检测转录服务提供方',
  statusWebsite: '网站',
  statusApi: '共享与处理 API',
  statusProvider: '转录服务提供方',
  statusNotMonitored: '未监控',
  statusWebsiteDetail: '静态资源可从此浏览器访问',
  statusApiDetail: 'API 有响应，但浏览器无法验证实际功能',
  statusApiUnreachable: '无法连接到 API',
  statusProviderDetail: '本页面不直接检测外部转录服务提供方',
  statusVersion: '应用版本',
  statusHealthy: '可用',
  statusReachable: '有响应',
  statusDegraded: '发现问题',
  statusUnknown: '尚未确认',
  statusCheckedAt: '检查时间',
  statusRefresh: '重新检查',
  statusLastFailure: '最近记录的错误',
  statusNoFailure: '此设备没有错误记录',
};
const ja: Words = {
  statusTitle: 'サービスステータス',
  statusOverall: '総合ステータス',
  statusAllOperational: 'すべてのシステムは正常に動作しています',
  statusIssueDetected: '一部のシステムで問題が検出されました',
  statusPartiallyVerified: '一部のシステムはまだ確認されていません',
  statusProbeNote:
    'このページはブラウザから公開サイトと共有APIをリアルタイムで確認し、文字起こしプロバイダーは直接確認しません',
  statusMonitorPrefix: '共有モニター',
  statusBrowserPrefix: 'このブラウザ',
  statusStale: '期限切れ',
  statusMonitorNote:
    '1時間ごとの共有CIモニターとこのブラウザのライブチェック。文字起こしプロバイダーは直接確認しません',
  statusWebsite: 'ウェブサイト',
  statusApi: '共有・処理API',
  statusProvider: '文字起こしプロバイダー',
  statusNotMonitored: '監視対象外',
  statusWebsiteDetail: 'このブラウザから静的アセットが応答しています',
  statusApiDetail: 'APIは応答していますが、実際の機能はブラウザからは検証されません',
  statusApiUnreachable: 'APIに接続できません',
  statusProviderDetail: '外部の文字起こしプロバイダーはこのページからは直接確認しません',
  statusVersion: 'アプリのバージョン',
  statusHealthy: '利用可能',
  statusReachable: '応答あり',
  statusDegraded: '問題を検出',
  statusUnknown: '未確認',
  statusCheckedAt: '確認時刻',
  statusRefresh: '再確認',
  statusLastFailure: '最後に記録されたエラー',
  statusNoFailure: 'この端末にエラーの記録はありません',
};
const es: Words = {
  statusTitle: 'Estado del servicio',
  statusOverall: 'Estado general',
  statusAllOperational: 'Todos los sistemas funcionan con normalidad',
  statusIssueDetected: 'Se detectó un problema en algunos sistemas',
  statusPartiallyVerified: 'Algunos sistemas no se han verificado',
  statusProbeNote:
    'Las comprobaciones se ejecutan en vivo desde tu navegador contra el sitio público y la API de compartición; el proveedor de transcripción no se comprueba',
  statusMonitorPrefix: 'Monitor compartido',
  statusBrowserPrefix: 'Este navegador',
  statusStale: 'obsoleto',
  statusMonitorNote:
    'Monitor CI compartido por hora más comprobaciones en vivo desde tu navegador; el proveedor de transcripción no se comprueba',
  statusWebsite: 'Sitio web',
  statusApi: 'API de compartición y procesamiento',
  statusProvider: 'Proveedor de transcripción',
  statusNotMonitored: 'Sin supervisión',
  statusWebsiteDetail: 'Los recursos estáticos responden desde este navegador',
  statusApiDetail: 'La API responde; la función real no se verifica desde el navegador',
  statusApiUnreachable: 'No se puede conectar con la API',
  statusProviderDetail: 'Esta página no comprueba directamente el proveedor externo de transcripción',
  statusVersion: 'Versión de la aplicación',
  statusHealthy: 'Disponible',
  statusReachable: 'Responde',
  statusDegraded: 'Problema detectado',
  statusUnknown: 'Sin confirmar',
  statusCheckedAt: 'Hora de comprobación',
  statusRefresh: 'Comprobar de nuevo',
  statusLastFailure: 'Último error registrado',
  statusNoFailure: 'No hay errores registrados en este dispositivo',
};
const fr: Words = {
  statusTitle: 'État du service',
  statusOverall: 'État général',
  statusAllOperational: 'Tous les systèmes fonctionnent normalement',
  statusIssueDetected: 'Un problème a été détecté sur certains systèmes',
  statusPartiallyVerified: 'Certains systèmes n’ont pas été vérifiés',
  statusProbeNote:
    'Les vérifications sont exécutées en direct depuis votre navigateur sur le site public et l’API de partage ; le fournisseur de transcription n’est pas vérifié',
  statusMonitorPrefix: 'Moniteur partagé',
  statusBrowserPrefix: 'Ce navigateur',
  statusStale: 'obsolète',
  statusMonitorNote:
    'Moniteur CI partagé horaire plus vérifications en direct depuis votre navigateur ; le fournisseur de transcription n’est pas vérifié',
  statusWebsite: 'Site web',
  statusApi: 'API de partage et de traitement',
  statusProvider: 'Fournisseur de transcription',
  statusNotMonitored: 'Non surveillé',
  statusWebsiteDetail: 'Les ressources statiques répondent depuis ce navigateur',
  statusApiDetail: 'L’API répond ; la fonction réelle n’est pas vérifiée depuis le navigateur',
  statusApiUnreachable: 'Impossible de joindre l’API',
  statusProviderDetail: 'Le fournisseur externe de transcription n’est pas vérifié directement par cette page',
  statusVersion: 'Version de l’application',
  statusHealthy: 'Disponible',
  statusReachable: 'Répond',
  statusDegraded: 'Problème détecté',
  statusUnknown: 'Non confirmé',
  statusCheckedAt: 'Heure de vérification',
  statusRefresh: 'Vérifier à nouveau',
  statusLastFailure: 'Dernière erreur enregistrée',
  statusNoFailure: 'Aucune erreur enregistrée sur cet appareil',
};
const de: Words = {
  statusTitle: 'Dienststatus',
  statusOverall: 'Gesamtstatus',
  statusAllOperational: 'Alle Systeme funktionieren normal',
  statusIssueDetected: 'In einigen Systemen wurde ein Problem festgestellt',
  statusPartiallyVerified: 'Einige Systeme wurden nicht überprüft',
  statusProbeNote:
    'Prüfungen laufen live aus Ihrem Browser gegen die öffentliche Website und die Freigabe-API; der Transkriptionsanbieter wird nicht geprüft',
  statusMonitorPrefix: 'Gemeinsamer Monitor',
  statusBrowserPrefix: 'Dieser Browser',
  statusStale: 'veraltet',
  statusMonitorNote:
    'Stündlicher gemeinsamer CI-Monitor plus Live-Prüfungen aus Ihrem Browser; der Transkriptionsanbieter wird nicht geprüft',
  statusWebsite: 'Website',
  statusApi: 'API für Freigabe und Verarbeitung',
  statusProvider: 'Transkriptionsanbieter',
  statusNotMonitored: 'Nicht überwacht',
  statusWebsiteDetail: 'Statische Assets antworten von diesem Browser aus',
  statusApiDetail: 'API antwortet; tatsächliche Funktion wird vom Browser nicht geprüft',
  statusApiUnreachable: 'API ist nicht erreichbar',
  statusProviderDetail: 'Der externe Transkriptionsanbieter wird von dieser Seite nicht direkt geprüft',
  statusVersion: 'App-Version',
  statusHealthy: 'Verfügbar',
  statusReachable: 'Antwortet',
  statusDegraded: 'Problem erkannt',
  statusUnknown: 'Nicht bestätigt',
  statusCheckedAt: 'Prüfzeitpunkt',
  statusRefresh: 'Erneut prüfen',
  statusLastFailure: 'Letzter aufgezeichneter Fehler',
  statusNoFailure: 'Keine Fehler auf diesem Gerät aufgezeichnet',
};
const pt: Words = {
  statusTitle: 'Status do serviço',
  statusOverall: 'Status geral',
  statusAllOperational: 'Todos os sistemas operando normalmente',
  statusIssueDetected: 'Um problema foi detectado em alguns sistemas',
  statusPartiallyVerified: 'Alguns sistemas não foram verificados',
  statusProbeNote:
    'As verificações são executadas ao vivo do seu navegador contra o site público e a API de compartilhamento; o provedor de transcrição não é verificado',
  statusMonitorPrefix: 'Monitor compartilhado',
  statusBrowserPrefix: 'Este navegador',
  statusStale: 'desatualizado',
  statusMonitorNote:
    'Monitor CI compartilhado por hora mais verificações ao vivo do seu navegador; o provedor de transcrição não é verificado',
  statusWebsite: 'Site',
  statusApi: 'API de compartilhamento e processamento',
  statusProvider: 'Provedor de transcrição',
  statusNotMonitored: 'Não monitorado',
  statusWebsiteDetail: 'Os recursos estáticos respondem deste navegador',
  statusApiDetail: 'A API responde; a função real não é verificada pelo navegador',
  statusApiUnreachable: 'Não foi possível conectar à API',
  statusProviderDetail: 'O provedor externo de transcrição não é verificado diretamente por esta página',
  statusVersion: 'Versão do aplicativo',
  statusHealthy: 'Disponível',
  statusReachable: 'Respondendo',
  statusDegraded: 'Problema detetado',
  statusUnknown: 'Não confirmado',
  statusCheckedAt: 'Hora da verificação',
  statusRefresh: 'Verificar novamente',
  statusLastFailure: 'Último erro registado',
  statusNoFailure: 'Nenhum erro registado neste dispositivo',
};
const it: Words = {
  statusTitle: 'Stato del servizio',
  statusOverall: 'Stato generale',
  statusAllOperational: 'Tutti i sistemi sono operativi',
  statusIssueDetected: 'È stato rilevato un problema in alcuni sistemi',
  statusPartiallyVerified: 'Alcuni sistemi non sono stati verificati',
  statusProbeNote:
    'I controlli vengono eseguiti in tempo reale dal tuo browser sul sito pubblico e sull’API di condivisione; il fornitore di trascrizione non viene verificato',
  statusMonitorPrefix: 'Monitor condiviso',
  statusBrowserPrefix: 'Questo browser',
  statusStale: 'obsoleto',
  statusMonitorNote:
    'Monitor CI condiviso orario più controlli live dal tuo browser; il fornitore di trascrizione non è verificato',
  statusWebsite: 'Sito web',
  statusApi: 'API di condivisione ed elaborazione',
  statusProvider: 'Fornitore di trascrizione',
  statusNotMonitored: 'Non monitorato',
  statusWebsiteDetail: 'Le risorse statiche rispondono da questo browser',
  statusApiDetail: 'L’API risponde; la funzione effettiva non è verificata dal browser',
  statusApiUnreachable: 'Impossibile raggiungere l’API',
  statusProviderDetail: 'Il fornitore esterno di trascrizione non viene verificato direttamente da questa pagina',
  statusVersion: 'Versione dell’app',
  statusHealthy: 'Disponibile',
  statusReachable: 'Risponde',
  statusDegraded: 'Problema rilevato',
  statusUnknown: 'Non confermato',
  statusCheckedAt: 'Ora della verifica',
  statusRefresh: 'Verifica di nuovo',
  statusLastFailure: 'Ultimo errore registrato',
  statusNoFailure: 'Nessun errore registrato su questo dispositivo',
};
const ru: Words = {
  statusTitle: 'Статус сервиса',
  statusOverall: 'Общий статус',
  statusAllOperational: 'Все системы работают нормально',
  statusIssueDetected: 'В некоторых системах обнаружена проблема',
  statusPartiallyVerified: 'Некоторые системы не проверены',
  statusProbeNote:
    'Проверки выполняются в реальном времени из вашего браузера к публичному сайту и API публикации; поставщик транскрипции не проверяется',
  statusMonitorPrefix: 'Общий монитор',
  statusBrowserPrefix: 'Этот браузер',
  statusStale: 'устарело',
  statusMonitorNote:
    'Общий почасовой CI-монитор плюс живые проверки из вашего браузера; поставщик транскрипции не проверяется',
  statusWebsite: 'Веб-сайт',
  statusApi: 'API публикации и обработки',
  statusProvider: 'Поставщик транскрипции',
  statusNotMonitored: 'Не отслеживается',
  statusWebsiteDetail: 'Статические ресурсы отвечают из этого браузера',
  statusApiDetail: 'API отвечает; фактическая работа из браузера не проверяется',
  statusApiUnreachable: 'Не удаётся подключиться к API',
  statusProviderDetail: 'Внешний поставщик транскрипции напрямую этой страницей не проверяется',
  statusVersion: 'Версия приложения',
  statusHealthy: 'Доступно',
  statusReachable: 'Отвечает',
  statusDegraded: 'Обнаружена проблема',
  statusUnknown: 'Не подтверждено',
  statusCheckedAt: 'Время проверки',
  statusRefresh: 'Проверить снова',
  statusLastFailure: 'Последняя записанная ошибка',
  statusNoFailure: 'На этом устройстве нет записанных ошибок',
};
const id: Words = {
  statusTitle: 'Status layanan',
  statusOverall: 'Status keseluruhan',
  statusAllOperational: 'Semua sistem beroperasi normal',
  statusIssueDetected: 'Masalah terdeteksi pada sebagian sistem',
  statusPartiallyVerified: 'Sebagian sistem belum diverifikasi',
  statusProbeNote:
    'Pemeriksaan berjalan langsung dari browser Anda ke situs publik dan API berbagi; penyedia transkripsi tidak diperiksa',
  statusMonitorPrefix: 'Monitor bersama',
  statusBrowserPrefix: 'Browser ini',
  statusStale: 'kedaluwarsa',
  statusMonitorNote:
    'Monitor CI bersama per jam plus pemeriksaan langsung dari browser Anda; penyedia transkripsi tidak diperiksa',
  statusWebsite: 'Situs web',
  statusApi: 'API berbagi & pemrosesan',
  statusProvider: 'Penyedia transkripsi',
  statusNotMonitored: 'Tidak dipantau',
  statusWebsiteDetail: 'Aset statis merespons dari browser ini',
  statusApiDetail: 'API merespons; fungsi sebenarnya tidak diverifikasi dari browser',
  statusApiUnreachable: 'Tidak dapat terhubung ke API',
  statusProviderDetail: 'Penyedia transkripsi eksternal tidak diperiksa langsung oleh halaman ini',
  statusVersion: 'Versi aplikasi',
  statusHealthy: 'Tersedia',
  statusReachable: 'Merespons',
  statusDegraded: 'Masalah terdeteksi',
  statusUnknown: 'Belum dikonfirmasi',
  statusCheckedAt: 'Waktu pemeriksaan',
  statusRefresh: 'Periksa lagi',
  statusLastFailure: 'Kesalahan terakhir yang tercatat',
  statusNoFailure: 'Tidak ada kesalahan tercatat di perangkat ini',
};
const tr: Words = {
  statusTitle: 'Hizmet durumu',
  statusOverall: 'Genel durum',
  statusAllOperational: 'Tüm sistemler normal çalışıyor',
  statusIssueDetected: 'Bazı sistemlerde bir sorun algılandı',
  statusPartiallyVerified: 'Bazı sistemler doğrulanmadı',
  statusProbeNote:
    'Kontroller tarayıcınızdan herkese açık siteye ve paylaşım API’sine karşı canlı çalışır; döküm sağlayıcısı doğrudan kontrol edilmez',
  statusMonitorPrefix: 'Paylaşılan izleyici',
  statusBrowserPrefix: 'Bu tarayıcı',
  statusStale: 'eski',
  statusMonitorNote:
    'Saatlik paylaşılan CI izleyici artı tarayıcınızdan canlı kontroller; döküm sağlayıcısı doğrudan kontrol edilmez',
  statusWebsite: 'Web sitesi',
  statusApi: 'Paylaşım ve işleme API’si',
  statusProvider: 'Döküm sağlayıcısı',
  statusNotMonitored: 'İzlenmiyor',
  statusWebsiteDetail: 'Statik varlıklar bu tarayıcıdan yanıt veriyor',
  statusApiDetail: 'API yanıt veriyor; gerçek işlev tarayıcıdan doğrulanmıyor',
  statusApiUnreachable: 'API’ye ulaşılamıyor',
  statusProviderDetail: 'Harici döküm sağlayıcısı bu sayfa tarafından doğrudan kontrol edilmez',
  statusVersion: 'Uygulama sürümü',
  statusHealthy: 'Kullanılabilir',
  statusReachable: 'Yanıt veriyor',
  statusDegraded: 'Sorun algılandı',
  statusUnknown: 'Doğrulanmadı',
  statusCheckedAt: 'Kontrol zamanı',
  statusRefresh: 'Yeniden kontrol et',
  statusLastFailure: 'Kaydedilen son hata',
  statusNoFailure: 'Bu cihazda kayıtlı hata yok',
};
const vi: Words = {
  statusTitle: 'Trạng thái dịch vụ',
  statusOverall: 'Trạng thái tổng thể',
  statusAllOperational: 'Tất cả hệ thống hoạt động bình thường',
  statusIssueDetected: 'Phát hiện sự cố ở một số hệ thống',
  statusPartiallyVerified: 'Một số hệ thống chưa được xác minh',
  statusProbeNote:
    'Kiểm tra chạy trực tiếp từ trình duyệt của bạn tới trang công khai và API chia sẻ; nhà cung cấp phiên âm không được kiểm tra trực tiếp',
  statusMonitorPrefix: 'Giám sát chung',
  statusBrowserPrefix: 'Trình duyệt này',
  statusStale: 'lỗi thời',
  statusMonitorNote:
    'Giám sát CI chung hàng giờ cùng kiểm tra trực tiếp từ trình duyệt của bạn; nhà cung cấp phiên âm không được kiểm tra trực tiếp',
  statusWebsite: 'Trang web',
  statusApi: 'API chia sẻ & xử lý',
  statusProvider: 'Nhà cung cấp phiên âm',
  statusNotMonitored: 'Không giám sát',
  statusWebsiteDetail: 'Tài nguyên tĩnh phản hồi từ trình duyệt này',
  statusApiDetail: 'API phản hồi; chức năng thực tế không được xác minh từ trình duyệt',
  statusApiUnreachable: 'Không thể kết nối tới API',
  statusProviderDetail: 'Trang này không kiểm tra trực tiếp nhà cung cấp phiên âm bên ngoài',
  statusVersion: 'Phiên bản ứng dụng',
  statusHealthy: 'Khả dụng',
  statusReachable: 'Đang phản hồi',
  statusDegraded: 'Phát hiện sự cố',
  statusUnknown: 'Chưa xác nhận',
  statusCheckedAt: 'Thời gian kiểm tra',
  statusRefresh: 'Kiểm tra lại',
  statusLastFailure: 'Lỗi được ghi lại gần nhất',
  statusNoFailure: 'Không có lỗi được ghi lại trên thiết bị này',
};

// Kept separately so incomplete reason tables still have a localized fallback.
const NOT_CONFIRMED: Record<Language, string> = {
  en: 'The status could not be confirmed; please check again later.',
  ko: '상태를 확인하지 못했어요; 잠시 후 다시 확인해 주세요.',
  zh: '尚未确认状态；请稍后重新检查。',
  ja: '状態を確認できませんでした。しばらくしてから再確認してください。',
  es: 'No se pudo confirmar el estado; vuelve a comprobarlo más tarde.',
  fr: 'L’état n’a pas pu être confirmé ; réessayez plus tard.',
  de: 'Der Zustand konnte nicht bestätigt werden; prüfe ihn später erneut.',
  pt: 'Não foi possível confirmar o estado; verifica novamente mais tarde.',
  it: 'Non è stato possibile confermare lo stato; riprova più tardi.',
  ru: 'Не удалось подтвердить состояние; повторите проверку позже.',
  id: 'Status belum dapat dipastikan; periksa lagi nanti.',
  tr: 'Durum doğrulanamadı; lütfen daha sonra yeniden kontrol edin.',
  vi: 'Chưa thể xác nhận trạng thái; vui lòng kiểm tra lại sau.',
};

const REASON_LABELS: Record<Language, Record<HealthReason, string>> = {
  en: {
    indexeddb_unavailable:
      'This browser cannot use storage on this device; try a regular browsing window or another browser.',
    local_cache_not_initialized:
      'Song storage on this device is not ready yet; try playing a song, then check again.',
    local_cache_blocked:
      'Song storage on this device is blocked; close other game tabs, then check again.',
    local_cache_unavailable:
      'Song storage on this device could not be opened; restart the browser, then check again.',
    local_cache_readable:
      'Saved song data on this device can be read; try playing a song to check the next step.',
    local_cache_read_failed:
      'Saved song data on this device could not be read; restart the browser, then check again.',
    audio_context_unavailable:
      'This browser cannot prepare sound for playback; try updating it or using another browser.',
    decode_audio_data_unavailable:
      'This browser cannot read the test sound; try updating it or using another browser.',
    audio_decode_output_untested:
      'The test sound can be read, but sound output has not been checked; play a song and listen.',
    pcm_decode_failed:
      'The test sound could not be read; restart the browser, then check again.',
    metadata_api_key_not_configured:
      'YouTube song information is not set up for this version of the game; try again later.',
    metadata_http_error:
      'The song information service could not provide the requested information; try again later.',
    unrecognized_metadata_response:
      'The song information received could not be used; try again later.',
    metadata_readable_audio_import_untested:
      'Song information can be read, but adding audio has not been checked; try adding a song.',
    check_timed_out: 'The check took too long to finish; please check again.',
    check_unavailable: NOT_CONFIRMED.en,
  },
  ko: {
    indexeddb_unavailable:
      '이 브라우저에서는 기기 저장소를 사용할 수 없어요; 일반 창이나 다른 브라우저에서 시도해 주세요.',
    local_cache_not_initialized:
      '이 기기의 곡 저장 공간이 아직 준비되지 않았어요; 곡을 재생한 뒤 다시 확인해 주세요.',
    local_cache_blocked:
      '이 기기의 곡 저장 공간에 접근할 수 없어요; 다른 게임 탭을 닫고 다시 확인해 주세요.',
    local_cache_unavailable:
      '이 기기의 곡 저장 공간을 열지 못했어요; 브라우저를 다시 시작한 뒤 확인해 주세요.',
    local_cache_readable:
      '이 기기에 저장된 곡 데이터를 읽을 수 있어요; 곡을 재생해 다음 단계도 확인해 주세요.',
    local_cache_read_failed:
      '이 기기에 저장된 곡 데이터를 읽지 못했어요; 브라우저를 다시 시작한 뒤 확인해 주세요.',
    audio_context_unavailable:
      '이 브라우저에서는 소리 재생을 준비할 수 없어요; 브라우저를 업데이트하거나 다른 브라우저를 사용해 주세요.',
    decode_audio_data_unavailable:
      '이 브라우저에서는 시험용 소리를 읽을 수 없어요; 브라우저를 업데이트하거나 다른 브라우저를 사용해 주세요.',
    audio_decode_output_untested:
      '시험용 소리는 읽을 수 있지만 실제 소리 출력은 확인하지 않았어요; 곡을 재생해 소리를 들어 보세요.',
    pcm_decode_failed:
      '시험용 소리를 읽지 못했어요; 브라우저를 다시 시작한 뒤 확인해 주세요.',
    metadata_api_key_not_configured:
      '이 게임 버전에서는 YouTube 곡 정보를 가져올 준비가 되지 않았어요; 나중에 다시 시도해 주세요.',
    metadata_http_error:
      '곡 정보 서비스에서 요청한 정보를 받지 못했어요; 잠시 후 다시 시도해 주세요.',
    unrecognized_metadata_response:
      '받아 온 곡 정보를 사용할 수 없어요; 잠시 후 다시 시도해 주세요.',
    metadata_readable_audio_import_untested:
      '곡 정보는 읽을 수 있지만 소리 가져오기는 확인하지 않았어요; 곡을 추가해 보세요.',
    check_timed_out: '확인 시간이 너무 오래 걸렸어요; 다시 확인해 주세요.',
    check_unavailable: NOT_CONFIRMED.ko,
  },
  zh: {
    indexeddb_unavailable:
      '此浏览器无法使用设备存储空间；请尝试普通浏览窗口或其他浏览器。',
    local_cache_not_initialized:
      '此设备的歌曲存储空间尚未就绪；请尝试播放一首歌，然后重新检查。',
    local_cache_blocked:
      '此设备的歌曲存储空间被阻止访问；请关闭其他游戏标签页，然后重新检查。',
    local_cache_unavailable:
      '无法打开此设备的歌曲存储空间；请重启浏览器，然后重新检查。',
    local_cache_readable:
      '可以读取此设备上保存的歌曲数据；请尝试播放一首歌以检查下一步。',
    local_cache_read_failed:
      '无法读取此设备上保存的歌曲数据；请重启浏览器，然后重新检查。',
    audio_context_unavailable:
      '此浏览器无法准备声音播放；请更新浏览器或使用其他浏览器。',
    decode_audio_data_unavailable:
      '此浏览器无法读取测试声音；请更新浏览器或使用其他浏览器。',
    audio_decode_output_untested:
      '可以读取测试声音，但尚未检查实际声音输出；请播放一首歌并聆听。',
    pcm_decode_failed: '无法读取测试声音；请重启浏览器，然后重新检查。',
    metadata_api_key_not_configured:
      '此游戏版本尚未设置好 YouTube 歌曲信息功能；请稍后重试。',
    metadata_http_error: '歌曲信息服务未能提供所请求的信息；请稍后重试。',
    unrecognized_metadata_response: '收到的歌曲信息无法使用；请稍后重试。',
    metadata_readable_audio_import_untested:
      '可以读取歌曲信息，但尚未检查音频添加功能；请尝试添加一首歌。',
    check_timed_out: '检查耗时过长，未能完成；请重新检查。',
    check_unavailable: NOT_CONFIRMED.zh,
  },
  ja: {
    indexeddb_unavailable:
      'このブラウザーでは端末の保存領域を使えません。通常のウィンドウか別のブラウザーでお試しください。',
    local_cache_not_initialized:
      'この端末の曲の保存領域はまだ準備できていません。曲を再生してから再確認してください。',
    local_cache_blocked:
      'この端末の曲の保存領域へのアクセスが妨げられています。他のゲームのタブを閉じて再確認してください。',
    local_cache_unavailable:
      'この端末の曲の保存領域を開けませんでした。ブラウザーを再起動して再確認してください。',
    local_cache_readable:
      'この端末に保存された曲のデータを読み取れます。次の確認として曲を再生してみてください。',
    local_cache_read_failed:
      'この端末に保存された曲のデータを読み取れませんでした。ブラウザーを再起動して再確認してください。',
    audio_context_unavailable:
      'このブラウザーでは音の再生を準備できません。ブラウザーを更新するか、別のブラウザーでお試しください。',
    decode_audio_data_unavailable:
      'このブラウザーではテスト用の音を読み取れません。ブラウザーを更新するか、別のブラウザーでお試しください。',
    audio_decode_output_untested:
      'テスト用の音は読み取れますが、実際の音の出力は未確認です。曲を再生して音を聞いてみてください。',
    pcm_decode_failed:
      'テスト用の音を読み取れませんでした。ブラウザーを再起動して再確認してください。',
    metadata_api_key_not_configured:
      'このゲームのバージョンでは YouTube の曲情報を取得する準備ができていません。後でもう一度お試しください。',
    metadata_http_error:
      '曲情報のサービスから必要な情報を取得できませんでした。後でもう一度お試しください。',
    unrecognized_metadata_response:
      '受け取った曲情報を利用できませんでした。後でもう一度お試しください。',
    metadata_readable_audio_import_untested:
      '曲情報は読み取れますが、音声の取り込みは未確認です。曲を追加してみてください。',
    check_timed_out:
      '確認に時間がかかりすぎて完了できませんでした。もう一度確認してください。',
    check_unavailable: NOT_CONFIRMED.ja,
  },
  es: {
    indexeddb_unavailable:
      'Este navegador no puede usar el almacenamiento del dispositivo; prueba una ventana de navegación normal u otro navegador.',
    local_cache_not_initialized:
      'El almacenamiento de canciones de este dispositivo aún no está listo; intenta reproducir una canción y vuelve a comprobarlo.',
    local_cache_blocked:
      'El acceso al almacenamiento de canciones de este dispositivo está bloqueado; cierra las otras pestañas del juego y vuelve a comprobarlo.',
    local_cache_unavailable:
      'No se pudo abrir el almacenamiento de canciones de este dispositivo; reinicia el navegador y vuelve a comprobarlo.',
    local_cache_readable:
      'Se pueden leer los datos de canciones guardados en este dispositivo; intenta reproducir una canción para comprobar el siguiente paso.',
    local_cache_read_failed:
      'No se pudieron leer los datos de canciones guardados en este dispositivo; reinicia el navegador y vuelve a comprobarlo.',
    audio_context_unavailable:
      'Este navegador no puede preparar la reproducción de sonido; actualízalo o prueba otro navegador.',
    decode_audio_data_unavailable:
      'Este navegador no puede leer el sonido de prueba; actualízalo o prueba otro navegador.',
    audio_decode_output_untested:
      'Se puede leer el sonido de prueba, pero no se ha comprobado si se oye; reproduce una canción y escucha.',
    pcm_decode_failed:
      'No se pudo leer el sonido de prueba; reinicia el navegador y vuelve a comprobarlo.',
    metadata_api_key_not_configured:
      'La información de canciones de YouTube no está preparada en esta versión del juego; vuelve a intentarlo más tarde.',
    metadata_http_error:
      'El servicio de información de canciones no pudo proporcionar la información solicitada; vuelve a intentarlo más tarde.',
    unrecognized_metadata_response:
      'No se pudo utilizar la información de la canción recibida; vuelve a intentarlo más tarde.',
    metadata_readable_audio_import_untested:
      'Se puede leer la información de canciones, pero no se ha comprobado la incorporación del audio; intenta añadir una canción.',
    check_timed_out:
      'La comprobación tardó demasiado y no pudo terminar; vuelve a comprobarlo.',
    check_unavailable: NOT_CONFIRMED.es,
  },
  fr: {
    indexeddb_unavailable:
      'Ce navigateur ne peut pas utiliser le stockage de cet appareil ; essayez une fenêtre de navigation normale ou un autre navigateur.',
    local_cache_not_initialized:
      'Le stockage des morceaux sur cet appareil n’est pas encore prêt ; essayez de lire un morceau, puis relancez la vérification.',
    local_cache_blocked:
      'L’accès au stockage des morceaux sur cet appareil est bloqué ; fermez les autres onglets du jeu, puis relancez la vérification.',
    local_cache_unavailable:
      'Le stockage des morceaux sur cet appareil n’a pas pu être ouvert ; redémarrez le navigateur, puis relancez la vérification.',
    local_cache_readable:
      'Les données des morceaux enregistrées sur cet appareil sont lisibles ; essayez de lire un morceau pour vérifier la suite.',
    local_cache_read_failed:
      'Les données des morceaux enregistrées sur cet appareil n’ont pas pu être lues ; redémarrez le navigateur, puis relancez la vérification.',
    audio_context_unavailable:
      'Ce navigateur ne peut pas préparer la lecture du son ; mettez-le à jour ou essayez un autre navigateur.',
    decode_audio_data_unavailable:
      'Ce navigateur ne peut pas lire le son de test ; mettez-le à jour ou essayez un autre navigateur.',
    audio_decode_output_untested:
      'Le son de test est lisible, mais la sortie sonore n’a pas été vérifiée ; lancez un morceau et écoutez.',
    pcm_decode_failed:
      'Le son de test n’a pas pu être lu ; redémarrez le navigateur, puis relancez la vérification.',
    metadata_api_key_not_configured:
      'Les informations des morceaux YouTube ne sont pas prêtes dans cette version du jeu ; réessayez plus tard.',
    metadata_http_error:
      'Le service d’informations des morceaux n’a pas pu fournir les informations demandées ; réessayez plus tard.',
    unrecognized_metadata_response:
      'Les informations du morceau reçues n’ont pas pu être utilisées ; réessayez plus tard.',
    metadata_readable_audio_import_untested:
      'Les informations des morceaux sont lisibles, mais l’ajout du son n’a pas été vérifié ; essayez d’ajouter un morceau.',
    check_timed_out:
      'La vérification a pris trop de temps et n’a pas pu se terminer ; relancez-la.',
    check_unavailable: NOT_CONFIRMED.fr,
  },
  de: {
    indexeddb_unavailable:
      'Dieser Browser kann den Speicher auf diesem Gerät nicht nutzen; versuche es in einem normalen Browserfenster oder einem anderen Browser.',
    local_cache_not_initialized:
      'Der Songspeicher auf diesem Gerät ist noch nicht bereit; versuche einen Song abzuspielen und prüfe danach erneut.',
    local_cache_blocked:
      'Der Zugriff auf den Songspeicher dieses Geräts ist blockiert; schließe andere Spiel-Tabs und prüfe erneut.',
    local_cache_unavailable:
      'Der Songspeicher auf diesem Gerät konnte nicht geöffnet werden; starte den Browser neu und prüfe erneut.',
    local_cache_readable:
      'Die gespeicherten Songdaten auf diesem Gerät sind lesbar; spiele zur weiteren Prüfung einen Song ab.',
    local_cache_read_failed:
      'Die gespeicherten Songdaten auf diesem Gerät konnten nicht gelesen werden; starte den Browser neu und prüfe erneut.',
    audio_context_unavailable:
      'Dieser Browser kann die Tonwiedergabe nicht vorbereiten; aktualisiere ihn oder verwende einen anderen Browser.',
    decode_audio_data_unavailable:
      'Dieser Browser kann den Testton nicht lesen; aktualisiere ihn oder verwende einen anderen Browser.',
    audio_decode_output_untested:
      'Der Testton ist lesbar, aber die Tonausgabe wurde nicht geprüft; spiele einen Song ab und höre hin.',
    pcm_decode_failed:
      'Der Testton konnte nicht gelesen werden; starte den Browser neu und prüfe erneut.',
    metadata_api_key_not_configured:
      'YouTube-Songinformationen sind in dieser Spielversion noch nicht eingerichtet; versuche es später erneut.',
    metadata_http_error:
      'Der Dienst für Songinformationen konnte die angefragten Informationen nicht liefern; versuche es später erneut.',
    unrecognized_metadata_response:
      'Die empfangenen Songinformationen konnten nicht verwendet werden; versuche es später erneut.',
    metadata_readable_audio_import_untested:
      'Songinformationen sind lesbar, aber das Hinzufügen der Audiodaten wurde nicht geprüft; versuche einen Song hinzuzufügen.',
    check_timed_out:
      'Die Prüfung hat zu lange gedauert und wurde nicht abgeschlossen; prüfe erneut.',
    check_unavailable: NOT_CONFIRMED.de,
  },
  pt: {
    indexeddb_unavailable:
      'Este navegador não consegue usar o armazenamento deste dispositivo; tenta uma janela de navegação normal ou outro navegador.',
    local_cache_not_initialized:
      'O armazenamento de músicas neste dispositivo ainda não está pronto; tenta reproduzir uma música e verifica novamente.',
    local_cache_blocked:
      'O acesso ao armazenamento de músicas neste dispositivo está bloqueado; fecha os outros separadores do jogo e verifica novamente.',
    local_cache_unavailable:
      'Não foi possível abrir o armazenamento de músicas neste dispositivo; reinicia o navegador e verifica novamente.',
    local_cache_readable:
      'Os dados das músicas guardados neste dispositivo podem ser lidos; tenta reproduzir uma música para verificar o passo seguinte.',
    local_cache_read_failed:
      'Não foi possível ler os dados das músicas guardados neste dispositivo; reinicia o navegador e verifica novamente.',
    audio_context_unavailable:
      'Este navegador não consegue preparar a reprodução de som; atualiza-o ou usa outro navegador.',
    decode_audio_data_unavailable:
      'Este navegador não consegue ler o som de teste; atualiza-o ou usa outro navegador.',
    audio_decode_output_untested:
      'O som de teste pode ser lido, mas a saída de som não foi verificada; reproduz uma música e escuta.',
    pcm_decode_failed:
      'Não foi possível ler o som de teste; reinicia o navegador e verifica novamente.',
    metadata_api_key_not_configured:
      'As informações de músicas do YouTube não estão preparadas nesta versão do jogo; tenta novamente mais tarde.',
    metadata_http_error:
      'O serviço de informações de músicas não conseguiu fornecer as informações pedidas; tenta novamente mais tarde.',
    unrecognized_metadata_response:
      'Não foi possível usar as informações da música recebidas; tenta novamente mais tarde.',
    metadata_readable_audio_import_untested:
      'As informações das músicas podem ser lidas, mas a adição de áudio não foi verificada; tenta adicionar uma música.',
    check_timed_out:
      'A verificação demorou demasiado e não foi concluída; verifica novamente.',
    check_unavailable: NOT_CONFIRMED.pt,
  },
  it: {
    indexeddb_unavailable:
      'Questo browser non può usare lo spazio di archiviazione del dispositivo; prova una finestra di navigazione normale o un altro browser.',
    local_cache_not_initialized:
      'Lo spazio per i brani su questo dispositivo non è ancora pronto; prova a riprodurre un brano, poi verifica di nuovo.',
    local_cache_blocked:
      'L’accesso allo spazio per i brani su questo dispositivo è bloccato; chiudi le altre schede del gioco, poi verifica di nuovo.',
    local_cache_unavailable:
      'Non è stato possibile aprire lo spazio per i brani su questo dispositivo; riavvia il browser, poi verifica di nuovo.',
    local_cache_readable:
      'I dati dei brani salvati su questo dispositivo sono leggibili; prova a riprodurre un brano per verificare il passaggio successivo.',
    local_cache_read_failed:
      'Non è stato possibile leggere i dati dei brani salvati su questo dispositivo; riavvia il browser, poi verifica di nuovo.',
    audio_context_unavailable:
      'Questo browser non può preparare la riproduzione del suono; aggiornalo o usa un altro browser.',
    decode_audio_data_unavailable:
      'Questo browser non può leggere il suono di prova; aggiornalo o usa un altro browser.',
    audio_decode_output_untested:
      'Il suono di prova è leggibile, ma l’uscita audio non è stata verificata; riproduci un brano e ascolta.',
    pcm_decode_failed:
      'Non è stato possibile leggere il suono di prova; riavvia il browser, poi verifica di nuovo.',
    metadata_api_key_not_configured:
      'Le informazioni sui brani di YouTube non sono pronte in questa versione del gioco; riprova più tardi.',
    metadata_http_error:
      'Il servizio di informazioni sui brani non ha potuto fornire le informazioni richieste; riprova più tardi.',
    unrecognized_metadata_response:
      'Non è stato possibile usare le informazioni sul brano ricevute; riprova più tardi.',
    metadata_readable_audio_import_untested:
      'Le informazioni sui brani sono leggibili, ma l’aggiunta dell’audio non è stata verificata; prova ad aggiungere un brano.',
    check_timed_out:
      'La verifica ha impiegato troppo tempo e non è stata completata; verifica di nuovo.',
    check_unavailable: NOT_CONFIRMED.it,
  },
  ru: {
    indexeddb_unavailable:
      'Этот браузер не может использовать хранилище на устройстве; попробуйте обычное окно браузера или другой браузер.',
    local_cache_not_initialized:
      'Хранилище песен на этом устройстве ещё не готово; попробуйте воспроизвести песню, затем повторите проверку.',
    local_cache_blocked:
      'Доступ к хранилищу песен на этом устройстве заблокирован; закройте другие вкладки игры и повторите проверку.',
    local_cache_unavailable:
      'Не удалось открыть хранилище песен на этом устройстве; перезапустите браузер и повторите проверку.',
    local_cache_readable:
      'Сохранённые на этом устройстве данные песен доступны для чтения; попробуйте воспроизвести песню для дальнейшей проверки.',
    local_cache_read_failed:
      'Не удалось прочитать сохранённые на этом устройстве данные песен; перезапустите браузер и повторите проверку.',
    audio_context_unavailable:
      'Этот браузер не может подготовить воспроизведение звука; обновите его или используйте другой браузер.',
    decode_audio_data_unavailable:
      'Этот браузер не может прочитать тестовый звук; обновите его или используйте другой браузер.',
    audio_decode_output_untested:
      'Тестовый звук доступен для чтения, но вывод звука не проверен; включите песню и послушайте.',
    pcm_decode_failed:
      'Не удалось прочитать тестовый звук; перезапустите браузер и повторите проверку.',
    metadata_api_key_not_configured:
      'Получение сведений о песнях с YouTube не настроено в этой версии игры; попробуйте позже.',
    metadata_http_error:
      'Служба сведений о песнях не смогла предоставить запрошенную информацию; попробуйте позже.',
    unrecognized_metadata_response:
      'Не удалось использовать полученные сведения о песне; попробуйте позже.',
    metadata_readable_audio_import_untested:
      'Сведения о песнях доступны для чтения, но добавление звука не проверено; попробуйте добавить песню.',
    check_timed_out:
      'Проверка заняла слишком много времени и не завершилась; повторите проверку.',
    check_unavailable: NOT_CONFIRMED.ru,
  },
  id: {
    indexeddb_unavailable:
      'Browser ini tidak dapat menggunakan penyimpanan perangkat; coba jendela penjelajahan biasa atau browser lain.',
    local_cache_not_initialized:
      'Penyimpanan lagu di perangkat ini belum siap; coba putar sebuah lagu, lalu periksa lagi.',
    local_cache_blocked:
      'Akses ke penyimpanan lagu di perangkat ini terhalang; tutup tab game lainnya, lalu periksa lagi.',
    local_cache_unavailable:
      'Penyimpanan lagu di perangkat ini tidak dapat dibuka; mulai ulang browser, lalu periksa lagi.',
    local_cache_readable:
      'Data lagu yang tersimpan di perangkat ini dapat dibaca; coba putar sebuah lagu untuk memeriksa langkah berikutnya.',
    local_cache_read_failed:
      'Data lagu yang tersimpan di perangkat ini tidak dapat dibaca; mulai ulang browser, lalu periksa lagi.',
    audio_context_unavailable:
      'Browser ini tidak dapat menyiapkan pemutaran suara; perbarui browser atau gunakan browser lain.',
    decode_audio_data_unavailable:
      'Browser ini tidak dapat membaca suara uji; perbarui browser atau gunakan browser lain.',
    audio_decode_output_untested:
      'Suara uji dapat dibaca, tetapi suara yang terdengar belum diperiksa; putar sebuah lagu dan dengarkan.',
    pcm_decode_failed:
      'Suara uji tidak dapat dibaca; mulai ulang browser, lalu periksa lagi.',
    metadata_api_key_not_configured:
      'Informasi lagu YouTube belum disiapkan untuk versi game ini; coba lagi nanti.',
    metadata_http_error:
      'Layanan informasi lagu tidak dapat memberikan informasi yang diminta; coba lagi nanti.',
    unrecognized_metadata_response:
      'Informasi lagu yang diterima tidak dapat digunakan; coba lagi nanti.',
    metadata_readable_audio_import_untested:
      'Informasi lagu dapat dibaca, tetapi penambahan suara belum diperiksa; coba tambahkan sebuah lagu.',
    check_timed_out:
      'Pemeriksaan memakan waktu terlalu lama dan belum selesai; periksa lagi.',
    check_unavailable: NOT_CONFIRMED.id,
  },
  tr: {
    indexeddb_unavailable:
      'Bu tarayıcı cihazdaki depolama alanını kullanamıyor; normal bir tarayıcı penceresi veya başka bir tarayıcı deneyin.',
    local_cache_not_initialized:
      'Bu cihazdaki şarkı depolama alanı henüz hazır değil; bir şarkı çalmayı deneyip yeniden kontrol edin.',
    local_cache_blocked:
      'Bu cihazdaki şarkı depolama alanına erişim engelleniyor; oyunun diğer sekmelerini kapatıp yeniden kontrol edin.',
    local_cache_unavailable:
      'Bu cihazdaki şarkı depolama alanı açılamadı; tarayıcıyı yeniden başlatıp tekrar kontrol edin.',
    local_cache_readable:
      'Bu cihazda kayıtlı şarkı verileri okunabiliyor; sonraki adımı kontrol etmek için bir şarkı çalmayı deneyin.',
    local_cache_read_failed:
      'Bu cihazda kayıtlı şarkı verileri okunamadı; tarayıcıyı yeniden başlatıp tekrar kontrol edin.',
    audio_context_unavailable:
      'Bu tarayıcı ses çalmaya hazırlanamıyor; tarayıcıyı güncelleyin veya başka bir tarayıcı kullanın.',
    decode_audio_data_unavailable:
      'Bu tarayıcı deneme sesini okuyamıyor; tarayıcıyı güncelleyin veya başka bir tarayıcı kullanın.',
    audio_decode_output_untested:
      'Deneme sesi okunabiliyor ancak ses çıkışı kontrol edilmedi; bir şarkı çalıp dinleyin.',
    pcm_decode_failed:
      'Deneme sesi okunamadı; tarayıcıyı yeniden başlatıp tekrar kontrol edin.',
    metadata_api_key_not_configured:
      'Oyunun bu sürümünde YouTube şarkı bilgileri henüz kullanıma hazır değil; daha sonra tekrar deneyin.',
    metadata_http_error:
      'Şarkı bilgisi hizmeti istenen bilgileri sağlayamadı; daha sonra tekrar deneyin.',
    unrecognized_metadata_response:
      'Alınan şarkı bilgileri kullanılamadı; daha sonra tekrar deneyin.',
    metadata_readable_audio_import_untested:
      'Şarkı bilgileri okunabiliyor ancak ses ekleme kontrol edilmedi; bir şarkı eklemeyi deneyin.',
    check_timed_out:
      'Kontrol çok uzun sürdüğü için tamamlanamadı; yeniden kontrol edin.',
    check_unavailable: NOT_CONFIRMED.tr,
  },
  vi: {
    indexeddb_unavailable:
      'Trình duyệt này không thể dùng bộ nhớ trên thiết bị; hãy thử cửa sổ duyệt web thông thường hoặc trình duyệt khác.',
    local_cache_not_initialized:
      'Bộ nhớ lưu bài hát trên thiết bị này chưa sẵn sàng; hãy thử phát một bài hát rồi kiểm tra lại.',
    local_cache_blocked:
      'Quyền truy cập bộ nhớ lưu bài hát trên thiết bị này đang bị chặn; hãy đóng các thẻ trò chơi khác rồi kiểm tra lại.',
    local_cache_unavailable:
      'Không thể mở bộ nhớ lưu bài hát trên thiết bị này; hãy khởi động lại trình duyệt rồi kiểm tra lại.',
    local_cache_readable:
      'Có thể đọc dữ liệu bài hát đã lưu trên thiết bị này; hãy thử phát một bài hát để kiểm tra bước tiếp theo.',
    local_cache_read_failed:
      'Không thể đọc dữ liệu bài hát đã lưu trên thiết bị này; hãy khởi động lại trình duyệt rồi kiểm tra lại.',
    audio_context_unavailable:
      'Trình duyệt này không thể chuẩn bị phát âm thanh; hãy cập nhật trình duyệt hoặc dùng trình duyệt khác.',
    decode_audio_data_unavailable:
      'Trình duyệt này không thể đọc âm thanh thử nghiệm; hãy cập nhật trình duyệt hoặc dùng trình duyệt khác.',
    audio_decode_output_untested:
      'Có thể đọc âm thanh thử nghiệm nhưng chưa kiểm tra âm thanh phát ra; hãy phát một bài hát và nghe thử.',
    pcm_decode_failed:
      'Không thể đọc âm thanh thử nghiệm; hãy khởi động lại trình duyệt rồi kiểm tra lại.',
    metadata_api_key_not_configured:
      'Thông tin bài hát YouTube chưa được thiết lập cho phiên bản trò chơi này; hãy thử lại sau.',
    metadata_http_error:
      'Dịch vụ thông tin bài hát không thể cung cấp thông tin được yêu cầu; hãy thử lại sau.',
    unrecognized_metadata_response:
      'Không thể sử dụng thông tin bài hát nhận được; hãy thử lại sau.',
    metadata_readable_audio_import_untested:
      'Có thể đọc thông tin bài hát nhưng chưa kiểm tra việc thêm âm thanh; hãy thử thêm một bài hát.',
    check_timed_out:
      'Quá trình kiểm tra mất quá nhiều thời gian nên chưa hoàn tất; hãy kiểm tra lại.',
    check_unavailable: NOT_CONFIRMED.vi,
  },
};

export const STATUS_LABELS: Record<
  Language,
  Words & { reasons: Record<HealthReason, string> }
> = {
  en: { ...en, reasons: REASON_LABELS.en },
  ko: { ...ko, reasons: REASON_LABELS.ko },
  zh: { ...zh, reasons: REASON_LABELS.zh },
  ja: { ...ja, reasons: REASON_LABELS.ja },
  es: { ...es, reasons: REASON_LABELS.es },
  fr: { ...fr, reasons: REASON_LABELS.fr },
  de: { ...de, reasons: REASON_LABELS.de },
  pt: { ...pt, reasons: REASON_LABELS.pt },
  it: { ...it, reasons: REASON_LABELS.it },
  ru: { ...ru, reasons: REASON_LABELS.ru },
  id: { ...id, reasons: REASON_LABELS.id },
  tr: { ...tr, reasons: REASON_LABELS.tr },
  vi: { ...vi, reasons: REASON_LABELS.vi },
};

/** The only path from internal details or persisted messages to visible text. */
export function statusReasonText(language: Language, detail?: string): string {
  const reason = healthReason(detail);
  const localized = STATUS_LABELS[language]?.reasons?.[reason];
  if (typeof localized === 'string' && localized.trim()) return localized;
  const english = STATUS_LABELS.en?.reasons?.[reason];
  if (typeof english === 'string' && english.trim()) return english;
  return NOT_CONFIRMED[language] ?? NOT_CONFIRMED.en;
}
