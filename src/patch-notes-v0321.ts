import type { Language } from './i18n';
export const PATCH_V0321 = {
 version:'0.3.21',date:'2026-11-11',notes:{
  "ko": [
    "장애 감지 시 정해진 분류와 감지 시각을 기기에만 보관하는 선택적 로컬 기록을 추가했습니다. 외부 알림은 보내지 않습니다."
  ],
  "en": [
    "Added an optional device-only record of failure categories and detection times. It does not send external alerts."
  ],
  "zh": [
    "新增可选的设备本地故障类别和检测时间记录，不发送外部通知。"
  ],
  "ja": [
    "障害の分類と検知時刻を端末内だけに保存する任意の記録を追加しました。外部への通知は送信しません。"
  ],
  "es": [
    "Se añadió un registro opcional de categorías de fallos y horas de detección solo en el dispositivo. No envía alertas externas."
  ],
  "fr": [
    "Ajout d’un relevé facultatif des catégories de panne et heures de détection sur cet appareil uniquement. Aucune alerte externe n’est envoyée."
  ],
  "de": [
    "Optionale lokale Aufzeichnung von Fehlerkategorien und Erkennungszeiten ergänzt. Es werden keine externen Benachrichtigungen gesendet."
  ],
  "pt": [
    "Adicionado um registo opcional de categorias de falhas e horas de deteção apenas no dispositivo. Não envia alertas externos."
  ],
  "it": [
    "Aggiunto un registro facoltativo delle categorie di errore e degli orari di rilevamento solo sul dispositivo. Non invia avvisi esterni."
  ],
  "ru": [
    "Добавлена необязательная локальная запись категорий сбоев и времени обнаружения. Внешние уведомления не отправляются."
  ],
  "id": [
    "Menambahkan catatan opsional kategori kegagalan dan waktu deteksi hanya di perangkat. Tidak mengirim peringatan eksternal."
  ],
  "tr": [
    "Hata kategorileri ve algılama zamanları için isteğe bağlı, yalnızca cihazda tutulan kayıt eklendi. Harici uyarı göndermez."
  ],
  "vi": [
    "Đã thêm bản ghi tùy chọn về loại lỗi và thời điểm phát hiện chỉ trên thiết bị. Không gửi cảnh báo ra bên ngoài."
  ]
} satisfies Record<Language,string[]>,
};
