/** DOM boot loader shown before Phaser renders the first frame. */
export function setBootProgress(p: number): void {
  const el = document.getElementById('boot-fill');
  if (el) el.style.width = `${Math.round(p * 100)}%`;
}

export function hideBootLoader(): void {
  const el = document.getElementById('boot-loader');
  if (el) {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 350);
  }
}
