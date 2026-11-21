// Netlify Function (v2) — reports that the API proxy is reachable (used by the Data Sources status panel).
export default async () => Response.json({ ok: true, nasaKey: process.env.NASA_API_KEY ? 'personal' : 'DEMO_KEY' });
export const config = { path: ['/api/health', '/explorer/api/health'] };
