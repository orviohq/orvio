import type { Language } from './i18n';
export const PATCH_V036 = {
  version: '0.2.36',
  date: '2026-11-09',
  notes: {
    en: [
      'Results now fit their contents instead of leaving oversized blank space below the buttons.',
      'Reuse saved audio before rendering and remove the artificial startup wait. Refreshing a saved song no longer flashes the wrong start screen.',
      'Restore local song play URLs on refresh, with clear recovery when the song is missing.',
    ],
    ko: [
      '결과 카드를 내용에 맞춰 버튼 아래의 과도한 빈 공간을 없앴습니다.',
      '저장된 오디오를 우선 사용하고 인위적인 시작 대기를 없앴습니다. 곡 주소를 새로고침할 때 다른 시작 화면이 잠깐 나타나지 않도록 했습니다.',
      '저장된 곡의 플레이 주소를 새로고침해도 진입할 수 있으며, 곡이 없으면 곡 선택으로 안내합니다.',
    ],
    ja: [
      '保存済み音声を優先し、起動時の人工的な待ち時間を削除。再読み込み時に別の開始画面が一瞬出る問題を修正しました。',
      '保存した曲のプレイURLを再読み込みできます。曲がなければ選曲へ戻ります。',
    ],
    zh: [
      '优先使用已保存音频，移除人为的启动等待，刷新时不再闪现错误的开始画面。',
      '刷新本地歌曲的游玩地址可正常进入；缺少歌曲时返回选曲。',
    ],
    es: [
      'Reutiliza el audio guardado y elimina la espera artificial al iniciar, sin destellos de otra pantalla al recargar.',
      'Recupera las direcciones de juego de canciones locales o vuelve a la selección si faltan.',
    ],
    fr: [
      'Réutilise le son sauvegardé et supprime l’attente artificielle au démarrage ainsi que le bref écran incorrect au rechargement.',
      'Restaure les liens de jeu locaux au rechargement, ou revient au choix de chanson si elle manque.',
    ],
    de: [
      'Gespeichertes Audio wird zuerst verwendet. Künstliche Startwartezeit und falsches Startbild beim Neuladen entfallen.',
      'Lokale Song-Spieladressen funktionieren beim Neuladen; fehlende Songs führen zur Auswahl.',
    ],
    pt: [
      'Reutiliza o áudio salvo e remove a espera artificial ao iniciar e a tela errada ao recarregar.',
      'Restaura endereços de jogo locais ao recarregar, com retorno à seleção se a música faltar.',
    ],
    it: [
      'Riutilizza l’audio salvato e rimuove l’attesa artificiale e il lampo della schermata errata al ricaricamento.',
      'Ripristina gli indirizzi di gioco locali; se manca il brano, torna alla selezione.',
    ],
    ru: [
      'Сохранённое аудио используется в первую очередь. Убраны искусственная пауза запуска и мигание неверного стартового экрана.',
      'Адрес локальной песни восстанавливается при обновлении; если песни нет, открывается выбор.',
    ],
    id: [
      'Gunakan audio tersimpan terlebih dahulu dan hapus jeda buatan serta kilatan layar awal yang salah saat memuat ulang.',
      'Pulihkan alamat bermain lagu lokal saat dimuat ulang, atau kembali ke pilihan jika lagu tidak ada.',
    ],
    vi: [
      'Ưu tiên âm thanh đã lưu, bỏ chờ nhân tạo và màn hình bắt đầu sai nhấp nháy khi tải lại.',
      'Khôi phục địa chỉ chơi bài hát cục bộ khi tải lại; về chọn bài nếu không có bài hát.',
    ],
    tr: [
      'Kayıtlı ses öncelikli kullanılır; yapay başlangıç beklemesi ve yenilemede yanlış ekran parlaması kaldırıldı.',
      'Yerel şarkı oyun adresleri yenilemede açılır; şarkı yoksa seçime dönülür.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
