import type { Language } from './i18n';
export const PATCH_V042 = {
  version: '0.2.42',
  date: '2026-11-09',
  notes: {
    en: [
      'Supported shared songs can start before the full audio download finishes. Playback waits safely if more audio is needed. Starting a song cancels its unfinished preview download.',
    ],
    ko: [
      '지원되는 공유 곡은 전체 음원 다운로드가 끝나기 전에 시작할 수 있습니다. 음원이 더 필요하면 안전하게 기다립니다. 곡을 시작하면 진행 중이던 미리듣기 다운로드를 취소합니다.',
    ],
    ja: [
      '対応する共有曲は音源全体のダウンロード完了前に開始できます。必要な音源を待ちながら安全に再生し、開始時は未完了のプレビュー取得を中止します。',
    ],
    zh: [
      '支持的分享歌曲可在完整音频下载完成前开始。需要更多音频时会安全等待。开始歌曲会取消尚未完成的试听下载。',
    ],
    es: [
      'Las canciones compartidas compatibles pueden comenzar antes de terminar la descarga. La reproducción espera si falta audio. Al comenzar se cancela la descarga de vista previa pendiente.',
    ],
    fr: [
      "Les morceaux partagés compatibles peuvent démarrer avant la fin du téléchargement. La lecture attend si nécessaire. Le démarrage annule le téléchargement de l'extrait en cours.",
    ],
    de: [
      'Unterstützte geteilte Songs können vor Ende des Downloads starten. Die Wiedergabe wartet bei Bedarf auf weitere Audiodaten. Beim Start wird ein laufender Vorschaudownload abgebrochen.',
    ],
    pt: [
      'Músicas compartilhadas compatíveis podem começar antes do fim do download. A reprodução espera se precisar de mais áudio. Iniciar cancela o download de prévia pendente.',
    ],
    it: [
      "I brani condivisi supportati possono iniziare prima che il download termini. La riproduzione attende se serve altro audio. L'avvio annulla il download dell'anteprima in corso.",
    ],
    ru: [
      'Поддерживаемые общие песни можно запустить до конца загрузки. Если нужно больше аудио, воспроизведение подождёт. При запуске незавершённая загрузка предпрослушивания отменяется.',
    ],
    id: [
      'Lagu bersama yang didukung dapat dimulai sebelum unduhan selesai. Pemutaran menunggu jika perlu audio tambahan. Memulai lagu membatalkan unduhan pratinjau yang belum selesai.',
    ],
    vi: [
      'Bài hát được chia sẻ có hỗ trợ có thể bắt đầu trước khi tải xong âm thanh. Phát nhạc sẽ đợi khi cần thêm dữ liệu. Bắt đầu bài hát sẽ hủy tải nghe thử chưa xong.',
    ],
    tr: [
      'Desteklenen paylaşılan şarkılar indirme bitmeden başlayabilir. Gerekirse oynatma daha fazla ses bekler. Şarkıyı başlatmak bitmemiş önizleme indirmesini iptal eder.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
