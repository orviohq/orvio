import type { Language } from './i18n';
export const PATCH_V033 = {
  version: '0.2.33',
  date: '2026-11-09',
  notes: {
    en: [
      'Share a song link so the recipient can review it before adding it.',
      'YouTube imports show the title early when available and report the current import stage. A notification appears after saving.',
      'Keep selection artwork stable with long titles; improve missing Korean characters and notifications.',
      'BREAK feedback no longer covers the note corridor with a red fill.',
    ],
    ko: [
      '곡 링크를 공유하고, 받은 사람은 곡을 확인한 뒤 추가할 수 있습니다.',
      'YouTube 가져오기에서 가능한 경우 제목을 먼저 표시하고 현재 진행 단계를 안내합니다. 저장이 끝나면 알림을 표시합니다.',
      '긴 제목에서도 곡 선택 썸네일 위치를 유지하고, 빠진 한글 문자와 알림 표시를 보완했습니다.',
      'BREAK 판정의 붉은 면이 노트 영역을 가리지 않도록 바꿨습니다.',
    ],
    ja: [
      '曲リンクを共有し、受け取った人は確認してから追加できます。',
      'YouTubeの取り込みでは、取得できたタイトルと現在の段階を表示し、保存後に通知します。',
      '長い曲名でも画像の位置を維持し、韓国語の文字と通知表示を改善しました。',
      'BREAK時の赤い塗りがノーツを隠さないようにしました。',
    ],
    zh: [
      '分享歌曲链接，接收者确认后再添加。',
      'YouTube导入在可用时提前显示标题，显示当前阶段，并在保存后通知。',
      '长标题不再改变选曲封面的位置，并补全韩文字形和改进通知。',
      'BREAK的红色填充不再遮挡音符区域。',
    ],
    es: [
      'Comparte una canción para que el destinatario la revise antes de añadirla.',
      'La importación de YouTube muestra el título cuando está disponible, la etapa actual y un aviso tras guardar.',
      'Carátulas estables con títulos largos, caracteres coreanos y avisos mejorados.',
      'El fondo rojo de BREAK ya no tapa las notas.',
    ],
    fr: [
      'Partagez une chanson pour que le destinataire la vérifie avant de l’ajouter.',
      'L’import YouTube affiche le titre si disponible, l’étape actuelle et une notification après sauvegarde.',
      'Images stables avec les titres longs, caractères coréens et notifications améliorés.',
      'Le fond rouge de BREAK ne masque plus les notes.',
    ],
    de: [
      'Teile einen Songlink, damit Empfänger den Song vor dem Hinzufügen prüfen können.',
      'YouTube-Importe zeigen verfügbare Titel früh, den aktuellen Schritt und nach dem Speichern eine Meldung.',
      'Stabile Bilder bei langen Titeln sowie bessere koreanische Zeichen und Meldungen.',
      'Die rote BREAK-Fläche verdeckt keine Noten mehr.',
    ],
    pt: [
      'Compartilhe uma música para que o destinatário a confira antes de adicionar.',
      'A importação do YouTube mostra o título quando disponível, a etapa atual e um aviso após salvar.',
      'Capas estáveis com títulos longos, caracteres coreanos e avisos melhorados.',
      'O fundo vermelho de BREAK não cobre mais as notas.',
    ],
    it: [
      'Condividi una canzone: chi la riceve può verificarla prima di aggiungerla.',
      'Le importazioni YouTube mostrano il titolo se disponibile, la fase attuale e un avviso dopo il salvataggio.',
      'Immagini stabili con titoli lunghi, caratteri coreani e notifiche migliorati.',
      'Lo sfondo rosso di BREAK non copre più le note.',
    ],
    ru: [
      'Поделитесь ссылкой на песню: получатель сможет проверить её перед добавлением.',
      'Импорт YouTube показывает доступное название, текущий этап и уведомление после сохранения.',
      'Обложки не смещаются из-за длинных названий; улучшены корейские символы и уведомления.',
      'Красная заливка BREAK больше не закрывает ноты.',
    ],
    id: [
      'Bagikan tautan lagu agar penerima dapat memeriksanya sebelum menambahkan.',
      'Impor YouTube menampilkan judul jika tersedia, tahap saat ini dan notifikasi setelah disimpan.',
      'Posisi gambar tetap untuk judul panjang; karakter Korea dan notifikasi diperbaiki.',
      'Latar merah BREAK tidak lagi menutupi nada.',
    ],
    vi: [
      'Chia sẻ liên kết bài hát để người nhận kiểm tra trước khi thêm.',
      'Nhập YouTube hiển thị tên khi có, bước hiện tại và thông báo sau khi lưu.',
      'Giữ vị trí ảnh với tên dài, bổ sung chữ Hàn và cải thiện thông báo.',
      'Nền đỏ BREAK không còn che các nốt.',
    ],
    tr: [
      'Alıcının eklemeden önce inceleyebilmesi için şarkı bağlantısı paylaşın.',
      'YouTube içe aktarma, varsa başlığı erken gösterir; geçerli aşamayı ve kayıttan sonra bildirimi sunar.',
      'Uzun başlıklarda görsel sabit kalır; Korece karakterler ve bildirimler iyileştirildi.',
      'BREAK kırmızı dolgusu artık notaları örtmez.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
