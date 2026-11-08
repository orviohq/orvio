import type { Language } from './i18n';
export const PATCH_V020 = {
  version: '0.2.20',
  date: '2026-11-08',
  notes: {
    en: [
      'NM, HD, MX and separate SC charts now show numeric levels in track selection and results. Levels are Orvio estimates; SC uses its own scale. Saved charts and replays stay unchanged.',
      'Automatic FEVER reaches ×5 with hold ticks and a separate FEVER combo. It adds no score bonus. Turn it off in settings before a session; replay keeps the recorded rules.',
    ],
    ko: [
      'NM·HD·MX와 별도 SC 채보의 숫자 레벨을 곡 선택과 결과 화면에 표시합니다. 레벨은 Orvio 자체 추정이며 SC는 별도 척도입니다. 저장된 채보와 리플레이는 그대로 유지됩니다.',
      '자동 피버가 롱노트 틱과 별도 피버 콤보로 최대 ×5까지 올라갑니다. 점수 보너스는 없습니다. 시작 전 설정에서 끌 수 있고 리플레이는 당시 규칙을 유지합니다.',
    ],
    zh: [
      '选曲和成绩显示 NM、HD、MX 和独立 SC 谱面的数字等级。等级是 Orvio 的估计，SC 使用独立尺度。已存谱面和回放不变。',
      '自动 FEVER 通过长按计数和独立连击升至 ×5，不增加分数。可在开始前关闭；回放保留录制时的规则。',
    ],
    ja: [
      '選曲とリザルトに NM・HD・MX と独立した SC 譜面の数値レベルを表示します。Orvio 独自の推定で、SC は別の尺度です。保存済み譜面とリプレイは変わりません。',
      '自動 FEVER はロングノートの刻みと別コンボで最大 ×5 になります。得点ボーナスはありません。開始前に設定で無効にでき、リプレイは記録時のルールを使います。',
    ],
    es: [
      'NM, HD, MX y mapas SC separados muestran niveles en selección y resultados. Son estimaciones de Orvio; SC usa otra escala. Los mapas y repeticiones guardados no cambian.',
      'FEVER automático llega a ×5 con notas largas y un combo separado, sin bonus de puntos. Se puede desactivar antes de jugar; la repetición conserva sus reglas.',
    ],
    fr: [
      'Les cartes NM, HD, MX et SC distinctes affichent leur niveau dans la sélection et les résultats. Ce sont des estimations Orvio, avec une échelle SC séparée. Les cartes et replays sauvegardés restent inchangés.',
      'FEVER automatique atteint ×5 avec les notes longues et un combo séparé, sans bonus de score. Désactivez-le avant de jouer ; le replay conserve ses règles.',
    ],
    de: [
      'NM, HD, MX und eigene SC-Charts zeigen Stufen in Auswahl und Ergebnis. Die Werte sind Orvio-Schätzungen; SC hat eine eigene Skala. Gespeicherte Charts und Replays bleiben unverändert.',
      'Automatisches FEVER erreicht mit langen Noten und einem eigenen Combo ×5, ohne Punktebonus. Vor dem Start abschaltbar; Replays behalten ihre Regeln.',
    ],
    pt: [
      'NM, HD, MX e mapas SC separados mostram níveis na seleção e nos resultados. São estimativas Orvio; SC usa outra escala. Mapas e repetições guardados não mudam.',
      'FEVER automático chega a ×5 com notas longas e combo separado, sem bónus de pontos. Pode ser desligado antes de jogar; a repetição mantém as suas regras.',
    ],
    it: [
      'NM, HD, MX e mappe SC separate mostrano livelli nella selezione e nei risultati. Sono stime Orvio; SC usa una scala separata. Mappe e replay salvati non cambiano.',
      'FEVER automatico arriva a ×5 con note lunghe e combo separata, senza bonus punti. Si può disattivare prima di giocare; il replay conserva le regole registrate.',
    ],
    ru: [
      'NM, HD, MX и отдельные карты SC показывают уровни в выборе и результатах. Это оценки Orvio; у SC своя шкала. Сохранённые карты и повторы не меняются.',
      'Автоматический FEVER достигает ×5 с длинными нотами и отдельным комбо, без бонуса к очкам. Его можно выключить до игры; повтор сохраняет записанные правила.',
    ],
    id: [
      'NM, HD, MX dan chart SC terpisah menampilkan level di pilihan lagu dan hasil. Level adalah perkiraan Orvio; SC memakai skala sendiri. Chart dan replay tersimpan tidak berubah.',
      'FEVER otomatis mencapai ×5 dengan nada panjang dan combo terpisah, tanpa bonus skor. Matikan sebelum bermain; replay mempertahankan aturan rekaman.',
    ],
    tr: [
      'NM, HD, MX ve ayrı SC haritaları seçimde ve sonuçlarda seviye gösterir. Bunlar Orvio tahminidir; SC ayrı ölçek kullanır. Kayıtlı haritalar ve tekrarlar değişmez.',
      'Otomatik FEVER uzun notalar ve ayrı kombo ile ×5 olur, puan bonusu vermez. Oyun öncesi kapatılabilir; tekrar kayıt kurallarını korur.',
    ],
    vi: [
      'NM, HD, MX và bản đồ SC riêng hiển thị cấp độ ở chọn bài và kết quả. Đây là ước tính Orvio; SC dùng thang riêng. Bản đồ và phát lại đã lưu không đổi.',
      'FEVER tự động đạt ×5 với nốt dài và combo riêng, không cộng điểm thưởng. Có thể tắt trước khi chơi; phát lại giữ quy tắc đã ghi.',
    ],
  } satisfies Record<Language, string[]>,
};
