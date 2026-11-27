/* Housebiom: the lake's soundscape — sparse piano in open space, wind, lapping water, birds,
   and the double scull, timed to every stroke. Everything is synthesized. */
(function () {
  const S = window.HBSound;
  let bus = null, verb = null;               /* shared reverb for music and the far-off boat */
  function impulse(ac, secs, decay) {
    const len = ac.sampleRate * secs, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function noiseBuf(ac, secs) {
    const b = ac.createBuffer(1, ac.sampleRate * secs, ac.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = w * .6 + last * 3; }
    return b;
  }
  /* soft piano-like note */
  function note(ac, out, f, when, vol, len) {
    const t0 = ac.currentTime + when, g = ac.createGain();
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .006); g.gain.exponentialRampToValueAtTime(vol * .35, t0 + .25); g.gain.exponentialRampToValueAtTime(.0001, t0 + len);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(4200, t0); lp.frequency.exponentialRampToValueAtTime(900, t0 + len);
    [[1, 'sine', 1], [2, 'triangle', .22], [3, 'sine', .08]].forEach(([m, type, a]) => {
      const o = ac.createOscillator(), og = ac.createGain(); o.type = type; o.frequency.value = f * m; og.gain.value = a;
      o.connect(og).connect(lp); o.start(t0); o.stop(t0 + len + .1);
    });
    lp.connect(g).connect(out);
  }
  /* original, sparse phrases in D major pentatonic: a few notes, then lots of silence */
  const SCALE = [146.83, 164.81, 185, 220, 246.94, 293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.25];
  function phrase(ac, out) {
    const r = Math.random();
    if (r < .25) {                                        /* a soft open chord, low */
      [0, 3, 5].forEach((n, i) => note(ac, out, SCALE[n] / (i ? 1 : 2), i * .05, .05, 5));
    } else {
      let n = 5 + Math.floor(Math.random() * 5), t = 0;
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        note(ac, out, SCALE[n], t, .045 + Math.random() * .02, 3.5);
        n = Math.max(3, Math.min(SCALE.length - 1, n + [-2, -1, 1, 2, -3][Math.floor(Math.random() * 5)]));
        t += [.45, .6, .9][Math.floor(Math.random() * 3)];
      }
    }
  }
  function bird(ac, out) {
    const n = 2 + Math.floor(Math.random() * 3), base = 2600 + Math.random() * 1400, pan = ac.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - .8; pan.connect(out);
    for (let i = 0; i < n; i++) {
      const t0 = ac.currentTime + i * (.11 + Math.random() * .05), o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(base * (1 + Math.random() * .2), t0); o.frequency.exponentialRampToValueAtTime(base * (.7 + Math.random() * .6), t0 + .08);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.012, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + .09);
      o.connect(g).connect(pan); o.start(t0); o.stop(t0 + .12);
    }
  }
  function ambience(ac, master) {
    verb = ac.createConvolver(); verb.buffer = impulse(ac, 4, 2.6);
    const wet = ac.createGain(); wet.gain.value = .55; verb.connect(wet).connect(master);
    bus = ac.createGain(); bus.gain.value = 2.6; bus.connect(master); bus.connect(verb);
    const music = ac.createGain(); music.gain.value = 1.6; music.connect(master); music.connect(verb);
    const nb = noiseBuf(ac, 6), nodes = [];
    /* wind: band-passed noise that slowly swells */
    const wind = ac.createBufferSource(); wind.buffer = nb; wind.loop = true;
    const wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 500; wf.Q.value = .7;
    const wg = ac.createGain(); wg.gain.value = .03;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .07; lg.gain.value = 260; lfo.connect(lg).connect(wf.frequency);
    const lfo2 = ac.createOscillator(), lg2 = ac.createGain(); lfo2.frequency.value = .045; lg2.gain.value = .012; lfo2.connect(lg2).connect(wg.gain);
    wind.connect(wf).connect(wg).connect(master); wind.start(); lfo.start(); lfo2.start(); nodes.push(wind, lfo, lfo2);
    /* water lapping against the ruin */
    const lap = ac.createBufferSource(); lap.buffer = nb; lap.loop = true; lap.playbackRate.value = .7;
    const lf = ac.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 420;
    const lgain = ac.createGain(); lgain.gain.value = .03; lap.connect(lf).connect(lgain).connect(master); lap.start(); nodes.push(lap);
    const timers = [];
    const lapT = setInterval(() => { const t = ac.currentTime; lgain.gain.setTargetAtTime(.02 + Math.random() * .05, t, .5); }, 1300); timers.push(lapT);
    /* piano phrases with long gaps, birds now and then */
    let next = 1.5;
    const musicT = setInterval(() => { next -= .5; if (next <= 0) { phrase(ac, music); next = 5 + Math.random() * 7; } }, 500); timers.push(musicT);
    const birdT = setInterval(() => { if (Math.random() < .35) bird(ac, master); }, 4000); timers.push(birdT);
    return {stop() { timers.forEach(clearInterval); nodes.forEach(n => { try { n.stop(); } catch (e) {} }); bus = verb = null; }};
  }
  /* the boat: events the page sends as the stroke goes round */
  function burst(ac, out, dur, vol, type, f0, f1, when = 0, q = 1) {
    const t0 = ac.currentTime + when, n = ac.createBufferSource();
    const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = b; const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * .15); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    n.connect(f).connect(g).connect(out); n.start(t0); n.stop(t0 + dur + .02);
  }
  function thump(ac, out, f, dur, vol, when = 0) {
    const t0 = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * .55, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur + .02);
  }
  function row(kind, pan, strokeSecs) {
    const a = S.audio(); if (!a || !bus) return;
    const ac = a.ac, p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(bus);
    if (kind === 'catch') {             /* blades go in together: a soft double plop */
      burst(ac, p, .22, .09, 'bandpass', 1100, 380, 0, 1.4); thump(ac, p, 190, .14, .05); burst(ac, p, .18, .05, 'bandpass', 900, 350, .03, 1.4);
    } else if (kind === 'drive') {      /* water rushing past the blades and the hull */
      burst(ac, p, strokeSecs, .05, 'lowpass', 900, 380, 0, .7);
    } else if (kind === 'finish') {     /* oarlocks clunk as the blades turn out; a little release splash */
      thump(ac, p, 150, .09, .07); burst(ac, p, .03, .05, 'highpass', 3000, 2500); burst(ac, p, .16, .04, 'bandpass', 1500, 700, .05, 1.2);
    } else if (kind === 'slide') {      /* seats rolling back up the slides, hull gliding */
      burst(ac, p, strokeSecs, .025, 'lowpass', 260, 180, 0, .5); burst(ac, p, strokeSecs * .9, .012, 'bandpass', 2400, 1800, .1, 3);
    }
  }
  S.useAmbience(ambience);
  window.HBLake = {row};
})();
