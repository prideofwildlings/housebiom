/* Housebiom shared sound: synthesized chiptune ambience and effects */
(function () {
const sound = (() => {
  let ac = null, master = null, on = false, timer = 0, step = 0;
  const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  const TUNE = [0, 2, 4, 2, 3, 1, 2, -1, 0, 4, 5, 4, 3, 2, 1, -1];
  function tone(freq, dur, type = 'triangle', vol = .05, when = 0, slide = 0) {
    if (!ac || !on) return;
    const t0 = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + .05);
  }
  function noise(dur, vol, f0, f1) {
    if (!ac || !on) return;
    const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = b;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    const t0 = ac.currentTime; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    n.connect(f).connect(g).connect(master); n.start(); n.stop(t0 + dur);
  }
  let hum = null;
  function startHum() {
    const g = ac.createGain(); g.gain.value = .0;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.type = o2.type = 'triangle';
    o1.frequency.value = 55; o2.frequency.value = 82.6;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = .18; lg.gain.value = .018;
    lfo.connect(lg).connect(g.gain);
    o1.connect(lp); o2.connect(lp); lp.connect(g).connect(master);
    g.gain.setValueAtTime(.035, ac.currentTime);
    [o1, o2, lfo].forEach(o => o.start());
    hum = {stop: () => [o1, o2, lfo].forEach(o => o.stop())};
  }
  function tick() {
    const n = TUNE[step % TUNE.length];
    if (n >= 0) tone(NOTES[n] / 2, .6, 'triangle', .025);
    if (step % 4 === 0) tone(NOTES[[0, 3, 1, 2][(step / 4) % 4 | 0]] / 4, 1.4, 'sine', .02);
    if (Math.random() < .35) tone(300 + Math.random() * 500, .12, 'sine', .03, Math.random() * .3, .45);
    step++;
  }
  return {
    get on() { return on; },
    toggle() {
      if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return false; ac = new A(); master = ac.createGain(); master.gain.value = .8; master.connect(ac.destination); }
      on = !on;
      if (on) { ac.resume(); startHum(); timer = setInterval(tick, 430); }
      else { clearInterval(timer); if (hum) hum.stop(); hum = null; }
      return on;
    },
    blip() { tone(988, .07, 'square', .025); tone(1319, .09, 'square', .02, .05); },
    hop() { tone(660, .1, 'square', .02, 0, 1.6); },
    sparkle() { [0, 2, 4, 5].forEach((n, i) => tone(NOTES[n] * 2, .18, 'triangle', .03, i * .07)); },
    page() { noise(.28, .12, 2400, 600); },
    _noise: noise,
    thud() { tone(90, .25, 'square', .05, 0, .5); noise(.15, .08, 400, 120); }
  };
})();

  /* extra effects */
  sound.whoosh = function () { this._noise && this._noise(.9, .22, 300, 3000); this.sparkle(); };
  /* remember on/off across pages; browsers need a click before audio can start */
  const KEY = 'housebiom-sound';
  let want = false; try { want = localStorage.getItem(KEY) === 'on'; } catch (e) {}
  sound.bindButton = function (btn) {
    const sync = on => { btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off'); };
    btn.addEventListener('click', e => { e.stopPropagation(); const on = sound.toggle(); sync(on); try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (err) {} if (on) sound.blip(); });
    if (want) {
      const start = () => { removeEventListener('pointerdown', start, true); removeEventListener('keydown', start, true); if (!sound.on) { sound.toggle(); sync(true); } };
      addEventListener('pointerdown', start, true); addEventListener('keydown', start, true);
    }
  };
  window.HBSound = sound;
})();
