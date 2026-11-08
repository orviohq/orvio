import type { Language } from './i18n';
const rows: Record<Language, [string, string, string, string]> = {
  en: ['Make new chart', 'Making a new chart…', 'Original chart', 'New chart'],
  ko: ['새 채보 만들기', '새 채보 만드는 중…', '기존 채보', '새 채보'],
  zh: ['生成新谱面', '正在生成新谱面…', '原谱面', '新谱面'],
  ja: ['新しい譜面を作成', '新しい譜面を作成中…', '元の譜面', '新しい譜面'],
  es: [
    'Crear nuevo mapa',
    'Creando un nuevo mapa…',
    'Mapa original',
    'Mapa nuevo',
  ],
  fr: [
    'Créer une nouvelle carte',
    'Création de la carte…',
    'Carte originale',
    'Nouvelle carte',
  ],
  de: [
    'Neue Karte erstellen',
    'Neue Karte wird erstellt…',
    'Ursprüngliche Karte',
    'Neue Karte',
  ],
  pt: ['Criar novo mapa', 'Criando novo mapa…', 'Mapa original', 'Novo mapa'],
  it: [
    'Crea nuova mappa',
    'Creazione della mappa…',
    'Mappa originale',
    'Nuova mappa',
  ],
  ru: [
    'Создать новую карту',
    'Создание новой карты…',
    'Исходная карта',
    'Новая карта',
  ],
  id: ['Buat chart baru', 'Membuat chart baru…', 'Chart asli', 'Chart baru'],
  tr: [
    'Yeni harita oluştur',
    'Yeni harita oluşturuluyor…',
    'Özgün harita',
    'Yeni harita',
  ],
  vi: [
    'Tạo bản nhạc mới',
    'Đang tạo bản nhạc mới…',
    'Bản nhạc gốc',
    'Bản nhạc mới',
  ],
};
export function regenerationLabels(language: Language) {
  const r = rows[language];
  return { create: r[0], busy: r[1], original: r[2], current: r[3] };
}
