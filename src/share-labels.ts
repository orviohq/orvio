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
} as Record<
  Language,
  {
    busy: string;
    failed: string;
    quota: string;
    missing: string;
    invalid: string;
    expiry: string;
  }
>;
export function shareLabels(lang: Language) {
  return SHARE_LABELS[lang] ?? SHARE_LABELS.en;
}
