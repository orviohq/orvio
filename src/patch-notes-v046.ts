import type { Language } from './i18n';
export const PATCH_V046 = {
  version: '0.2.46',
  date: '2026-11-09',
  notes: {
    en: [
      'Previously viewed results and replay collections appear from saved display data when reloaded, without waiting for another request. The replay collection is now named Replay. Playback still verifies the saved session and audio.',
    ],
    ko: [
      '한 번 확인한 결과와 리플레이 목록은 새로고침 시 저장한 화면을 먼저 표시합니다. 로컬 리플레이 이름을 리플레이로 바꿨으며, 실제 재생 전에는 저장된 기록과 음원을 확인합니다.',
    ],
    ja: [
      '一度表示した結果とリプレイ一覧は再読み込み時に保存表示を先に出します。ローカルリプレイの名前をリプレイに変更しました。',
    ],
    zh: [
      '刷新时先显示已查看过的结果和回放列表。“本地回放”改为“回放”，播放前仍验证记录和音频。',
    ],
    es: [
      'Los resultados y las repeticiones ya vistos aparecen desde los datos guardados al recargar. La colección ahora se llama Repeticiones.',
    ],
    fr: [
      'Les résultats et replays déjà consultés sont affichés depuis les données enregistrées au rechargement. La collection se nomme désormais Replays.',
    ],
    de: [
      'Bereits angezeigte Ergebnisse und Replays erscheinen beim Neuladen aus gespeicherten Anzeigedaten. Die Sammlung heißt jetzt Replays.',
    ],
    pt: [
      'Resultados e replays já vistos aparecem dos dados salvos ao recarregar. A coleção agora se chama Replays.',
    ],
    it: [
      'Risultati e replay già visualizzati appaiono dai dati salvati al ricaricamento. La raccolta si chiama ora Replay.',
    ],
    ru: [
      'При обновлении ранее просмотренные результаты и повторы сначала показываются из сохранённых данных. Раздел теперь называется Повторы.',
    ],
    id: [
      'Hasil dan daftar replay yang pernah dilihat muncul dari data tersimpan saat dimuat ulang. Nama koleksi kini Replay.',
    ],
    vi: [
      'Kết quả và danh sách phát lại đã xem được hiển thị từ dữ liệu lưu khi tải lại. Bộ sưu tập nay có tên Phát lại.',
    ],
    tr: [
      'Daha önce görüntülenen sonuçlar ve tekrarlar yenilemede kayıtlı görüntü verilerinden açılır. Koleksiyonun adı artık Tekrarlar.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
