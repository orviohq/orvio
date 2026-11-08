import type { Language } from './i18n';
export const PATCH_V027 = {
  version: '0.2.27',
  date: '2026-11-08',
  notes: {
    en: [
      'A separate replay page brings together saved YouTube replays and original-song replays saved from this release onward. Browser storage errors are shown instead of an empty collection. Earlier unsaved original-song sessions cannot be restored.',
      'Remove a song from loading or error rows with right-click or keyboard controls, without deleting saved audio or replays. Original-song artwork keeps its full frame. Song preparation keeps the screen clear, and the YouTube input clears only after a successful addition. Failed or cancelled additions keep your input.',
    ],
    ko: [
      '저장된 YouTube 리플레이와 이번 버전부터 저장하는 오리지널 곡 리플레이를 별도 페이지에서 모아 봅니다. 브라우저 저장소를 읽지 못하면 빈 목록 대신 오류를 표시합니다. 이전에 저장되지 않은 오리지널 플레이는 복원되지 않습니다.',
      '불러오는 중이거나 오류가 난 곡도 우클릭이나 키보드로 목록에서 제거할 수 있습니다. 저장 음원과 리플레이는 지우지 않습니다. 오리지널 곡 이미지를 자르지 않고 표시하고 준비 화면을 정리했습니다. YouTube 입력은 추가 성공 후에만 비우며 실패하거나 취소하면 유지합니다.',
    ],
    ja: [
      '保存済みYouTubeリプレイと、この版から保存するオリジナル曲のリプレイを専用ページにまとめました。保存領域を読めない場合は空の一覧ではなくエラーを表示します。以前の未保存プレイは復元されません。',
      '読込中やエラーの曲も右クリックやキーボードで一覧から除外できます。保存音源とリプレイは削除しません。オリジナル曲の画像を切り取らずに表示し、準備画面を整理しました。YouTube入力は追加成功後だけ消去し、失敗や中止時は残します。',
    ],
    zh: [
      '独立回放页面汇总已保存的YouTube回放，以及从本版本起保存的原创曲目回放。无法读取浏览器存储时显示错误，而不是空列表。以前未保存的原创游戏无法恢复。',
      '加载中或出错的曲目也可通过右键或键盘从列表移除，不删除音频或回放。原创曲目图片完整显示，准备画面更简洁。YouTube输入仅在添加成功后清空，失败或取消时保留。',
    ],
    es: [
      'Una página reúne las repeticiones guardadas de YouTube y las de canciones originales guardadas desde esta versión. Los errores de almacenamiento se muestran en lugar de una lista vacía. No se recuperan sesiones originales que nunca se guardaron.',
      'Quita canciones en carga o con error mediante clic derecho o teclado sin borrar audio ni repeticiones. Las imágenes originales se muestran completas. Se simplifica la pantalla de preparación. La entrada de YouTube solo se borra al añadir correctamente; los fallos y cancelaciones la conservan.',
    ],
    fr: [
      'Une page regroupe les replays YouTube enregistrés et ceux des morceaux originaux sauvegardés à partir de cette version. Une erreur de stockage ne donne plus une liste vide. Les anciennes parties originales non enregistrées ne sont pas restaurées.',
      'Retirez une ligne en chargement ou en erreur par clic droit ou clavier sans effacer audio ni replays. Les images originales restent entières. La préparation est plus discrète. Le champ YouTube est vidé seulement après un ajout réussi, jamais après un échec ou une annulation.',
    ],
    de: [
      'Eine eigene Seite sammelt gespeicherte YouTube-Replays und ab dieser Version gespeicherte Replays eigener Songs. Speicherfehler erscheinen statt einer leeren Liste. Frühere ungespeicherte Original-Spiele werden nicht wiederhergestellt.',
      'Lade- und Fehlerzeilen lassen sich per Rechtsklick oder Tastatur ausblenden, ohne Audio oder Replays zu löschen. Originalbilder bleiben vollständig. Die Vorbereitung ist unauffälliger. Die YouTube-Eingabe wird nur nach erfolgreichem Hinzufügen geleert, nicht bei Fehler oder Abbruch.',
    ],
    pt: [
      'Uma página reúne replays salvos do YouTube e de músicas originais salvos a partir desta versão. Erros de armazenamento aparecem em vez de uma lista vazia. Partidas originais antigas que nunca foram salvas não são recuperadas.',
      'Remova linhas em carregamento ou com erro pelo botão direito ou teclado sem apagar áudio ou replays. As imagens originais ficam inteiras. A preparação fica mais discreta. A entrada do YouTube só é limpa após adicionar com sucesso; falhas e cancelamentos mantêm o texto.',
    ],
    it: [
      'Una pagina raccoglie i replay YouTube salvati e quelli dei brani originali salvati da questa versione. Gli errori di archiviazione appaiono al posto di una lista vuota. Le vecchie partite originali non salvate non vengono recuperate.',
      'Rimuovi righe in caricamento o in errore con clic destro o tastiera senza cancellare audio o replay. Le immagini originali restano intere. La preparazione è più discreta. Il campo YouTube si svuota solo dopo un aggiunta riuscita; errori e annullamenti conservano il testo.',
    ],
    ru: [
      'Отдельная страница объединяет сохранённые повторы YouTube и повторы оригинальных песен, записанные начиная с этой версии. Ошибки хранилища не выглядят как пустой список. Старые несохранённые игры не восстанавливаются.',
      'Уберите загружаемую или ошибочную строку правой кнопкой мыши или клавиатурой без удаления аудио и повторов. Оригинальные изображения видны целиком. Экран подготовки упрощён. Поле YouTube очищается только после успешного добавления, но не при ошибке или отмене.',
    ],
    id: [
      'Halaman khusus mengumpulkan replay YouTube tersimpan dan replay lagu orisinal yang disimpan mulai versi ini. Kesalahan penyimpanan ditampilkan, bukan daftar kosong. Sesi orisinal lama yang tidak disimpan tidak dapat dipulihkan.',
      'Hapus baris yang sedang dimuat atau bermasalah dari daftar dengan klik kanan atau keyboard tanpa menghapus audio atau replay. Gambar orisinal ditampilkan utuh. Layar persiapan dirapikan. Input YouTube hanya dikosongkan setelah berhasil ditambahkan, bukan saat gagal atau dibatalkan.',
    ],
    tr: [
      'Ayrı bir sayfa, kayıtlı YouTube tekrarlarını ve bu sürümden itibaren kaydedilen orijinal şarkı tekrarlarını bir araya getirir. Depolama hataları boş liste yerine gösterilir. Önceden kaydedilmemiş oyunlar geri getirilemez.',
      'Yüklenen veya hatalı satırları sağ tık ya da klavyeyle listeden kaldırın; ses ve tekrarlar silinmez. Orijinal görseller tam gösterilir. Hazırlık ekranı sadeleştirildi. YouTube alanı yalnızca başarılı eklemeden sonra temizlenir; hata ve iptalde korunur.',
    ],
    vi: [
      'Trang riêng tập hợp bản phát lại YouTube đã lưu và bản phát lại bài gốc được lưu từ phiên bản này. Lỗi lưu trữ được hiển thị thay vì danh sách trống. Không thể khôi phục lượt chơi cũ chưa từng lưu.',
      'Xóa dòng đang tải hoặc gặp lỗi khỏi danh sách bằng chuột phải hoặc bàn phím mà không xóa âm thanh hay bản phát lại. Hình bài gốc được giữ trọn vẹn. Màn hình chuẩn bị gọn hơn. Ô YouTube chỉ được xóa sau khi thêm thành công; lỗi hoặc hủy vẫn giữ nội dung.',
    ],
  } satisfies Record<Language, string[]>,
};
