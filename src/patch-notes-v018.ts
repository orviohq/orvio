import type { Language } from './i18n';
export const PATCH_V018 = {
  version: '0.2.18',
  date: '2026-11-08',
  notes: {
    en: [
      'Fixed key highlights shifting to a different lane after playing again, including custom keys and switching between 5 KEY and 7 KEY.',
    ],
    ko: [
      '다시 플레이할 때 키를 누른 표시가 다른 칸에 나타나는 문제를 수정했습니다. 키 설정과 5 KEY·7 KEY 전환 후에도 맞는 칸에 표시됩니다.',
    ],
    zh: [
      '修复再次游玩后按键提示位置偏移的问题，自定义按键和切换 5 KEY、7 KEY 后也会显示在正确轨道。',
    ],
    ja: [
      '2回目以降のプレイでキー表示が別のレーンにずれる問題を修正。キー設定や5 KEY・7 KEY切り替え後も正しいレーンに表示されます。',
    ],
    es: [
      'Corregido el desplazamiento de la luz de las teclas al volver a jugar, también con teclas personalizadas y al cambiar entre 5 KEY y 7 KEY.',
    ],
    fr: [
      'Les touches restent sur la bonne voie après une nouvelle partie, même avec des touches personnalisées ou en passant de 5 KEY à 7 KEY.',
    ],
    de: [
      'Tasten leuchten nach erneutem Spielen wieder auf der richtigen Bahn, auch mit eigenen Tasten und beim Wechsel zwischen 5 KEY und 7 KEY.',
    ],
    pt: [
      'Corrigida a luz das teclas na faixa errada ao jogar de novo, incluindo teclas personalizadas e a troca entre 5 KEY e 7 KEY.',
    ],
    it: [
      'Corretta la luce dei tasti nella corsia sbagliata dopo una nuova partita, anche con tasti personalizzati e passando tra 5 KEY e 7 KEY.',
    ],
    ru: [
      'Исправлено смещение подсветки клавиш на другую дорожку при повторной игре, включая свои клавиши и смену 5 KEY и 7 KEY.',
    ],
    id: [
      'Sorotan tombol tidak lagi bergeser ke jalur lain saat bermain lagi, termasuk tombol khusus dan pergantian 5 KEY atau 7 KEY.',
    ],
    tr: [
      'Yeniden oynarken tuş ışığının başka şeride kayması düzeltildi; özel tuşlar ve 5 KEY ile 7 KEY geçişleri de desteklenir.',
    ],
    vi: [
      'Đã sửa lỗi đèn phím lệch sang làn khác khi chơi lại, kể cả với phím tùy chỉnh và khi chuyển giữa 5 KEY và 7 KEY.',
    ],
  } satisfies Record<Language, string[]>,
};
