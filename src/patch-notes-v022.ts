import type { Language } from './i18n';
export const PATCH_V022 = {
  version: '0.2.22',
  date: '2026-11-08',
  notes: {
    en: [
      'Remove songs from the list without erasing audio, results or replays. One list entry per YouTube video, without old/new chart labels or migration buttons. Hold bodies fade smoothly with FADE OUT. FEVER activation adds an original sound, burst and combo impact, respecting volume and reduced motion. YouTube artwork keeps its full image. Optional local frame diagnostics are off by default.',
    ],
    ko: [
      '음원·기록·리플레이를 지우지 않고 곡을 목록에서 삭제할 수 있습니다. 같은 YouTube 영상은 목록에 하나만 표시하며 기존/새 채보 표시와 마이그레이션 버튼을 없앴습니다. FADE OUT에서 롱노트가 부드럽게 사라집니다. FEVER 발동음·버스트·콤보 효과를 추가하고 음량과 모션 감소 설정을 따릅니다. YouTube 이미지를 자르지 않고 표시합니다. 선택형 기기 내 프레임 진단은 기본으로 꺼져 있습니다.',
    ],
    zh: [
      '可从列表移除歌曲，保留音频、成绩和回放。同一YouTube视频仅显示一项，移除新旧谱面标签与迁移按钮。FADE OUT长音符平滑淡出。FEVER增加原创音效、爆发与连击效果，遵循音量和减少动态设置。保留完整图片。本地帧诊断默认关闭。',
    ],
    ja: [
      '音源・記録・リプレイを残して曲を一覧から削除できます。同じYouTube動画は1項目のみ表示し、新旧譜面ラベルと移行ボタンを削除。FADE OUTの長押しノートが滑らかに消えます。FEVERに独自の音・バースト・コンボ演出を追加し、音量とモーション軽減に対応。画像全体を表示。任意のローカルフレーム診断は初期状態でオフです。',
    ],
    es: [
      'Quita canciones sin borrar audio, resultados ni repeticiones. Cada vídeo tiene una entrada, sin etiquetas de mapas nuevos o antiguos ni migración. FADE OUT suaviza las notas largas. FEVER añade sonido original y efectos de combo según volumen y movimiento reducido. Imágenes completas y diagnóstico local opcional desactivado por defecto.',
    ],
    fr: [
      'Retirez un morceau sans effacer audio, résultats ou replays. Une entrée par vidéo, sans étiquettes anciennes/nouvelles ni migration. Les notes longues disparaissent en douceur avec FADE OUT. FEVER ajoute un son original et des effets selon volume et mouvement réduit. Images complètes et diagnostic local facultatif désactivé par défaut.',
    ],
    de: [
      'Songs aus der Liste entfernen, ohne Audio, Ergebnisse oder Replays zu löschen. Ein Eintrag pro Video, ohne alte/neue Charts oder Migration. Lange Noten blenden mit FADE OUT weich aus. FEVER ergänzt eigenen Sound und Combo-Effekte unter Beachtung von Lautstärke und reduzierter Bewegung. Vollständige Bilder; lokale Frame-Diagnose standardmäßig aus.',
    ],
    pt: [
      'Remova músicas sem apagar áudio, resultados ou replays. Uma entrada por vídeo, sem rótulos de mapas antigos/novos ou migração. Notas longas somem suavemente com FADE OUT. FEVER adiciona som original e efeitos conforme volume e movimento reduzido. Imagens completas; diagnóstico local opcional desligado por padrão.',
    ],
    it: [
      'Rimuovi brani senza cancellare audio, risultati o replay. Una voce per video, senza etichette vecchio/nuovo o migrazione. Note lunghe sfumate con FADE OUT. FEVER aggiunge suono originale ed effetti nel rispetto di volume e movimento ridotto. Immagini complete; diagnostica locale opzionale disattivata.',
    ],
    ru: [
      'Удаление песни из списка сохраняет аудио, результаты и повторы. Одна запись на видео, без старых/новых карт и миграции. Длинные ноты плавно исчезают с FADE OUT. FEVER добавляет оригинальный звук и эффекты с учетом громкости и уменьшения движения. Полные изображения; локальная диагностика кадров по умолчанию выключена.',
    ],
    id: [
      'Hapus lagu dari daftar tanpa menghapus audio, hasil, atau replay. Satu entri per video tanpa label peta lama/baru atau migrasi. Nada panjang memudar halus dengan FADE OUT. FEVER menambah suara asli dan efek sesuai volume serta gerakan berkurang. Gambar utuh; diagnostik frame lokal opsional mati secara default.',
    ],
    tr: [
      'Şarkıları ses, sonuç ve tekrarları silmeden listeden kaldırın. Video başına tek kayıt; eski/yeni harita veya geçiş düğmesi yok. Uzun notalar FADE OUT ile yumuşak kaybolur. FEVER özgün ses ve efektlerle ses düzeyi ve azaltılmış harekete uyar. Tam görüntüler; isteğe bağlı yerel kare tanısı varsayılan kapalı.',
    ],
    vi: [
      'Xóa bài hát khỏi danh sách mà giữ âm thanh, kết quả và bản phát lại. Mỗi video một mục, bỏ nhãn bản nhạc cũ/mới và nút chuyển đổi. Nốt dài mờ dần với FADE OUT. FEVER thêm âm thanh gốc và hiệu ứng theo âm lượng và giảm chuyển động. Giữ toàn bộ ảnh; chẩn đoán khung hình cục bộ tùy chọn mặc định tắt.',
    ],
  } satisfies Record<Language, string[]>,
};
