import { expect, it } from 'vitest';
import { AudioJobError, type AudioFailureStage } from '../src/external-audio-api';
import { externalError } from '../src/external-errors';
import { LANGUAGES, type Language } from '../src/i18n';

// Download, provider, analysis, and the explicit no-automatic-request guarantee.
const terms: Record<Language, [string, string, string, string]> = {
  en: ['download', 'provider', 'analysis', 'No new request is sent automatically.'],
  ko: ['다운로드', '제공 서비스', '분석', '자동으로 새 요청을 보내지 않습니다.'],
  zh: ['下载', '提供服务', '分析', '不会自动发送新请求。'],
  ja: ['ダウンロード', '提供サービス', '解析', '新しいリクエストは自動で送信されません。'],
  es: ['descarga', 'proveedor', 'análisis', 'No se envía una nueva solicitud automáticamente.'],
  fr: ['téléchargement', 'fournisseur', 'analyse', 'Aucune nouvelle demande n’est envoyée automatiquement.'],
  de: ['Download', 'Audioanbieter', 'Audioanalyse', 'Eine neue Anfrage wird nicht automatisch gesendet.'],
  pt: ['download', 'provedor', 'análise', 'Não é enviado um novo pedido automaticamente.'],
  it: ['download', 'fornitore', 'analisi', 'Nessuna nuova richiesta viene inviata automaticamente.'],
  ru: ['Загрузка', 'аудиопровайдера', 'Анализ', 'Новый запрос не отправляется автоматически.'],
  id: ['Unduhan', 'penyedia', 'Analisis', 'Permintaan baru tidak dikirim secara otomatis.'],
  tr: ['indirme', 'sağlayıcısını', 'analizi', 'Otomatik olarak yeni istek gönderilmez.'],
  vi: ['Tải', 'nhà cung cấp', 'Phân tích', 'Không tự động gửi yêu cầu mới.'],
};
const stages: (AudioFailureStage | undefined)[] = [
  'response', 'service', 'analysis', 'storage', 'browser', undefined,
];

it.each(Object.keys(LANGUAGES) as Language[])('explains the actual timeout stage and manual retry in %s', (language) => {
  const messages = stages.map((stage) => externalError(
    new AudioJobError('request_timeout', undefined, undefined, undefined, stage), language,
  ));
  expect(new Set(messages).size).toBe(stages.length);
  for (const [index, term] of terms[language].slice(0, 3).entries())
    expect(messages[index].toLowerCase()).toContain(term.toLowerCase());
  for (const message of messages) {
    expect(message.endsWith(terms[language][3])).toBe(true);
    expect(message.split(terms[language][3])).toHaveLength(2);
    expect(message).not.toContain('90');
  }
});

it('does not imply that an unknown timeout is a provider wait or that a request was saved', () => {
  const message = externalError(new AudioJobError('request_timeout'), 'en');
  expect(message).toContain('import did not finish in time');
  expect(message).not.toMatch(/provider|download|analysis|saved request/);
  expect(externalError(new AudioJobError('request_timeout', undefined, undefined, undefined, 'service'), 'en'))
    .toContain('Preparation may still be running.');
});
