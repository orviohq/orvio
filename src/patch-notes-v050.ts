import type { Language } from './i18n';
export const PATCH_V050 = {
  version: '0.2.50',
  date: '2026-11-09',
  notes: {
    en: [
      'Built-in songs now support 4, 5, 6, 7 and 8 keys.',
      'Set one eight-key layout and preview the centered keys for each mode. Existing custom five- and seven-key layouts are kept.',
    ],
    ko: [
      '기본 곡에서 4·5·6·7·8키를 선택할 수 있습니다.',
      '8키를 한 화면에서 설정하고 모드별 가운데 키를 확인할 수 있습니다. 기존 5·7키 사용자 설정은 유지됩니다.',
    ],
    ja: [
      '内蔵曲で4・5・6・7・8キーを選べます。',
      '8キーを一画面で設定し、各モードの中央キーを確認できます。既存の5・7キーのカスタム設定は保持されます。',
    ],
    zh: [
      '内置歌曲支持4、5、6、7和8键。',
      '在一个界面设置8键并预览各模式的居中按键。保留已有的5键和7键自定义设置。',
    ],
    es: [
      'Las canciones incluidas admiten 4, 5, 6, 7 y 8 teclas.',
      'Configura ocho teclas en una pantalla y revisa las teclas centrales de cada modo. Se conservan las configuraciones personalizadas de cinco y siete teclas.',
    ],
    fr: [
      'Les morceaux intégrés prennent en charge 4, 5, 6, 7 et 8 touches.',
      'Réglez les huit touches sur un écran et prévisualisez les touches centrales de chaque mode. Vos réglages personnalisés à cinq et sept touches sont conservés.',
    ],
    de: [
      'Integrierte Songs unterstützen 4, 5, 6, 7 und 8 Tasten.',
      'Lege acht Tasten auf einem Bildschirm fest und sieh die mittleren Tasten für jeden Modus. Eigene Belegungen für fünf und sieben Tasten bleiben erhalten.',
    ],
    pt: [
      'As músicas incluídas permitem 4, 5, 6, 7 e 8 teclas.',
      'Configure oito teclas numa tela e veja as teclas centrais de cada modo. As configurações personalizadas de cinco e sete teclas são mantidas.',
    ],
    it: [
      'I brani inclusi supportano 4, 5, 6, 7 e 8 tasti.',
      'Imposta otto tasti in una schermata e visualizza i tasti centrali di ogni modalità. Le impostazioni personalizzate a cinque e sette tasti vengono conservate.',
    ],
    ru: [
      'Встроенные песни поддерживают 4, 5, 6, 7 и 8 клавиш.',
      'Настройте восемь клавиш на одном экране и просмотрите центральные клавиши каждого режима. Свои настройки пяти и семи клавиш сохраняются.',
    ],
    id: [
      'Lagu bawaan mendukung 4, 5, 6, 7 dan 8 tombol.',
      'Atur delapan tombol pada satu layar dan lihat tombol tengah untuk setiap mode. Pengaturan khusus lima dan tujuh tombol tetap disimpan.',
    ],
    vi: [
      'Các bài hát có sẵn hỗ trợ 4, 5, 6, 7 và 8 phím.',
      'Đặt tám phím trên một màn hình và xem các phím ở giữa cho từng chế độ. Cài đặt riêng cho năm và bảy phím được giữ lại.',
    ],
    tr: [
      'Yerleşik şarkılar 4, 5, 6, 7 ve 8 tuşu destekler.',
      'Sekiz tuşu tek ekranda ayarlayın ve her modun ortadaki tuşlarını görün. Beş ve yedi tuş için özel ayarlarınız korunur.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
