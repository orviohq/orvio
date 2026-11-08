import type { Language } from './i18n';
export const PATCH_V048 = {
  version: '0.2.48',
  date: '2026-11-09',
  notes: {
    en: [
      'Charts for saved audio can now be prepared on your device. Existing charts and replays stay unchanged; audio that is not saved is not downloaded automatically.',
    ],
    ko: [
      '저장된 음원의 채보를 내 기기에서 준비할 수 있습니다. 기존 채보와 리플레이는 그대로 유지하며, 저장되지 않은 음원은 자동으로 내려받지 않습니다.',
    ],
    ja: [
      '保存済みの音源から端末上で譜面を準備できます。既存の譜面とリプレイは変わらず、未保存の音源を自動取得しません。',
    ],
    zh: [
      '已保存音频的谱面现在可在设备上准备。原有谱面和回放保持不变，未保存的音频不会自动下载。',
    ],
    es: [
      'Los mapas del audio guardado se preparan en tu dispositivo. Los mapas y repeticiones existentes no cambian; el audio no guardado no se descarga automáticamente.',
    ],
    fr: [
      'Les partitions des pistes sauvegardées sont préparées sur votre appareil. Les partitions et replays existants restent inchangés, sans téléchargement automatique des pistes absentes.',
    ],
    de: [
      'Notenmuster für gespeichertes Audio werden auf deinem Gerät vorbereitet. Bestehende Muster und Replays bleiben unverändert. Fehlendes Audio wird nicht automatisch geladen.',
    ],
    pt: [
      'Os mapas de áudio salvo são preparados no seu dispositivo. Mapas e replays existentes não mudam; áudio não salvo não é baixado automaticamente.',
    ],
    it: [
      'Le mappe audio salvate vengono preparate sul dispositivo. Mappe e replay esistenti restano invariati; gli audio mancanti non vengono scaricati automaticamente.',
    ],
    ru: [
      'Карты сохранённого аудио готовятся на вашем устройстве. Прежние карты и повторы не меняются; отсутствующее аудио не загружается автоматически.',
    ],
    id: [
      'Peta nada audio tersimpan disiapkan di perangkat Anda. Peta dan replay lama tetap sama; audio yang belum tersimpan tidak diunduh otomatis.',
    ],
    vi: [
      'Bản nhạc cho âm thanh đã lưu được chuẩn bị trên thiết bị. Bản nhạc và phát lại cũ không đổi; âm thanh chưa lưu không tự tải xuống.',
    ],
    tr: [
      'Kaydedilmiş sesin notaları cihazınızda hazırlanır. Mevcut notalar ve tekrarlar değişmez; kaydedilmemiş ses otomatik indirilmez.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
