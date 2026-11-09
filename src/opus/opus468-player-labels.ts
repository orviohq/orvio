import type { Language } from '../i18n';
type Labels = {
  unavailable: string;
  integrity: string;
  retry: string;
  back: string;
};
const rows: Record<Language, [string, string, string, string]> = {
  en: [
    'This track could not be verified. Playback was stopped.',
    'This track data does not match. Playback was stopped.',
    'Try again',
    'Track select',
  ],
  ko: [
    '이 곡을 현재 확인할 수 없어 재생하지 않았습니다.',
    '곡 데이터가 일치하지 않아 재생하지 않았습니다.',
    '다시 확인',
    '곡 선택으로',
  ],
  zh: [
    '无法验证此曲目，已停止播放。',
    '此曲目的数据不匹配，已停止播放。',
    '重试',
    '选择曲目',
  ],
  ja: [
    'この曲を確認できないため、再生を停止しました。',
    'この曲のデータが一致しないため、再生を停止しました。',
    '再試行',
    '曲選択へ',
  ],
  es: [
    'No se pudo verificar esta canción. Se detuvo la reproducción.',
    'Los datos de esta canción no coinciden. Se detuvo la reproducción.',
    'Reintentar',
    'Seleccionar canción',
  ],
  fr: [
    'Ce morceau ne peut pas être vérifié. La lecture a été arrêtée.',
    'Les données de ce morceau ne correspondent pas. La lecture a été arrêtée.',
    'Réessayer',
    'Choisir un morceau',
  ],
  de: [
    'Dieser Titel konnte nicht überprüft werden. Die Wiedergabe wurde gestoppt.',
    'Die Daten dieses Titels stimmen nicht überein. Die Wiedergabe wurde gestoppt.',
    'Erneut versuchen',
    'Titelauswahl',
  ],
  pt: [
    'Não foi possível verificar esta música. A reprodução foi interrompida.',
    'Os dados desta música não correspondem. A reprodução foi interrompida.',
    'Tentar novamente',
    'Selecionar música',
  ],
  it: [
    'Impossibile verificare questo brano. La riproduzione è stata interrotta.',
    'I dati di questo brano non corrispondono. La riproduzione è stata interrotta.',
    'Riprova',
    'Seleziona brano',
  ],
  ru: [
    'Не удалось проверить эту композицию. Воспроизведение остановлено.',
    'Данные этой композиции не совпадают. Воспроизведение остановлено.',
    'Повторить',
    'Выбор композиции',
  ],
  id: [
    'Lagu ini tidak dapat diverifikasi. Pemutaran dihentikan.',
    'Data lagu ini tidak cocok. Pemutaran dihentikan.',
    'Coba lagi',
    'Pilih lagu',
  ],
  tr: [
    'Bu parça doğrulanamadı. Oynatma durduruldu.',
    'Bu parçanın verileri eşleşmiyor. Oynatma durduruldu.',
    'Tekrar dene',
    'Parça seçimi',
  ],
  vi: [
    'Không thể xác minh bài hát này. Đã dừng phát.',
    'Dữ liệu bài hát này không khớp. Đã dừng phát.',
    'Thử lại',
    'Chọn bài hát',
  ],
};
export function opus468PlayerLabels(language: Language): Labels {
  const [unavailable, integrity, retry, back] = rows[language];
  return { unavailable, integrity, retry, back };
}
