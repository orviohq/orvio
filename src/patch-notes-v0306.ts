import type { Language } from './i18n';
export const PATCH_V0306 = {
  version: '0.3.6',
  date: '2026-11-10',
  notes: {
    en: [
      'The Replay menu now appears only when you have saved replays, and the replay list opens instantly from your device.',
    ],
    ko: [
      '저장된 리플레이가 있을 때만 리플레이 메뉴가 표시되고, 리플레이 목록이 기기에서 즉시 열립니다.',
    ],
    ja: [
      '保存されたリプレイがある場合のみリプレイメニューが表示され、リプレイ一覧がデバイスから即座に開きます。',
    ],
    zh: [
      '现在仅在已有保存的回放时才显示回放菜单，回放列表也会从本机即时打开。',
    ],
    es: [
      'El menú Repeticiones solo aparece cuando tienes repeticiones guardadas, y la lista se abre al instante desde tu dispositivo.',
    ],
    fr: [
      'Le menu Replays n’apparaît que lorsque des replays sont enregistrés, et la liste s’ouvre instantanément depuis votre appareil.',
    ],
    de: [
      'Das Replay-Menü erscheint nur, wenn gespeicherte Replays vorhanden sind, und die Replay-Liste öffnet sich sofort vom Gerät.',
    ],
    pt: [
      'O menu Replays só aparece quando há replays salvos, e a lista abre instantaneamente a partir do seu dispositivo.',
    ],
    it: [
      'Il menu Replay appare solo quando ci sono replay salvati e l’elenco si apre istantaneamente dal dispositivo.',
    ],
    ru: [
      'Меню реплеев теперь отображается только при наличии сохранённых реплеев, а список реплеев мгновенно открывается с устройства.',
    ],
    id: [
      'Menu Replay kini hanya muncul saat ada replay tersimpan, dan daftar replay langsung terbuka dari perangkat.',
    ],
    vi: [
      'Menu Replay chỉ hiện khi bạn có replay đã lưu, và danh sách replay mở ngay lập tức từ thiết bị.',
    ],
    tr: [
      'Tekrar menüsü artık yalnızca kayıtlı tekrarınız olduğunda görünür ve tekrar listesi cihazdan anında açılır.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
