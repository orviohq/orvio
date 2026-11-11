import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STATUS_LABELS, statusReasonText } from '../src/status-labels';
import { HEALTH_REASONS, healthReason } from '../src/status-reason-codes';
import { LANGUAGES } from '../src/i18n';

const jargon =
  /IndexedDB|AudioContext|\bPCM\b|decodeAudioData|API\s*key|\bHTTP\b|\b[45]\d{2}\b/i;

type Language = keyof typeof LANGUAGES;
type Reason = (typeof HEALTH_REASONS)[number];
const languages = Object.keys(LANGUAGES) as Language[];
const rawDetails = [
  ['IndexedDB unavailable', 'indexeddb_unavailable'],
  ['Local cache not initialized', 'local_cache_not_initialized'],
  ['Local cache blocked', 'local_cache_blocked'],
  ['Local cache unavailable', 'local_cache_unavailable'],
  ['Local cache readable', 'local_cache_readable'],
  ['Local cache read failed', 'local_cache_read_failed'],
  ['AudioContext unavailable', 'audio_context_unavailable'],
  ['decodeAudioData unavailable', 'decode_audio_data_unavailable'],
  [
    'AudioContext + PCM decode; output untested',
    'audio_decode_output_untested',
  ],
  ['PCM decode failed', 'pcm_decode_failed'],
  ['Metadata API key not configured', 'metadata_api_key_not_configured'],
  ['Metadata HTTP 404', 'metadata_http_error'],
  ['Unrecognized metadata response', 'unrecognized_metadata_response'],
  [
    'Metadata readable; audio import untested',
    'metadata_readable_audio_import_untested',
  ],
  ['Check timed out', 'check_timed_out'],
  ['Check unavailable', 'check_unavailable'],
] as const satisfies ReadonlyArray<readonly [string, Reason]>;

const unknownDetails = [
  'an arbitrary persisted failure string',
  'Error: import pipeline failed at decodeAudioData (HTTP 503)',
  '<img src=x onerror="alert(1)">',
  '<script>throw new Error("IndexedDB unavailable")</script>',
  'Metadata HTTP 401 extra raw text',
  'toString',
  '__proto__',
  '',
  undefined,
];

// Check both clauses and an actionable instruction in each language, rather
// than accepting a nonempty label or a repeated generic fallback as coverage.
const actionPatterns: Record<Language, RegExp> = {
  en: /^(?:try|close|restart|play|please check)\b/i,
  ko: /(?:주세요|보세요)[.]$/,
  zh: /^请/,
  ja: /ください。$/,
  es: /^(?:prueba|intenta|cierra|reinicia|actualízalo|reproduce|vuelve)\b/,
  fr: /^(?:essayez|fermez|redémarrez|mettez-le|lancez|réessayez|relancez-la)\b/,
  de: /^(?:versuche|schließe|starte|spiele|aktualisiere|prüfe)\b/,
  pt: /^(?:tenta|fecha|reinicia|atualiza-o|reproduz|verifica)\b/,
  it: /^(?:prova|chiudi|riavvia|aggiornalo|riproduci|riprova|verifica)\b/,
  ru: /^(?:попробуйте|закройте|перезапустите|обновите|включите|повторите) /,
  id: /^(?:coba|tutup|mulai ulang|perbarui|putar|periksa)\b/,
  tr: /(?:deneyin|edin|kullanın|dinleyin)[.]$/,
  vi: /^(?:hãy|vui lòng) /,
};

function expectSafeSentence(text: string, language: Language) {
  expect(typeof text).toBe('string');
  expect(text.trim()).not.toBe('');
  expect(text).not.toMatch(jargon);
  expect(text).not.toMatch(/<[^>]*>|Error\.message|[a-z]+_[a-z]+/);
  const [cause, action] = text.split(/[;；。]/).map((part) => part.trim());
  expect(cause.length).toBeGreaterThan(5);
  expect(action).toBeTruthy();
  // Japanese uses a full stop between clauses and at the sentence end.
  expect(language === 'ja' ? `${action}。` : action).toMatch(
    actionPatterns[language],
  );
}

describe('localized status reasons', () => {
  it('covers exactly 16 health reasons and 13 locales', () => {
    expect(HEALTH_REASONS).toHaveLength(16);
    expect(languages).toHaveLength(13);
    expect(languages.sort()).toEqual(
      [
        'en',
        'ko',
        'zh',
        'ja',
        'es',
        'fr',
        'de',
        'pt',
        'it',
        'ru',
        'id',
        'tr',
        'vi',
      ].sort(),
    );
    expect(Object.keys(STATUS_LABELS).sort()).toEqual(languages);
    expect(rawDetails.map(([, reason]) => reason).sort()).toEqual(
      [...HEALTH_REASONS].sort(),
    );
  });

  it.each(rawDetails)('maps "%s" to %s', (detail, reason) => {
    expect(healthReason(detail)).toBe(reason);
  });

  it.each([401, 503])(
    'maps dynamic Metadata HTTP %i to metadata_http_error',
    (status) => {
      expect(healthReason(`Metadata HTTP ${status}`)).toBe(
        'metadata_http_error',
      );
    },
  );

  it.each(unknownDetails)(
    'maps unknown detail %s to check_unavailable',
    (detail) => {
      expect(healthReason(detail)).toBe('check_unavailable');
    },
  );

  describe.each(languages)('%s', (language) => {
    it.each(rawDetails)(
      'provides a localized cause and action for %s',
      (detail, reason) => {
        const text = STATUS_LABELS[language].reasons[reason];
        expectSafeSentence(text, language);
        expect(statusReasonText(language, detail)).toBe(text);
        expect(text).not.toBe(detail);
        if (reason !== 'check_unavailable') {
          expect(text).not.toBe(
            STATUS_LABELS[language].reasons.check_unavailable,
          );
        }
        if (language !== 'en')
          expect(text).not.toBe(STATUS_LABELS.en.reasons[reason]);
      },
    );

    it('never exposes raw details or persisted messages, including HTML and undefined', () => {
      const inputs = [
        ...rawDetails.map(([detail]) => detail),
        'Metadata HTTP 401',
        'Metadata HTTP 503',
        ...unknownDetails,
      ];
      for (const detail of inputs) {
        const text = statusReasonText(language, detail);
        expectSafeSentence(text, language);
        if (detail) expect(text).not.toContain(detail);
        if (unknownDetails.includes(detail)) {
          expect(text).toBe(STATUS_LABELS[language].reasons.check_unavailable);
        }
      }
    });

    it('falls back safely when a locale is missing', () => {
      const labels: Partial<typeof STATUS_LABELS> = STATUS_LABELS;
      const original = labels[language];
      const generic = STATUS_LABELS[language].reasons.check_unavailable;
      try {
        delete labels[language];
        for (const [detail, reason] of rawDetails) {
          const text = statusReasonText(language, detail);
          expect(text).toBe(
            language === 'en' ? generic : STATUS_LABELS.en.reasons[reason],
          );
          expectSafeSentence(text, 'en');
        }
      } finally {
        labels[language] = original!;
      }
    });

    it('falls back safely for missing, empty and whitespace-only reasons', () => {
      const reasons: Partial<Record<Reason, string>> =
        STATUS_LABELS[language].reasons;
      for (const [detail, reason] of rawDetails) {
        const original = reasons[reason];
        const english = STATUS_LABELS.en.reasons[reason];
        const generic = STATUS_LABELS[language].reasons.check_unavailable;
        try {
          for (const missing of [undefined, '', '   ']) {
            if (missing === undefined) delete reasons[reason];
            else reasons[reason] = missing;
            const text = statusReasonText(language, detail);
            expect(text).toBe(language === 'en' ? generic : english);
            expectSafeSentence(text, 'en');
          }
        } finally {
          reasons[reason] = original!;
        }
      }
    });

    it('keeps the generic fallback localized when both reason tables are missing', () => {
      const labels: Partial<typeof STATUS_LABELS> = STATUS_LABELS;
      const original = labels[language];
      const english = labels.en;
      const generic = original!.reasons.check_unavailable;
      try {
        delete labels[language];
        delete labels.en;
        for (const detail of [
          ...rawDetails.map(([detail]) => detail),
          ...unknownDetails,
        ]) {
          const text = statusReasonText(language, detail);
          expect(text).toBe(generic);
          expectSafeSentence(text, language);
        }
      } finally {
        labels.en = english!;
        labels[language] = original!;
      }
    });
  });

  it('service status page renders details as plain text only', () => {
    const source = readFileSync(
      new URL('../src/status-page.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
    expect(source).toMatch(/querySelector(?:<[^>]+>)?\(['"]\[data-detail\]['"]\)/);
    expect(source).toMatch(
      /detailEl\.textContent\s*=\s*detail|querySelector(?:<[^>]+>)?\(['"]\[data-detail\]['"]\)[\s\S]*?\.textContent\s*=/,
    );
    expect(source).not.toMatch(/\[data-detail\][\s\S]{0,120}innerHTML/);
    expect(source).not.toContain('[data-failure]');
  });
});
