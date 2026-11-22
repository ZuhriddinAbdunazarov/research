import net from 'node:net';
// Node's default happy-eyeballs attempt timeout (250 ms per address) is too short for slow
// gateways such as api.nasa.gov on some networks; give each address 2.5 s before trying the next.
net.setDefaultAutoSelectFamilyAttemptTimeout?.(2500);

// fetch with timeout + retry/backoff for transient failures (network errors, 429/500/502/503/504).
const TRANSIENT = new Set([429, 500, 502, 503, 504]);
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
