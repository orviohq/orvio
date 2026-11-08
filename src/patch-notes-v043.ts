import type { Language } from './i18n';
export const PATCH_V043 = {
  version: '0.2.43',
  date: '2026-11-09',
  notes: {
    en: [
      'Removed the idle song-selection preview hint. Loading YouTube tracks now match the artwork size, spacing and title layout of other library cards, with a separate progress indicator.',
    ],
    ko: [
      '곡 선택 시 미리듣기 안내 문구를 없앴습니다. 추가 중인 YouTube 곡도 다른 곡과 썸네일 크기·간격·제목 배치를 맞추고 진행 상태를 따로 표시합니다.',
    ],
    ja: [
      '選曲時のプレビュー案内を削除。追加中のYouTube曲も他の曲と画像サイズ、間隔、タイトル配置をそろえ、進行状況を表示します。',
    ],
    zh: [
      '移除选曲试听提示。加载中的YouTube歌曲与其他歌曲使用相同的封面尺寸、间距和标题布局，并单独显示进度。',
    ],
    es: [
      'Se quitó el aviso de vista previa. Las canciones de YouTube en carga usan el mismo tamaño de imagen, espacio y título que las demás, con un indicador de progreso.',
    ],
    fr: [
      "Le conseil d'aperçu a été retiré. Les titres YouTube en chargement reprennent la taille d'image, les espaces et les titres des autres cartes, avec leur progression.",
    ],
    de: [
      'Der Vorschauhinweis wurde entfernt. Ladende YouTube-Songs nutzen dieselbe Bildgröße, Abstände und Titelanordnung wie andere Karten und zeigen ihren Fortschritt.',
    ],
    pt: [
      'Removido o aviso de prévia. Músicas do YouTube em carregamento usam o mesmo tamanho de imagem, espaçamento e título das outras, com indicador de progresso.',
    ],
    it: [
      'Rimosso il suggerimento di anteprima. I brani YouTube in caricamento usano immagini, spazi e titoli come le altre schede, con indicatore di avanzamento.',
    ],
    ru: [
      'Подсказка предпрослушивания убрана. Загружаемые песни YouTube используют размер обложки, отступы и заголовки других карточек с отдельным индикатором загрузки.',
    ],
    id: [
      'Petunjuk pratinjau dihapus. Lagu YouTube yang sedang dimuat memakai ukuran gambar, jarak dan judul yang sama dengan kartu lain, dengan indikator progres.',
    ],
    vi: [
      'Đã bỏ hướng dẫn nghe thử. Bài YouTube đang tải có ảnh, khoảng cách và tiêu đề giống các thẻ khác, kèm chỉ báo tiến trình.',
    ],
    tr: [
      'Önizleme ipucu kaldırıldı. Yüklenen YouTube şarkıları diğer kartlarla aynı görsel boyutu, aralık ve başlık düzenini kullanır; ilerleme ayrıca gösterilir.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
