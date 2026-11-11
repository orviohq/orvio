import type { Language } from './i18n';

export const PATCH_V0318 = {
  version: '0.3.18',
  date: '2026-11-11',
  notes: {
    ko: ['로컬에 저장된 YouTube 곡에서 곡 공유 동작이 누락되는 문제를 수정했습니다.'],
    en: ['Fixed the missing Share song action for locally saved YouTube songs.'],
    zh: ['修复了本地保存的 YouTube 歌曲缺少“分享歌曲”操作的问题。'],
    ja: ['ローカルに保存したYouTubeの曲で「曲を共有」操作が表示されない不具合を修正しました。'],
    es: ['Se corrigió la ausencia de la acción Compartir canción para las canciones de YouTube guardadas localmente.'],
    fr: ['Correction de l’absence de l’action Partager le morceau pour les morceaux YouTube enregistrés localement.'],
    de: ['Die fehlende Aktion „Song teilen“ für lokal gespeicherte YouTube-Songs wurde wiederhergestellt.'],
    pt: ['Corrigida a ausência da ação Compartilhar música para músicas do YouTube salvas localmente.'],
    it: ['Corretta l’assenza dell’azione Condividi brano per i brani di YouTube salvati localmente.'],
    ru: ['Исправлено отсутствие действия «Поделиться песней» для локально сохранённых песен с YouTube.'],
    id: ['Memperbaiki tindakan Bagikan lagu yang hilang untuk lagu YouTube yang disimpan secara lokal.'],
    tr: ['Yerel olarak kaydedilmiş YouTube şarkılarında eksik olan Şarkıyı paylaş eylemi düzeltildi.'],
    vi: ['Đã sửa lỗi thiếu thao tác Chia sẻ bài hát cho các bài hát YouTube được lưu cục bộ.'],
  } satisfies Record<Language, string[]>,
};
