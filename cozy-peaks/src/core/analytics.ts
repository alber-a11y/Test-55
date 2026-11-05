/** Analytics facade: logs to the console now; plug Metrica / GA / portal analytics in `send`. */
export type Params = Record<string, string | number | boolean | undefined>;

const log: { e: string; p: Params; t: number }[] = [];

export function track(event: string, params: Params = {}): void {
  log.push({ e: event, p: params, t: Date.now() });
  if (log.length > 500) log.shift();
  if (new URLSearchParams(location.search).has('debug')) console.info('[track]', event, params);
}

(window as any).__events = log;
