import type { Language } from './i18n';
const KEY = 'orvio.library-hidden.v1';
export function hiddenLibraryIds(
  storage: Pick<Storage, 'getItem'> = localStorage,
): Set<string> {
  try {
    const value: unknown = JSON.parse(storage.getItem(KEY) ?? '[]');
    return new Set(
      Array.isArray(value)
        ? value.filter(
            (id): id is string =>
              typeof id === 'string' &&
              /^(?:yt:[A-Za-z0-9_-]{11}|yt-[A-Za-z0-9_-]{11}-[a-f0-9]{16}(?:-c[a-f0-9]{16})?)$/.test(
                id,
              ),
          )
        : [],
    );
  } catch {
    return new Set();
  }
}
export function saveHiddenLibraryIds(
  ids: Set<string>,
  storage: Pick<Storage, 'setItem' | 'getItem'> = localStorage,
) {
  const json = JSON.stringify([...ids].sort());
  storage.setItem(KEY, json);
  if (storage.getItem(KEY) !== json)
    throw Error('List change could not be saved');
}
const labels: Record<Language, string[]> = {
  en: [
    'Remove from list',
    'Remove this song from the list? Audio, results and replays stay saved. Adding the same link restores the song.',
    'Remove',
    'Cancel',
    'Removed from list',
    'Could not save the list change. Nothing was removed.',
  ],
  ko: [
    '목록에서 삭제',
    '이 곡을 목록에서 삭제할까요? 음원·기록·리플레이는 유지됩니다. 같은 링크를 추가하면 이 곡이 다시 표시됩니다.',
    '삭제',
    '취소',
    '목록에서 삭제했습니다.',
    '목록 변경을 저장하지 못했습니다. 삭제하지 않았습니다.',
  ],
  zh: [
    '从列表移除',
    '从列表移除此歌曲？音频、成绩和回放会保留。重新添加相同链接可恢复歌曲。',
    '移除',
    '取消',
    '已从列表移除',
    '无法保存列表更改，未移除任何内容。',
  ],
  ja: [
    '一覧から削除',
    'この曲を一覧から削除しますか？音源・記録・リプレイは保持されます。同じリンクの追加で曲を再表示できます。',
    '削除',
    'キャンセル',
    '一覧から削除しました',
    '一覧の変更を保存できませんでした。削除していません。',
  ],
  es: [
    'Quitar de la lista',
    '¿Quitar esta canción de la lista? El audio, resultados y repeticiones se conservan. Añadir el mismo enlace restaura la canción.',
    'Quitar',
    'Cancelar',
    'Quitado de la lista',
    'No se pudo guardar el cambio. No se quitó nada.',
  ],
  fr: [
    'Retirer de la liste',
    'Retirer ce morceau de la liste ? Audio, résultats et replays sont conservés. Ajouter le même lien restaure le morceau.',
    'Retirer',
    'Annuler',
    'Retiré de la liste',
    'Impossible de sauvegarder la modification. Rien n’a été retiré.',
  ],
  de: [
    'Aus Liste entfernen',
    'Diesen Song aus der Liste entfernen? Audio, Ergebnisse und Replays bleiben gespeichert. Derselbe Link stellt den Song wieder her.',
    'Entfernen',
    'Abbrechen',
    'Aus Liste entfernt',
    'Änderung konnte nicht gespeichert werden. Nichts wurde entfernt.',
  ],
  pt: [
    'Remover da lista',
    'Remover esta música da lista? Áudio, resultados e replays ficam salvos. Adicionar o mesmo link restaura a música.',
    'Remover',
    'Cancelar',
    'Removido da lista',
    'Não foi possível salvar a alteração. Nada foi removido.',
  ],
  it: [
    'Rimuovi dalla lista',
    'Rimuovere questo brano dalla lista? Audio, risultati e replay restano salvati. Lo stesso link ripristina il brano.',
    'Rimuovi',
    'Annulla',
    'Rimosso dalla lista',
    'Impossibile salvare la modifica. Nulla è stato rimosso.',
  ],
  ru: [
    'Убрать из списка',
    'Убрать эту песню из списка? Аудио, результаты и повторы сохранятся. Та же ссылка вернет песню в список.',
    'Убрать',
    'Отмена',
    'Убрано из списка',
    'Не удалось сохранить изменение. Ничего не убрано.',
  ],
  id: [
    'Hapus dari daftar',
    'Hapus lagu ini dari daftar? Audio, hasil, dan replay tetap tersimpan. Menambahkan tautan yang sama memulihkan lagu.',
    'Hapus',
    'Batal',
    'Dihapus dari daftar',
    'Perubahan tidak dapat disimpan. Tidak ada yang dihapus.',
  ],
  tr: [
    'Listeden kaldır',
    'Bu şarkı listeden kaldırılsın mı? Ses, sonuçlar ve tekrarlar kayıtlı kalır. Aynı bağlantıyı eklemek şarkıyı geri getirir.',
    'Kaldır',
    'İptal',
    'Listeden kaldırıldı',
    'Değişiklik kaydedilemedi. Hiçbir şey kaldırılmadı.',
  ],
  vi: [
    'Xóa khỏi danh sách',
    'Xóa bài hát này khỏi danh sách? Âm thanh, kết quả và bản phát lại vẫn được lưu. Thêm cùng liên kết sẽ khôi phục bài hát.',
    'Xóa',
    'Hủy',
    'Đã xóa khỏi danh sách',
    'Không lưu được thay đổi. Chưa xóa nội dung nào.',
  ],
};
export function removalLabels(language: Language) {
  const [button, prompt, confirm, cancel, removed, failed] = labels[language];
  return { button, prompt, confirm, cancel, removed, failed };
}
