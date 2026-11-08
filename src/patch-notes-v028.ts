import type { Language } from './i18n';
export const PATCH_V028 = {
  version: '0.2.28',
  date: '2026-11-08',
  notes: {
    ko: [
      'YouTube 곡 제목이 영상 ID로만 보이던 문제를 수정했습니다. 이미 추가한 곡도 저장된 음원과 채보를 그대로 두고 제목과 아티스트를 다시 불러옵니다. 곡을 지우거나 다시 추가할 필요가 없습니다. 제목 정보를 확인할 수 없어도 플레이는 계속할 수 있습니다.',
    ],
    en: [
      'Fixed YouTube songs showing only a video ID. Existing songs recover their title and artist without changing saved audio or charts. You do not need to remove or add the song again. A missing title response does not block play.',
    ],
    ja: [
      'YouTube曲名が動画IDだけになる問題を修正しました。追加済みの曲も保存音源と譜面を変えずに曲名とアーティストを読み直します。削除や再追加は不要です。曲名情報を取得できなくてもプレイできます。',
    ],
    zh: [
      '修复YouTube曲目只显示视频ID的问题。已添加的曲目会重新获取标题和艺人，不改动已保存的音频和谱面。无需删除或重新添加。无法获取标题时仍可游玩。',
    ],
    es: [
      'Se corrige que las canciones de YouTube muestren solo el ID del vídeo. Las canciones añadidas recuperan título y artista sin cambiar audio ni notas guardadas. No hace falta quitarlas ni añadirlas otra vez. Si faltan los datos del título, se puede seguir jugando.',
    ],
    fr: [
      'Correction des morceaux YouTube affichant seulement un identifiant vidéo. Les morceaux déjà ajoutés retrouvent leur titre et artiste sans modifier les sons ni les notes enregistrés. Aucun retrait ni nouvel ajout nécessaire. Un titre indisponible ne bloque pas le jeu.',
    ],
    de: [
      'YouTube-Songs zeigen nicht mehr nur die Video-ID. Bereits hinzugefügte Songs laden Titel und Künstler nach, ohne gespeichertes Audio oder Noten zu ändern. Entfernen und erneutes Hinzufügen sind nicht nötig. Fehlende Titelinformationen blockieren das Spielen nicht.',
    ],
    pt: [
      'Corrigido o caso em que músicas do YouTube mostravam apenas o ID do vídeo. Músicas já adicionadas recuperam título e artista sem alterar áudio ou notas salvas. Não é preciso remover ou adicionar novamente. A falta do título não impede jogar.',
    ],
    it: [
      'Corretto il problema dei brani YouTube mostrati solo con il codice video. I brani già aggiunti recuperano titolo e artista senza modificare audio o note salvate. Non occorre rimuoverli o aggiungerli di nuovo. Un titolo non disponibile non blocca il gioco.',
    ],
    ru: [
      'Исправлено отображение только ID видео вместо названия песни YouTube. Добавленные песни получают название и исполнителя без изменения сохранённого аудио и нот. Удалять и добавлять песню заново не нужно. Отсутствие названия не мешает игре.',
    ],
    id: [
      'Memperbaiki lagu YouTube yang hanya menampilkan ID video. Lagu yang sudah ditambahkan memulihkan judul dan artis tanpa mengubah audio atau not tersimpan. Tidak perlu menghapus atau menambah ulang lagu. Judul yang belum tersedia tidak menghalangi permainan.',
    ],
    tr: [
      'YouTube şarkılarının yalnızca video kimliğiyle görünmesi düzeltildi. Eklenen şarkılar kayıtlı ses ve notalar değişmeden başlık ve sanatçıyı yeniden yükler. Silip yeniden eklemek gerekmez. Başlık bilgisi yoksa da oyun devam eder.',
    ],
    vi: [
      'Sửa lỗi bài YouTube chỉ hiện mã video. Bài đã thêm lấy lại tên bài và nghệ sĩ mà không đổi âm thanh hay nốt đã lưu. Không cần xóa hoặc thêm lại bài. Thiếu thông tin tên bài không ngăn việc chơi.',
    ],
  } satisfies Record<Language, string[]>,
};
