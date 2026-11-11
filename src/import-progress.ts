import type { Language } from './i18n';
import type { AudioJob } from './external-audio-api';
export type ImportStage =
  'checking' | 'queued' | 'extracting' | 'charting' | 'downloading' | 'saving';
export const IMPORT_STAGES: readonly ImportStage[] = [
  'checking',
  'queued',
  'extracting',
  'charting',
  'downloading',
  'saving',
];
export function jobImportStage(job: AudioJob): ImportStage | undefined {
  if (job.status === 'error') return undefined;
  if (job.status === 'queued') return 'queued';
  if (job.status === 'running') return 'extracting';
  if (job.canonical?.status === 'generating') return 'charting';
  if (
    job.canonical?.status === 'queued' ||
    job.canonical?.status === 'deferred'
  )
    return 'queued';
  if (job.canonical?.status === 'published') return 'downloading';
  return 'checking';
}
const labels: Record<Language, Record<ImportStage, string>> = {
  en: {
    checking: 'Checking the song…',
    queued: 'Preparing the audio…',
    extracting: 'Preparing the audio…',
    charting: 'Analyzing audio and creating charts…',
    downloading: 'Downloading the audio…',
    saving: 'Saving on this device…',
  },
  ko: {
    checking: '곡을 확인하고 있습니다…',
    queued: '음원을 준비하고 있습니다…',
    extracting: '음원을 준비하고 있습니다…',
    charting: '음원 분석 · 채보 생성 중…',
    downloading: '음원을 내려받고 있습니다…',
    saving: '이 기기에 저장하고 있습니다…',
  },
  zh: {
    checking: '正在检查歌曲…',
    queued: '正在准备音频…',
    extracting: '正在准备音频…',
    charting: '正在分析音频并生成谱面…',
    downloading: '正在下载音频…',
    saving: '正在保存到此设备…',
  },
  ja: {
    checking: '曲を確認中…',
    queued: '音源を準備中…',
    extracting: '音源を準備中…',
    charting: '音源解析・譜面作成中…',
    downloading: '音源をダウンロード中…',
    saving: 'この端末に保存中…',
  },
  es: {
    checking: 'Comprobando la canción…',
    queued: 'Preparando el audio…',
    extracting: 'Preparando el audio…',
    charting: 'Analizando audio y creando mapas…',
    downloading: 'Descargando el audio…',
    saving: 'Guardando en este dispositivo…',
  },
  fr: {
    checking: 'Vérification du morceau…',
    queued: 'Préparation audio…',
    extracting: 'Préparation audio…',
    charting: 'Analyse audio et création des partitions…',
    downloading: 'Téléchargement audio…',
    saving: 'Enregistrement sur cet appareil…',
  },
  de: {
    checking: 'Song wird geprüft…',
    queued: 'Audio wird vorbereitet…',
    extracting: 'Audio wird vorbereitet…',
    charting: 'Audioanalyse und Erstellung der Notenkarten…',
    downloading: 'Audio wird heruntergeladen…',
    saving: 'Speichern auf diesem Gerät…',
  },
  pt: {
    checking: 'Verificando a música…',
    queued: 'Preparando o áudio…',
    extracting: 'Preparando o áudio…',
    charting: 'Analisando áudio e criando mapas…',
    downloading: 'Baixando o áudio…',
    saving: 'Salvando neste dispositivo…',
  },
  it: {
    checking: 'Controllo del brano…',
    queued: 'Preparazione audio…',
    extracting: 'Preparazione audio…',
    charting: 'Analisi audio e creazione delle mappe…',
    downloading: 'Download audio…',
    saving: 'Salvataggio sul dispositivo…',
  },
  ru: {
    checking: 'Проверка песни…',
    queued: 'Подготовка аудио…',
    extracting: 'Подготовка аудио…',
    charting: 'Анализ аудио и создание карт…',
    downloading: 'Загрузка аудио…',
    saving: 'Сохранение на устройстве…',
  },
  id: {
    checking: 'Memeriksa lagu…',
    queued: 'Menyiapkan audio…',
    extracting: 'Menyiapkan audio…',
    charting: 'Menganalisis audio dan membuat chart…',
    downloading: 'Mengunduh audio…',
    saving: 'Menyimpan di perangkat ini…',
  },
  tr: {
    checking: 'Şarkı kontrol ediliyor…',
    queued: 'Ses hazırlanıyor…',
    extracting: 'Ses hazırlanıyor…',
    charting: 'Ses analiz ediliyor ve nota haritaları oluşturuluyor…',
    downloading: 'Ses indiriliyor…',
    saving: 'Bu cihaza kaydediliyor…',
  },
  vi: {
    checking: 'Đang kiểm tra bài hát…',
    queued: 'Đang chuẩn bị âm thanh…',
    extracting: 'Đang chuẩn bị âm thanh…',
    charting: 'Đang phân tích âm thanh và tạo bản nhạc…',
    downloading: 'Đang tải âm thanh…',
    saving: 'Đang lưu trên thiết bị này…',
  },
};
export const importStageLabel = (stage: ImportStage, language: Language) =>
  labels[language][stage];
