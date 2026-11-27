/* Housebiom: the hub's soundscape — a deep, slowly shifting drone, rare glass chimes echoing in the chamber,
   lamps crackling on the walls, a hum that rises near a portal, and your own wingbeats. All synthesized. */
(function () {
  const S = window.HBSound;
  let st = null;
  function impulse(ac, secs, decay) {
    const len = ac.sampleRate * secs, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function noiseBuf(ac, secs) {
    const b = ac.createBuffer(1, ac.sampleRate * secs, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b;
  }
  const BELLS = [440, 523.25, 587.33, 659.25, 783.99, 880, 987.77, 1174.66];   /* A minor / dorian, high and glassy */
  function bell(ac, out, f, when, vol) {
    const t0 = ac.currentTime + when, pan = ac.createStereoPanner(); pan.pan.value = Math.random() * 1.4 - .7; pan.connect(out);
    [[1, 1, 4.5], [2.76, .35, 2.2], [5.4, .12, 1.1]].forEach(([m, a, len]) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol * a, t0 + .004); g.gain.exponentialRampToValueAtTime(.0001, t0 + len);
      o.connect(g).connect(pan); o.start(t0); o.stop(t0 + len + .1);
    });
  }
  function ambience(ac, master) {
    const verb = ac.createConvolver(); verb.buffer = impulse(ac, 6, 2.2);
    const wet = ac.createGain(); wet.gain.value = .9; verb.connect(wet).connect(master);
    /* echoes: a soft ping-pong delay that feeds the big chamber reverb */
    const dl = ac.createDelay(2), dr = ac.createDelay(2), fb = ac.createGain(), pl = ac.createStereoPanner(), pr = ac.createStereoPanner();
    dl.delayTime.value = .62; dr.delayTime.value = .93; fb.gain.value = .38; pl.pan.value = -.8; pr.pan.value = .8;
    const echo = ac.createGain(); echo.gain.value = 1;
    echo.connect(dl); dl.connect(pl).connect(verb); dl.connect(dr); dr.connect(pr).connect(verb); dr.connect(fb).connect(dl);
    const space = ac.createGain(); space.gain.value = 1; space.connect(master); space.connect(verb); space.connect(echo);
    const nodes = [], timers = [];
    /* the drone: low A and E with a slow, breathing filter, and a faint high shimmer that beats against itself */
    const dronef = ac.createBiquadFilter(); dronef.type = 'lowpass'; dronef.frequency.value = 340; dronef.Q.value = 2;
    const droneg = ac.createGain(); droneg.gain.value = .05; dronef.connect(droneg).connect(master); droneg.connect(verb);
    [[55, 'sawtooth', .35], [55.4, 'sine', .8], [82.41, 'sine', .55], [130.81, 'triangle', .12], [131.4, 'triangle', .12]].forEach(([f, type, a]) => {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = a; o.connect(g).connect(dronef); o.start(); nodes.push(o);
    });
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .035; lg.gain.value = 180; lfo.connect(lg).connect(dronef.frequency); lfo.start(); nodes.push(lfo);
    /* air moving through the chamber */
    const nb = noiseBuf(ac, 5);
    const air = ac.createBufferSource(); air.buffer = nb; air.loop = true;
    const af = ac.createBiquadFilter(); af.type = 'bandpass'; af.frequency.value = 320; af.Q.value = .6;
    const ag = ac.createGain(); ag.gain.value = .012; air.connect(af).connect(ag).connect(master); air.start(); nodes.push(air);
    /* lamps: a low flame rustle and tiny crackles from the walls */
    const flame = ac.createBufferSource(); flame.buffer = nb; flame.loop = true; flame.playbackRate.value = .5;
    const ff = ac.createBiquadFilter(); ff.type = 'lowpass'; ff.frequency.value = 220;
    const fg = ac.createGain(); fg.gain.value = .02; flame.connect(ff).connect(fg).connect(master); flame.start(); nodes.push(flame);
    timers.push(setInterval(() => {
      if (Math.random() < .55) return;
      const t0 = ac.currentTime + Math.random() * .1, n = ac.createBufferSource(); n.buffer = nb;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500 + Math.random() * 2500;
      const g = ac.createGain(), p = ac.createStereoPanner(); p.pan.value = Math.random() < .5 ? -.7 : .7;
      g.gain.setValueAtTime(.025 * Math.random(), t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + .012);
      n.connect(hp).connect(g).connect(p).connect(space); n.start(t0, Math.random() * 4); n.stop(t0 + .02);
    }, 110));
    /* rare chimes, sometimes answered by a second one */
    let next = 3;
    timers.push(setInterval(() => {
      next -= .5; if (next > 0) return;
      const i = Math.floor(Math.random() * BELLS.length); bell(ac, space, BELLS[i], 0, .03);
      if (Math.random() < .4) bell(ac, space, BELLS[Math.max(0, i - 2)], 1.2 + Math.random(), .022);
      next = 7 + Math.random() * 9;
    }, 500));
    /* portal hum: rises as you fly near a door */
    const hum = ac.createGain(); hum.gain.value = 0; hum.connect(master); hum.connect(verb);
    const hp = ac.createStereoPanner(); hp.connect(hum);
    const trem = ac.createOscillator(), tg = ac.createGain(); trem.frequency.value = 3.2; tg.gain.value = .3;
    const humIn = ac.createGain(); humIn.gain.value = .7; trem.connect(tg).connect(humIn.gain); humIn.connect(hp);
    [[220, .5], [221.6, .5], [330, .25], [440.8, .1]].forEach(([f, a]) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = a; o.connect(g).connect(humIn); o.start(); nodes.push(o); });
    trem.start(); nodes.push(trem);
    st = {ac, space, hum, hp};
    return {stop() { timers.forEach(clearInterval); nodes.forEach(n => { try { n.stop(); } catch (e) {} }); st = null; }};
  }
  /* one soft wingbeat: a low whoomp of air */
  function flap(vol, pan) {
    if (!st || !S.on) return;
    const ac = st.ac, t0 = ac.currentTime, n = ac.createBufferSource();
    const b = ac.createBuffer(1, ac.sampleRate * .3, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = b;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t0); f.frequency.exponentialRampToValueAtTime(160, t0 + .22);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .04); g.gain.exponentialRampToValueAtTime(.0001, t0 + .26);
    const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    n.connect(f).connect(g).connect(p).connect(st.space); n.start(t0); n.stop(t0 + .3);
  }
  function portal(level, pan) {
    if (!st) return;
    st.hum.gain.setTargetAtTime(.035 * Math.max(0, Math.min(1, level)), st.ac.currentTime, .3);
    st.hp.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), st.ac.currentTime, .3);
  }
  S.useAmbience(ambience);
  window.HBHub = {flap, portal};
})();
