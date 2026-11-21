// fetch with timeout + retry/backoff for transient failures (network errors, 429/502/503/504).
const TRANSIENT = new Set([429, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchRetry(url, { timeoutMs = 30000, retries = 2, headers } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers });
      if (TRANSIENT.has(res.status) && attempt < retries) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(800 * 2 ** attempt + Math.random() * 400);
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(800 * 2 ** attempt);
    }
  }
  const cause = lastErr?.cause?.code || lastErr?.name || '';
  throw new Error(`${lastErr?.message || 'fetch failed'}${cause ? ` (${cause})` : ''}`);
}
