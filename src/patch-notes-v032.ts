import type { Language } from './i18n';
export const PATCH_V032 = {
  version: '0.2.32',
  date: '2026-11-09',
  notes: {
    ko: [
      '기기에 관계없이 같은 배속에서 노트가 같은 속도로 내려옵니다.',
      '모바일 화면 채움, 판정 효과, 결과 썸네일과 곡 선택 화면을 다듬었습니다.',
      '공유받은 결과에서는 다시 플레이 대신 플레이 시작을 표시합니다.',
    ],
    en: [
      'Notes now move at the same speed on every device for the same speed setting.',
      'Refined mobile screen fill, judgment effects, result artwork and track selection.',
      'Shared results show Start game rather than Play again.',
    ],
    ja: [
      '同じ速度設定なら、どの端末でもノーツが同じ速さで流れます。',
      'モバイル画面、判定エフェクト、結果の画像と選曲画面を調整しました。',
      '共有された結果には「もう一度プレイ」ではなくゲーム開始を表示します。',
    ],
    zh: [
      '相同倍速下，各设备的音符移动速度保持一致。',
      '优化移动端全屏、判定效果、结果封面和选曲界面。',
      '分享的结果显示开始游戏，而不是再次挑战。',
    ],
    es: [
      'Las notas se mueven igual en todos los dispositivos con la misma velocidad.',
      'Mejoras en pantalla móvil, efectos de juicio, carátulas y selección.',
      'Los resultados compartidos muestran Iniciar juego en lugar de Volver a jugar.',
    ],
    fr: [
      'Les notes défilent à la même vitesse sur tous les appareils au même réglage.',
      'Amélioration de l’écran mobile, des effets, des pochettes et de la sélection.',
      'Les résultats partagés affichent Démarrer au lieu de Rejouer.',
    ],
    de: [
      'Noten bewegen sich bei gleicher Einstellung auf allen Geräten gleich schnell.',
      'Mobile Ansicht, Treffereffekte, Ergebnisbilder und Titelauswahl verbessert.',
      'Geteilte Ergebnisse zeigen Spiel starten statt Erneut spielen.',
    ],
    pt: [
      'As notas se movem igual em todos os dispositivos na mesma velocidade.',
      'Melhorias na tela móvel, efeitos, capas e seleção de músicas.',
      'Resultados compartilhados mostram Iniciar jogo em vez de Jogar novamente.',
    ],
    it: [
      'Le note scorrono alla stessa velocità su tutti i dispositivi con la stessa impostazione.',
      'Migliorati schermo mobile, effetti, copertine e selezione.',
      'I risultati condivisi mostrano Avvia partita anziché Gioca ancora.',
    ],
    ru: [
      'При одинаковой настройке ноты движутся с одной скоростью на всех устройствах.',
      'Улучшены мобильный экран, эффекты, обложки результатов и выбор треков.',
      'Общие результаты показывают начало игры вместо повторной игры.',
    ],
    id: [
      'Nada bergerak dengan kecepatan yang sama di semua perangkat pada pengaturan yang sama.',
      'Tampilan seluler, efek penilaian, gambar hasil dan pilihan lagu diperbaiki.',
      'Hasil yang dibagikan menampilkan Mulai permainan, bukan Main lagi.',
    ],
    vi: [
      'Các nốt di chuyển cùng tốc độ trên mọi thiết bị khi dùng cùng cài đặt.',
      'Cải thiện màn hình di động, hiệu ứng, ảnh kết quả và chọn bài.',
      'Kết quả được chia sẻ hiển thị Bắt đầu thay vì Chơi lại.',
    ],
    tr: [
      'Aynı hız ayarında notalar tüm cihazlarda aynı hızda hareket eder.',
      'Mobil ekran, değerlendirme efektleri, sonuç görselleri ve parça seçimi iyileştirildi.',
      'Paylaşılan sonuçlar Tekrar oyna yerine Oyunu başlat gösterir.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
