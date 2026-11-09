import type { Language } from './i18n';
export const PATCH_V0301 = {
  version: '0.3.1',
  date: '2026-11-09',
  notes: {
    en: [
      'Fixed shared result and replay links opening the song list instead of the result.',
    ],
    ko: [
      '결과·리플레이 공유 링크를 열 때 결과 대신 곡 선택 화면으로 이동하던 문제를 수정했습니다.',
    ],
    ja: [
      '結果・リプレイの共有リンクで結果ではなく曲選択画面が開く問題を修正しました。',
    ],
    zh: ['修复了成绩和回放分享链接打开选曲界面而非成绩的问题。'],
    es: [
      'Corregido un fallo que abría la lista de canciones en vez del resultado al abrir enlaces de resultados y repeticiones.',
    ],
    fr: [
      'Correction des liens de résultat et de replay qui ouvraient la liste des morceaux au lieu du résultat.',
    ],
    de: [
      'Ergebnis- und Replay-Links öffnen wieder das Ergebnis statt der Titelliste.',
    ],
    pt: [
      'Corrigidos os links de resultados e replays que abriam a lista de músicas em vez do resultado.',
    ],
    it: [
      'Corretti i link di risultati e replay che aprivano la lista dei brani invece del risultato.',
    ],
    ru: [
      'Исправлены ссылки на результаты и повторы, открывавшие список композиций вместо результата.',
    ],
    id: [
      'Memperbaiki tautan hasil dan replay yang membuka daftar lagu, bukan hasil.',
    ],
    vi: [
      'Sửa lỗi liên kết kết quả và bản phát lại mở danh sách bài hát thay vì kết quả.',
    ],
    tr: [
      'Sonuç yerine şarkı listesini açan sonuç ve tekrar bağlantıları düzeltildi.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
