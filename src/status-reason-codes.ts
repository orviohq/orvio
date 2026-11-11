export const HEALTH_REASONS = [
  'indexeddb_unavailable',
  'local_cache_not_initialized',
  'local_cache_blocked',
  'local_cache_unavailable',
  'local_cache_readable',
  'local_cache_read_failed',
  'audio_context_unavailable',
  'decode_audio_data_unavailable',
  'audio_decode_output_untested',
  'pcm_decode_failed',
  'metadata_api_key_not_configured',
  'metadata_http_error',
  'unrecognized_metadata_response',
  'metadata_readable_audio_import_untested',
  'check_timed_out',
  'check_unavailable',
] as const;

export type HealthReason = (typeof HEALTH_REASONS)[number];

export function healthReason(detail?: string): HealthReason {
  switch (detail) {
    case 'IndexedDB unavailable':
      return 'indexeddb_unavailable';
    case 'Local cache not initialized':
      return 'local_cache_not_initialized';
    case 'Local cache blocked':
      return 'local_cache_blocked';
    case 'Local cache unavailable':
      return 'local_cache_unavailable';
    case 'Local cache readable':
      return 'local_cache_readable';
    case 'Local cache read failed':
      return 'local_cache_read_failed';
    case 'AudioContext unavailable':
      return 'audio_context_unavailable';
    case 'decodeAudioData unavailable':
      return 'decode_audio_data_unavailable';
    case 'AudioContext + PCM decode; output untested':
      return 'audio_decode_output_untested';
    case 'PCM decode failed':
      return 'pcm_decode_failed';
    case 'Metadata API key not configured':
      return 'metadata_api_key_not_configured';
    case 'Unrecognized metadata response':
      return 'unrecognized_metadata_response';
    case 'Metadata readable; audio import untested':
      return 'metadata_readable_audio_import_untested';
    case 'Check timed out':
      return 'check_timed_out';
    case 'Check unavailable':
      return 'check_unavailable';
    default:
      return detail !== undefined && /^Metadata HTTP \d+$/.test(detail)
        ? 'metadata_http_error'
        : 'check_unavailable';
  }
}
