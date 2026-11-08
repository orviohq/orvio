import type { Language } from './i18n';
export const PATCH_V021 = {
  version: '0.2.21',
  date: '2026-11-08',
  notes: {
    en: [
      'YouTube imports support videos up to 5 minutes. Errors explain the reported cause and next steps, including request limits and reset times. Fresh audio retrieval can retry without starting another extraction. Text inputs support select-all and normal editing; scrollbars are clearer across the game and patch notes.',
    ],
    ko: [
      'YouTube 추가를 최대 5분 영상까지 지원합니다. 오류에 확인된 원인과 해결 방법을 표시하고 요청 한도와 풀리는 시각을 안내합니다. 준비 직후 음원 가져오기는 새 추출 없이 다시 확인합니다. 입력창의 전체 선택과 기본 편집을 지원하고 게임과 패치노트의 스크롤바를 정리했습니다.',
    ],
    zh: [
      'YouTube导入支持最长5分钟的视频。错误显示服务报告的原因和处理方法，包括请求限额与重置时间。刚准备好的音频可重试获取，无需重新提取。输入框支持全选和常规编辑，游戏与更新日志的滚动条更清晰。',
    ],
    ja: [
      'YouTube追加は最大5分の動画に対応。エラーには報告された原因と対処、上限と解除時刻を表示します。準備直後の音源は再抽出せず取得を再確認します。入力欄の全選択と通常編集に対応し、ゲームと更新履歴のスクロールバーを見やすくしました。',
    ],
    es: [
      'Se pueden importar vídeos de YouTube de hasta 5 minutos. Los errores explican la causa comunicada y los pasos a seguir, con límites y horas de reinicio. La descarga reciente puede reintentarse sin otra extracción. Los campos permiten seleccionar todo y editar normalmente; las barras de desplazamiento son más claras.',
    ],
    fr: [
      'Importez des vidéos YouTube de 5 minutes maximum. Les erreurs expliquent la cause signalée et la marche à suivre, avec limites et heure de réinitialisation. La récupération récente peut être réessayée sans nouvelle extraction. Les champs autorisent la sélection complète et l’édition normale ; les barres de défilement sont plus lisibles.',
    ],
    de: [
      'YouTube-Videos bis 5 Minuten werden unterstützt. Fehler zeigen den gemeldeten Grund und nächste Schritte einschließlich Limits und Rücksetzzeiten. Frisch vorbereitetes Audio wird ohne neue Extraktion erneut abgerufen. Textfelder erlauben Alles auswählen und normales Bearbeiten; Scrollleisten sind übersichtlicher.',
    ],
    pt: [
      'Importe vídeos do YouTube de até 5 minutos. Os erros explicam o motivo informado e as próximas etapas, incluindo limites e horários de reinício. A busca do áudio recente pode ser repetida sem nova extração. Os campos permitem selecionar tudo e editar normalmente; as barras de rolagem estão mais claras.',
    ],
    it: [
      'Importa video YouTube fino a 5 minuti. Gli errori spiegano la causa segnalata e i passi successivi, con limiti e orari di ripristino. Il recupero recente può riprovare senza una nuova estrazione. I campi supportano la selezione completa e la normale modifica; barre di scorrimento più leggibili.',
    ],
    ru: [
      'Поддерживается импорт YouTube до 5 минут. Ошибки показывают сообщённую причину и дальнейшие действия, включая лимиты и время сброса. Получение свежего аудио можно повторить без новой обработки. В полях работают выделение всего текста и обычное редактирование; полосы прокрутки стали понятнее.',
    ],
    id: [
      'Impor YouTube mendukung video hingga 5 menit. Kesalahan menjelaskan penyebab yang dilaporkan dan langkah berikutnya, termasuk batas serta waktu reset. Audio yang baru siap dapat diambil ulang tanpa ekstraksi baru. Kolom teks mendukung pilih semua dan pengeditan biasa; scrollbar lebih jelas.',
    ],
    tr: [
      '5 dakikaya kadar YouTube videoları desteklenir. Hatalar bildirilen nedeni ve sonraki adımları, sınırları ve sıfırlanma zamanını gösterir. Yeni hazırlanan ses yeni çıkarma olmadan tekrar alınabilir. Metin alanları tümünü seçme ve normal düzenlemeyi destekler; kaydırma çubukları daha nettir.',
    ],
    vi: [
      'Hỗ trợ nhập video YouTube tối đa 5 phút. Lỗi giải thích nguyên nhân được báo và bước xử lý, gồm giới hạn và thời điểm đặt lại. Có thể lấy lại âm thanh vừa chuẩn bị mà không trích xuất mới. Ô nhập hỗ trợ chọn tất cả và chỉnh sửa thông thường; thanh cuộn rõ hơn.',
    ],
  } satisfies Record<Language, string[]>,
};
