/**
 * Virtual stage: the UI is laid out in design pixels (landscape 1600×900, portrait 900×1600)
 * and scaled to the window. The short side is fixed, the long side stretches, so the layout
 * fills any screen without letterboxing.
 */
const BASE_LONG = 1600;
const BASE_SHORT = 900;

class Stage {
  el!: HTMLElement;
  w = 1600;
  h = 900;
  scale = 1;
  portrait = false;
  private listeners = new Set<() => void>();

  mount(root: HTMLElement): void {
    this.el = root;
    const update = () => this.update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    this.update();
  }

  private update(): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const portrait = vh > vw * 1.05;
    const bw = portrait ? BASE_SHORT : BASE_LONG;
    const bh = portrait ? BASE_LONG : BASE_SHORT;
    const scale = Math.min(vw / bw, vh / bh);
    this.scale = scale;
    this.w = Math.round(vw / scale);
    this.h = Math.round(vh / scale);
    const changed = portrait !== this.portrait;
    this.portrait = portrait;
    Object.assign(this.el.style, { width: `${this.w}px`, height: `${this.h}px`, transform: `scale(${scale})` });
    this.el.classList.toggle('portrait', portrait);
    this.el.classList.toggle('landscape', !portrait);
    this.el.style.setProperty('--sw', `${this.w}px`);
    this.el.style.setProperty('--sh', `${this.h}px`);
    void changed;
    this.listeners.forEach((l) => l());
  }

  onResize(l: () => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Element rect in stage coordinates. */
  rect(el: Element): { x: number; y: number; w: number; h: number } {
    const r = el.getBoundingClientRect();
    const s = this.el.getBoundingClientRect();
    return { x: (r.left - s.left) / this.scale, y: (r.top - s.top) / this.scale, w: r.width / this.scale, h: r.height / this.scale };
  }
}

export const stage = new Stage();
