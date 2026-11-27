import type { Language } from './i18n';
// The only server exception is an explicit result-share click or opening a short link.
export const SHARE_LABELS: Record<
  Language,
  {
    failed: string;
    quota: string;
    missing: string;
    invalid: string;
    clientOnly: string;
    network: string;
  }
> = {
  en: {
    failed: 'Sharing failed. No link was copied. Try again later.',
    quota: 'Sharing failed. No link was copied. Try again later.',
    missing: 'This share link has expired or no longer exists.',
    invalid: 'This share link is damaged and cannot be played.',
    clientOnly:
      'This build cannot open shared short links. Open the online app instead.',
    network:
      'Could not load this share link. Check your connection and try again.',
  },
  ko: {
    failed:
      '공유하지 못했어요. 링크를 복사하지 않았어요. 나중에 다시 시도해주세요.',
    quota:
      '공유하지 못했어요. 링크를 복사하지 않았어요. 나중에 다시 시도해주세요.',
    missing: '공유 링크가 만료되었거나 존재하지 않아요.',
    invalid: '공유 링크가 손상되어 재생할 수 없어요.',
    clientOnly:
      '이 빌드에서는 공유 짧은 링크를 열 수 없어요. 온라인 앱에서 열어주세요.',
    network:
      '공유 링크를 불러오지 못했어요. 연결을 확인하고 다시 시도해주세요.',
  },
  zh: {
    failed: '分享失败，未复制链接，请稍后重试。',
    quota: '分享失败，未复制链接，请稍后重试。',
    missing: '链接已过期或不存在。',
    invalid: '链接已损坏，无法播放。',
    clientOnly: '此版本无法打开分享短链接。请使用在线版打开。',
    network: '无法加载此分享链接。请检查网络连接后重试。',
  },
  ja: {
    failed:
      '共有できませんでした。リンクはコピーされていません。後でもう一度お試しください。',
    quota:
      '共有できませんでした。リンクはコピーされていません。後でもう一度お試しください。',
    missing: '共有リンクは期限切れか存在しません。',
    invalid: '共有リンクが破損しているため再生できません。',
    clientOnly:
      'このビルドでは共有ショートリンクを開けません。オンライン版で開いてください。',
    network:
      '共有リンクを読み込めませんでした。接続を確認して再試行してください。',
  },
  es: {
    failed:
      'No se pudo compartir. No se copió ningún enlace. Inténtalo más tarde.',
    quota:
      'No se pudo compartir. No se copió ningún enlace. Inténtalo más tarde.',
    missing: 'Este enlace ha caducado o ya no existe.',
    invalid: 'Este enlace está dañado y no se puede reproducir.',
    clientOnly:
      'Esta versión no puede abrir enlaces cortos compartidos. Usa la app en línea.',
    network:
      'No se pudo cargar este enlace. Comprueba la conexión e inténtalo de nuevo.',
  },
  fr: {
    failed: 'Échec du partage. Aucun lien copié. Réessayez plus tard.',
    quota: 'Échec du partage. Aucun lien copié. Réessayez plus tard.',
    missing: 'Ce lien a expiré ou n’existe plus.',
    invalid: 'Ce lien est endommagé et ne peut pas être lu.',
    clientOnly:
      'Cette version ne peut pas ouvrir les liens courts partagés. Utilisez l’app en ligne.',
    network:
      'Impossible de charger ce lien. Vérifiez la connexion et réessayez.',
  },
  de: {
    failed:
      'Teilen fehlgeschlagen. Kein Link kopiert. Bitte später erneut versuchen.',
    quota:
      'Teilen fehlgeschlagen. Kein Link kopiert. Bitte später erneut versuchen.',
    missing: 'Dieser Link ist abgelaufen oder nicht mehr vorhanden.',
    invalid: 'Dieser Link ist beschädigt und nicht abspielbar.',
    clientOnly:
      'Diese Version kann geteilte Kurzlinks nicht öffnen. Nutze die Online-App.',
    network:
      'Dieser Link konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut.',
  },
  pt: {
    failed: 'Falha ao partilhar. Nenhuma ligação copiada. Tente mais tarde.',
    quota: 'Falha ao partilhar. Nenhuma ligação copiada. Tente mais tarde.',
    missing: 'Esta ligação expirou ou já não existe.',
    invalid: 'Esta ligação está danificada e não pode ser reproduzida.',
    clientOnly:
      'Esta versão não pode abrir ligações curtas partilhadas. Use a app online.',
    network:
      'Não foi possível carregar esta ligação. Verifique a ligação e tente novamente.',
  },
  it: {
    failed:
      'Condivisione non riuscita. Nessun link copiato. Riprova più tardi.',
    quota: 'Condivisione non riuscita. Nessun link copiato. Riprova più tardi.',
    missing: 'Questo link è scaduto o non esiste più.',
    invalid: 'Questo link è danneggiato e non può essere riprodotto.',
    clientOnly:
      'Questa versione non può aprire i link brevi condivisi. Usa l’app online.',
    network:
      'Impossibile caricare questo link. Controlla la connessione e riprova.',
  },
  ru: {
    failed: 'Не удалось поделиться. Ссылка не скопирована. Попробуйте позже.',
    quota: 'Не удалось поделиться. Ссылка не скопирована. Попробуйте позже.',
    missing: 'Срок ссылки истёк или она больше не существует.',
    invalid: 'Ссылка повреждена, воспроизведение невозможно.',
    clientOnly:
      'Эта сборка не может открывать короткие ссылки. Откройте онлайн-версию.',
    network:
      'Не удалось загрузить ссылку. Проверьте соединение и повторите попытку.',
  },
  id: {
    failed: 'Gagal membagikan. Tidak ada tautan disalin. Coba lagi nanti.',
    quota: 'Gagal membagikan. Tidak ada tautan disalin. Coba lagi nanti.',
    missing: 'Tautan ini kedaluwarsa atau tidak ada lagi.',
    invalid: 'Tautan rusak dan tidak dapat diputar.',
    clientOnly:
      'Build ini tidak dapat membuka tautan pendek. Buka aplikasi online.',
    network: 'Tautan ini tidak dapat dimuat. Periksa koneksi dan coba lagi.',
  },
  vi: {
    failed: 'Không chia sẻ được. Chưa sao chép liên kết. Hãy thử lại sau.',
    quota: 'Không chia sẻ được. Chưa sao chép liên kết. Hãy thử lại sau.',
    missing: 'Liên kết đã hết hạn hoặc không còn tồn tại.',
    invalid: 'Liên kết bị hỏng và không thể phát.',
    clientOnly:
      'Bản dựng này không thể mở liên kết ngắn. Hãy mở ứng dụng trực tuyến.',
    network: 'Không thể tải liên kết này. Kiểm tra kết nối và thử lại.',
  },
  tr: {
    failed: 'Paylaşım başarısız. Bağlantı kopyalanmadı. Daha sonra deneyin.',
    quota: 'Paylaşım başarısız. Bağlantı kopyalanmadı. Daha sonra deneyin.',
    missing: 'Bu bağlantının süresi doldu veya artık mevcut değil.',
    invalid: 'Bu bağlantı bozuk ve oynatılamıyor.',
    clientOnly:
      'Bu sürüm kısa paylaşım bağlantılarını açamaz. Çevrimiçi uygulamayı kullanın.',
    network:
      'Bu bağlantı yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.',
  },
};
export function shareLabels(lang: Language) {
  return SHARE_LABELS[lang] ?? SHARE_LABELS.en;
}
