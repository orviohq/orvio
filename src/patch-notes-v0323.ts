import type { Language } from './i18n';
export const PATCH_V0323 = {version:'0.3.23',date:'2026-11-11',notes:{
  "ko": [
    "불러오는 중인 곡을 갱신하거나 다시 시도할 때 카드와 커버 애니메이션이 유지되도록 수정했습니다.",
    "곡 선택을 연속해서 바꿀 때 미리듣기를 마지막 선택 뒤에 시작하고, 이전 선택의 오디오가 뒤늦게 재생되지 않도록 수정했습니다."
  ],
  "en": [
    "Fixed loading-song updates and retries to preserve cards and cover animations.",
    "Preview audio now waits for the final song selection during rapid changes and discards stale audio requests."
  ],
  "zh": [
    "修复了加载中歌曲更新和重试时卡片及封面动画中断的问题。",
    "快速切换歌曲时，预览音频会等待最终选择，并丢弃过期的音频请求。"
  ],
  "ja": [
    "読み込み中の曲の更新や再試行でカードとカバーのアニメーションが維持されるよう修正しました。",
    "曲を素早く切り替える際、最後の選択を待って試聴を開始し、古い音声リクエストを破棄するよう修正しました。"
  ],
  "es": [
    "Se conservan las tarjetas y animaciones de portada al actualizar o reintentar canciones en carga.",
    "Al cambiar de canción rápidamente, la vista previa espera la selección final y descarta solicitudes de audio antiguas."
  ],
  "fr": [
    "Les cartes et animations de pochette sont conservées lors des mises à jour et nouvelles tentatives de chargement.",
    "Lors de changements rapides de morceau, l’écoute attend la sélection finale et ignore les demandes audio périmées."
  ],
  "de": [
    "Karten und Cover-Animationen bleiben bei Ladeaktualisierungen und erneuten Versuchen erhalten.",
    "Bei schnellem Titelwechsel wartet die Vorschau auf die letzte Auswahl und verwirft veraltete Audioanfragen."
  ],
  "pt": [
    "Os cartões e as animações de capa são mantidos nas atualizações e novas tentativas de carregamento.",
    "Ao mudar rapidamente de música, a prévia aguarda a seleção final e descarta pedidos de áudio antigos."
  ],
  "it": [
    "Le schede e le animazioni delle copertine restano attive durante aggiornamenti e nuovi tentativi di caricamento.",
    "Durante cambi rapidi di brano, l’anteprima attende la selezione finale e scarta le richieste audio obsolete."
  ],
  "ru": [
    "Карточки и анимации обложек сохраняются при обновлении и повторной загрузке треков.",
    "При быстром переключении треков прослушивание ждёт последнего выбора и отклоняет устаревшие запросы аудио."
  ],
  "id": [
    "Kartu dan animasi sampul tetap dipertahankan saat pembaruan dan percobaan ulang pemuatan lagu.",
    "Saat lagu diganti dengan cepat, pratinjau menunggu pilihan terakhir dan membuang permintaan audio lama."
  ],
  "tr": [
    "Yüklenen şarkılar güncellenirken veya yeniden denenirken kartlar ve kapak animasyonları korunur.",
    "Hızlı şarkı değişikliklerinde önizleme son seçimi bekler ve eski ses isteklerini iptal eder."
  ],
  "vi": [
    "Giữ nguyên thẻ và hoạt ảnh ảnh bìa khi cập nhật hoặc thử tải lại bài hát.",
    "Khi đổi bài nhanh, bản nghe thử chờ lựa chọn cuối cùng và bỏ các yêu cầu âm thanh đã cũ."
  ]
} satisfies Record<Language,string[]>,};
