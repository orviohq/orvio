import type { Language } from './i18n';
export const PATCH_V0311 = { version: '0.3.11', date: '2026-11-10', notes: {
ko: ["새로고침 중에도 캐시에 저장된 YouTube 썸네일을 로딩 화면에 표시합니다. 저장된 음원과 채보는 변경하지 않습니다."],
en: ["Show cached YouTube thumbnails during refresh loading, without changing saved audio or charts."],
zh: ["刷新加载时显示已缓存的 YouTube 缩略图，不改变音频或谱面。"],
ja: ["再読み込み中もキャッシュ済みYouTube画像を表示します。音源と譜面は変更しません。"],
es: ["Mostrar miniaturas de YouTube en caché durante la recarga, sin cambiar audio ni mapas."],
fr: ["Afficher les images YouTube en cache pendant le rechargement, sans changer le son ni les partitions."],
de: ["Gespeicherte YouTube-Bilder beim Neuladen anzeigen; Audio und Notenkarten bleiben unverändert."],
pt: ["Mostrar miniaturas em cache durante a recarga, sem alterar áudio ou mapas."],
it: ["Mostra le miniature in cache durante il caricamento, senza modificare audio o mappe."],
ru: ["Показывать кэшированные миниатюры при перезагрузке, не меняя аудио и карты."],
id: ["Tampilkan thumbnail tersimpan saat memuat ulang, tanpa mengubah audio atau chart."],
tr: ["Yeniden yüklenirken önbellekteki küçük resimleri gösterir; ses ve haritalar değişmez."],
vi: ["Hiển thị ảnh thu nhỏ đã lưu khi tải lại, không đổi âm thanh hoặc bản nhạc."]
} satisfies Record<Language, string[]> };
