// @ts-nocheck
import { ProgressiveAudioClock } from '../src/progressive/progressive-clock';
import {
  makeSegments,
  validateManifest,
  verifySegment,
} from '../src/progressive/segments';
import { it, expect } from 'vitest';
import { progressiveFixture } from './progressive-fixture';
it('ported independent clock qualification', async () => {
  const ab = (await progressiveFixture(32)).buffer;
  const m = await makeSegments(ab, 'uXn-zOt68V8');
  validateManifest(m, {
    videoId: m.videoId,
    audioSha256: m.audioSha256,
    frames: m.frames,
    sampleRate: m.sampleRate,
  });
  let checks = 0;
  const ok = (x, name) => {
    if (!x) throw Error('FAIL ' + name);
    checks++;
  };

  function mockContext() {
    const c = {
      currentTime: 0,
      baseLatency: 0.005,
      outputLatency: 0.01,
      state: 'suspended',
      _suspended: true,
      starts: [],
      createGain: () => ({
        gain: { value: 0, setTargetAtTime() {} },
        connect() {},
      }),
      createBuffer: (ch, frames, r) => ({
        numberOfChannels: ch,
        length: frames,
        sampleRate: r,
        copyToChannel() {},
      }),
      createBufferSource: () => ({
        buffer: null,
        connect() {},
        start(when, offset = 0) {
          c.starts.push({ when, offset });
        },
        stop() {},
      }),
      resume: async () => {
        c._suspended = false;
        c.state = 'running';
      },
      suspend: async () => {
        c._suspended = true;
        c.state = 'suspended';
      },
      close: async () => {},
      getOutputTimestamp: () => undefined,
      tick(dt) {
        if (!c._suspended) c.currentTime += dt;
      },
    };
    return c;
  }
  const vs = async (i) => verifySegment(m.parts[i], m.parts[i].bytes);

  // --- Path A: timely arrival, guard polled like a real driver (50ms) ---
  {
    const ctx = mockContext();
    const clock = new ProgressiveAudioClock(ctx, { guardSec: 0.25 });
    await clock.begin(0.15);
    ctx.tick(0.05); // 50ms network/verify latency before first verified segment
    clock.scheduleSegment(m.parts[0], await vs(0), m);
    ok(
      Math.abs(clock.anchor - 0.2) < 1e-9,
      'A: anchor set at first verified segment + leadIn',
    );
    ok(
      ctx.starts[0].when === 0.2 && ctx.starts[0].offset === 0,
      'A: seg0 at anchor, zero offset',
    );
    ctx.starts[0].when = 0.15; // normalize for the uniform slot assertions below
    clock.anchor = 0.15;
    // segments 1..7 arrive every 1s of playback while guard polls
    for (let i = 1; i <= 7; i++) {
      for (let t = 0; t < 20; t++) {
        ctx.tick(0.05);
        await clock.guard(m);
      }
      clock.scheduleSegment(m.parts[i], vs(i), m);
      ok(
        ctx.starts[i].when === 0.15 + m.parts[i].startFrame / m.sampleRate &&
          ctx.starts[i].offset === 0,
        `A: seg${i} frame-exact`,
      );
    }
    ok(clock.underflowCount === 0, 'A: no underflow on timely arrival');
  }

  // --- Path B: early freeze (stall, guard polling catches before gap) ---
  {
    const ctx = mockContext();
    const clock = new ProgressiveAudioClock(ctx, { guardSec: 0.25 });
    await clock.begin(0.15);
    clock.scheduleSegment(m.parts[0], await vs(0), m); // 2s buffered; anchor = 0.15 (currentTime 0 + leadIn)
    // stall: poll guard without delivery until it freezes
    let frozeAt = null;
    for (let t = 0; t < 100 && frozeAt === null; t++) {
      ctx.tick(0.05);
      if (await clock.guard(m)) frozeAt = ctx.currentTime;
    }
    ok(frozeAt !== null, 'B: freeze happened');
    ok(
      frozeAt <= 0.15 + 2 - 0.25 + 0.05 + 1e-9,
      'B: freeze BEFORE gap (within one poll step)',
    );
    ok(
      ctx.currentTime >= 0.15 + 2 - 0.25,
      'B: freeze not premature beyond guard window',
    );
    const frozenNow = clock.frozenTime;
    ctx.tick(10); // long stall, wall time passes frozen
    clock.scheduleSegment(m.parts[1], await vs(1), m);
    ok(
      ctx.starts[1].when === 0.15 + 96000 / 48000 && ctx.starts[1].offset === 0,
      'B: post-freeze slot exact, zero offset',
    );
    await clock.resumeFromFreeze();
    ok(clock.anchor === 0.15, 'B: no anchor shift on early freeze');
    ok(
      clock.frozenTime === undefined && clock.frozen === false,
      'B: freeze state cleared after resume',
    );
    ok(clock.underflowCount === 1, 'B: one underflow');
  }

  // --- Path C: LATE freeze recovery (driver starved, gap already reached) ---
  {
    const ctx = mockContext();
    const clock = new ProgressiveAudioClock(ctx, { guardSec: 0.25 });
    await clock.begin(0.15);
    clock.scheduleSegment(m.parts[0], await vs(0), m); // anchor 0.15
    ctx.tick(3.0); // currentTime 3.0: gap at 2.15 already passed by 0.85s
    ok((await clock.guard(m)) === true, 'C: late freeze still freezes');
    const lateBy = 3.0 - (0.15 + 2); // 0.85
    const frozenNow = clock.frozenTime;
    clock.scheduleSegment(m.parts[1], await vs(1), m); // arrives during freeze; slot was 2.15 (past)
    await clock.resumeFromFreeze();
    ok(clock.anchor === 0.15, 'C: anchor NOT shifted (monotonic replay clock)');
    // chart clock continuity: now() right after resume equals frozenTime
    const after = clock.now();
    ok(
      Math.abs(after - frozenNow) < 0.05,
      'C: chart clock continuous across skip',
    );
    // segment 1 resumes mid-buffer at exactly the lateBy offset: audio and
    // chart skip the gap together, staying locked
    const s1 = ctx.starts[1];
    ok(
      Math.abs(s1.offset - lateBy) < 1e-9,
      'C: in-segment offset equals lateBy',
    );
    // future segment 2 lands on the ORIGINAL anchor, frame-exact
    clock.scheduleSegment(m.parts[2], await vs(2), m);
    ok(
      Math.abs(ctx.starts[2].when - (0.15 + 192000 / 48000)) < 1e-9 &&
        ctx.starts[2].offset === 0,
      'C: future slot frame-exact on original anchor',
    );
  }

  // --- Path D: out-of-order + full coverage ---
  {
    const ctx = mockContext();
    const clock = new ProgressiveAudioClock(ctx, { guardSec: 0.25 });
    await clock.begin(0.15);
    clock.scheduleSegment(m.parts[0], await vs(0), m); // anchor 0.15
    let threw = false;
    try {
      clock.scheduleSegment(m.parts[2], await vs(2), m);
    } catch {
      threw = true;
    }
    ok(threw, 'D: out-of-order rejected');
    for (let i = 1; i < m.parts.length; i++)
      clock.scheduleSegment(m.parts[i], vs(i), m);
    ok(clock.scheduledThroughFrame === m.frames, 'D: full coverage');
    ok(ctx.starts.length === m.parts.length, 'D: every segment exactly once');
    ok((await clock.guard(m)) === false, 'D: no freeze when fully scheduled');
  }

  console.log(
    'PASS',
    checks,
    'progressive-clock checks (A timely, B early-freeze, C late-freeze anchor-shift recovery, D order/coverage)',
  );

  expect(checks).toBe(26);
}, 20000);
