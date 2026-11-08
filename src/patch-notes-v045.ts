import type { Language } from './i18n';
export const PATCH_V045 = {
  version: '0.2.45',
  date: '2026-11-09',
  notes: {
    en: [
      'Loading and failed song cards now share the library artwork, spacing and readable text. Retry and close stay grouped on narrow screens; unavailable saved songs keep their recovery actions.',
    ],
    ko: [
      '곡 로딩·오류 카드의 썸네일, 간격, 글씨를 곡 목록과 맞췄습니다. 좁은 화면에서도 다시 시도·닫기 버튼을 함께 표시하며, 저장된 곡의 복구 동작은 유지합니다.',
    ],
    ja: [
      '読み込み中・失敗時の曲カードの画像、余白、文字を曲一覧に統一しました。狭い画面でも再試行と閉じるをまとめて表示します。',
    ],
    zh: [
      '统一歌曲加载和错误卡片的封面、间距与文字，窄屏下保留清晰的重试和关闭按钮。',
    ],
    es: [
      'Las tarjetas de carga y error comparten portada, espacio y texto con la biblioteca. Reintentar y cerrar siguen accesibles en pantallas estrechas.',
    ],
    fr: [
      'Les cartes de chargement et d’erreur reprennent les images, espacements et textes de la bibliothèque. Réessayer et fermer restent accessibles.',
    ],
    de: [
      'Lade- und Fehlerkarten verwenden dieselben Bilder, Abstände und Schriften wie die Bibliothek. Wiederholen und Schließen bleiben erreichbar.',
    ],
    pt: [
      'Os cartões de carregamento e erro usam a mesma capa, espaço e texto da biblioteca. Tentar novamente e fechar ficam acessíveis.',
    ],
    it: [
      'Le schede di caricamento ed errore usano immagini, spazi e testo della libreria. Riprova e chiudi restano accessibili.',
    ],
    ru: [
      'Карточки загрузки и ошибок используют те же обложки, отступы и текст, что и библиотека. Кнопки повтора и закрытия доступны на узких экранах.',
    ],
    id: [
      'Kartu pemuatan dan galat memakai gambar, jarak, dan teks yang sama dengan pustaka. Tombol coba lagi dan tutup tetap mudah dijangkau.',
    ],
    vi: [
      'Thẻ đang tải và lỗi dùng cùng ảnh, khoảng cách và chữ với thư viện. Nút thử lại và đóng vẫn dễ dùng trên màn hình hẹp.',
    ],
    tr: [
      'Yükleme ve hata kartları kitaplıkla aynı görsel, boşluk ve yazıları kullanır. Yeniden dene ve kapat dar ekranlarda erişilebilir kalır.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
