import type { Language } from './i18n';
export const PATCH_V037 = {
  version: '0.2.37',
  date: '2026-11-09',
  notes: {
    en: [
      'The result score counts up from zero, the rank lands with a stamp, and details appear in sequence. Actions stay available throughout.',
      'Reduced motion shows final results immediately. Scores, replays and saved sessions are unchanged.',
    ],
    ko: [
      '결과 점수가 0부터 올라가고, 랭크가 크게 찍힌 뒤 상세 항목이 차례로 나타납니다. 버튼은 언제든 사용할 수 있습니다.',
      '동작 줄이기 설정에서는 최종 결과가 즉시 표시됩니다. 점수·리플레이·저장 기록은 바뀌지 않습니다.',
    ],
    ja: [
      '結果のスコアが0から増え、ランクが大きく押され、詳細が順に表示されます。ボタンは常に使えます。',
      '動きを減らす設定では最終結果をすぐに表示します。スコアやリプレイ、保存記録は変わりません。',
    ],
    zh: [
      '结果分数从0递增，评级以印章效果落下，详情依次出现。按钮始终可用。',
      '减少动态效果时直接显示最终结果。分数、回放和保存记录不变。',
    ],
    es: [
      'La puntuación sube desde cero, el rango aparece con un sello y los detalles entran en orden. Los botones siguen disponibles.',
      'El movimiento reducido muestra el resultado final de inmediato, sin cambiar puntuaciones, repeticiones ni registros.',
    ],
    fr: [
      'Le score monte depuis zéro, le rang arrive comme un tampon et les détails apparaissent en ordre. Les boutons restent disponibles.',
      'Les mouvements réduits affichent le résultat final immédiatement. Scores, replays et sessions restent inchangés.',
    ],
    de: [
      'Der Punktestand zählt von null hoch, der Rang erscheint als Stempel und Details folgen nacheinander. Die Tasten bleiben nutzbar.',
      'Bei reduzierter Bewegung erscheint das Endergebnis sofort. Punkte, Replays und gespeicherte Sitzungen bleiben unverändert.',
    ],
    pt: [
      'A pontuação sobe do zero, o rank aparece como um carimbo e os detalhes surgem em sequência. Os botões continuam disponíveis.',
      'Movimento reduzido exibe o resultado final imediatamente, sem alterar pontuações, replays ou registros.',
    ],
    it: [
      'Il punteggio sale da zero, il rango arriva come un timbro e i dettagli appaiono in sequenza. I pulsanti restano disponibili.',
      'Con movimento ridotto il risultato finale appare subito. Punti, replay e sessioni salvate non cambiano.',
    ],
    ru: [
      'Счёт растёт от нуля, ранг появляется как штамп, а детали следуют по очереди. Кнопки остаются доступны.',
      'При уменьшении движения итог виден сразу. Счёт, повторы и сохранённые сессии не меняются.',
    ],
    id: [
      'Skor naik dari nol, peringkat muncul seperti cap, lalu rincian tampil berurutan. Tombol tetap tersedia.',
      'Gerakan terbatas langsung menampilkan hasil akhir. Skor, replay, dan sesi tersimpan tidak berubah.',
    ],
    vi: [
      'Điểm tăng từ 0, hạng xuất hiện như dấu đóng rồi các chi tiết lần lượt hiện ra. Các nút luôn dùng được.',
      'Giảm chuyển động hiển thị ngay kết quả cuối. Điểm, phát lại và phiên đã lưu không đổi.',
    ],
    tr: [
      'Puan sıfırdan yükselir, derece damga gibi belirir ve ayrıntılar sırayla görünür. Düğmeler kullanılabilir kalır.',
      'Azaltılmış harekette son sonuç hemen gösterilir. Puanlar, tekrarlar ve kayıtlar değişmez.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
