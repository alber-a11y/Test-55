const LOCAL_KEY = 'block_rush_save_v1';

export function localLoad(): unknown | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function localSave(data: unknown): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    /* private mode / quota — progress lives in memory only */
  }
}
