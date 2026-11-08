import type { Language } from './i18n';
export const PATCH_V047 = {
  version: '0.2.47',
  date: '2026-11-09',
  notes: {
    en: [
      'Simultaneous audio loads now keep separate verification, cancellation and buffer ownership. Canceling or transferring one load cannot affect another.',
    ],
    ko: [
      '여러 음원을 동시에 불러올 때 각 요청을 따로 확인하고 취소합니다. 한 요청을 취소하거나 음원을 처리해도 다른 요청에 영향을 주지 않습니다.',
    ],
    ja: [
      '同時に音源を読み込む際の検証とキャンセルを分離しました。一方の処理が他方に影響しません。',
    ],
    zh: ['同时加载音频时分别验证和取消，一个请求的处理不会影响另一个。'],
    es: [
      'Las cargas simultáneas de audio mantienen su propia verificación y cancelación. Una carga no afecta a otra.',
    ],
    fr: [
      'Les chargements audio simultanés gardent leur propre vérification et annulation. Un chargement n’affecte pas les autres.',
    ],
    de: [
      'Gleichzeitige Audioladevorgänge werden getrennt geprüft und abgebrochen. Ein Vorgang beeinflusst keinen anderen.',
    ],
    pt: [
      'Carregamentos simultâneos de áudio têm verificação e cancelamento separados. Um não afeta o outro.',
    ],
    it: [
      'I caricamenti audio simultanei hanno verifiche e annullamenti separati. Uno non influisce sugli altri.',
    ],
    ru: [
      'Проверка и отмена одновременных загрузок аудио разделены. Одна загрузка не влияет на другую.',
    ],
    id: [
      'Pemuatan audio bersamaan memiliki pemeriksaan dan pembatalan terpisah. Satu pemuatan tidak memengaruhi yang lain.',
    ],
    vi: [
      'Các lần tải âm thanh đồng thời được kiểm tra và hủy riêng biệt. Một lần tải không ảnh hưởng đến lần khác.',
    ],
    tr: [
      'Eşzamanlı ses yüklemeleri ayrı doğrulanır ve iptal edilir. Bir yükleme diğerini etkilemez.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
