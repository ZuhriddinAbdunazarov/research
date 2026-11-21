// Generic fetch helper: timeout, JSON validation, typed errors, small session cache.

export class ApiError extends Error {
  constructor(message, { status = 0, cause } = {}) { super(message); this.status = status; this.cause = cause; }
}

export async function fetchJson(url, { timeout = 30000, signal } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new DOMException('Request timed out', 'TimeoutError')), timeout);
  const onAbort = () => ctl.abort(signal.reason);
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    const type = res.headers.get('content-type') || '';
    if (!type.includes('json')) throw new ApiError(`Unexpected response (${res.status}) from ${new URL(url, location.href).pathname}`, { status: res.status });
    const body = await res.json();
    if (!res.ok) throw new ApiError(body?.error || `HTTP ${res.status}`, { status: res.status });
    return body;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e?.name === 'TimeoutError' || ctl.signal.reason?.name === 'TimeoutError') throw new ApiError('The request timed out.');
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(e?.message || 'Network error', { cause: e });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const mem = new Map();
/** Cache a JSON request in memory + sessionStorage (reloads within the session avoid repeat calls). */
export async function cachedJson(url, opts = {}, { ttlMs = 30 * 60_000 } = {}) {
  const key = `mm:c:${url}`;
  const now = Date.now();
  const m = mem.get(key);
  if (m && now - m.t < ttlMs) return m.v;
  try {
    const s = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (s && now - s.t < ttlMs) { mem.set(key, s); return s.v; }
  } catch { /* storage unavailable */ }
  const v = await fetchJson(url, opts);
  const entry = { v, t: now };
  mem.set(key, entry);
  try { sessionStorage.setItem(key, JSON.stringify(entry)); } catch { /* quota / private mode */ }
  return v;
}

export function storeGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
}
export function storeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
