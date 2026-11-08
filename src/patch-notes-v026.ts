import type { Language } from './i18n';
export const PATCH_V026 = {
  version: '0.2.26',
  date: '2026-11-08',
  notes: {
    ko: [
      '저장된 YouTube 음원을 오래됐다는 이유나 새 곡 추가 때문에 지우지 않습니다. 예전 작업 주소 대신 곡에 맞는 저장 음원을 불러옵니다. 저장 공간이 부족하면 기존 곡을 지우는 대신 새 곡 추가를 멈춥니다. 기존 기록·리플레이는 유지됩니다.',
      '새 플레이는 자동 피버를 사용합니다. 언어 메뉴를 줄이고 YouTube 추가를 아이콘으로 바꿨습니다. 최근 추가한 곡을 먼저 표시하고 난이도 설명 문구를 정리했습니다. 다음 플레이에 빨간 테두리가 남던 문제를 수정했습니다. 기존 리플레이 설정은 유지됩니다.',
    ],
    en: [
      'Saved YouTube audio is no longer deleted because of its age or new additions. Load the matching saved audio without an old job address. When storage is full, new additions stop instead of deleting existing songs. Results and replays stay saved.',
      'New games use automatic FEVER. The language menu is more compact, adding YouTube uses an icon, and recent additions appear first. Removed difficulty estimate labels and fixed red borders carrying over to the next game. Saved replays keep their recorded settings.',
    ],
    ja: [
      '保存済みYouTube音源を期間経過や新しい曲の追加によって削除しません。古い処理アドレスに頼らず一致する音源を読み込みます。容量不足時は既存曲を消さず新規追加を止めます。記録とリプレイは保持されます。',
      '新しいプレイは自動FEVERを使います。言語メニューを小さくし、YouTube追加をアイコンに変更。最近追加した曲を先に表示し、難易度の推定ラベルを削除しました。次のプレイに赤い枠が残る問題を修正。保存済みリプレイの設定は変わりません。',
    ],
    zh: [
      '已保存的YouTube音频不再因时间或新增歌曲而删除。无需旧任务地址即可读取匹配音频。空间不足时停止新增歌曲，不删除已有歌曲。成绩和回放保持不变。',
      '新游戏默认自动 FEVER。缩短语言菜单，将 YouTube 添加改为图标，最近添加的歌曲排在前面。移除难度估计说明，修复红色边框残留到下一局的问题。旧回放保留原设置。',
    ],
    es: [
      'El audio guardado de YouTube ya no se borra por antigüedad ni por añadir canciones. Se carga el audio coincidente sin una dirección de tarea antigua. Si falta espacio, se detienen las nuevas canciones en lugar de borrar las existentes. Los resultados y repeticiones se conservan.',
      'Las nuevas partidas usan FEVER automático. Menú de idioma más compacto, icono para añadir YouTube y canciones recientes primero. Se quitaron las etiquetas de estimación y el borde rojo que quedaba entre partidas. Las repeticiones guardadas conservan sus ajustes.',
    ],
    pt: [
      'Áudio salvo do YouTube não é mais apagado por tempo ou novas músicas. O áudio correspondente é carregado sem um endereço de tarefa antigo. Sem espaço, novas músicas são interrompidas em vez de apagar as existentes. Resultados e replays são mantidos.',
      'Novos jogos usam FEVER automático. Menu de idioma compacto, ícone para adicionar YouTube e músicas recentes primeiro. Removidas as etiquetas de estimativa e corrigida a borda vermelha entre jogos. Replays mantêm as configurações gravadas.',
    ],
    fr: [
      'Le son YouTube enregistré n’est plus supprimé avec le temps ou les nouveaux ajouts. Le son correspondant est chargé sans ancienne adresse de tâche. Si le stockage est plein, les ajouts cessent sans effacer les morceaux existants. Résultats et replays sont conservés.',
      'Les nouvelles parties utilisent FEVER automatique. Menu de langue compact, ajout YouTube par icône et ajouts récents en premier. Suppression des mentions d’estimation et correction du bord rouge persistant entre parties. Les replays gardent leurs réglages.',
    ],
    de: [
      'Gespeichertes YouTube-Audio wird nicht mehr wegen seines Alters oder neuer Songs gelöscht. Passendes Audio lädt ohne alte Aufgabenadresse. Bei vollem Speicher stoppen neue Songs, statt vorhandene zu löschen. Ergebnisse und Replays bleiben erhalten.',
      'Neue Spiele nutzen automatisches FEVER. Kompaktes Sprachmenü, YouTube-Symbol und neue Songs zuerst. Schätzungslabels entfernt und rote Ränder beim nächsten Spiel behoben. Gespeicherte Replays behalten ihre Einstellungen.',
    ],
    ru: [
      'Сохранённое аудио YouTube больше не удаляется из-за времени или новых песен. Подходящее аудио загружается без старого адреса задачи. При нехватке места новые песни не добавляются, а старые сохраняются. Результаты и повторы остаются.',
      'Новые игры используют автоматический FEVER. Компактное меню языка, значок добавления YouTube и новые песни сверху. Убраны подписи об оценке сложности и красная рамка между играми. Повторы сохраняют прежние настройки.',
    ],
    id: [
      'Audio YouTube tersimpan tidak lagi dihapus karena usia atau lagu baru. Audio yang cocok dimuat tanpa alamat tugas lama. Saat ruang penuh, penambahan lagu dihentikan tanpa menghapus lagu lama. Hasil dan replay tetap tersimpan.',
      'Permainan baru memakai FEVER otomatis. Menu bahasa lebih ringkas, ikon tambah YouTube, dan lagu terbaru di atas. Label perkiraan dihapus dan garis merah yang tersisa antarpermainan diperbaiki. Replay mempertahankan pengaturan rekaman.',
    ],
    vi: [
      'Âm thanh YouTube đã lưu không còn bị xóa do thời gian hay bài mới. Nạp âm thanh phù hợp không cần địa chỉ tác vụ cũ. Khi hết chỗ, dừng thêm bài thay vì xóa bài cũ. Kết quả và bản phát lại được giữ nguyên.',
      'Lượt chơi mới dùng FEVER tự động. Menu ngôn ngữ gọn hơn, biểu tượng thêm YouTube và bài mới lên đầu. Bỏ nhãn ước tính, sửa viền đỏ còn lại ở lượt sau. Bản phát lại giữ cài đặt đã ghi.',
    ],
    tr: [
      'Kayıtlı YouTube sesi, zaman geçtiği veya yeni şarkı eklendiği için artık silinmez. Eşleşen ses eski görev adresi olmadan yüklenir. Alan dolduğunda eski şarkılar silinmez, yeni eklemeler durur. Sonuçlar ve tekrarlar korunur.',
      'Yeni oyunlar otomatik FEVER kullanır. Dil menüsü küçültüldü, YouTube ekleme simgeye dönüştü ve yeni şarkılar üstte. Tahmin etiketleri kaldırıldı, sonraki oyunda kalan kırmızı kenarlar düzeltildi. Tekrarlar kayıt ayarlarını korur.',
    ],
    it: [
      'L’audio YouTube salvato non viene più eliminato per il tempo trascorso o per nuovi brani. L’audio corrispondente si carica senza il vecchio indirizzo di attività. A memoria piena si fermano le aggiunte, senza eliminare i brani esistenti. Risultati e replay restano salvati.',
      'Le nuove partite usano FEVER automatico. Menu lingua compatto, icona per aggiungere YouTube e brani recenti per primi. Rimosse le etichette di stima e corretto il bordo rosso tra partite. I replay mantengono le impostazioni registrate.',
    ],
  } satisfies Record<Language, string[]>,
};
