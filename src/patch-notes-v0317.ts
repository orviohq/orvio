import type { Language } from './i18n';

export const PATCH_V0317 = {
  version: '0.3.17',
  date: '2026-11-11',
  notes: {
    ko: ['로컬에 저장된 곡을 4–8키로 플레이하고, 플레이 기록과 리플레이를 이 기기에 보관하며, 검증된 결과를 공유할 수 있습니다. 리플레이 오디오는 기기에 미리 저장되어 있어야 합니다.'],
    en: ['Play locally saved songs with 4–8 keys, keep sessions and replays on this device, and share verified results. Replay audio must already be saved on the device.'],
    zh: ['使用 4–8 键游玩本地保存的歌曲，在此设备上保留游玩记录和回放，并分享经过验证的成绩。回放音频必须已保存在设备上。'],
    ja: ['ローカルに保存した曲を4–8キーでプレイし、プレイ記録とリプレイをこの端末に保存して、検証済みの結果を共有できます。リプレイの音声は端末にあらかじめ保存されている必要があります。'],
    es: ['Juega canciones guardadas localmente con 4–8 teclas, conserva sesiones y repeticiones en este dispositivo y comparte resultados verificados. El audio de la repetición debe estar guardado previamente en el dispositivo.'],
    fr: ['Jouez aux morceaux enregistrés localement avec 4–8 touches, conservez les sessions et les replays sur cet appareil et partagez des résultats vérifiés. Le son du replay doit déjà être enregistré sur l’appareil.'],
    de: ['Spiele lokal gespeicherte Songs mit 4–8 Tasten, bewahre Spielsitzungen und Replays auf diesem Gerät auf und teile überprüfte Ergebnisse. Die Audiodatei für das Replay muss bereits auf dem Gerät gespeichert sein.'],
    pt: ['Jogue músicas salvas localmente com 4–8 teclas, mantenha sessões e replays neste dispositivo e compartilhe resultados verificados. O áudio do replay já deve estar salvo no dispositivo.'],
    it: ['Gioca ai brani salvati localmente con 4–8 tasti, conserva sessioni e replay su questo dispositivo e condividi risultati verificati. L’audio del replay deve essere già salvato sul dispositivo.'],
    ru: ['Играйте локально сохранённые песни с 4–8 клавишами, храните игровые сессии и повторы на этом устройстве и делитесь проверенными результатами. Аудио для повтора должно быть заранее сохранено на устройстве.'],
    id: ['Mainkan lagu yang disimpan secara lokal dengan 4–8 tombol, simpan sesi dan tayangan ulang di perangkat ini, serta bagikan hasil yang telah diverifikasi. Audio tayangan ulang harus sudah tersimpan di perangkat.'],
    tr: ['Yerel olarak kaydedilmiş şarkıları 4–8 tuşla oynayın, oturumları ve tekrarları bu cihazda saklayın ve doğrulanmış sonuçları paylaşın. Tekrarın sesi cihazda önceden kaydedilmiş olmalıdır.'],
    vi: ['Chơi các bài hát đã lưu cục bộ bằng 4–8 phím, giữ các phiên chơi và bản phát lại trên thiết bị này, đồng thời chia sẻ kết quả đã xác minh. Âm thanh của bản phát lại phải được lưu sẵn trên thiết bị.'],
  } satisfies Record<Language, string[]>,
};
