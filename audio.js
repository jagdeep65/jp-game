'use strict';
NB.Audio = class {
  constructor() { this.ctx = null; this.voices = 0; this.beat = 0; this.nextBeat = 0; this.lastShot = 0; }
  unlock() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * .3, this.ctx.sampleRate);
      const samples = this.noise.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.sync();
  }
  sync() { if (this.ctx) this.master.gain.setTargetAtTime(NB.settings.audio ? NB.settings.volume * .42 : 0, this.ctx.currentTime, .025); }
  tone(from, to, duration, volume, type = 'sine', delay = 0) {
    if (!this.ctx || !NB.settings.audio || this.voices >= 30) return;
    const t = this.ctx.currentTime + delay, gain = this.ctx.createGain(), osc = this.ctx.createOscillator();
    osc.type = type; osc.frequency.setValueAtTime(from, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    gain.gain.setValueAtTime(.001, t); gain.gain.exponentialRampToValueAtTime(Math.max(.002, volume), t + .004); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    osc.connect(gain); gain.connect(this.master); osc.start(t); osc.stop(t + duration + .02); this.voices++;
    osc.onended = () => { osc.disconnect(); gain.disconnect(); this.voices--; };
  }
  hiss(duration = .1, volume = .15) {
    if (!this.ctx || !NB.settings.audio || this.voices >= 30) return;
    const t = this.ctx.currentTime, source = this.ctx.createBufferSource(), gain = this.ctx.createGain(), filter = this.ctx.createBiquadFilter();
    source.buffer = this.noise; filter.type = 'highpass'; filter.frequency.value = 1400;
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(t); source.stop(t + duration); this.voices++;
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.voices--; };
  }
  play(name) {
    if (!this.ctx || !NB.settings.audio) return;
    switch (name) {
      case 'shoot': if (this.ctx.currentTime - this.lastShot < .045) break; this.lastShot = this.ctx.currentTime; this.tone(700, 170, .065, .12, 'sawtooth'); this.tone(130, 45, .07, .16); break;
      case 'hit': this.tone(170, 65, .06, .12, 'triangle'); break;
      case 'death': this.hiss(.1, .17); this.tone(170, 36, .14, .22, 'triangle'); break;
      case 'hurt': this.tone(90, 35, .23, .4, 'sawtooth'); this.hiss(.16, .23); break;
      case 'dash': this.hiss(.18, .23); this.tone(180, 1100, .16, .18, 'triangle'); break;
      case 'pickup': this.tone(850, 1250, .055, .07); break;
      case 'upgrade': [330, 440, 660, 880].forEach((f, i) => this.tone(f, f * 1.01, .25, .17, 'triangle', i * .075)); break;
      case 'warning': [0, .25, .5].forEach(d => this.tone(180, 160, .17, .27, 'square', d)); break;
      case 'pulse': this.tone(75, 900, .18, .35, 'sawtooth'); this.tone(160, 26, .7, .5); this.hiss(.25, .3); break;
      case 'win': [262, 330, 392, 523, 659].forEach((f, i) => this.tone(f, f, .6, .23, 'triangle', i * .14)); break;
      default: this.tone(660, 880, .07, .12, 'triangle');
    }
  }
  update(active) {
    if (!this.ctx || this.ctx.state !== 'running' || !NB.settings.audio || !NB.settings.music) return;
    const t = this.ctx.currentTime;
    if (t < this.nextBeat) return;
    this.nextBeat = t + .24;
    const steps = [55, 55, 82.41, 55, 65.41, 65.41, 49, 73.42];
    if (this.beat % 2 === 0) this.tone(steps[(this.beat / 2) % steps.length], 42, .17, active ? .16 : .08, 'triangle');
    if (active && this.beat % 4 === 0) this.tone(110, 28, .13, .22);
    if (this.beat % 8 === 6) this.tone(steps[Math.floor(this.beat / 2) % steps.length] * 8, 240, .34, .045, 'sine');
    this.beat = (this.beat + 1) % 64;
  }
};
