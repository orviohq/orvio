import type { Language } from './i18n';
export const PATCH_V039 = {
  version: '0.2.39',
  date: '2026-11-09',
  notes: {
    en: [
      'On return visits, the saved song list appears during page startup instead of leaving only the header visible. Audio preparation no longer blocks the list.',
      'The saved display keeps artwork, selection and scroll position. Play actions still wait for verified song data, and audio integrity is checked before playback.',
    ],
    ko: [
      '재방문 시 저장된 곡 목록을 페이지 시작부터 표시해 헤더만 보이는 빈 화면을 줄였습니다. 음원 준비 때문에 목록 표시가 늦어지지 않습니다.',
      '저장된 화면은 썸네일·선택·스크롤 위치를 유지합니다. 플레이는 검증된 곡 정보가 준비된 뒤 가능하며, 재생 전 음원 무결성 검사는 유지됩니다.',
    ],
    ja: [
      '再訪時はページ起動中から保存した選曲を表示し、ヘッダーだけの空白を解消。音声準備は一覧を待たせません。',
      '画像、選択、スクロール位置を保持。検証済み曲情報と再生前の音声検証は維持します。',
    ],
    zh: [
      '再次访问时，页面启动即显示已保存的歌曲列表，不再只显示页眉。音频准备不阻塞列表。',
      '保留封面、选中和滚动位置。游玩仍需已验证的歌曲数据，播放前仍校验音频。',
    ],
    es: [
      'Al volver, la lista guardada aparece durante el inicio sin dejar solo la cabecera. Preparar audio ya no bloquea la lista.',
      'Conserva imágenes, selección y desplazamiento. Jugar sigue requiriendo datos verificados y validar el audio.',
    ],
    fr: [
      'Au retour, la liste sauvegardée apparaît dès le démarrage au lieu du seul en-tête. Le son ne bloque plus la liste.',
      'Images, sélection et défilement sont conservés. Jouer attend toujours les données vérifiées et la validation du son.',
    ],
    de: [
      'Bei erneuten Besuchen erscheint die gespeicherte Songliste schon beim Seitenstart statt nur der Kopfzeile. Audio hält die Liste nicht auf.',
      'Bilder, Auswahl und Scrollposition bleiben erhalten. Das Spiel wartet weiterhin auf verifizierte Daten und Audioprüfung.',
    ],
    pt: [
      'Ao retornar, a lista salva aparece durante a abertura, em vez de apenas o cabeçalho. Preparar áudio não bloqueia a lista.',
      'Mantém imagens, seleção e rolagem. Jogar ainda exige dados verificados e validação do áudio.',
    ],
    it: [
      'Al ritorno, la lista salvata appare durante l’avvio anziché lasciare solo l’intestazione. L’audio non blocca la lista.',
      'Mantiene immagini, selezione e scorrimento. Giocare richiede ancora dati verificati e controllo dell’audio.',
    ],
    ru: [
      'При повторном посещении сохранённый список виден уже при запуске страницы вместо одной шапки. Аудио не задерживает список.',
      'Сохраняются изображения, выбор и прокрутка. Игра по-прежнему ждёт проверенных данных и проверки аудио.',
    ],
    id: [
      'Saat kembali, daftar tersimpan muncul saat halaman mulai, bukan hanya header. Persiapan audio tidak menghalangi daftar.',
      'Gambar, pilihan, dan posisi gulir dipertahankan. Bermain tetap menunggu data dan audio terverifikasi.',
    ],
    vi: [
      'Khi quay lại, danh sách đã lưu hiện từ lúc trang khởi động thay vì chỉ có đầu trang. Chuẩn bị âm thanh không chặn danh sách.',
      'Giữ ảnh, lựa chọn và vị trí cuộn. Chơi vẫn chờ dữ liệu và âm thanh được kiểm tra.',
    ],
    tr: [
      'Yeniden ziyarette kayıtlı liste sayfa başlarken görünür; yalnızca başlık kalmaz. Ses hazırlığı listeyi bekletmez.',
      'Görseller, seçim ve kaydırma korunur. Oynamak yine doğrulanmış veri ve ses denetimi gerektirir.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
