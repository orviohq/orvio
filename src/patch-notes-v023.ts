import type { Language } from './i18n';
export const PATCH_V023 = {
  version: '0.2.23',
  date: '2026-11-08',
  notes: {
    en: [
      'The same YouTube video uses the same chart and difficulty on different devices. Shared results include the exact replay. Saved play history stays unchanged. Songs that are not ready remain in the list with a retry button; other songs stay playable. Adding a YouTube link closes the dialog immediately while the song loads in the background. Audio errors distinguish service responses, analysis and browser storage.',
    ],
    ko: [
      '같은 YouTube 영상은 기기가 달라도 같은 채보와 난이도를 사용합니다. 공유한 결과에서 같은 리플레이를 볼 수 있습니다. 저장된 플레이 기록은 바꾸지 않습니다. 아직 준비되지 않은 곡은 다시 시도 버튼과 함께 목록에 남으며 다른 곡은 계속 플레이할 수 있습니다. YouTube 링크를 추가하면 창이 바로 닫히고 곡은 뒤에서 준비됩니다. 음원 오류는 서비스 응답·분석·브라우저 저장 문제를 구분해 안내합니다.',
    ],
    ja: [
      '同じYouTube動画では端末が違っても同じ譜面と難易度を使います。共有した結果から同じリプレイを再生できます。保存済みのプレイ記録は変更しません。準備できていない曲は再試行ボタンとともに一覧に残り、他の曲はプレイできます。リンク追加後は画面がすぐ閉じ、曲をバックグラウンドで準備します。音源エラーはサービス応答・解析・ブラウザー保存を区別します。',
    ],
    zh: [
      '同一YouTube视频在不同设备上使用相同谱面和难度。分享的成绩包含相同回放，已保存的游玩记录保持不变。尚未准备好的歌曲留在列表中并提供重试按钮，其他歌曲仍可游玩。添加链接后窗口立即关闭，歌曲在后台准备。音频错误分别提示服务响应、分析或浏览器存储问题。',
    ],
    es: [
      'El mismo vídeo de YouTube usa el mismo mapa y dificultad en distintos dispositivos. Los resultados compartidos incluyen la repetición exacta. El historial guardado no cambia. Las canciones pendientes siguen en la lista con un botón para reintentar; las demás se pueden jugar. Al añadir un enlace se cierra el diálogo y la canción carga en segundo plano. Los errores distinguen servicio, análisis y almacenamiento del navegador.',
    ],
    pt: [
      'O mesmo vídeo do YouTube usa o mesmo mapa e dificuldade em dispositivos diferentes. Os resultados compartilhados incluem o replay exato. O histórico salvo não muda. Músicas ainda não prontas ficam na lista com um botão para tentar de novo; as outras continuam disponíveis. Adicionar um link fecha a janela e carrega a música em segundo plano. Os erros distinguem serviço, análise e armazenamento do navegador.',
    ],
    fr: [
      'Une même vidéo YouTube utilise la même partition et difficulté sur différents appareils. Les résultats partagés incluent le replay exact. L’historique enregistré reste inchangé. Les morceaux en attente restent dans la liste avec un bouton pour réessayer; les autres restent jouables. Ajouter un lien ferme la fenêtre et prépare le morceau en arrière-plan. Les erreurs distinguent service, analyse et stockage du navigateur.',
    ],
    de: [
      'Dasselbe YouTube-Video verwendet auf verschiedenen Geräten dieselbe Notenkarte und Schwierigkeit. Geteilte Ergebnisse enthalten den genauen Replay. Der gespeicherte Spielverlauf bleibt unverändert. Noch nicht bereite Songs bleiben mit einer Wiederholen-Taste in der Liste; andere bleiben spielbar. Ein Link schließt den Dialog sofort und lädt den Song im Hintergrund. Fehler unterscheiden Dienst, Analyse und Browserspeicher.',
    ],
    it: [
      'Lo stesso video YouTube usa la stessa mappa e difficoltà su dispositivi diversi. I risultati condivisi includono il replay esatto. La cronologia salvata non cambia. I brani non pronti restano in elenco con un pulsante per riprovare; gli altri restano giocabili. Aggiungere un link chiude la finestra e prepara il brano in background. Gli errori distinguono servizio, analisi e memoria del browser.',
    ],
    ru: [
      'Одно видео YouTube использует одинаковую карту и сложность на разных устройствах. Общие результаты включают точный повтор. Сохранённая история игры не меняется. Неготовые песни остаются в списке с кнопкой повтора, остальные доступны для игры. После добавления ссылки окно сразу закрывается, а песня готовится в фоне. Ошибки различают ответ сервиса, анализ и хранилище браузера.',
    ],
    id: [
      'Video YouTube yang sama memakai peta dan tingkat kesulitan yang sama di perangkat berbeda. Hasil yang dibagikan memuat replay yang sama. Riwayat tersimpan tidak berubah. Lagu yang belum siap tetap di daftar dengan tombol coba lagi; lagu lain tetap bisa dimainkan. Menambah tautan langsung menutup dialog dan menyiapkan lagu di latar belakang. Galat membedakan layanan, analisis, dan penyimpanan browser.',
    ],
    tr: [
      'Aynı YouTube videosu farklı cihazlarda aynı haritayı ve zorluğu kullanır. Paylaşılan sonuçlar aynı tekrarı içerir. Kayıtlı oyun geçmişi değişmez. Hazır olmayan şarkılar tekrar dene düğmesiyle listede kalır; diğer şarkılar oynanabilir. Bağlantı eklemek pencereyi hemen kapatır ve şarkı arka planda hazırlanır. Hatalar hizmet yanıtı, analiz ve tarayıcı depolamasını ayırır.',
    ],
    vi: [
      'Cùng video YouTube dùng cùng bản nhạc và độ khó trên các thiết bị. Kết quả chia sẻ có bản phát lại chính xác. Lịch sử chơi đã lưu không thay đổi. Bài chưa sẵn sàng vẫn ở danh sách với nút thử lại; bài khác vẫn chơi được. Thêm liên kết sẽ đóng cửa sổ ngay và chuẩn bị bài hát ở nền. Lỗi phân biệt dịch vụ, phân tích và bộ nhớ trình duyệt.',
    ],
  } satisfies Record<Language, string[]>,
};
