import type { Language } from './i18n';
export const PATCH_V0324 = {version:'0.3.24',date:'2026-11-11',notes:{
  "ko": [
    "곡·키 선택 시 반복되는 차트 데이터 복사와 불필요한 설정 갱신을 줄였습니다.",
    "짧은 곡 전용 선택 링크는 받는 사람의 키·난이도·속도·셔플 설정을 유지합니다. 없는 곡 링크는 다른 곡을 시작하는 대신 안내를 표시합니다."
  ],
  "en": [
    "Reduced repeated chart-data copying and unnecessary settings updates during song/key selection.",
    "Shorter song-only selection links retain recipient-local keys, difficulty, speed and shuffle. Unavailable song links show guidance instead of starting another song."
  ],
  "zh": [
    "减少了选择歌曲或键数时重复的谱面数据复制和不必要的设置更新。",
    "更短的歌曲专用选择链接保留接收者本地的键数、难度、速度和随机设置。歌曲不可用时显示提示，而不会开始其他歌曲。"
  ],
  "ja": [
    "曲・キー数の選択時に繰り返される譜面データのコピーと不要な設定更新を減らしました。",
    "短い曲専用リンクは受信者のキー数・難易度・速度・シャッフル設定を維持します。曲がない場合は別の曲を開始せず案内を表示します。"
  ],
  "es": [
    "Se redujeron las copias repetidas de datos de partituras y las actualizaciones innecesarias de ajustes al seleccionar canción o teclas.",
    "Los enlaces más cortos de selección de canción conservan las teclas, dificultad, velocidad y mezcla locales del destinatario. Si la canción no está disponible, se muestra ayuda en vez de iniciar otra."
  ],
  "fr": [
    "Réduction des copies répétées des données de partitions et des mises à jour inutiles des réglages lors du choix du morceau ou des touches.",
    "Les liens de sélection plus courts, limités au morceau, conservent les touches, la difficulté, la vitesse et le mélange locaux du destinataire. Un morceau indisponible affiche une aide au lieu de lancer un autre morceau."
  ],
  "de": [
    "Weniger wiederholtes Kopieren von Chart-Daten und unnötige Einstellungsänderungen bei der Titel- und Tastenauswahl.",
    "Kürzere Links nur für den Titel behalten lokale Tasten-, Schwierigkeits-, Tempo- und Shuffle-Einstellungen des Empfängers bei. Nicht verfügbare Titel zeigen Hinweise, statt einen anderen Titel zu starten."
  ],
  "pt": [
    "Reduzidas as cópias repetidas de dados das partituras e as atualizações desnecessárias das opções ao selecionar música ou teclas.",
    "Os links mais curtos apenas para a música mantêm as teclas, dificuldade, velocidade e aleatoriedade locais do destinatário. Músicas indisponíveis mostram orientação em vez de iniciar outra música."
  ],
  "it": [
    "Ridotte le copie ripetute dei dati degli spartiti e gli aggiornamenti non necessari delle impostazioni nella scelta di brano o tasti.",
    "I link più brevi dedicati al brano mantengono tasti, difficoltà, velocità e shuffle locali del destinatario. I brani non disponibili mostrano indicazioni invece di avviare un altro brano."
  ],
  "ru": [
    "Сокращено повторное копирование данных карт и ненужное обновление настроек при выборе трека или числа клавиш.",
    "Короткие ссылки только на трек сохраняют локальные настройки клавиш, сложности, скорости и перемешивания получателя. Если трек недоступен, выводится подсказка вместо запуска другого трека."
  ],
  "id": [
    "Mengurangi penyalinan berulang data chart dan pembaruan pengaturan yang tidak perlu saat memilih lagu atau tombol.",
    "Tautan pilihan khusus lagu yang lebih pendek mempertahankan tombol, kesulitan, kecepatan, dan acak lokal penerima. Lagu yang tidak tersedia menampilkan panduan alih-alih memulai lagu lain."
  ],
  "tr": [
    "Şarkı veya tuş seçiminde tekrarlanan nota verisi kopyalama ve gereksiz ayar güncellemeleri azaltıldı.",
    "Daha kısa, yalnızca şarkı içeren seçim bağlantıları alıcının yerel tuş, zorluk, hız ve karıştırma ayarlarını korur. Kullanılamayan şarkı bağlantıları başka bir şarkı başlatmak yerine yol gösterir."
  ],
  "vi": [
    "Giảm việc sao chép lặp lại dữ liệu bản nhạc và cập nhật cài đặt không cần thiết khi chọn bài hoặc số phím.",
    "Liên kết chọn bài ngắn hơn chỉ chứa bài hát, giữ nguyên số phím, độ khó, tốc độ và xáo trộn cục bộ của người nhận. Bài không có sẵn sẽ hiển thị hướng dẫn thay vì bắt đầu bài khác."
  ]
} satisfies Record<Language,string[]>,};
