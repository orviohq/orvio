import type { Language } from './i18n';
export const PATCH_V017 = {
  version: '0.2.17',
  date: '2026-11-08',
  notes: {
    en: [
      'Notes no longer fall before the countdown ends, including after changing speed during the countdown.',
      'Audio preparation can be cancelled with Cancel or Esc. If preparation stalls, it returns to track selection so you can retry.',
    ],
    ko: [
      '카운트다운 중 속도를 바꾸어도 카운트다운이 끝나기 전에 노트가 내려오지 않도록 수정했습니다.',
      '음원 준비 중 취소 버튼이나 Esc로 돌아갈 수 있습니다. 준비가 멈추면 곡 선택으로 돌아가 다시 시작할 수 있습니다.',
    ],
    zh: [
      '修复倒计时结束前音符下落的问题，倒计时期间更改速度也不会提前下落。',
      '准备音频时可按取消或 Esc 返回。准备停滞时会返回选曲，可重新开始。',
    ],
    ja: [
      'カウントダウン中に速度を変更しても、終了前にノーツが落ちてこないように修正しました。',
      '音源準備はキャンセルまたは Esc で中止できます。準備が止まった場合は曲選択に戻り、再試行できます。',
    ],
    es: [
      'Las notas ya no caen antes de terminar la cuenta atrás, incluso si cambias la velocidad durante ella.',
      'Puedes cancelar la preparación de audio con Cancelar o Esc. Si se detiene, vuelve a la selección de pista para reintentar.',
    ],
    fr: [
      'Les notes ne tombent plus avant la fin du compte à rebours, même si la vitesse change pendant celui-ci.',
      'Annuler ou Esc arrête la préparation audio. Si elle se bloque, le jeu revient au choix du morceau pour réessayer.',
    ],
    de: [
      'Noten fallen nicht mehr vor dem Ende des Countdowns, auch wenn du dabei das Tempo änderst.',
      'Die Audiovorbereitung lässt sich mit Abbrechen oder Esc beenden. Bei Stillstand kehrt das Spiel zur Titelauswahl zurück, damit du es erneut versuchen kannst.',
    ],
    pt: [
      'As notas não caem antes do fim da contagem, mesmo ao mudar a velocidade durante a contagem.',
      'Cancele a preparação do áudio com Cancelar ou Esc. Se ela parar, o jogo volta à seleção de música para tentar novamente.',
    ],
    it: [
      'Le note non scendono prima della fine del conto alla rovescia, anche cambiando velocità durante il conto.',
      'Annulla o Esc interrompe la preparazione audio. Se si blocca, il gioco torna alla selezione del brano per riprovare.',
    ],
    ru: [
      'Ноты больше не падают до конца отсчёта, даже при смене скорости во время отсчёта.',
      'Подготовку звука можно отменить кнопкой отмены или Esc. Если она зависнет, игра вернётся к выбору трека для повторной попытки.',
    ],
    id: [
      'Not tidak lagi turun sebelum hitung mundur selesai, termasuk saat kecepatan diubah selama hitung mundur.',
      'Batalkan persiapan audio dengan Batal atau Esc. Jika persiapan macet, permainan kembali ke pilihan lagu agar dapat dicoba lagi.',
    ],
    tr: [
      'Geri sayım sırasında hız değişse bile notalar artık geri sayım bitmeden düşmez.',
      'Ses hazırlığını İptal veya Esc ile durdurabilirsiniz. Hazırlık takılırsa yeniden denemek için parça seçimine dönülür.',
    ],
    vi: [
      'Nốt không còn rơi trước khi đếm ngược kết thúc, kể cả khi đổi tốc độ trong lúc đếm ngược.',
      'Có thể hủy chuẩn bị âm thanh bằng Hủy hoặc Esc. Nếu bị kẹt, trò chơi trở về chọn bài để thử lại.',
    ],
  } satisfies Record<Language, string[]>,
};
