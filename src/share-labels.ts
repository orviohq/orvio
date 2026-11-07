import type { Language } from './i18n';
// The only server exception is an explicit result-share click or opening a short link.
export const SHARE_LABELS: Record<
  Language,
  {
    failed: string;
    quota: string;
    missing: string;
    invalid: string;
  }
> = {
  en: {
    failed: 'Sharing failed. No link was copied. Try again later.',
    quota: 'Sharing failed. No link was copied. Try again later.',
    missing: 'This share link has expired or no longer exists.',
    invalid: 'This share link is damaged and cannot be played.',
  },
  ko: {
    failed:
      '공유하지 못했어요. 링크를 복사하지 않았어요. 나중에 다시 시도해주세요.',
    quota:
      '공유하지 못했어요. 링크를 복사하지 않았어요. 나중에 다시 시도해주세요.',
    missing: '공유 링크가 만료되었거나 존재하지 않아요.',
    invalid: '공유 링크가 손상되어 재생할 수 없어요.',
  },
  zh: {
    failed: '分享失败，未复制链接，请稍后重试。',
    quota: '分享失败，未复制链接，请稍后重试。',
    missing: '链接已过期或不存在。',
    invalid: '链接已损坏，无法播放。',
  },
  ja: {
    failed:
      '共有できませんでした。リンクはコピーされていません。後でもう一度お試しください。',
    quota:
      '共有できませんでした。リンクはコピーされていません。後でもう一度お試しください。',
    missing: '共有リンクは期限切れか存在しません。',
    invalid: '共有リンクが破損しているため再生できません。',
  },
  es: {
    failed:
      'No se pudo compartir. No se copió ningún enlace. Inténtalo más tarde.',
    quota:
      'No se pudo compartir. No se copió ningún enlace. Inténtalo más tarde.',
    missing: 'Este enlace ha caducado o ya no existe.',
    invalid: 'Este enlace está dañado y no se puede reproducir.',
  },
  fr: {
    failed: 'Échec du partage. Aucun lien copié. Réessayez plus tard.',
    quota: 'Échec du partage. Aucun lien copié. Réessayez plus tard.',
    missing: 'Ce lien a expiré ou n’existe plus.',
    invalid: 'Ce lien est endommagé et ne peut pas être lu.',
  },
  de: {
    failed:
      'Teilen fehlgeschlagen. Kein Link kopiert. Bitte später erneut versuchen.',
    quota:
      'Teilen fehlgeschlagen. Kein Link kopiert. Bitte später erneut versuchen.',
    missing: 'Dieser Link ist abgelaufen oder nicht mehr vorhanden.',
    invalid: 'Dieser Link ist beschädigt und nicht abspielbar.',
  },
  pt: {
    failed: 'Falha ao partilhar. Nenhuma ligação copiada. Tente mais tarde.',
    quota: 'Falha ao partilhar. Nenhuma ligação copiada. Tente mais tarde.',
    missing: 'Esta ligação expirou ou já não existe.',
    invalid: 'Esta ligação está danificada e não pode ser reproduzida.',
  },
  it: {
    failed:
      'Condivisione non riuscita. Nessun link copiato. Riprova più tardi.',
    quota: 'Condivisione non riuscita. Nessun link copiato. Riprova più tardi.',
    missing: 'Questo link è scaduto o non esiste più.',
    invalid: 'Questo link è danneggiato e non può essere riprodotto.',
  },
  ru: {
    failed: 'Не удалось поделиться. Ссылка не скопирована. Попробуйте позже.',
    quota: 'Не удалось поделиться. Ссылка не скопирована. Попробуйте позже.',
    missing: 'Срок ссылки истёк или она больше не существует.',
    invalid: 'Ссылка повреждена, воспроизведение невозможно.',
  },
  id: {
    failed: 'Gagal membagikan. Tidak ada tautan disalin. Coba lagi nanti.',
    quota: 'Gagal membagikan. Tidak ada tautan disalin. Coba lagi nanti.',
    missing: 'Tautan ini kedaluwarsa atau tidak ada lagi.',
    invalid: 'Tautan rusak dan tidak dapat diputar.',
  },
  vi: {
    failed: 'Không chia sẻ được. Chưa sao chép liên kết. Hãy thử lại sau.',
    quota: 'Không chia sẻ được. Chưa sao chép liên kết. Hãy thử lại sau.',
    missing: 'Liên kết đã hết hạn hoặc không còn tồn tại.',
    invalid: 'Liên kết bị hỏng và không thể phát.',
  },
  tr: {
    failed: 'Paylaşım başarısız. Bağlantı kopyalanmadı. Daha sonra deneyin.',
    quota: 'Paylaşım başarısız. Bağlantı kopyalanmadı. Daha sonra deneyin.',
    missing: 'Bu bağlantının süresi doldu veya artık mevcut değil.',
    invalid: 'Bu bağlantı bozuk ve oynatılamıyor.',
  },
};
export function shareLabels(lang: Language) {
  return SHARE_LABELS[lang] ?? SHARE_LABELS.en;
}
