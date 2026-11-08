import type { Language } from './i18n';
export const PATCH_V031 = {
  version: '0.2.31',
  date: '2026-11-09',
  notes: {
    ko: [
      'Safari에서 미리듣기와 리플레이 음악 재생을 개선했습니다.',
      '일부 브라우저에서 리플레이 진행이 멈추는 문제를 수정했습니다.',
    ],
    en: [
      'Improve music playback for previews and replays in Safari.',
      'Fix replay progress freezing in some browsers.',
    ],
    ja: [
      'Safariでプレビューとリプレイの音楽再生を改善しました。',
      '一部のブラウザーでリプレイの進行が止まる問題を修正しました。',
    ],
    zh: [
      '改善Safari中的试听和回放音乐播放。',
      '修复部分浏览器中回放进度停滞的问题。',
    ],
    es: [
      'Mejoras en la música de las vistas previas y repeticiones en Safari.',
      'Corregido el bloqueo del avance de las repeticiones en algunos navegadores.',
    ],
    fr: [
      'Amélioration de la musique des aperçus et des replays dans Safari.',
      'Correction du blocage de la progression des replays dans certains navigateurs.',
    ],
    de: [
      'Musikwiedergabe für Vorschau und Replays in Safari verbessert.',
      'Stillstehender Replay-Fortschritt in einigen Browsern behoben.',
    ],
    pt: [
      'Melhorias na música das prévias e replays no Safari.',
      'Corrigido o travamento do progresso dos replays em alguns navegadores.',
    ],
    it: [
      'Migliorata la musica delle anteprime e dei replay in Safari.',
      'Risolto il blocco dei replay in alcuni browser.',
    ],
    ru: [
      'Улучшено воспроизведение музыки в предпросмотре и повторах Safari.',
      'Исправлена остановка повтора в некоторых браузерах.',
    ],
    id: [
      'Pemutaran musik pratinjau dan replay di Safari ditingkatkan.',
      'Memperbaiki progres replay yang berhenti di beberapa browser.',
    ],
    vi: [
      'Cải thiện phát nhạc xem trước và phát lại trên Safari.',
      'Sửa lỗi tiến trình phát lại bị dừng trên một số trình duyệt.',
    ],
    tr: [
      'Safari önizleme ve tekrar müziği iyileştirildi.',
      'Bazı tarayıcılarda tekrar ilerlemesinin donması düzeltildi.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
