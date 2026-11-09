// Pinned contract excludes speech quality enhancement and nested decoder workers.
// Optional upstream ML decoder is never part of orvio-opus-v1.
export class OpusMLDecoder {constructor(){throw Error('unsupported_opus_ml');}}
export class OpusMLDecoderWebWorker {constructor(){throw Error('unsupported_opus_ml');}}
