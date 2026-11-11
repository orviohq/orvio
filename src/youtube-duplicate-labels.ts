import type { Language } from './i18n';

const messages: Record<Language, [string, string]> = {
  ko: ['이미 추가된 곡입니다', '이미 추가 중인 곡입니다'],
  en: ['This song is already added.', 'This song is already being added.'],
  ja: ['すでに追加されている曲です。', 'この曲はすでに追加中です。'],
  zh: ['此歌曲已添加。', '此歌曲正在添加中。'],
  es: ['Esta canción ya está añadida.', 'Esta canción ya se está añadiendo.'],
  fr: ['Ce morceau est déjà ajouté.', 'Ce morceau est déjà en cours d’ajout.'],
  de: [
    'Dieser Song wurde bereits hinzugefügt.',
    'Dieser Song wird bereits hinzugefügt.',
  ],
  pt: [
    'Esta música já foi adicionada.',
    'Esta música já está sendo adicionada.',
  ],
  it: [
    'Questo brano è già stato aggiunto.',
    'Questo brano è già in fase di aggiunta.',
  ],
  ru: ['Эта песня уже добавлена.', 'Эта песня уже добавляется.'],
  id: ['Lagu ini sudah ditambahkan.', 'Lagu ini sedang ditambahkan.'],
  vi: ['Bài hát này đã được thêm.', 'Bài hát này đang được thêm.'],
  tr: ['Bu şarkı zaten eklenmiş.', 'Bu şarkı zaten ekleniyor.'],
};

export const youtubeDuplicateMessage = (language: Language, pending: boolean) =>
  messages[language][pending ? 1 : 0];
