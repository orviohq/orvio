import type { Language } from './i18n';
export const PATCH_V025 = {
  version: '0.2.25',
  date: '2026-11-08',
  notes: {
    ko: [
      '준비하지 못한 YouTube 곡도 목록에서 삭제할 수 있습니다. 음원·기록·리플레이는 유지됩니다. 곡별로 이 기기에 음원이 남아 있는지 확인할 수 있습니다.',
    ],
    en: [
      'YouTube songs that are not ready can now be removed from the list without erasing audio, results or replays. Check each song for audio saved on this device.',
    ],
    ja: [
      '準備できていないYouTube曲も一覧から削除できます。音源・記録・リプレイは保持されます。曲ごとに端末の保存音源を確認できます。',
    ],
    zh: [
      '尚未准备好的YouTube歌曲也可从列表移除，音频、成绩和回放会保留。可逐曲检查此设备的已保存音频。',
    ],
    es: [
      'Las canciones de YouTube que aún no están listas se pueden quitar de la lista sin borrar audio, resultados ni repeticiones. Comprueba el audio guardado en este dispositivo para cada canción.',
    ],
    pt: [
      'Músicas do YouTube ainda não prontas podem ser removidas da lista sem apagar áudio, resultados ou replays. Verifique o áudio salvo neste dispositivo para cada música.',
    ],
    fr: [
      'Les morceaux YouTube non prêts peuvent être retirés de la liste sans effacer le son, les résultats ou les replays. Vérifiez le son enregistré sur cet appareil pour chaque morceau.',
    ],
    de: [
      'Noch nicht bereite YouTube-Songs lassen sich aus der Liste entfernen. Audio, Ergebnisse und Replays bleiben erhalten. Prüfe je Song das auf diesem Gerät gespeicherte Audio.',
    ],
    ru: [
      'Неготовые песни YouTube можно убрать из списка, сохранив аудио, результаты и повторы. Для каждой песни можно проверить аудио в памяти устройства.',
    ],
    id: [
      'Lagu YouTube yang belum siap dapat dihapus dari daftar tanpa menghapus audio, hasil, atau replay. Periksa audio tersimpan di perangkat ini untuk tiap lagu.',
    ],
    vi: [
      'Có thể xóa bài YouTube chưa sẵn sàng khỏi danh sách mà vẫn giữ âm thanh, kết quả và bản phát lại. Kiểm tra âm thanh đã lưu trên thiết bị cho từng bài.',
    ],
    tr: [
      'Henüz hazır olmayan YouTube şarkıları ses, sonuç ve tekrarlar silinmeden listeden kaldırılabilir. Her şarkı için bu cihazda kayıtlı sesi kontrol edin.',
    ],
    it: [
      "I brani YouTube non ancora pronti si possono rimuovere dalla lista senza eliminare audio, risultati o replay. Controlla per ogni brano l'audio salvato sul dispositivo.",
    ],
  } satisfies Record<Language, string[]>,
};
