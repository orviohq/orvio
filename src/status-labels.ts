import type { Language } from './i18n';
import { healthReason, type HealthReason } from './status-reason-codes';

const en = {
  statusTitle: 'Status on this device',
  statusAccess: 'Access · local storage',
  statusPlayback: 'Playback · local decoding',
  statusYouTubeAdd: 'YouTube add · metadata',
  statusHealthy: 'Available',
  statusDegraded: 'Problem detected',
  statusUnknown: 'Not confirmed',
  statusCheckedAt: 'Checked at',
  statusRefresh: 'Check again',
  statusLastFailure: 'Last recorded failure',
  statusNoFailure: 'No failure recorded on this device',
};
type Words = typeof en;
const ko: Words = {
  statusTitle: '이 기기의 상태',
  statusAccess: '접속 · 기기 저장소',
  statusPlayback: '재생 · 기기 내 디코딩',
  statusYouTubeAdd: 'YouTube 추가 · 곡 정보',
  statusHealthy: '사용 가능',
  statusDegraded: '문제 감지',
  statusUnknown: '확인되지 않음',
  statusCheckedAt: '확인 시각',
  statusRefresh: '다시 확인',
  statusLastFailure: '마지막으로 기록된 오류',
  statusNoFailure: '이 기기에 기록된 오류가 없어요',
};
const zh: Words = {
  statusTitle: '此设备的状态',
  statusAccess: '访问 · 本地存储',
  statusPlayback: '播放 · 本地解码',
  statusYouTubeAdd: '添加 YouTube · 曲目信息',
  statusHealthy: '可用',
  statusDegraded: '发现问题',
  statusUnknown: '尚未确认',
  statusCheckedAt: '检查时间',
  statusRefresh: '重新检查',
  statusLastFailure: '最近记录的错误',
  statusNoFailure: '此设备没有错误记录',
};
const ja: Words = {
  statusTitle: 'この端末の状態',
  statusAccess: 'アクセス · 端末の保存領域',
  statusPlayback: '再生 · 端末内のデコード',
  statusYouTubeAdd: 'YouTube追加 · 曲情報',
  statusHealthy: '利用可能',
  statusDegraded: '問題を検出',
  statusUnknown: '未確認',
  statusCheckedAt: '確認時刻',
  statusRefresh: '再確認',
  statusLastFailure: '最後に記録されたエラー',
  statusNoFailure: 'この端末にエラーの記録はありません',
};
const es: Words = {
  statusTitle: 'Estado en este dispositivo',
  statusAccess: 'Acceso · almacenamiento local',
  statusPlayback: 'Reproducción · decodificación local',
  statusYouTubeAdd: 'Añadir de YouTube · metadatos',
  statusHealthy: 'Disponible',
  statusDegraded: 'Problema detectado',
  statusUnknown: 'Sin confirmar',
  statusCheckedAt: 'Hora de comprobación',
  statusRefresh: 'Comprobar de nuevo',
  statusLastFailure: 'Último error registrado',
  statusNoFailure: 'No hay errores registrados en este dispositivo',
};
const fr: Words = {
  statusTitle: 'État sur cet appareil',
  statusAccess: 'Accès · stockage local',
  statusPlayback: 'Lecture · décodage local',
  statusYouTubeAdd: 'Ajout YouTube · métadonnées',
  statusHealthy: 'Disponible',
  statusDegraded: 'Problème détecté',
  statusUnknown: 'Non confirmé',
  statusCheckedAt: 'Heure de vérification',
  statusRefresh: 'Vérifier à nouveau',
  statusLastFailure: 'Dernière erreur enregistrée',
  statusNoFailure: 'Aucune erreur enregistrée sur cet appareil',
};
const de: Words = {
  statusTitle: 'Status auf diesem Gerät',
  statusAccess: 'Zugriff · lokaler Speicher',
  statusPlayback: 'Wiedergabe · lokale Dekodierung',
  statusYouTubeAdd: 'YouTube hinzufügen · Metadaten',
  statusHealthy: 'Verfügbar',
  statusDegraded: 'Problem erkannt',
  statusUnknown: 'Nicht bestätigt',
  statusCheckedAt: 'Prüfzeitpunkt',
  statusRefresh: 'Erneut prüfen',
  statusLastFailure: 'Letzter aufgezeichneter Fehler',
  statusNoFailure: 'Keine Fehler auf diesem Gerät aufgezeichnet',
};
const pt: Words = {
  statusTitle: 'Estado neste dispositivo',
  statusAccess: 'Acesso · armazenamento local',
  statusPlayback: 'Reprodução · descodificação local',
  statusYouTubeAdd: 'Adicionar do YouTube · metadados',
  statusHealthy: 'Disponível',
  statusDegraded: 'Problema detetado',
  statusUnknown: 'Não confirmado',
  statusCheckedAt: 'Hora da verificação',
  statusRefresh: 'Verificar novamente',
  statusLastFailure: 'Último erro registado',
  statusNoFailure: 'Nenhum erro registado neste dispositivo',
};
const it: Words = {
  statusTitle: 'Stato su questo dispositivo',
  statusAccess: 'Accesso · archivio locale',
  statusPlayback: 'Riproduzione · decodifica locale',
  statusYouTubeAdd: 'Aggiunta da YouTube · metadati',
  statusHealthy: 'Disponibile',
  statusDegraded: 'Problema rilevato',
  statusUnknown: 'Non confermato',
  statusCheckedAt: 'Ora della verifica',
  statusRefresh: 'Verifica di nuovo',
  statusLastFailure: 'Ultimo errore registrato',
  statusNoFailure: 'Nessun errore registrato su questo dispositivo',
};
const ru: Words = {
  statusTitle: 'Состояние на этом устройстве',
  statusAccess: 'Доступ · локальное хранилище',
  statusPlayback: 'Воспроизведение · локальное декодирование',
  statusYouTubeAdd: 'Добавление с YouTube · метаданные',
  statusHealthy: 'Доступно',
  statusDegraded: 'Обнаружена проблема',
  statusUnknown: 'Не подтверждено',
  statusCheckedAt: 'Время проверки',
  statusRefresh: 'Проверить снова',
  statusLastFailure: 'Последняя записанная ошибка',
  statusNoFailure: 'На этом устройстве нет записанных ошибок',
};
const id: Words = {
  statusTitle: 'Status di perangkat ini',
  statusAccess: 'Akses · penyimpanan lokal',
  statusPlayback: 'Pemutaran · dekode lokal',
  statusYouTubeAdd: 'Tambah YouTube · metadata',
  statusHealthy: 'Tersedia',
  statusDegraded: 'Masalah terdeteksi',
  statusUnknown: 'Belum dikonfirmasi',
  statusCheckedAt: 'Waktu pemeriksaan',
  statusRefresh: 'Periksa lagi',
  statusLastFailure: 'Kesalahan terakhir yang tercatat',
  statusNoFailure: 'Tidak ada kesalahan tercatat di perangkat ini',
};
const tr: Words = {
  statusTitle: 'Bu cihazdaki durum',
  statusAccess: 'Erişim · yerel depolama',
  statusPlayback: 'Oynatma · yerel kod çözme',
  statusYouTubeAdd: 'YouTube ekleme · meta veriler',
  statusHealthy: 'Kullanılabilir',
  statusDegraded: 'Sorun algılandı',
  statusUnknown: 'Doğrulanmadı',
  statusCheckedAt: 'Kontrol zamanı',
  statusRefresh: 'Yeniden kontrol et',
  statusLastFailure: 'Kaydedilen son hata',
  statusNoFailure: 'Bu cihazda kayıtlı hata yok',
};
const vi: Words = {
  statusTitle: 'Trạng thái trên thiết bị này',
  statusAccess: 'Truy cập · bộ nhớ cục bộ',
  statusPlayback: 'Phát nhạc · giải mã cục bộ',
  statusYouTubeAdd: 'Thêm YouTube · thông tin bài hát',
  statusHealthy: 'Khả dụng',
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
