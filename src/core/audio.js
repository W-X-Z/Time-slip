/** All sounds are synthesized locally; no asset download or autoplay. */
export class Sound {
  constructor(enabled = false) { this.enabled = enabled; this.context = null; }
  unlock() {
    if (!this.enabled) return;
    try { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) this.context ||= new Audio(); this.context?.resume().catch(() => {}); } catch { /* Sound is optional. */ }
  }
  tone(frequency, duration = 0.12, delay = 0, type = 'sine', end = frequency) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), start = ctx.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(frequency, start); osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + duration);
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(0.055, start + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  play(name) {
    if (name === 'jump') this.tone(230, 0.11, 0, 'triangle', 420);
    if (name === 'land') this.tone(110, 0.06, 0, 'triangle', 60);
    if (name === 'shard') [523, 659, 784, 1046].forEach((n, i) => this.tone(n, 0.23, i * 0.075));
    if (name === 'anchor' || name === 'travel') [196, 294, 392].forEach((n, i) => this.tone(n, 0.4, i * 0.12));
    if (name === 'rewind') this.tone(560, 0.55, 0, 'triangle', 65);
    if (name === 'tick') this.tone(660, 0.045);
    if (name === 'win') [392, 494, 587, 784, 988].forEach((n, i) => this.tone(n, 0.6, i * 0.16));
  }
}
