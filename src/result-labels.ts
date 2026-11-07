import type { Language } from './i18n';
export const RESULT_LABELS: Record<Language, [string, string, string]> = {
  en: [
    'Preview',
    'Stop preview',
    'Hold heads count once; hold tails are judgments.',
  ],
  ko: [
    '미리듣기',
    '미리듣기 정지',
    '홀드는 시작 노트 1개로 세며 끝 판정은 노트 수에 더하지 않습니다.',
  ],
  zh: ['试听', '停止试听', '长按音符只计起点；终点计入判定。'],
  ja: [
    '試聴',
    '試聴を停止',
    'ロングノーツは始点を1個と数え、終点は判定数に含みます。',
  ],
  es: [
    'Escuchar',
    'Detener escucha',
    'Cada nota larga cuenta una vez; su final es otro juicio.',
  ],
  fr: [
    'Écouter',
    'Arrêter',
    'Une note longue compte une fois ; sa fin est un jugement.',
  ],
  de: [
    'Vorhören',
    'Vorhören stoppen',
    'Eine Haltenote zählt einmal; ihr Ende ist eine Wertung.',
  ],
  pt: [
    'Prévia',
    'Parar prévia',
    'Uma nota longa conta uma vez; o final é outro julgamento.',
  ],
  it: [
    'Anteprima',
    'Ferma anteprima',
    'Una nota lunga conta una volta; la fine è un giudizio.',
  ],
  ru: [
    'Прослушать',
    'Остановить',
    'Удержание считается одной нотой; конец является отдельной оценкой.',
  ],
  id: [
    'Pratinjau',
    'Hentikan',
    'Nada tahan dihitung sekali; akhir adalah penilaian terpisah.',
  ],
  tr: [
    'Ön dinleme',
    'Durdur',
    'Tutma notası bir kez sayılır; sonu ayrı bir değerlendirmedir.',
  ],
  vi: [
    'Nghe thử',
    'Dừng nghe thử',
    'Nốt giữ được tính một lần; điểm cuối là lượt chấm riêng.',
  ],
};
