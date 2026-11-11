import type { Language } from './i18n';
export const PATCH_V0310 = {
  version: '0.3.10',
  date: '2026-11-10',
  notes: {
    en: [
      'Restore thumbnails for existing and newly added YouTube songs. Successfully cached images remain available offline, without changing saved audio or charts.',
    ],
    ko: [
      '기존 곡과 새로 추가한 YouTube 곡의 썸네일을 복구했습니다. 저장된 음원·채보는 그대로 유지하며, 캐시에 저장된 이미지는 오프라인에서도 표시합니다.',
    ],
    zh: [
      '恢复已有及新添加 YouTube 歌曲的缩略图。已缓存图片可离线显示，不改变已保存的音频和谱面。',
    ],
    ja: [
      '既存・新規追加のYouTube曲のサムネイルを復元しました。保存済み音源・譜面は変更せず、キャッシュ済み画像をオフラインでも表示します。',
    ],
    es: [
      'Se restauran las miniaturas de canciones de YouTube existentes y nuevas. Las imágenes guardadas en caché funcionan sin conexión, sin cambiar audio ni mapas guardados.',
    ],
    fr: [
      'Restauration des miniatures des morceaux YouTube existants et ajoutés. Les images en cache restent accessibles hors ligne, sans modifier le son ni les partitions enregistrés.',
    ],
    de: [
      'Vorschaubilder bestehender und neuer YouTube-Titel wiederhergestellt. Gespeicherte Bilder sind offline verfügbar; Audio und Notenkarten bleiben unverändert.',
    ],
    pt: [
      'Restauradas as miniaturas das músicas YouTube existentes e novas. As imagens em cache ficam disponíveis offline, sem alterar áudio ou mapas guardados.',
    ],
    it: [
      'Ripristinate le miniature dei brani YouTube esistenti e nuovi. Le immagini in cache sono disponibili offline, senza modificare audio o mappe salvati.',
    ],
    ru: [
      'Восстановлены миниатюры существующих и новых песен YouTube. Кэшированные изображения доступны офлайн без изменения сохранённых аудио и карт.',
    ],
    id: [
      'Thumbnail lagu YouTube lama dan baru dipulihkan. Gambar yang tersimpan di cache tersedia offline tanpa mengubah audio atau chart.',
    ],
    tr: [
      'Mevcut ve yeni YouTube şarkılarının küçük resimleri geri getirildi. Önbellekteki resimler çevrimdışı kullanılabilir; kayıtlı ses ve haritalar değişmez.',
    ],
    vi: [
      'Khôi phục ảnh thu nhỏ cho bài YouTube cũ và mới. Ảnh đã lưu trong bộ nhớ đệm vẫn hiển thị ngoại tuyến, không thay đổi âm thanh hay bản nhạc đã lưu.',
    ],
  } satisfies Record<Language, string[]>,
};
