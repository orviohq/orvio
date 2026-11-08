import type { Language } from './i18n';
export const AUDIO_STORAGE_FULL: Record<Language, string> = {
  ko: '서버의 음원 저장 한도에 걸려 새 곡을 추가하지 않았습니다. 이미 저장된 곡은 지우지 않았습니다.',
  en: "The server's audio storage limit was reached, so the new song was not added. Your saved songs were not deleted.",
  ja: 'サーバーの音源保存上限に達したため、新しい曲を追加しませんでした。保存済みの曲は削除していません。',
  zh: '服务器音频存储已达上限，未添加新曲目。已保存的曲目没有被删除。',
  es: 'Se alcanzó el límite de almacenamiento de audio del servidor y no se añadió la nueva canción. Tus canciones guardadas no se borraron.',
  fr: 'La limite de stockage audio du serveur a été atteinte. Le nouveau morceau n’a pas été ajouté. Vos morceaux enregistrés n’ont pas été supprimés.',
  de: 'Das Audiospeicherlimit des Servers wurde erreicht. Der neue Song wurde nicht hinzugefügt. Deine gespeicherten Songs wurden nicht gelöscht.',
  pt: 'O limite de armazenamento de áudio do servidor foi atingido e a nova música não foi adicionada. Suas músicas salvas não foram excluídas.',
  it: 'È stato raggiunto il limite di archiviazione audio del server. Il nuovo brano non è stato aggiunto. I brani salvati non sono stati eliminati.',
  ru: 'Достигнут лимит хранения аудио на сервере. Новая песня не добавлена. Сохранённые песни не удалены.',
  id: 'Batas penyimpanan audio server tercapai, jadi lagu baru tidak ditambahkan. Lagu tersimpan Anda tidak dihapus.',
  tr: 'Sunucunun ses depolama sınırına ulaşıldığından yeni şarkı eklenmedi. Kayıtlı şarkılarınız silinmedi.',
  vi: 'Đã đạt giới hạn lưu âm thanh của máy chủ nên chưa thêm bài mới. Các bài đã lưu không bị xóa.',
};
