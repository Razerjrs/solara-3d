// Synthesized WebAudio sound: engine hum tied to speed, two-tone sirens,
// punch thuds, pickup blips, a mission jingle and a lazy sunset music loop.
// No audio files, no network — everything is oscillators and noise.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: a low sawtooth whose pitch follows speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: a sine that alternates between two tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      startMusic();
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, dur, type = 'sine', vol = 0.25) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol = 0.3) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(master);
    src.start();
  }

  // Lazy sunset loop: Am – F – C – G arpeggios, one chord per bar.
  const CHORDS = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = setInterval(() => {
      if (!ctx || muted) return;
      const chord = CHORDS[musicStep % CHORDS.length];
      musicStep += 1;
      chord.forEach((f, i) => {
        setTimeout(() => blip(f, 0.9, 'triangle', 0.05), i * 140);
      });
    }, 1400);
  }

  return {
    resume,
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    get muted() { return muted; },
    engine(speed, driving) {
      if (!ctx) return;
      const target = driving ? 0.05 + Math.min(Math.abs(speed) / 46, 1) * 0.1 : 0;
      engineGain.gain.setTargetAtTime(muted ? 0 : target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 2.2, ctx.currentTime, 0.1);
    },
    siren(on, t) {
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, ctx.currentTime, 0.1);
      if (on) sirenOsc.frequency.setTargetAtTime(Math.sin(t * 4) > 0 ? 720 : 540, ctx.currentTime, 0.05);
    },
    punch() { noise(0.12, 0.35); blip(120, 0.1, 'square', 0.2); },
    pickup() { blip(660, 0.12); setTimeout(() => blip(880, 0.16), 90); },
    jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.16), i * 110)); },
    crash() { noise(0.3, 0.4); blip(90, 0.25, 'sawtooth', 0.25); },
    fail() { blip(220, 0.3, 'sawtooth', 0.18); setTimeout(() => blip(160, 0.4, 'sawtooth', 0.18), 160); },
  };
}
