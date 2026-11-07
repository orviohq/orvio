import type { Language } from './i18n';
// The only server exception is an explicit result-share click or opening a short link.
export const SHARE_LABELS: Record<
  Language,
  {
    busy: string;
    failed: string;
    quota: string;
    missing: string;
    invalid: string;
    expiry: string;
  }
> = {
  en: {
    busy: 'Creating share link…',
    failed: 'Sharing failed. No link was copied. Try again later.',
    quota: 'Free sharing limit reached. No link was copied. Try again later.',
    missing: 'This share link has expired or no longer exists.',
    invalid: 'This share link is damaged and cannot be played.',
    expiry:
      'Sharing stores only this result and replay. Links normally expire after one year, but older records may be removed early to free space.',
  },
  ko: {
    busy: '공유 링크 만드는 중…',
    failed:
      '공유하지 못했어요. 링크를 복사하지 않았어요. 나중에 다시 시도해주세요.',
    quota:
      '무료 공유 한도에 도달했어요. 링크를 복사하지 않았어요. 나중에 다시 시도해주세요.',
    missing: '공유 링크가 만료되었거나 존재하지 않아요.',
    invalid: '공유 링크가 손상되어 재생할 수 없어요.',
    expiry:
      '공유를 누를 때만 결과와 리플레이를 저장해요. 링크는 기본 1년 후 만료되며, 공간이 부족하면 오래된 기록부터 일찍 삭제될 수 있어요.',
  },
  zh: {
    busy: '正在创建分享链接…',
    failed: '分享失败，未复制链接，请稍后重试。',
    quota: '免费分享额度已用完，未复制链接，请稍后重试。',
    missing: '链接已过期或不存在。',
    invalid: '链接已损坏，无法播放。',
    expiry:
      '仅点击分享时保存结果和回放。链接通常一年后过期；空间不足时可能提前删除旧记录。',
  },
  ja: {
    busy: '共有リンクを作成中…',
    failed:
      '共有できませんでした。リンクはコピーされていません。後でもう一度お試しください。',
    quota:
      '無料共有の上限です。リンクはコピーされていません。後でお試しください。',
    missing: '共有リンクは期限切れか存在しません。',
    invalid: '共有リンクが破損しているため再生できません。',
    expiry:
      '共有時のみ結果とリプレイを保存します。通常1年で失効しますが、容量不足では古い記録が早く削除される場合があります。',
  },
  es: {
    busy: 'Creando enlace…',
    failed:
      'No se pudo compartir. No se copió ningún enlace. Inténtalo más tarde.',
    quota:
      'Límite gratuito alcanzado. No se copió ningún enlace. Inténtalo más tarde.',
    missing: 'Este enlace ha caducado o ya no existe.',
    invalid: 'Este enlace está dañado y no se puede reproducir.',
    expiry:
      'Solo compartir guarda el resultado y la repetición. Caducidad normal de un año; los registros antiguos pueden borrarse antes por falta de espacio.',
  },
  fr: {
    busy: 'Création du lien…',
    failed: 'Échec du partage. Aucun lien copié. Réessayez plus tard.',
    quota: 'Limite gratuite atteinte. Aucun lien copié. Réessayez plus tard.',
    missing: 'Ce lien a expiré ou n’existe plus.',
    invalid: 'Ce lien est endommagé et ne peut pas être lu.',
    expiry:
      'Seul Partager enregistre le résultat et le replay. Expiration normale après un an ; les anciens enregistrements peuvent être supprimés plus tôt faute de place.',
  },
  de: {
    busy: 'Freigabelink wird erstellt…',
    failed:
      'Teilen fehlgeschlagen. Kein Link kopiert. Bitte später erneut versuchen.',
    quota:
      'Kostenloses Limit erreicht. Kein Link kopiert. Bitte später erneut versuchen.',
    missing: 'Dieser Link ist abgelaufen oder nicht mehr vorhanden.',
    invalid: 'Dieser Link ist beschädigt und nicht abspielbar.',
    expiry:
      'Nur Teilen speichert Ergebnis und Replay. Links laufen normalerweise nach einem Jahr ab; alte Einträge können bei Platzmangel früher gelöscht werden.',
  },
  pt: {
    busy: 'A criar ligação…',
    failed: 'Falha ao partilhar. Nenhuma ligação copiada. Tente mais tarde.',
    quota:
      'Limite gratuito atingido. Nenhuma ligação copiada. Tente mais tarde.',
    missing: 'Esta ligação expirou ou já não existe.',
    invalid: 'Esta ligação está danificada e não pode ser reproduzida.',
    expiry:
      'Só Partilhar guarda o resultado e replay. Expiração normal após um ano; registos antigos podem ser apagados antes por falta de espaço.',
  },
  it: {
    busy: 'Creazione del link…',
    failed:
      'Condivisione non riuscita. Nessun link copiato. Riprova più tardi.',
    quota: 'Limite gratuito raggiunto. Nessun link copiato. Riprova più tardi.',
    missing: 'Questo link è scaduto o non esiste più.',
    invalid: 'Questo link è danneggiato e non può essere riprodotto.',
    expiry:
      'Solo Condividi salva risultato e replay. Scadenza normale dopo un anno; i vecchi dati possono essere eliminati prima per mancanza di spazio.',
  },
  ru: {
    busy: 'Создаётся ссылка…',
    failed: 'Не удалось поделиться. Ссылка не скопирована. Попробуйте позже.',
    quota:
      'Бесплатный лимит исчерпан. Ссылка не скопирована. Попробуйте позже.',
    missing: 'Срок ссылки истёк или она больше не существует.',
    invalid: 'Ссылка повреждена, воспроизведение невозможно.',
    expiry:
      'Результат и повтор сохраняются только при отправке. Обычный срок ссылки - год; старые записи могут удаляться раньше при нехватке места.',
  },
  id: {
    busy: 'Membuat tautan…',
    failed: 'Gagal membagikan. Tidak ada tautan disalin. Coba lagi nanti.',
    quota: 'Batas gratis tercapai. Tidak ada tautan disalin. Coba lagi nanti.',
    missing: 'Tautan ini kedaluwarsa atau tidak ada lagi.',
    invalid: 'Tautan rusak dan tidak dapat diputar.',
    expiry:
      'Hanya Bagikan yang menyimpan hasil dan replay. Tautan biasanya berlaku setahun; rekaman lama dapat dihapus lebih awal jika ruang penuh.',
  },
  vi: {
    busy: 'Đang tạo liên kết…',
    failed: 'Không chia sẻ được. Chưa sao chép liên kết. Hãy thử lại sau.',
    quota: 'Đã hết hạn mức miễn phí. Chưa sao chép liên kết. Hãy thử lại sau.',
    missing: 'Liên kết đã hết hạn hoặc không còn tồn tại.',
    invalid: 'Liên kết bị hỏng và không thể phát.',
    expiry:
      'Chỉ Chia sẻ mới lưu kết quả và bản phát lại. Liên kết thường hết hạn sau một năm; bản cũ có thể bị xóa sớm khi đầy bộ nhớ.',
  },
  tr: {
    busy: 'Paylaşım bağlantısı oluşturuluyor…',
    failed: 'Paylaşım başarısız. Bağlantı kopyalanmadı. Daha sonra deneyin.',
    quota:
      'Ücretsiz sınıra ulaşıldı. Bağlantı kopyalanmadı. Daha sonra deneyin.',
    missing: 'Bu bağlantının süresi doldu veya artık mevcut değil.',
    invalid: 'Bu bağlantı bozuk ve oynatılamıyor.',
    expiry:
      'Yalnızca Paylaş sonucu ve tekrarı kaydeder. Bağlantılar normalde bir yıl geçerlidir; yer kalmazsa eski kayıtlar erken silinebilir.',
  },
};
export function shareLabels(lang: Language) {
  return SHARE_LABELS[lang] ?? SHARE_LABELS.en;
}
