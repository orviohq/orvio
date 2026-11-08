import type { Language } from './i18n';
export const PATCH_V034 = {
  version: '0.2.34',
  date: '2026-11-09',
  notes: {
    en: [
      'Move song sharing to the song right-click menu and remove the button below the preview.',
    ],
    ko: [
      '곡 공유를 곡 우클릭 메뉴로 옮기고 미리듣기 아래의 버튼을 없앴습니다.',
    ],
    ja: [
      '曲の共有を右クリックメニューに移し、プレビュー下のボタンを削除しました。',
    ],
    zh: ['将歌曲分享移至歌曲右键菜单，并移除预览下方的按钮。'],
    es: [
      'Comparte canciones desde su menú contextual; se retira el botón bajo la vista previa.',
    ],
    fr: [
      'Le partage de chanson passe dans le menu du clic droit. Le bouton sous l’aperçu est supprimé.',
    ],
    de: [
      'Songs werden jetzt über das Rechtsklickmenü geteilt. Die Schaltfläche unter der Vorschau entfällt.',
    ],
    pt: [
      'Compartilhe músicas pelo menu do botão direito. O botão abaixo da prévia foi removido.',
    ],
    it: [
      'La condivisione dei brani passa al menu del tasto destro. Rimosso il pulsante sotto l’anteprima.',
    ],
    ru: [
      'Поделиться песней теперь можно через меню правой кнопки мыши. Кнопка под предпрослушиванием удалена.',
    ],
    id: [
      'Berbagi lagu dipindahkan ke menu klik kanan lagu. Tombol di bawah pratinjau dihapus.',
    ],
    vi: [
      'Chuyển chia sẻ bài hát vào menu nhấp chuột phải của bài hát và bỏ nút dưới phần nghe thử.',
    ],
    tr: [
      'Şarkı paylaşımı sağ tık menüsüne taşındı. Önizlemenin altındaki düğme kaldırıldı.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
