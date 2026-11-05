/**
 * Collects reasons the game must be frozen (ad playing, tab hidden, platform pause, menu).
 * Gameplay scenes subscribe and pause their simulation while any reason is active.
 */
type Listener = (paused: boolean) => void;

class PauseHub {
  private reasons = new Set<string>();
  private listeners = new Set<Listener>();

  set(reason: string, on: boolean): void {
    const was = this.paused;
    if (on) this.reasons.add(reason);
    else this.reasons.delete(reason);
    if (was !== this.paused) this.listeners.forEach((l) => l(this.paused));
  }

  has(reason: string): boolean {
    return this.reasons.has(reason);
  }

  get paused(): boolean {
    return this.reasons.size > 0;
  }

  /** Paused for a reason other than the user's own pause menu. */
  get systemPaused(): boolean {
    for (const r of this.reasons) if (r !== 'menu') return true;
    return false;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const pauseHub = new PauseHub();
