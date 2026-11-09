import type { Language } from './i18n';
export const PATCH_V0302 = {
  version: '0.3.2',
  date: '2026-11-10',
  notes: {
    en: [
      'Fixed a click-handling error after returning from a replay to the song list.',
    ],
    ko: [
      '리플레이에서 곡 목록으로 돌아온 뒤 클릭 오류가 발생하던 문제를 수정했습니다.',
    ],
    ja: [
      'リプレイから曲一覧に戻った後にクリックエラーが発生する問題を修正しました。',
    ],
    zh: ['修复了从回放返回歌曲列表后出现的点击错误。'],
    es: [
      'Corregido un error de clic tras volver de una repetición a la lista de canciones.',
    ],
    fr: [
      "Correction d'une erreur de clic après le retour d'un replay à la liste des morceaux.",
    ],
    de: [
      'Ein Klickfehler nach der Rückkehr vom Replay zur Titelliste wurde behoben.',
    ],
    pt: [
      'Corrigido um erro de clique após voltar de um replay para a lista de músicas.',
    ],
    it: [
      'Corretto un errore di clic dopo il ritorno da un replay alla lista dei brani.',
    ],
    ru: [
      'Исправлена ошибка обработки нажатий после возврата из повтора в список композиций.',
    ],
    id: [
      'Memperbaiki kesalahan klik setelah kembali dari replay ke daftar lagu.',
    ],
    vi: ['Sửa lỗi nhấp sau khi từ bản phát lại trở về danh sách bài hát.'],
    tr: [
      'Tekrardan şarkı listesine döndükten sonra oluşan tıklama hatası düzeltildi.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
