import type { Language } from './i18n';
export const PATCH_V040 = {
  version: '0.2.40',
  date: '2026-11-09',
  notes: {
    en: [
      'The Add YouTube button now stays available after refreshing the song list. Mobile controls keep their position during startup.',
    ],
    ko: [
      '곡 목록을 새로고침한 뒤에도 YouTube 추가 버튼이 사라지지 않도록 수정했습니다. 모바일에서도 시작 중 안내와 버튼 위치를 유지합니다.',
    ],
    ja: [
      '選曲を再読み込みしてもYouTube追加ボタンが消えないよう修正。モバイルでも起動中の案内とボタン位置を保ちます。',
    ],
    zh: [
      '修复刷新歌曲列表后YouTube添加按钮消失的问题。移动端启动时也保持提示和按钮位置。',
    ],
    es: [
      'El botón para añadir YouTube ya no desaparece al recargar la lista. Los controles móviles conservan su posición al iniciar.',
    ],
    fr: [
      'Le bouton Ajouter YouTube reste disponible après le rechargement. Les commandes mobiles gardent leur position au démarrage.',
    ],
    de: [
      'YouTube hinzufügen bleibt nach dem Neuladen verfügbar. Mobile Bedienelemente behalten beim Start ihre Position.',
    ],
    pt: [
      'O botão de adicionar YouTube não desaparece após recarregar. Os controles móveis mantêm a posição ao iniciar.',
    ],
    it: [
      'Il pulsante per aggiungere YouTube resta disponibile dopo il ricaricamento. I controlli mobili mantengono la posizione.',
    ],
    ru: [
      'Кнопка добавления YouTube больше не исчезает после обновления. Мобильные кнопки сохраняют положение при запуске.',
    ],
    id: [
      'Tombol tambah YouTube tetap tersedia setelah memuat ulang. Kontrol seluler tetap pada posisinya saat mulai.',
    ],
    vi: [
      'Nút thêm YouTube không còn biến mất sau khi tải lại. Điều khiển trên điện thoại giữ vị trí khi khởi động.',
    ],
    tr: [
      'YouTube ekleme düğmesi yenilemeden sonra kaybolmaz. Mobil kontroller başlangıçta yerini korur.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
