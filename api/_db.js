// Small Supabase REST helper (server-side only). Files starting with "_" are not exposed as routes.
//   SUPABASE_URL               e.g. https://abcd1234.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  the service_role / secret key (never expose to the browser)
import { randomBytes } from 'node:crypto';

export const SITE_URL = (process.env.SITE_URL || 'https://northstarpeptide.org').replace(/\/$/, '');
export const dbReady = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
export const newId = () => randomBytes(12).toString('base64url'); // 16 url-safe chars
export const ID_RE = /^[A-Za-z0-9_-]{16}$/;

// Only these quiz answers are stored, and only short lowercase codes (no free text).
const KEYS = ['goal', 'also', 'age', 'train', 'sleep', 'exp', 'route', 'flags'];
const CODE = /^[a-z0-9]{1,12}$/;
export function cleanAnswers(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const k of KEYS) {
    const v = raw[k];
    if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string' && CODE.test(x)).slice(0, 10);
    else if (typeof v === 'string' && CODE.test(v)) out[k] = v;
  }
  return out;
}

async function rest(path, init = {}) {
  // Accept the URL with or without a trailing slash or /rest/v1 on the end.
  const base = process.env.SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  // New-style keys (sb_secret_...) go in the apikey header only; legacy JWT keys also need Authorization.
  const auth = key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` };
  const r = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, ...auth, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${txt}`);
  return txt ? JSON.parse(txt) : null;
}

export const insertResult = (row) => rest('results', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
export const getResult = async (id) => (await rest(`results?id=eq.${encodeURIComponent(id)}&select=id,created_at,name,goal,answers&limit=1`))[0] || null;
export const deleteResult = (id) => rest(`results?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
