import type { Language } from './i18n';
export const PATCH_V052 = {
  version: '0.2.52',
  date: '2026-11-09',
  notes: {
    en: [
      'The finished result and its reopened view now use the same settled appearance. The rank panel has straight corners; the intro animation and existing replays are preserved.',
    ],
    ko: [
      '플레이 직후 결과와 다시 연 결과가 같은 모습으로 표시되도록 고쳤습니다. 랭크 상자의 모서리를 반듯하게 다듬었으며, 등장 연출과 기존 리플레이는 유지됩니다.',
    ],
    ja: [
      'プレイ直後と再表示した結果の見た目を揃えました。ランク枠を角型にし、登場アニメーションと既存のリプレイは維持しています。',
    ],
    zh: [
      '修正了完成游戏后与重新打开的结果外观差异。评级框改为直角，保留入场动画和已有回放。',
    ],
    es: [
      'El resultado al terminar y al volver a abrirlo tiene el mismo aspecto final. El panel de rango tiene esquinas rectas; se conservan la animación de entrada y las repeticiones existentes.',
    ],
    fr: [
      "Le résultat affiché en fin de partie et celui rouvert ont le même aspect final. Le cadre du rang a des angles droits ; l'animation et les replays existants sont conservés.",
    ],
    de: [
      'Das Ergebnis nach dem Spiel und beim erneuten Öffnen sieht gleich aus. Das Rangfeld hat gerade Ecken; die Animation und vorhandene Replays bleiben erhalten.',
    ],
    pt: [
      'O resultado ao terminar e ao reabrir tem a mesma aparência final. O painel de classificação tem cantos retos; a animação e os replays existentes foram mantidos.',
    ],
    it: [
      'Il risultato a fine partita e alla riapertura ha lo stesso aspetto finale. Il riquadro del grado ha angoli retti; animazione e replay esistenti restano invariati.',
    ],
    ru: [
      'Результат после игры и при повторном открытии выглядит одинаково. У панели ранга прямые углы; анимация появления и существующие повторы сохранены.',
    ],
    id: [
      'Hasil setelah bermain dan saat dibuka kembali kini tampil sama. Panel peringkat memakai sudut siku; animasi masuk dan replay yang ada tetap dipertahankan.',
    ],
    vi: [
      'Kết quả khi chơi xong và khi mở lại có cùng giao diện cuối cùng. Khung xếp hạng dùng góc vuông; hiệu ứng xuất hiện và bản phát lại cũ được giữ nguyên.',
    ],
    tr: [
      'Oyun sonundaki ve yeniden açılan sonuç aynı görünür. Derece panelinin köşeleri düzdür; giriş animasyonu ve mevcut tekrarlar korunur.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
