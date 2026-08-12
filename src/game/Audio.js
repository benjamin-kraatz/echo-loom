/**
 * Lightweight Web Audio synthesizer — no samples, zero license risk.
 */
export class AudioSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this._unlocked = false;
  }

  async unlock() {
    if (this._unlocked) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      this.enabled = false;
      return;
    }
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') {
      try {
        await Promise.race([
          this.ctx.resume(),
          new Promise((r) => setTimeout(r, 300)),
        ]);
      } catch (_) {
        /* ignore — will resume on next gesture */
      }
    }
    this._unlocked = true;
  }

  _env(gain, t0, attack, decay, peak = 0.35, sustain = 0.0001) {
    gain.gain.cancelScheduledValues(t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(sustain, t0 + attack + decay);
  }

  _tone(freq, duration, type = 'sine', peak = 0.28, detune = 0) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (detune) osc.detune.setValueAtTime(detune, t0);
    this._env(gain, t0, 0.01, duration, peak);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  pulseCast() {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Soft rising chime cluster
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t0);
      this._env(gain, t0 + i * 0.02, 0.008, 0.35, 0.18 - i * 0.03);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0 + i * 0.02);
      osc.stop(t0 + 0.5);
    });
  }

  glassTing(intensity = 1) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sine';
    const base = 1400 + Math.random() * 600;
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.exponentialRampToValueAtTime(base * 0.55, t0 + 0.18);
    filter.type = 'highpass';
    filter.frequency.value = 800;
    this._env(gain, t0, 0.002, 0.22, 0.16 * intensity);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.28);
  }

  starAwaken(index = 0) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const chord = [261.63, 329.63, 392.0, 523.25];
    const root = chord[index % chord.length];
    [root, root * 1.25, root * 1.5].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0);
      this._env(gain, t0 + i * 0.04, 0.04, 0.9, 0.22 - i * 0.04);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0 + i * 0.04);
      osc.stop(t0 + 1.2);
    });
  }

  levelClear() {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, t0 + i * 0.09);
      this._env(gain, t0 + i * 0.09, 0.03, 1.1, 0.2);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0 + i * 0.09);
      osc.stop(t0 + 1.6);
    });
  }

  winFanfare() {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime;
    const notes = [196, 246.94, 293.66, 392, 493.88, 587.33];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t0 + i * 0.12);
      this._env(gain, t0 + i * 0.12, 0.05, 1.4, 0.18);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0 + i * 0.12);
      osc.stop(t0 + 2.0);
    });
  }
}
