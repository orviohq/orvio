// Canonical PCM16 stereo WAV: 300s at 48kHz is 57,600,000 data bytes.
// The transport cap includes room for WAV headers and bounded metadata chunks.
export const AUDIO_MAX_SECONDS = 300;
export const AUDIO_MAX_BYTES = 57_800_000;
