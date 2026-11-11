import type { Language } from './i18n';
export const PATCH_V0305 = {
  version: '0.3.5',
  date: '2026-11-10',
  notes: {
    en: [
      'YouTube song previews now continue from the usual starting point through the end of the song.',
    ],
    ko: ['YouTube 곡 미리듣기가 기존 시작 지점에서 곡 끝까지 이어집니다.'],
    ja: ['YouTube曲の試聴が従来の開始位置から曲の最後まで再生されます。'],
    zh: ['YouTube 歌曲试听现在从原有起点持续播放到歌曲结尾。'],
    es: [
      'Las vistas previas de canciones de YouTube continúan desde el punto inicial habitual hasta el final de la canción.',
    ],
    fr: [
      'Les aperçus des morceaux YouTube se poursuivent depuis le point de départ habituel jusqu’à la fin du morceau.',
    ],
    de: [
      'YouTube-Songvorschauen laufen jetzt vom gewohnten Startpunkt bis zum Ende des Songs weiter.',
    ],
    pt: [
      'As prévias de músicas do YouTube agora continuam do ponto inicial habitual até o fim da música.',
    ],
    it: [
      'Le anteprime dei brani YouTube ora continuano dal punto iniziale abituale fino alla fine del brano.',
    ],
    ru: [
      'Предпросмотр песен YouTube теперь продолжается от обычной начальной точки до конца песни.',
    ],
    id: [
      'Pratinjau lagu YouTube kini berlanjut dari titik awal yang biasa hingga akhir lagu.',
    ],
    vi: [
      'Bản nghe trước bài hát YouTube giờ tiếp tục từ điểm bắt đầu quen thuộc đến cuối bài.',
    ],
    tr: [
      'YouTube şarkı önizlemeleri artık normal başlangıç noktasından şarkının sonuna kadar devam eder.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
