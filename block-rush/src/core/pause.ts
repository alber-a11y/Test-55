/**
 * Pause is a set of reasons (ad, hidden tab, platform request, pause menu, modal).
 * Gameplay timers run only while no reason is active.
 */
type Listener = (paused: boolean) => void;

class PauseHub {
  private reasons = new Set<string>();
  private listeners: Listener[] = [];

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

  onChange(l: Listener): void {
    this.listeners.push(l);
  }
}

export const pauseHub = new PauseHub();
