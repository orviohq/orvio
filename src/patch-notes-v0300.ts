import type { Language } from './i18n';
export const PATCH_V0300 = {
  version: '0.3.0',
  date: '2026-11-09',
  notes: {
    en: [
      'YouTube tracks now support 4, 6 and 8 keys, with saved results and replay playback.',
      'Improved YouTube import and saved-track loading. If chart preparation fails, the saved track stays available and you can try again.',
    ],
    ko: [
      'YouTube 곡을 4·6·8키로 플레이하고 결과를 저장하거나 리플레이를 볼 수 있습니다.',
      'YouTube 곡 가져오기와 저장된 곡 불러오기를 개선했습니다. 채보 준비에 실패해도 저장된 곡은 유지되며 다시 시도할 수 있습니다.',
    ],
    ja: [
      'YouTube の曲を4・6・8キーでプレイし、結果の保存やリプレイ再生ができます。',
      'YouTube の取り込みと保存済み曲の読み込みを改善しました。譜面の準備に失敗しても保存済みの曲は残り、再試行できます。',
    ],
    zh: [
      'YouTube 曲目现支持4、6和8键游玩、保存成绩和播放回放。',
      '改进了 YouTube 导入和已保存曲目的加载。谱面准备失败时，已保存的曲目仍会保留，可重新尝试。',
    ],
    es: [
      'Las canciones de YouTube admiten 4, 6 y 8 teclas, con resultados guardados y reproducción de repeticiones.',
      'Mejoras al importar YouTube y cargar canciones guardadas. Si falla la preparación del mapa, la canción guardada se conserva y puedes volver a intentarlo.',
    ],
    fr: [
      'Les morceaux YouTube se jouent en 4, 6 et 8 touches, avec sauvegarde des résultats et lecture des replays.',
      'Importation YouTube et chargement des morceaux sauvegardés améliorés. Si la préparation de la partition échoue, le morceau reste disponible et vous pouvez réessayer.',
    ],
    de: [
      'YouTube-Titel lassen sich mit 4, 6 und 8 Tasten spielen. Ergebnisse können gespeichert und Replays abgespielt werden.',
      'YouTube-Import und Laden gespeicherter Titel verbessert. Schlägt die Vorbereitung der Noten fehl, bleibt der gespeicherte Titel erhalten und du kannst es erneut versuchen.',
    ],
    pt: [
      'As músicas do YouTube agora aceitam 4, 6 e 8 teclas, com resultados salvos e reprodução de replays.',
      'Melhorias na importação do YouTube e no carregamento de músicas salvas. Se a preparação do mapa falhar, a música salva permanece disponível e você pode tentar novamente.',
    ],
    it: [
      'I brani di YouTube supportano 4, 6 e 8 tasti, con risultati salvati e riproduzione dei replay.',
      'Migliorati importazione da YouTube e caricamento dei brani salvati. Se la preparazione delle note non riesce, il brano salvato resta disponibile e puoi riprovare.',
    ],
    ru: [
      'Композиции YouTube поддерживают 4, 6 и 8 клавиш, сохранение результатов и просмотр повторов.',
      'Улучшены импорт YouTube и загрузка сохраненных композиций. При ошибке подготовки нот сохраненная композиция остается доступной, и можно повторить попытку.',
    ],
    id: [
      'Lagu YouTube kini mendukung 4, 6, dan 8 tombol, dengan hasil tersimpan dan pemutaran replay.',
      'Impor YouTube dan pemuatan lagu tersimpan ditingkatkan. Jika persiapan pola nada gagal, lagu tersimpan tetap tersedia dan Anda dapat mencoba lagi.',
    ],
    vi: [
      'Bài hát YouTube hỗ trợ 4, 6 và 8 phím, lưu kết quả và xem bản phát lại.',
      'Cải thiện nhập YouTube và tải bài hát đã lưu. Nếu chuẩn bị bản nốt thất bại, bài hát đã lưu vẫn được giữ lại và bạn có thể thử lại.',
    ],
    tr: [
      'YouTube parçaları artık 4, 6 ve 8 tuşu, sonuç kaydetmeyi ve tekrar oynatmayı destekler.',
      'YouTube içe aktarma ve kayıtlı parça yükleme iyileştirildi. Nota hazırlığı başarısız olsa bile kayıtlı parça korunur ve yeniden deneyebilirsiniz.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
