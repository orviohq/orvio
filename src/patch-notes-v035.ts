import type { Language } from './i18n';
export const PATCH_V035 = {
  version: '0.2.35',
  date: '2026-11-09',
  notes: {
    en: [
      'Redesign the result screen with score and rank together, a clearer layout, and labeled Replay and Share buttons on one row.',
      'Copy song links directly from the context menu without opening a dialog.',
    ],
    ko: [
      '결과화면 전체를 새로 정리했습니다. 점수와 랭크를 함께 배치하고, 텍스트가 있는 리플레이 보기·결과 공유 버튼을 같은 줄에 놓았습니다.',
      '곡 우클릭 메뉴에서 공유를 누르면 팝업 없이 바로 링크를 복사합니다.',
    ],
    ja: [
      'リザルト画面を一新。スコアとランクをまとめ、リプレイと共有を文字付きの同じ行に配置しました。',
      '曲の右クリックメニューからダイアログなしでリンクをコピーできます。',
    ],
    zh: [
      '重新设计结果界面，将分数与评级放在一起，同一行显示带文字的回放和分享按钮。',
      '歌曲右键菜单直接复制链接，不再弹出对话框。',
    ],
    es: [
      'Rediseñamos los resultados: puntuación y rango juntos, con Repetición y Compartir en la misma fila.',
      'El menú contextual copia el enlace de la canción sin abrir un diálogo.',
    ],
    fr: [
      'Nouvel écran de résultats : score et rang regroupés, boutons Replay et Partager nommés sur une même ligne.',
      'Le menu contextuel copie le lien de la chanson sans dialogue.',
    ],
    de: [
      'Neue Ergebnisansicht: Punktzahl und Rang zusammen, beschriftete Replay- und Teilen-Schaltflächen in einer Zeile.',
      'Das Song-Kontextmenü kopiert den Link ohne Dialog.',
    ],
    pt: [
      'Novo visual dos resultados: pontuação e classificação juntas, com Replay e Compartilhar na mesma linha.',
      'O menu de contexto copia o link da música sem abrir uma janela.',
    ],
    it: [
      'Nuova schermata dei risultati: punteggio e grado insieme, pulsanti Replay e Condividi sulla stessa riga.',
      'Il menu contestuale copia il link del brano senza finestre.',
    ],
    ru: [
      'Новый экран результатов: счёт и ранг вместе, подписанные кнопки повтора и отправки в одной строке.',
      'Меню песни копирует ссылку без диалога.',
    ],
    id: [
      'Tampilan hasil baru menyatukan skor dan peringkat, dengan tombol Replay dan Bagikan berlabel pada satu baris.',
      'Menu klik kanan lagu langsung menyalin tautan tanpa dialog.',
    ],
    vi: [
      'Thiết kế lại màn hình kết quả: điểm và hạng cùng khu vực, nút Xem lại và Chia sẻ có chữ trên cùng hàng.',
      'Menu bài hát sao chép liên kết ngay, không mở hộp thoại.',
    ],
    tr: [
      'Sonuç ekranı yenilendi: puan ve derece birlikte, etiketli Tekrar ve Paylaş düğmeleri aynı satırda.',
      'Şarkı menüsü bağlantıyı iletişim kutusu açmadan kopyalar.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
