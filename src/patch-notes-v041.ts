import type { Language } from './i18n';
export const PATCH_V041 = {
  version: '0.2.41',
  date: '2026-11-09',
  notes: {
    en: [
      'Failed YouTube additions now keep artwork, error text and retry/remove actions readable on small screens. Short-screen keyboard settings keep reset controls visible.',
    ],
    ko: [
      'YouTube 추가 실패 시 썸네일·오류 안내·다시 시도·삭제 버튼을 작은 화면에서도 읽기 쉽게 정리했습니다. 작은 화면의 키 설정에서도 초기화 버튼이 잘리지 않습니다.',
    ],
    ja: [
      'YouTube追加失敗時の画像、案内、再試行・削除を小さい画面でも見やすく整理。キー設定のリセットも画面内に収めました。',
    ],
    zh: [
      '整理YouTube添加失败时的封面、错误提示、重试和删除按钮，小屏幕也清晰可读。按键设置的重置按钮不再被裁切。',
    ],
    es: [
      'Los errores al añadir YouTube muestran imagen, mensaje y acciones legibles en pantallas pequeñas. Restablecer teclas permanece visible.',
    ],
    fr: [
      'Les ajouts YouTube échoués gardent image, message et actions lisibles sur petit écran. Réinitialiser les touches reste visible.',
    ],
    de: [
      'Fehlgeschlagene YouTube-Importe zeigen Bild, Hinweis und Aktionen auch auf kleinen Bildschirmen lesbar. Zurücksetzen bleibt sichtbar.',
    ],
    pt: [
      'Falhas ao adicionar YouTube mantêm imagem, aviso e ações legíveis em telas pequenas. Redefinir teclas continua visível.',
    ],
    it: [
      'Gli errori di aggiunta YouTube mostrano immagine, avviso e azioni leggibili su schermi piccoli. Il ripristino dei tasti resta visibile.',
    ],
    ru: [
      'Изображение, ошибка и кнопки неудачного добавления YouTube удобнее на малых экранах. Сброс клавиш остаётся видимым.',
    ],
    id: [
      'Gambar, pesan gagal, coba lagi dan hapus tetap terbaca di layar kecil. Reset tombol tetap terlihat.',
    ],
    vi: [
      'Ảnh, lỗi và nút thử lại/xóa khi thêm YouTube rõ ràng hơn trên màn hình nhỏ. Nút đặt lại phím luôn hiển thị.',
    ],
    tr: [
      'Başarısız YouTube eklemelerinde görsel, hata ve işlemler küçük ekranda okunur. Tuşları sıfırlama görünür kalır.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
