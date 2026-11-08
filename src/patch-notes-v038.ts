import type { Language } from './i18n';
export const PATCH_V038 = {
  version: '0.2.38',
  date: '2026-11-09',
  notes: {
    en: [
      'Larger song artwork, clearer titles and selection borders, with reachable controls on narrow and landscape screens.',
      'Restore the pre-play wallpaper presentation when starting again from a local replay. An already-visible play-route wallpaper counts toward that presentation.',
    ],
    ko: [
      '곡 목록의 썸네일을 키우고 제목과 선택 표시를 정리했습니다. 작은 화면과 가로 화면에서도 목록과 버튼에 접근할 수 있습니다.',
      '로컬 리플레이에서 다시 플레이할 때 월페이퍼가 너무 빨리 넘어가는 문제를 고쳤습니다. 이미 표시된 플레이 화면의 월페이퍼 시간은 중복해서 기다리지 않습니다.',
    ],
    ja: [
      '選曲の画像を大きくし、タイトルと選択表示を整理。狭い画面や横向きでも操作できます。',
      'ローカルリプレイから再プレイする際の壁紙表示を復元。すでに表示した壁紙の時間は重複して待ちません。',
    ],
    zh: [
      '增大歌曲封面，整理标题和选中边框，小屏幕和横屏仍可操作。',
      '修复从本地回放再次游玩时壁纸过快消失。已显示的壁纸时间不重复等待。',
    ],
    es: [
      'Carátulas más grandes y títulos y selección más claros, con controles accesibles en pantallas estrechas y horizontales.',
      'Restaura la presentación del fondo al volver a jugar una repetición local, sin repetir el tiempo ya mostrado.',
    ],
    fr: [
      'Pochettes plus grandes, titres et sélection plus clairs, avec des commandes accessibles en écran étroit ou paysage.',
      'Restaure le fond avant de rejouer un replay local, sans répéter le temps déjà affiché.',
    ],
    de: [
      'Größere Songbilder und klarere Titel und Auswahl. Bedienelemente bleiben auf schmalen und querformatigen Bildschirmen erreichbar.',
      'Das Hintergrundbild vor erneutem Spiel aus einem lokalen Replay bleibt sichtbar; bereits gezeigte Zeit zählt mit.',
    ],
    pt: [
      'Capas maiores, títulos e seleção mais claros e controles acessíveis em telas estreitas ou horizontais.',
      'Restaura a apresentação do fundo ao jogar novamente um replay local, sem repetir o tempo já exibido.',
    ],
    it: [
      'Copertine più grandi, titoli e selezione più chiari e controlli raggiungibili su schermi stretti o orizzontali.',
      'Ripristina lo sfondo prima di rigiocare un replay locale, contando il tempo già mostrato.',
    ],
    ru: [
      'Крупнее обложки и понятнее названия и выбор. Управление доступно на узких и горизонтальных экранах.',
      'Восстановлен показ обоев перед повторной игрой из локального повтора; уже показанное время учитывается.',
    ],
    id: [
      'Sampul lagu lebih besar, judul dan pilihan lebih jelas, kontrol tetap terjangkau pada layar sempit dan lanskap.',
      'Pulihkan tampilan wallpaper sebelum bermain lagi dari replay lokal, tanpa mengulang waktu yang sudah ditampilkan.',
    ],
    vi: [
      'Ảnh bài hát lớn hơn, tiêu đề và lựa chọn rõ hơn; các nút vẫn dùng được trên màn hình hẹp và ngang.',
      'Khôi phục hiển thị hình nền trước khi chơi lại từ bản phát lại cục bộ, tính cả thời gian đã hiển thị.',
    ],
    tr: [
      'Daha büyük şarkı görselleri, daha net başlık ve seçim; dar ve yatay ekranlarda erişilebilir kontroller.',
      'Yerel tekrardan yeniden oynarken duvar kâğıdı sunumu geri gelir; önceden gösterilen süre yeniden bekletilmez.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
