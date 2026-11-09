import type { Language } from './i18n';
export const PATCH_V0304 = {
  version: '0.3.4',
  date: '2026-11-10',
  notes: {
    en: [
      'Automatic YouTube charts now use the same chart engine for 4, 5, 6, 7 and 8 keys. Existing results and replays are preserved.',
    ],
    ko: [
      'YouTube 자동 채보가 4·5·6·7·8키 모두 같은 생성 엔진을 사용합니다. 기존 결과와 리플레이는 그대로 유지됩니다.',
    ],
    ja: [
      'YouTube の自動譜面が4・5・6・7・8キーで同じ生成エンジンを使うようになりました。既存の結果とリプレイは保持されます。',
    ],
    zh: [
      'YouTube 自动谱面的4、5、6、7、8键模式现使用同一生成引擎。已有成绩和回放保持不变。',
    ],
    es: [
      'Los mapas automáticos de YouTube usan el mismo motor para 4, 5, 6, 7 y 8 teclas. Se conservan los resultados y las repeticiones existentes.',
    ],
    fr: [
      'Les partitions automatiques YouTube utilisent le même moteur pour 4, 5, 6, 7 et 8 touches. Les résultats et replays existants sont conservés.',
    ],
    de: [
      'Automatische YouTube-Noten verwenden für 4, 5, 6, 7 und 8 Tasten dieselbe Engine. Vorhandene Ergebnisse und Replays bleiben erhalten.',
    ],
    pt: [
      'Os mapas automáticos do YouTube usam o mesmo motor para 4, 5, 6, 7 e 8 teclas. Resultados e replays existentes são preservados.',
    ],
    it: [
      'Le note automatiche di YouTube usano lo stesso motore per 4, 5, 6, 7 e 8 tasti. Risultati e replay esistenti restano invariati.',
    ],
    ru: [
      'Автоматические карты YouTube теперь используют единый движок для 4, 5, 6, 7 и 8 клавиш. Старые результаты и повторы сохраняются.',
    ],
    id: [
      'Chart otomatis YouTube kini memakai mesin yang sama untuk 4, 5, 6, 7, dan 8 tombol. Hasil dan replay yang ada tetap tersimpan.',
    ],
    vi: [
      'Bản nhạc tự động YouTube dùng cùng một bộ tạo cho 4, 5, 6, 7 và 8 phím. Kết quả và bản phát lại hiện có được giữ nguyên.',
    ],
    tr: [
      'Otomatik YouTube notaları artık 4, 5, 6, 7 ve 8 tuş için aynı motoru kullanır. Mevcut sonuçlar ve tekrarlar korunur.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
