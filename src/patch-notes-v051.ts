import type { Language } from './i18n';
export const PATCH_V051 = {
  version: '0.2.51',
  date: '2026-11-09',
  notes: {
    en: [
      'Reduced repeated work when preparing charts on this device. Notes, timing, judgments and existing replays are unchanged.',
    ],
    ko: [
      '기기에서 채보를 준비할 때 반복하는 계산을 줄였습니다. 노트, 타이밍, 판정과 기존 리플레이는 그대로입니다.',
    ],
    ja: [
      '端末で譜面を準備する際の重複計算を減らしました。ノート、タイミング、判定、既存のリプレイは変わりません。',
    ],
    zh: [
      '减少了设备准备谱面时的重复计算。音符、时序、判定和已有回放保持不变。',
    ],
    es: [
      'Se reducen los cálculos repetidos al preparar mapas en este dispositivo. Las notas, la sincronización, los juicios y las repeticiones existentes no cambian.',
    ],
    fr: [
      'Réduction des calculs répétés lors de la préparation des partitions sur cet appareil. Notes, timing, jugements et replays existants restent inchangés.',
    ],
    de: [
      'Weniger wiederholte Berechnungen beim Vorbereiten von Charts auf diesem Gerät. Noten, Timing, Wertungen und vorhandene Replays bleiben unverändert.',
    ],
    pt: [
      'Menos cálculos repetidos ao preparar mapas neste dispositivo. Notas, tempos, julgamentos e replays existentes não mudam.',
    ],
    it: [
      'Ridotti i calcoli ripetuti durante la preparazione dei tracciati sul dispositivo. Note, tempi, giudizi e replay esistenti restano invariati.',
    ],
    ru: [
      'Сокращены повторные вычисления при подготовке карт на устройстве. Ноты, тайминг, оценки и существующие повторы не изменены.',
    ],
    id: [
      'Mengurangi perhitungan berulang saat menyiapkan chart di perangkat ini. Not, waktu, penilaian, dan replay yang ada tidak berubah.',
    ],
    vi: [
      'Giảm phép tính lặp lại khi chuẩn bị bản đồ nốt trên thiết bị. Nốt, thời gian, phán định và bản phát lại cũ không thay đổi.',
    ],
    tr: [
      'Bu cihazda haritalar hazırlanırken tekrarlanan hesaplamalar azaltıldı. Notalar, zamanlama, değerlendirmeler ve mevcut tekrarlar değişmedi.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
