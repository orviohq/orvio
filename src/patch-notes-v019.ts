import type { Language } from './i18n';
export const PATCH_V019 = {
  version: '0.2.19',
  date: '2026-11-08',
  notes: {
    en: [
      'New YouTube charts add holds and chords, with a harder Hard mode.',
      'Use Regenerate to add a new chart version. Your saved chart, results and replays stay unchanged.',
    ],
    ko: [
      '새 YouTube 채보에 롱노트와 동시치기를 추가하고 상 난이도를 강화했습니다.',
      '다시 생성하면 새 채보가 추가됩니다. 기존 채보와 기록, 리플레이는 그대로 유지됩니다.',
    ],
    zh: [
      '新的 YouTube 谱面加入长按与同时按键，并提高高难度。',
      '重新生成会添加新版本。原谱面、成绩和回放保持不变。',
    ],
    ja: [
      '新しいYouTube譜面にロングノートと同時押しを追加し、高難度を強化しました。',
      '再生成すると新しい譜面が追加されます。元の譜面、記録、リプレイは変わりません。',
    ],
    es: [
      'Los nuevos mapas de YouTube incluyen notas largas y acordes, con un modo difícil más exigente.',
      'Regenerar añade otra versión sin cambiar el mapa, los resultados ni las repeticiones guardadas.',
    ],
    fr: [
      'Les nouvelles cartes YouTube ajoutent des notes longues et des accords, avec un mode difficile plus exigeant.',
      'Régénérer ajoute une version sans modifier la carte, les résultats ni les replays sauvegardés.',
    ],
    de: [
      'Neue YouTube-Charts enthalten Haltenoten und Akkorde. Schwer ist anspruchsvoller.',
      'Neu erzeugen fügt eine Version hinzu. Gespeicherte Charts, Ergebnisse und Replays bleiben unverändert.',
    ],
    pt: [
      'Os novos mapas do YouTube têm notas longas e acordes, com um modo difícil mais exigente.',
      'Gerar novamente adiciona uma versão sem alterar o mapa, os resultados e os replays salvos.',
    ],
    it: [
      'Le nuove mappe YouTube aggiungono note lunghe e accordi, con un livello difficile più impegnativo.',
      'Rigenera aggiunge una versione senza modificare mappa, risultati e replay salvati.',
    ],
    ru: [
      'В новых картах YouTube появились длинные ноты и аккорды, а сложный режим стал труднее.',
      'Повторная генерация добавляет новую версию. Сохранённые карты, результаты и повторы не меняются.',
    ],
    id: [
      'Bagan YouTube baru menambahkan nada tahan dan akor, dengan mode sulit yang lebih menantang.',
      'Buat ulang menambahkan versi baru tanpa mengubah bagan, hasil, dan replay tersimpan.',
    ],
    tr: [
      'Yeni YouTube haritaları uzun notalar ve akorlar ekler. Zor mod daha zorludur.',
      'Yeniden oluşturma yeni bir sürüm ekler. Kayıtlı haritalar, sonuçlar ve tekrarlar değişmez.',
    ],
    vi: [
      'Bản nhạc YouTube mới thêm nốt giữ và hợp âm, với chế độ khó thử thách hơn.',
      'Tạo lại sẽ thêm phiên bản mới. Bản nhạc, kết quả và phát lại đã lưu không thay đổi.',
    ],
  },
} satisfies {
  version: string;
  date: string;
  notes: Record<Language, string[]>;
};
