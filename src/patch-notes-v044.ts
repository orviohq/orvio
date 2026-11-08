import type { Language } from './i18n';
export const PATCH_V044 = {
  version: '0.2.44',
  date: '2026-11-09',
  notes: {
    en: [
      'Returning to song selection keeps the selected track in view after navigation, refresh and list updates. Saved audio now requests persistent browser storage when supported, without blocking playback or promising permanent retention.',
    ],
    ko: [
      '다른 화면에서 돌아오거나 새로고침해도 선택한 곡이 보이는 위치를 복원합니다. 저장한 음원은 지원되는 브라우저에서 영구 저장을 요청하며, 거부되더라도 재생을 막지 않습니다.',
    ],
    ja: [
      '画面移動や再読み込み後も選択曲が見える位置を復元します。対応ブラウザでは音源の永続保存を要求しますが、拒否されても再生を妨げません。',
    ],
    zh: [
      '返回选曲或刷新后恢复到所选歌曲可见的位置。支持的浏览器会请求持久保存音频，拒绝也不会阻止播放。',
    ],
    es: [
      'Al volver o recargar, la pista seleccionada sigue visible. Se solicita almacenamiento persistente cuando está disponible, sin bloquear la reproducción.',
    ],
    fr: [
      'Le morceau sélectionné reste visible au retour et au rechargement. Le stockage persistant est demandé si disponible, sans bloquer la lecture.',
    ],
    de: [
      'Der gewählte Song bleibt nach Rückkehr und Neuladen sichtbar. Dauerhafter Browserspeicher wird nach Möglichkeit angefragt, ohne die Wiedergabe zu blockieren.',
    ],
    pt: [
      'A faixa selecionada permanece visível ao voltar e recarregar. O armazenamento persistente é solicitado quando disponível, sem bloquear a reprodução.',
    ],
    it: [
      'Il brano selezionato resta visibile al ritorno e dopo il ricaricamento. Si richiede spazio persistente se supportato, senza bloccare la riproduzione.',
    ],
    ru: [
      'При возврате и обновлении выбранная песня остаётся видимой. По возможности запрашивается постоянное хранилище, без блокировки воспроизведения.',
    ],
    id: [
      'Lagu terpilih tetap terlihat saat kembali atau memuat ulang. Penyimpanan persisten diminta jika didukung, tanpa menghalangi pemutaran.',
    ],
    vi: [
      'Bài đã chọn vẫn hiển thị khi quay lại hoặc tải lại. Yêu cầu lưu trữ lâu dài khi trình duyệt hỗ trợ, không chặn phát nhạc.',
    ],
    tr: [
      'Geri dönüşte ve yenilemede seçili şarkı görünür kalır. Desteklenirse kalıcı depolama istenir; oynatma engellenmez.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
