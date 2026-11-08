import type { Language } from './i18n';
export const AUDIO_STORAGE_FULL: Record<Language, string> = {
  ko: '새 음원을 저장할 공간이 부족해 추가하지 않았습니다. 이미 저장된 곡은 지우지 않았습니다.',
  en: 'There is not enough space to save new audio, so it was not added. Existing songs were not deleted.',
  ja: '新しい音源を保存する空き容量が足りないため追加しませんでした。保存済みの曲は削除していません。',
  zh: '没有足够空间保存新音频，因此未添加。已保存的歌曲未被删除。',
  es: 'No hay espacio suficiente para guardar audio nuevo, así que no se añadió. Las canciones guardadas no se borraron.',
  pt: 'Não há espaço suficiente para salvar novo áudio, por isso ele não foi adicionado. As músicas salvas não foram apagadas.',
  fr: "Il manque de la place pour enregistrer un nouveau son. Il n'a pas été ajouté et les morceaux enregistrés n’ont pas été supprimés.",
  de: 'Für neues Audio ist nicht genug Speicher frei. Es wurde nicht hinzugefügt und gespeicherte Songs wurden nicht gelöscht.',
  ru: 'Недостаточно места для нового аудио, поэтому оно не добавлено. Сохранённые песни не удалены.',
  id: 'Ruang untuk menyimpan audio baru tidak cukup, jadi audio tidak ditambahkan. Lagu tersimpan tidak dihapus.',
  vi: 'Không đủ chỗ lưu âm thanh mới nên chưa thêm. Các bài đã lưu không bị xóa.',
  tr: 'Yeni sesi kaydetmek için yeterli alan yok, bu yüzden eklenmedi. Kayıtlı şarkılar silinmedi.',
  it: "Non c'è spazio sufficiente per salvare nuovo audio, quindi non è stato aggiunto. I brani salvati non sono stati eliminati.",
};
