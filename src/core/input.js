const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyR: 'rewind', KeyE: 'interact' };
export class Input {
  constructor(root, isActive) {
    this.keys = new Set(); this.pointers = new Map(); this.edges = new Set(); this.isActive = isActive;
    window.addEventListener('keydown', event => {
      const action = KEYS[event.code];
      if (!action || !this.isActive()) return;
      event.preventDefault();
      if (!this.keys.has(event.code) && !event.repeat) this.edges.add(action);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.clear());
    root.querySelectorAll('[data-control]').forEach(button => {
      button.addEventListener('pointerdown', event => {
        if (!this.isActive()) return;
        event.preventDefault(); button.setPointerCapture(event.pointerId);
        const action = button.dataset.control; this.pointers.set(event.pointerId, action); this.edges.add(action); button.classList.add('pressed');
      });
      const release = event => { this.pointers.delete(event.pointerId); button.classList.remove('pressed'); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', event => event.preventDefault());
    });
  }
  down(action) { return [...this.keys].some(code => KEYS[code] === action) || [...this.pointers.values()].includes(action); }
  sample() {
    const value = { move: Number(this.down('right')) - Number(this.down('left')), jumpDown: this.down('jump'), jumpPressed: this.edges.has('jump'), interactPressed: this.edges.has('interact'), rewindPressed: this.edges.has('rewind') };
    this.edges.clear(); return value;
  }
  clear() { this.keys.clear(); this.pointers.clear(); this.edges.clear(); document.querySelectorAll('.pressed').forEach(el => el.classList.remove('pressed')); }
}
