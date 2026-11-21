// MARS × MOON local server — zero dependencies (Node ≥ 18).
//   node server.mjs            → http://localhost:8080
// Serves ./public and two API routes:
//   GET /api/ephemeris?start=ISO&stop=ISO&steps=N[&verify=1]   (JPL Horizons proxy)
//   GET /api/apod                                             (NASA APOD proxy, uses NASA_API_KEY)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEphemeris, parseRequest, InputError, createCache } from './lib/horizons.mjs';
import { getApod } from './lib/apod.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');

// Minimal .env loader (no dependency): KEY=value lines.
const envFile = path.join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.txt': 'text/plain; charset=utf-8',
};

const ephemCache = createCache(300);
let apodCache = null;

function sendJson(res, status, obj, extra = {}) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(obj));
}

async function handleApi(url, res) {
  if (url.pathname === '/api/ephemeris') {
    let q;
    try { q = parseRequest(url.searchParams); } catch (e) {
      return sendJson(res, e instanceof InputError ? 400 : 500, { error: e.message });
    }
    const key = `${q.start.toISOString()}|${q.stop.toISOString()}|${q.steps}|${q.verify}`;
    const cached = ephemCache.get(key);
    if (cached) return sendJson(res, 200, { ...cached, meta: { ...cached.meta, cache: 'server-hit' } });
    try {
      const data = await getEphemeris(q);
      ephemCache.set(key, data);
      return sendJson(res, 200, data);
    } catch (e) {
      console.error('[horizons]', e.message);
      return sendJson(res, 502, { error: `Could not retrieve ephemeris from JPL Horizons: ${e.message}` });
    }
  }
  if (url.pathname === '/api/apod') {
    if (apodCache && Date.now() - apodCache.t < 3600_000) return sendJson(res, 200, apodCache.v);
    try {
      const v = await getApod(process.env.NASA_API_KEY);
      apodCache = { v, t: Date.now() };
      return sendJson(res, 200, v);
    } catch (e) {
      console.error('[apod]', e.message);
      if (apodCache) return sendJson(res, 200, { ...apodCache.v, meta: { ...apodCache.v.meta, stale: true } });
      return sendJson(res, 502, { error: `NASA APOD unavailable: ${e.message}` });
    }
  }
  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, nasaKey: process.env.NASA_API_KEY ? 'personal' : 'DEMO_KEY' });
  return sendJson(res, 404, { error: 'Unknown API route.' });
}

async function serveStatic(url, res) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error('not a file');
    const ext = path.extname(file).toLowerCase();
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': /\.(jpg|png|webp)$/.test(ext) ? 'public, max-age=86400' : 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(url, res);
    else await serveStatic(url, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
  }
}).listen(PORT, () => {
  console.log(`MARS × MOON explorer → http://localhost:${PORT}`);
  console.log(`NASA API key: ${process.env.NASA_API_KEY ? 'personal key from environment' : 'DEMO_KEY (rate-limited)'}`);
});
