import type { Language } from './i18n';
export const PATCH_V049 = {
  version: '0.2.49',
  date: '2026-11-09',
  notes: {
    en: [
      'Older score-only result links can be shared again. Replays and saved charts are unchanged.',
    ],
    ko: [
      '구형 점수 전용 결과 링크를 다시 공유할 수 있습니다. 리플레이와 저장된 채보는 변경되지 않습니다.',
    ],
    ja: [
      '旧形式のスコア専用結果リンクを再び共有できます。リプレイと保存済み譜面は変わりません。',
    ],
    zh: ['旧版仅含分数的结果链接可再次分享。回放与已保存谱面保持不变。'],
    es: [
      'Los enlaces antiguos de resultados sin repetición se pueden compartir de nuevo. Las repeticiones y los mapas guardados no cambian.',
    ],
    fr: [
      'Les anciens liens de résultats sans replay peuvent à nouveau être partagés. Les replays et partitions sauvegardés ne changent pas.',
    ],
    de: [
      'Ältere Ergebnislinks ohne Replay lassen sich wieder teilen. Replays und gespeicherte Notenmuster bleiben unverändert.',
    ],
    pt: [
      'Links antigos de resultados sem replay podem ser compartilhados novamente. Replays e mapas salvos não mudam.',
    ],
    it: [
      'I vecchi link dei risultati senza replay si possono condividere di nuovo. Replay e mappe salvate restano invariati.',
    ],
    ru: [
      'Старые ссылки на результаты без повтора снова можно отправлять. Повторы и сохранённые карты не изменены.',
    ],
    id: [
      'Tautan hasil lama tanpa replay dapat dibagikan lagi. Replay dan peta nada tersimpan tidak berubah.',
    ],
    vi: [
      'Có thể chia sẻ lại liên kết kết quả cũ không có bản phát lại. Bản phát lại và bản nhạc đã lưu không thay đổi.',
    ],
    tr: [
      'Tekrar içermeyen eski sonuç bağlantıları yeniden paylaşılabilir. Tekrarlar ve kayıtlı notalar değişmez.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
