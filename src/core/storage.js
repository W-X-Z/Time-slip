import { sanitizeProgress, freshProgress } from '../game/progress.js';
const KEY = 'time-slip:save:v1';
export class SaveStore {
  constructor(storage) { this.storage = storage; this.available = true; }
  read() {
    try { const raw = JSON.parse(this.storage?.getItem(KEY) || 'null'); return { progress: sanitizeProgress(raw?.progress), sound: raw?.sound === true, ghost: raw?.ghost !== false, reducedMotion: typeof raw?.reducedMotion === 'boolean' ? raw.reducedMotion : undefined }; }
    catch { return { progress: freshProgress(), sound: false, ghost: true }; }
  }
  write(progress, settings) {
    try { if (!this.storage) throw new Error('No storage'); this.storage.setItem(KEY, JSON.stringify({ progress, ...settings })); return true; }
    catch { this.available = false; return false; }
  }
}
