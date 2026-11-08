import type { Language } from './i18n';
export const LOCAL_GENERATION_ERRORS = {
  en: [
    'The audio for this song is not available yet. Your saved songs were kept.',
    'Adding songs is currently unavailable. Your saved songs were kept.',
  ],
  ko: [
    '아직 준비된 음원이 없는 곡입니다. 저장된 곡은 그대로 유지됩니다.',
    '지금은 곡 추가를 사용할 수 없습니다. 저장된 곡은 그대로 유지됩니다.',
  ],
  ja: [
    'この曲の音源はまだ利用できません。保存済みの曲は保持されます。',
    '現在、曲を追加できません。保存済みの曲は保持されます。',
  ],
  zh: [
    '此歌曲的音频尚不可用。已保留保存的歌曲。',
    '目前无法添加歌曲。已保留保存的歌曲。',
  ],
  es: [
    'El audio de esta canción aún no está disponible. Tus canciones guardadas se conservan.',
    'No se pueden añadir canciones ahora. Tus canciones guardadas se conservan.',
  ],
  fr: [
    'L’audio de ce morceau n’est pas encore disponible. Vos morceaux enregistrés sont conservés.',
    'L’ajout de morceaux est indisponible pour le moment. Vos morceaux sont conservés.',
  ],
  de: [
    'Das Audio dieses Songs ist noch nicht verfügbar. Gespeicherte Songs bleiben erhalten.',
    'Songs können gerade nicht hinzugefügt werden. Gespeicherte Songs bleiben erhalten.',
  ],
  pt: [
    'O áudio desta música ainda não está disponível. Suas músicas salvas foram mantidas.',
    'Não é possível adicionar músicas agora. Suas músicas salvas foram mantidas.',
  ],
  it: [
    'L’audio di questo brano non è ancora disponibile. I brani salvati sono conservati.',
    'Al momento non è possibile aggiungere brani. I brani salvati sono conservati.',
  ],
  ru: [
    'Аудио этой песни пока недоступно. Сохранённые песни не изменены.',
    'Добавление песен сейчас недоступно. Сохранённые песни не изменены.',
  ],
  id: [
    'Audio lagu ini belum tersedia. Lagu tersimpan tetap dipertahankan.',
    'Penambahan lagu sedang tidak tersedia. Lagu tersimpan tetap dipertahankan.',
  ],
  vi: [
    'Âm thanh của bài này chưa có sẵn. Các bài đã lưu được giữ nguyên.',
    'Hiện không thể thêm bài hát. Các bài đã lưu được giữ nguyên.',
  ],
  tr: [
    'Bu şarkının sesi henüz kullanılamıyor. Kayıtlı şarkılarınız korundu.',
    'Şu anda şarkı eklenemiyor. Kayıtlı şarkılarınız korundu.',
  ],
} satisfies Record<Language, [string, string]>;
