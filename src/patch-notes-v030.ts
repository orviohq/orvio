import type { Language } from './i18n';
export const PATCH_V030 = {
  version: '0.2.30',
  date: '2026-11-08',
  notes: {
    ko: [
      'A37(결과 전환): 결과를 여는 짧은 대기 화면을 로딩 애니메이션으로 바꿨습니다. 대기 시간을 추가하지 않으며 모션 줄이기 설정을 따릅니다.',
      'A38(공유 결과 제목): 공유 결과를 새로고침해도 곡 제목을 유지합니다. 저장된 음원, 차트와 리플레이는 바꾸지 않습니다.',
      'A39: 모바일 결과는 전체 화면으로 표시하며 긴 제목과 좁은 화면에 맞게 배치합니다. 모바일에서는 리플레이를 볼 수 있고 직접 플레이는 데스크톱에서만 가능합니다.',
    ],
    en: [
      'A37 (result transition): A loading animation replaces the brief result entry page, with no added delay and reduced-motion support.',
      'A38 (shared result title): Keep the song title after reloading a shared result. Saved audio, charts and replays stay unchanged.',
      'A39: Full-screen mobile results adapt to narrow screens and long titles. Mobile can watch replays; direct gameplay requires a desktop.',
    ],
    ja: [
      'A37（結果遷移）：短い待機画面を読み込みアニメーションに変更。待ち時間は追加せず、動きを減らす設定に対応。',
      'A38（共有結果の曲名）：再読み込み後も曲名を維持。保存済み音源、譜面、リプレイは変更しません。',
      'A39：モバイル結果を全画面にし、長い曲名と狭い画面に対応。リプレイは視聴でき、直接プレイはデスクトップのみ。',
    ],
    zh: [
      'A37（结果切换）：短暂的等待页改为加载动画，不增加等待时间，并支持减少动态效果。',
      'A38（分享结果标题）：刷新分享结果后保留曲名，不改变已保存音频、谱面和回放。',
      'A39：移动端结果全屏显示，适配窄屏和长标题。移动端可观看回放，直接游玩仅限桌面端。',
    ],
    de: [
      'A37 (Ergebniswechsel): Ladeanimation statt kurzer Zwischenseite, ohne zusätzliche Wartezeit und mit reduzierter Bewegung.',
      'A38 (geteilter Ergebnistitel): Songtitel nach Neuladen erhalten. Gespeicherte Audiodaten, Charts und Replays bleiben unverändert.',
      'A39: Mobile Ergebnisse füllen den Bildschirm und passen lange Titel an. Replays sind mobil abspielbar; direktes Spielen erfordert einen Desktop.',
    ],
    fr: [
      'A37 (transition) : Animation de chargement sans attente ajoutée, avec mouvement réduit.',
      'A38 (titre partagé) : Le titre reste après actualisation. Audio, partitions et replays enregistrés restent inchangés.',
      'A39 : Résultats mobiles plein écran, adaptés aux titres longs. Replays visibles sur mobile, jeu direct sur ordinateur uniquement.',
    ],
    es: [
      'A37 (transición): Animación de carga sin espera añadida y con movimiento reducido.',
      'A38 (título compartido): El título se mantiene al recargar. Audio, mapas y repeticiones guardados no cambian.',
      'A39: Resultados móviles a pantalla completa adaptados a títulos largos. Se pueden ver repeticiones; jugar requiere un escritorio.',
    ],
    pt: [
      'A37 (transição): Animação de carregamento sem espera adicional e com movimento reduzido.',
      'A38 (título compartilhado): O título permanece após atualizar. Áudio, mapas e replays salvos não mudam.',
      'A39: Resultados móveis em tela cheia, com títulos longos. Replays no celular; jogo direto apenas no computador.',
    ],
    it: [
      'A37 (transizione): Animazione di caricamento senza attesa aggiunta, con movimento ridotto.',
      'A38 (titolo condiviso): Il titolo resta dopo il ricaricamento. Audio, mappe e replay salvati non cambiano.',
      'A39: Risultati mobili a schermo intero, adatti a titoli lunghi. Replay visibili su mobile; gioco diretto solo su desktop.',
    ],
    ru: [
      'A37 (переход): Анимация загрузки без лишнего ожидания, с поддержкой уменьшения движения.',
      'A38 (название в общей ссылке): Название сохраняется после обновления. Аудио, карты и повторы не меняются.',
      'A39: Полноэкранные результаты на мобильных с переносом длинных названий. Просмотр повторов доступен, игра только на компьютере.',
    ],
    id: [
      'A37 (transisi): Animasi pemuatan tanpa menambah waktu tunggu, mendukung pengurangan gerakan.',
      'A38 (judul hasil bersama): Judul tetap setelah memuat ulang. Audio, chart dan replay tersimpan tidak berubah.',
      'A39: Hasil seluler layar penuh menyesuaikan judul panjang. Replay dapat ditonton; bermain langsung hanya di desktop.',
    ],
    vi: [
      'A37 (chuyển kết quả): Hoạt ảnh tải không thêm thời gian chờ, hỗ trợ giảm chuyển động.',
      'A38 (tên kết quả chia sẻ): Giữ tên bài sau khi tải lại. Không đổi âm thanh, bản đồ nốt hay phát lại đã lưu.',
      'A39: Kết quả di động toàn màn hình, phù hợp tên dài. Có thể xem phát lại; chơi trực tiếp cần máy tính.',
    ],
    tr: [
      'A37 (sonuç geçişi): Ek bekleme olmadan yükleme animasyonu, azaltılmış hareket desteği.',
      'A38 (paylaşılan sonuç başlığı): Yenilemeden sonra başlık korunur. Kayıtlı ses, nota ve tekrarlar değişmez.',
      'A39: Mobil sonuçlar tam ekran ve uzun başlıklara uyumludur. Tekrar izlenebilir; doğrudan oyun masaüstü gerektirir.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
