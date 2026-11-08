import type { Language } from './i18n';
import type { DeviceAudioState } from './device-audio-inspection';
const labels: Record<
  Language,
  readonly [string, string, string, string, string, string, string]
> = {
  ko: [
    '기기 저장 상태 확인',
    '확인 중...',
    '이 기기에 재생에 필요한 음원과 채보가 저장되어 있습니다.',
    '이 기기에 음원은 남아 있지만, 재생에 필요한 채보를 확인하지 못했습니다. 곡과 브라우저 데이터를 지우지 마세요.',
    '이 곡에 맞는 저장 음원을 찾지 못했습니다. 곡과 브라우저 데이터는 그대로 두세요.',
    '저장된 곡을 확인하지 못했습니다. 데이터는 지우지 않았습니다.',
    '기기 저장 공간을 읽지 못했습니다. 데이터는 지우지 않았습니다.',
  ],
  en: [
    'Check device storage',
    'Checking...',
    'Audio and charts needed to play are saved on this device.',
    'Audio is still on this device, but the chart needed to play could not be confirmed. Keep the song and browser data.',
    'No matching saved audio was found. Keep the song and browser data.',
    'Saved song data could not be verified. Nothing was deleted.',
    'Device storage could not be read. Nothing was deleted.',
  ],
  ja: [
    '端末の保存状態を確認',
    '確認中...',
    '再生に必要な音源と譜面が端末に保存されています。',
    '音源は残っていますが、再生に必要な譜面を確認できませんでした。曲とブラウザのデータは消さないでください。',
    '一致する保存音源が見つかりませんでした。曲とブラウザのデータはそのままにしてください。',
    '保存データを確認できませんでした。削除はしていません。',
    '端末の保存領域を読み取れませんでした。削除はしていません。',
  ],
  zh: [
    '检查设备存储',
    '检查中...',
    '此设备已保存播放所需的音频和谱面。',
    '此设备仍有音频，但无法确认播放所需的谱面。请保留歌曲和浏览器数据。',
    '未找到匹配的已保存音频。请保留歌曲和浏览器数据。',
    '无法验证已保存的歌曲数据。未删除任何内容。',
    '无法读取设备存储。未删除任何内容。',
  ],
  es: [
    'Revisar almacenamiento',
    'Revisando...',
    'El audio y las notas necesarios están guardados en este dispositivo.',
    'El audio sigue aquí, pero no se pudo confirmar la partitura necesaria. Conserva la canción y los datos del navegador.',
    'No se encontró audio guardado coincidente. Conserva la canción y los datos del navegador.',
    'No se pudieron verificar los datos guardados. No se borró nada.',
    'No se pudo leer el almacenamiento. No se borró nada.',
  ],
  pt: [
    'Verificar armazenamento',
    'Verificando...',
    'O áudio e as notas necessários estão salvos neste dispositivo.',
    'O áudio continua aqui, mas não foi possível confirmar as notas necessárias. Mantenha a música e os dados do navegador.',
    'Nenhum áudio salvo correspondente foi encontrado. Mantenha a música e os dados do navegador.',
    'Não foi possível verificar os dados salvos. Nada foi apagado.',
    'Não foi possível ler o armazenamento. Nada foi apagado.',
  ],
  fr: [
    'Vérifier le stockage',
    'Vérification...',
    'Le son et les notes nécessaires sont enregistrés sur cet appareil.',
    "Le son est encore présent, mais les notes nécessaires n'ont pas pu être confirmées. Gardez le morceau et les données du navigateur.",
    'Aucun son enregistré correspondant trouvé. Gardez le morceau et les données du navigateur.',
    "Les données enregistrées n'ont pas pu être vérifiées. Rien n'a été supprimé.",
    "Le stockage est illisible. Rien n'a été supprimé.",
  ],
  de: [
    'Gerätespeicher prüfen',
    'Wird geprüft...',
    'Audio und Noten zum Spielen sind auf diesem Gerät gespeichert.',
    'Audio ist noch vorhanden, aber die nötigen Noten konnten nicht bestätigt werden. Song und Browserdaten behalten.',
    'Keine passende gespeicherte Audiodatei gefunden. Song und Browserdaten behalten.',
    'Gespeicherte Daten konnten nicht geprüft werden. Nichts wurde gelöscht.',
    'Gerätespeicher konnte nicht gelesen werden. Nichts wurde gelöscht.',
  ],
  ru: [
    'Проверить память устройства',
    'Проверка...',
    'Аудио и ноты для игры сохранены на этом устройстве.',
    'Аудио осталось, но нужные ноты подтвердить не удалось. Не удаляйте песню и данные браузера.',
    'Подходящее сохранённое аудио не найдено. Не удаляйте песню и данные браузера.',
    'Сохранённые данные проверить не удалось. Ничего не удалено.',
    'Не удалось прочитать память устройства. Ничего не удалено.',
  ],
  id: [
    'Periksa penyimpanan',
    'Memeriksa...',
    'Audio dan not yang diperlukan tersimpan di perangkat ini.',
    'Audio masih ada, tetapi not untuk bermain belum dapat dipastikan. Simpan lagu dan data browser.',
    'Audio tersimpan yang cocok tidak ditemukan. Simpan lagu dan data browser.',
    'Data tersimpan tidak dapat diverifikasi. Tidak ada yang dihapus.',
    'Penyimpanan tidak dapat dibaca. Tidak ada yang dihapus.',
  ],
  vi: [
    'Kiểm tra bộ nhớ thiết bị',
    'Đang kiểm tra...',
    'Âm thanh và nốt cần để chơi đã được lưu trên thiết bị.',
    'Âm thanh vẫn còn nhưng chưa xác nhận được nốt cần để chơi. Giữ bài hát và dữ liệu trình duyệt.',
    'Không tìm thấy âm thanh đã lưu phù hợp. Giữ bài hát và dữ liệu trình duyệt.',
    'Không thể xác minh dữ liệu đã lưu. Không có gì bị xóa.',
    'Không thể đọc bộ nhớ thiết bị. Không có gì bị xóa.',
  ],
  tr: [
    'Cihaz depolamasını kontrol et',
    'Kontrol ediliyor...',
    'Oynamak için gereken ses ve notalar bu cihazda kayıtlı.',
    'Ses hâlâ burada, ancak gereken notalar doğrulanamadı. Şarkıyı ve tarayıcı verilerini koruyun.',
    'Eşleşen kayıtlı ses bulunamadı. Şarkıyı ve tarayıcı verilerini koruyun.',
    'Kayıtlı veriler doğrulanamadı. Hiçbir şey silinmedi.',
    'Cihaz depolaması okunamadı. Hiçbir şey silinmedi.',
  ],
  it: [
    'Controlla memoria dispositivo',
    'Controllo...',
    'Audio e note per giocare sono salvati sul dispositivo.',
    "L'audio è ancora presente, ma le note necessarie non sono state confermate. Conserva il brano e i dati del browser.",
    'Nessun audio salvato corrispondente trovato. Conserva il brano e i dati del browser.',
    'Impossibile verificare i dati salvati. Nulla è stato eliminato.',
    'Impossibile leggere la memoria. Nulla è stato eliminato.',
  ],
};
export const deviceInspectionButton = (language: Language) =>
  labels[language][0];
export const deviceInspectionChecking = (language: Language) =>
  labels[language][1];
export function deviceInspectionMessage(
  state: DeviceAudioState,
  language: Language,
) {
  const index = {
    ready: 2,
    legacy_audio: 3,
    missing: 4,
    invalid: 5,
    unavailable: 6,
  } as const;
  return labels[language][index[state]];
}
