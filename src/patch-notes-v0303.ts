import type { Language } from './i18n';
export const PATCH_V0303 = {
  version: '0.3.3',
  date: '2026-11-10',
  notes: {
    en: [
      'Songs removed from the list now disappear immediately. Saved audio, results and replays stay on this device.',
    ],
    ko: [
      '목록에서 삭제한 곡이 즉시 사라지도록 수정했습니다. 저장된 음원·결과·리플레이는 기기에 그대로 유지됩니다.',
    ],
    ja: [
      '一覧から削除した曲がすぐに非表示になるよう修正しました。保存済みの音声・結果・リプレイは端末に残ります。',
    ],
    zh: [
      '修复了从列表移除歌曲后未立即隐藏的问题。已保存的音频、成绩和回放仍保留在设备上。',
    ],
    es: [
      'Las canciones quitadas de la lista desaparecen al instante. El audio, los resultados y las repeticiones guardados permanecen en el dispositivo.',
    ],
    fr: [
      'Les morceaux retirés de la liste disparaissent immédiatement. Audio, résultats et replays enregistrés restent sur cet appareil.',
    ],
    de: [
      'Aus der Liste entfernte Songs verschwinden jetzt sofort. Gespeicherte Audiodaten, Ergebnisse und Replays bleiben auf diesem Gerät.',
    ],
    pt: [
      'As músicas removidas da lista desaparecem imediatamente. Áudio, resultados e replays salvos permanecem neste dispositivo.',
    ],
    it: [
      'I brani rimossi dalla lista scompaiono subito. Audio, risultati e replay salvati restano sul dispositivo.',
    ],
    ru: [
      'Удалённые из списка композиции теперь исчезают сразу. Сохранённые аудио, результаты и повторы остаются на устройстве.',
    ],
    id: [
      'Lagu yang dihapus dari daftar kini langsung hilang. Audio, hasil, dan replay tersimpan tetap ada di perangkat ini.',
    ],
    vi: [
      'Bài hát được xóa khỏi danh sách giờ biến mất ngay. Âm thanh, kết quả và bản phát lại đã lưu vẫn còn trên thiết bị.',
    ],
    tr: [
      'Listeden kaldırılan şarkılar artık hemen kaybolur. Kaydedilmiş ses, sonuçlar ve tekrarlar bu cihazda kalır.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
