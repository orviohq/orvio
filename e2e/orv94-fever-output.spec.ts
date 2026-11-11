import { test, expect } from '@playwright/test';

// Instrument native Web Audio only in this browser test. No app module imports,
// engine mutation, clock acceleration, autoplay bypass or production test hooks.
for (const volume of [0.37, 0]) {
  test(`production keyboard FEVER creates candidate output at volume ${volume}`, async ({ page }, info) => {
    const requests: string[] = [];
    const external: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      requests.push(url);
      if (new URL(url).origin !== (process.env.ORV94_BASE_URL??'http://127.0.0.1:4194')) {
        external.push(url);
        await route.abort();
      } else await route.continue();
    });
    await page.addInitScript(({ volume }) => {
      localStorage.setItem('orvio.settings.v1', JSON.stringify({ volume }));
      const w = window as any;
      const proof = w.feverOutputProof = {
        sources: [] as any[], transitions: [] as any[], resumes: [] as any[],
        contexts: [] as any[], samples: [] as any[],
      };
      const graph = new Map<AudioNode, AudioNode[]>();
      const ids = new Map<AudioNode, number>();
      const probes: Array<{ node: AudioNode; analyser: AnalyserNode; kind: string }> = [];
      const id = (node: AudioNode) => {
        if (!ids.has(node)) ids.set(node, ids.size + 1);
        return ids.get(node)!;
      };
      const nativeConnect = AudioNode.prototype.connect;
      const nativeDisconnect = AudioNode.prototype.disconnect;
      const tap = (node: AudioNode, kind: string) => {
        const analyser = node.context.createAnalyser();
        analyser.fftSize = 2048;
        // Side tap; the original connection to the real destination is retained.
        (nativeConnect as (this: AudioNode, destination: AudioNode) => AudioNode).call(node, analyser);
        probes.push({ node, analyser, kind });
      };
      AudioNode.prototype.connect = function (this: AudioNode, destination: any, ...args: any[]) {
        const result = (nativeConnect as any).call(this, destination, ...args);
        if (destination instanceof AudioNode) {
          graph.set(this, [...(graph.get(this) ?? []), destination]);
          id(this); id(destination);
          if (destination === this.context.destination && this instanceof GainNode)
            tap(this, 'user-output');
        }
        return result;
      } as any;
      AudioNode.prototype.disconnect = function (this: AudioNode, ...args: any[]) {
        for (const source of proof.sources) {
          if (source.path.includes(id(this))) source.disconnects.push(id(this));
        }
        return (nativeDisconnect as any).apply(this, args);
      } as any;
      const nativeResume = AudioContext.prototype.resume;
      AudioContext.prototype.resume = function () {
        const before = this.state;
        return nativeResume.call(this).then(() => {
          proof.resumes.push({ before, after: this.state, time: this.currentTime });
        });
      };
      const NativeContext = AudioContext;
      w.AudioContext = class extends NativeContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          proof.contexts.push({ initialState: this.state, sampleRate: this.sampleRate });
        }
      };
      for (const prototype of [OscillatorNode.prototype, AudioBufferSourceNode.prototype]) {
        const nativeStart = prototype.start;
        prototype.start = function (this: OscillatorNode | AudioBufferSourceNode, ...args: any[]) {
          const result = (nativeStart as any).apply(this, args);
          const d = w.orvioDiagnostics;
          // Builtin music is rendered offline. Live oscillators and the small
          // noise buffers can therefore be attributed to the activation graph.
          if (this.context instanceof NativeContext && d?.active && d.fever?.stage >= 2 && new Error().stack?.includes("feverBurst")) {
            const path: AudioNode[] = [];
            let node: AudioNode | undefined = this;
            while (node && !path.includes(node)) {
              path.push(node);
              node = graph.get(node)?.[0];
            }
            const user = path.at(-2);
            const record = {
              type: this instanceof OscillatorNode ? this.type : 'noise',
              frequency: this instanceof OscillatorNode ? this.frequency.value : null,
              bufferLength: this instanceof AudioBufferSourceNode ? this.buffer?.length : null,
              at: args[0], contextTime: this.context.currentTime,
              state: this.context.state, stage: d.fever?.stage,
              journal: d.fever?.journal.at(-1),
              path: path.map(id), reachesDestination: path.at(-1) === this.context.destination,
              user: user ? id(user) : null,
              volume: user instanceof GainNode ? user.gain.value : null,
              stack: new Error().stack, disconnects: [] as number[], ended: false,
            };
            proof.sources.push(record);
            this.addEventListener('ended', () => { record.ended = true; }, { once: true });
            const voiceGain = path.at(-3);
            if (voiceGain) tap(voiceGain, 'candidate-voice');
          }
          return result;
        } as any;
      }
      let lastStage = 1;
      setInterval(() => {
        const d = w.orvioDiagnostics;
        if (!d?.active) return;
        if (d.fever.stage !== lastStage) {
          proof.transitions.push({ from: lastStage, to: d.fever.stage,
            clock: d.clock, contextState: d.audioContextState,
            journal: d.fever.journal.at(-1), sources: proof.sources.length });
          lastStage = d.fever.stage;
        }
        if (!proof.sources.length) return;
        for (const { node, analyser, kind } of probes) {
          if (node.context.state !== 'running') continue;
          const data = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(data);
          let peak = 0, square = 0;
          for (const x of data) { peak = Math.max(peak, Math.abs(x)); square += x * x; }
          proof.samples.push({ kind, node: id(node), time: node.context.currentTime,
            peak, rms: Math.sqrt(square / data.length) });
        }
      }, 10);
    }, { volume });

    await page.goto('/play/first-light/5/low/');
    expect(await page.evaluate(()=>(window as any).orvioDiagnostics.version)).toBe('0.3.15');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).orvioDiagnostics?.active);
    // Same normal DOM keyboard input path used by e2e/input.ts, scheduled with
    // existing read-only diagnostics. The meter still requires 46 real charges.
    await page.evaluate(() => {
      const w = window as any;
      const keys = [...document.querySelectorAll('#keycaps span')].map((e) => {
        const text = e.textContent!.trim();
        return text === '␣' ? 'Space' : 'Key' + text.toUpperCase();
      });
      const actions = w.orvioDiagnostics.notes.flatMap(({ note }: any) => [
        { time: note.time, code: keys[note.lane], down: true },
        { time: note.end ?? note.time + 0.035, code: keys[note.lane], down: false },
      ]).sort((a: any, b: any) => a.time - b.time);
      w.__feverKeys=keys;w.__feverActions=actions;let index = 0;
      const timer = setInterval(() => {
        const time = w.orvioAudioTime;
        while (index < actions.length && actions[index].time <= time) {
          const action = actions[index++];w.__feverIndex=index;
          window.dispatchEvent(new KeyboardEvent(action.down ? 'keydown' : 'keyup', {
            code: action.code, bubbles: true,
          }));
        }
        if (w.feverOutputProof.sources.length || index === actions.length) clearInterval(timer);
      }, 1);
    });
    await page.waitForFunction(() => (window as any).feverOutputProof.sources.length >= 12,null,{timeout:65000});
    await page.waitForFunction(() => (window as any).feverOutputProof.sources.every((s: any) => s.ended));
    const evidence = await page.evaluate(() => ({
      proof: (window as any).feverOutputProof,
      diagnostics: (window as any).orvioDiagnostics,
    }));
    await info.attach('fever-output-evidence.json', {
      body: JSON.stringify({ volume, ...evidence, requests, external, errors }, null, 2),
      contentType: 'application/json',
    });
    const { proof, diagnostics } = evidence;
    expect(errors).toEqual([]);
    expect(diagnostics.audioContextState).toBe('running');
    expect(proof.resumes.some((r: any) => r.after === 'running')).toBe(true);
    expect(proof.sources).toHaveLength(12);
    expect(proof.sources.filter((s: any) => s.type === 'sine')).toHaveLength(10);
    expect(proof.sources.filter((s: any) => s.type === 'noise')).toHaveLength(2);
    const transition = proof.transitions.find((t: any) => t.from === 1 && t.to === 2);
    expect(transition).toBeTruthy();
    // Stage is observed before the renderer dispatches its feedback voice.
    expect(proof.sources).toHaveLength(12);
    expect(transition.journal.activations).toBe(1);
    const user = proof.sources[0].user;
    for (const source of proof.sources) {
      expect(source.state).toBe('running');
      expect(source.stage).toBe(2);
      expect(source.journal.activations).toBe(1);
      expect(source.journal).toEqual(transition.journal);
      expect(source.reachesDestination).toBe(true);
      expect(source.user).toBe(user);
      expect(source.volume).toBeCloseTo(volume, 5);
      expect(source.stack).toContain('feverBurst');
      expect(source.ended).toBe(true);
      for (const privateNode of source.path.slice(0, -2))
        expect(source.disconnects).toContain(privateNode);
      expect(source.disconnects).not.toContain(user);
    }
    const voicePeak = Math.max(...proof.samples.filter((s: any) => s.kind === 'candidate-voice').map((s: any) => s.peak));
    const outputPeak = Math.max(...proof.samples.filter((s: any) => s.kind === 'user-output' && s.node === user).map((s: any) => s.peak));
    expect(voicePeak).toBeGreaterThan(0.001);
    if (volume > 0) expect(outputPeak).toBeGreaterThan(0.001);
    else expect(outputPeak).toBe(0);
    // Local bundled UI assets are expected; no fetched audio or source modules.
    expect(requests.filter((u) => /\.(wav|mp3|ogg|opus|m4a)(\?|$)|\/src\//.test(u))).toEqual([]);
    console.log('ORV94_OUTPUT', JSON.stringify({ volume, voices: proof.sources.length,
      transition, voicePeak, outputPeak, resumes: proof.resumes, externalBlocked: external }));
  });
}
