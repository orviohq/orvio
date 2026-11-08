import type { Language } from './i18n';
const pending: Record<Language, string> = {
  ko: '곡을 아직 준비하지 못했습니다. 다시 시도를 눌러 상태를 확인하세요. 저장된 플레이 기록은 그대로 남아 있습니다.',
  en: 'This song is not ready yet. Try again to check its status. Your saved play history is still here.',
  ja: 'この曲はまだ準備できていません。再試行で状態を確認してください。保存済みのプレイ記録は残っています。',
  zh: '此歌曲尚未准备好。请重试以检查状态。已保存的游玩记录仍然保留。',
  es: 'La canción aún no está lista. Reintenta para comprobar su estado. Tu historial guardado sigue aquí.',
  pt: 'A música ainda não está pronta. Tente de novo para verificar o estado. Seu histórico salvo continua aqui.',
  fr: 'Ce morceau n’est pas encore prêt. Réessayez pour vérifier son état. Votre historique enregistré est conservé.',
  de: 'Dieser Song ist noch nicht bereit. Versuche es erneut, um den Status zu prüfen. Dein gespeicherter Spielverlauf bleibt erhalten.',
  ru: 'Песня пока не готова. Повторите попытку, чтобы проверить её состояние. Сохранённая история игры остаётся.',
  id: 'Lagu ini belum siap. Coba lagi untuk memeriksa statusnya. Riwayat permainan yang tersimpan tetap ada.',
  vi: 'Bài hát này chưa sẵn sàng. Thử lại để kiểm tra trạng thái. Lịch sử chơi đã lưu vẫn còn.',
  tr: 'Bu şarkı henüz hazır değil. Durumunu kontrol etmek için tekrar dene. Kayıtlı oyun geçmişin duruyor.',
  it: 'Il brano non è ancora pronto. Riprova per verificarne lo stato. La cronologia salvata è ancora disponibile.',
};
export const canonicalPendingMessage = (language: Language) =>
  pending[language];
