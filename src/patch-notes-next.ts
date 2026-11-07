import type { Language } from './i18n';
export const NEXT_PATCH = {
  version: '0.2.16',
  date: '2026-11-08',
  notes: {
    en: [
      'YouTube imports now show a large loading indicator and elapsed time. Cancel, retry and error recovery keep your library unchanged.',
      'YouTube thumbnails appear in track selection, during play and on results. Unavailable images use a local fallback without blocking play.',
    ],
    ko: [
      'YouTube 가져오기 중 눈에 잘 보이는 로딩 표시와 경과 시간을 보여줍니다. 취소·재시도·오류 복구 시 기존 라이브러리는 그대로 유지됩니다.',
      'YouTube 썸네일을 곡 선택, 게임 배경과 결과 화면에 표시합니다. 이미지를 불러오지 못해도 기본 이미지로 플레이를 계속할 수 있습니다.',
    ],
    zh: [
      '导入 YouTube 时显示醒目的加载提示和已用时间。取消、重试或出错不会更改现有曲库。',
      'YouTube 缩略图显示在选曲、游戏背景和结果画面。图片不可用时使用本地图像，不阻止游玩。',
    ],
    ja: [
      'YouTube の取り込み中は、大きな読み込み表示と経過時間が表示されます。キャンセル・再試行・エラー時も既存のライブラリは変わりません。',
      '曲選択・プレイ背景・リザルトに YouTube のサムネイルを表示します。画像を取得できない場合は端末内の画像を使い、プレイを妨げません。',
    ],
    es: [
      'La importación de YouTube muestra un indicador visible y el tiempo transcurrido. Cancelar, reintentar o un error no cambia tu biblioteca.',
      'Las miniaturas de YouTube aparecen en la selección, el fondo del juego y los resultados. Si una imagen falla, se usa una imagen local sin bloquear el juego.',
    ],
    fr: [
      'L’importation YouTube affiche un indicateur visible et le temps écoulé. Annuler, réessayer ou une erreur ne modifie pas votre bibliothèque.',
      'Les miniatures YouTube apparaissent dans la sélection, en arrière-plan du jeu et dans les résultats. Une image locale remplace les images indisponibles sans bloquer le jeu.',
    ],
    de: [
      'YouTube-Importe zeigen eine deutliche Ladeanzeige und die verstrichene Zeit. Abbrechen, Wiederholen und Fehler ändern deine Bibliothek nicht.',
      'YouTube-Vorschaubilder erscheinen bei der Titelauswahl, als Spielhintergrund und im Ergebnis. Bei Bildfehlern wird ein lokales Bild verwendet, ohne das Spiel zu blockieren.',
    ],
    pt: [
      'A importação do YouTube mostra um indicador visível e o tempo decorrido. Cancelar, tentar novamente ou um erro não altera sua biblioteca.',
      'As miniaturas do YouTube aparecem na seleção, no fundo do jogo e nos resultados. Imagens indisponíveis são substituídas por uma imagem local sem bloquear o jogo.',
    ],
    it: [
      'Le importazioni YouTube mostrano un indicatore visibile e il tempo trascorso. Annullare, riprovare o un errore non cambia la libreria.',
      'Le miniature YouTube appaiono nella selezione, sullo sfondo del gioco e nei risultati. Le immagini non disponibili sono sostituite da un’immagine locale senza bloccare il gioco.',
    ],
    ru: [
      'Импорт YouTube показывает заметный индикатор загрузки и прошедшее время. Отмена, повтор и ошибки не меняют вашу библиотеку.',
      'Миниатюры YouTube показаны при выборе трека, на фоне игры и в результатах. При ошибке изображения используется локальная замена без блокировки игры.',
    ],
    id: [
      'Impor YouTube menampilkan indikator pemuatan yang jelas dan waktu berlalu. Membatalkan, mencoba ulang, atau kesalahan tidak mengubah koleksi Anda.',
      'Thumbnail YouTube tampil pada pilihan lagu, latar permainan, dan hasil. Gambar yang tidak tersedia diganti gambar lokal tanpa menghentikan permainan.',
    ],
    tr: [
      'YouTube içe aktarma işlemi belirgin bir yükleme göstergesi ve geçen süreyi gösterir. İptal, yeniden deneme ve hatalar kitaplığınızı değiştirmez.',
      'YouTube küçük resimleri parça seçiminde, oyun arka planında ve sonuçlarda görünür. Görüntü yüklenemezse oyun engellenmeden yerel bir görüntü kullanılır.',
    ],
    vi: [
      'Nhập YouTube hiển thị chỉ báo tải rõ ràng và thời gian đã trôi qua. Hủy, thử lại hoặc lỗi không thay đổi thư viện hiện có.',
      'Ảnh thu nhỏ YouTube xuất hiện khi chọn bài, trong nền trò chơi và trên kết quả. Ảnh không tải được sẽ dùng ảnh cục bộ mà không chặn trò chơi.',
    ],
  } satisfies Record<Language, string[]>,
};
