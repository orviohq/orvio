import type { Language } from './i18n';
const rows: Record<Language, [string, string]> = {
  en: [
    'Restore audio',
    'Request the same audio again to play this replay. Request limits apply. The original chart and result will stay unchanged. Playback is only possible if the audio still matches.',
  ],
  ko: [
    '음원 다시 준비',
    '이 리플레이를 재생하려면 같은 음원을 다시 요청하세요. 요청 한도가 적용됩니다. 원래 채보와 결과는 그대로 유지되며, 같은 음원일 때만 재생할 수 있습니다.',
  ],
  zh: [
    '重新获取音频',
    '请重新请求相同音频以播放此回放。请求次数限制适用。原谱面和成绩不变，仅音频仍一致时才可播放。',
  ],
  ja: [
    '音源を再取得',
    'このリプレイを再生するには同じ音源を再リクエストしてください。リクエスト上限が適用されます。元の譜面と結果は保持され、音源が一致する場合のみ再生できます。',
  ],
  es: [
    'Recuperar audio',
    'Solicita el mismo audio para reproducir esta repetición. Se aplican límites. El mapa y el resultado originales no cambian. Solo se reproduce si el audio coincide.',
  ],
  fr: [
    "Récupérer l'audio",
    "Redemandez le même audio pour lire ce replay. Les limites de requêtes s'appliquent. La partition et le résultat restent inchangés. La lecture exige le même audio.",
  ],
  de: [
    'Audio wiederherstellen',
    'Fordere dasselbe Audio erneut an, um das Replay abzuspielen. Anfragelimits gelten. Originalkarte und Ergebnis bleiben unverändert. Wiedergabe ist nur mit passendem Audio möglich.',
  ],
  pt: [
    'Recuperar áudio',
    'Solicite o mesmo áudio para reproduzir o replay. Há limites de pedidos. O mapa e o resultado originais não mudam. Só é possível reproduzir se o áudio for igual.',
  ],
  ru: [
    'Восстановить аудио',
    'Запросите то же аудио для просмотра повтора. Действуют лимиты запросов. Исходная карта и результат не изменятся. Воспроизведение возможно только при совпадении аудио.',
  ],
  it: [
    'Recupera audio',
    'Richiedi lo stesso audio per riprodurre il replay. Si applicano limiti. Mappa e risultato originali non cambiano. La riproduzione richiede audio corrispondente.',
  ],
  id: [
    'Pulihkan audio',
    'Minta audio yang sama lagi untuk memutar replay. Batas permintaan berlaku. Peta dan hasil asli tidak berubah. Pemutaran hanya tersedia jika audionya cocok.',
  ],
  tr: [
    'Sesi geri yükle',
    'Bu tekrarı oynatmak için aynı sesi yeniden isteyin. İstek sınırları geçerlidir. Asıl nota haritası ve sonuç değişmez. Yalnızca ses hâlâ eşleşiyorsa oynatılabilir.',
  ],
  vi: [
    'Khôi phục âm thanh',
    'Yêu cầu lại cùng âm thanh để phát bản xem lại. Có giới hạn yêu cầu. Bản đồ và kết quả gốc không đổi. Chỉ phát khi âm thanh vẫn khớp.',
  ],
};
export function sharedAudioLabels(language: Language) {
  const r = rows[language];
  return { restore: r[0], explain: r[1] };
}
