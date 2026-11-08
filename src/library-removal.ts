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
              /^yt-[A-Za-z0-9_-]{11}-[a-f0-9]{16}(?:-c[a-f0-9]{16})?$/.test(id),
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
    'Remove this chart version from the list? Audio, results and replays stay saved. Adding the same link restores removed versions of this song.',
    'Remove',
    'Cancel',
    'Removed from list',
    'Could not save the list change. Nothing was removed.',
  ],
  ko: [
    '목록에서 삭제',
    '이 채보 버전을 목록에서 삭제할까요? 음원·기록·리플레이는 유지됩니다. 같은 링크를 추가하면 이 곡의 삭제한 버전이 다시 표시됩니다.',
    '삭제',
    '취소',
    '목록에서 삭제했습니다.',
    '목록 변경을 저장하지 못했습니다. 삭제하지 않았습니다.',
  ],
  zh: [
    '从列表移除',
    '从列表移除此谱面版本？音频、成绩和回放会保留。重新添加相同链接可恢复此曲移除的版本。',
    '移除',
    '取消',
    '已从列表移除',
    '无法保存列表更改，未移除任何内容。',
  ],
  ja: [
    '一覧から削除',
    'この譜面バージョンを一覧から削除しますか？音源・記録・リプレイは保持されます。同じリンクの追加で削除したバージョンを再表示できます。',
    '削除',
    'キャンセル',
    '一覧から削除しました',
    '一覧の変更を保存できませんでした。削除していません。',
  ],
  es: [
    'Quitar de la lista',
    '¿Quitar esta versión del mapa? El audio, resultados y repeticiones se conservan. Añadir el mismo enlace restaura las versiones quitadas de esta canción.',
    'Quitar',
    'Cancelar',
    'Quitado de la lista',
    'No se pudo guardar el cambio. No se quitó nada.',
  ],
  fr: [
    'Retirer de la liste',
    'Retirer cette version de la partition ? Audio, résultats et replays sont conservés. Ajouter le même lien restaure les versions retirées de ce morceau.',
    'Retirer',
    'Annuler',
    'Retiré de la liste',
    'Impossible de sauvegarder la modification. Rien n’a été retiré.',
  ],
  de: [
    'Aus Liste entfernen',
    'Diese Chart-Version entfernen? Audio, Ergebnisse und Replays bleiben gespeichert. Derselbe Link stellt entfernte Versionen dieses Songs wieder her.',
    'Entfernen',
    'Abbrechen',
    'Aus Liste entfernt',
    'Änderung konnte nicht gespeichert werden. Nichts wurde entfernt.',
  ],
  pt: [
    'Remover da lista',
    'Remover esta versão do mapa? Áudio, resultados e replays ficam salvos. Adicionar o mesmo link restaura as versões removidas desta música.',
    'Remover',
    'Cancelar',
    'Removido da lista',
    'Não foi possível salvar a alteração. Nada foi removido.',
  ],
  it: [
    'Rimuovi dalla lista',
    'Rimuovere questa versione della mappa? Audio, risultati e replay restano salvati. Aggiungendo lo stesso link si ripristinano le versioni rimosse del brano.',
    'Rimuovi',
    'Annulla',
    'Rimosso dalla lista',
    'Impossibile salvare la modifica. Nulla è stato rimosso.',
  ],
  ru: [
    'Убрать из списка',
    'Убрать эту версию карты? Аудио, результаты и повторы сохранятся. Добавление той же ссылки вернёт убранные версии этой песни.',
    'Убрать',
    'Отмена',
    'Убрано из списка',
    'Не удалось сохранить изменение. Ничего не убрано.',
  ],
  id: [
    'Hapus dari daftar',
    'Hapus versi chart ini dari daftar? Audio, hasil, dan replay tetap tersimpan. Menambahkan tautan yang sama memulihkan versi lagu yang dihapus.',
    'Hapus',
    'Batal',
    'Dihapus dari daftar',
    'Perubahan tidak dapat disimpan. Tidak ada yang dihapus.',
  ],
  tr: [
    'Listeden kaldır',
    'Bu nota haritası sürümü listeden kaldırılsın mı? Ses, sonuçlar ve tekrarlar saklanır. Aynı bağlantıyı eklemek kaldırılan sürümleri geri getirir.',
    'Kaldır',
    'İptal',
    'Listeden kaldırıldı',
    'Değişiklik kaydedilemedi. Hiçbir şey kaldırılmadı.',
  ],
  vi: [
    'Xóa khỏi danh sách',
    'Xóa phiên bản bản nhạc này khỏi danh sách? Âm thanh, kết quả và phát lại vẫn được lưu. Thêm lại cùng liên kết sẽ khôi phục các phiên bản đã xóa của bài này.',
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
