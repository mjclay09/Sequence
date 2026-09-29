// POST /api/request — "Ask for something specific". Emails Mark and (if set up) saves the request.
import { dbReady, newId, insertRequest } from './_db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const clipMulti = (v, n) => String(v ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const { RESEND_API_KEY, NOTIFY_TO, NOTIFY_FROM = 'North Star Peptide <onboarding@resend.dev>' } = process.env;
  if (!RESEND_API_KEY || !NOTIFY_TO) return res.status(500).json({ error: 'Email is not set up yet' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); } }
  if (!body || typeof body !== 'object' || JSON.stringify(body).length > 10_000) return res.status(400).json({ error: 'Bad request' });
  if (body.company) return res.status(200).json({ ok: true }); // honeypot

  const name = clip(body.name, 80), email = clip(body.email, 120), address = clipMulti(body.address, 300);
  const message = clipMulti(body.message, 1500);
  const peptides = (Array.isArray(body.peptides) ? body.peptides : []).slice(0, 25).map((p) => clip(p, 60)).filter(Boolean);
  if (!name || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Name and a valid email are required' });
  if (address.length < 8) return res.status(400).json({ error: 'Mailing address is required' });
  if (body.consent !== true) return res.status(400).json({ error: 'Consent is required' });
  if (!peptides.length && message.length < 3) return res.status(400).json({ error: 'Tell us what you’re looking for' });

  if (dbReady()) {
    try { await insertRequest({ id: newId(), name, email, address, peptides, message }); }
    catch (err) { console.error('Request save failed', err); }
  }

  const row = (k, v) => v ? `<tr><td style="padding:7px 12px 7px 0;color:#667;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:7px 0;color:#111">${v}</td></tr>` : '';
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5">
<div style="max-width:600px;margin:0 auto;padding:28px 20px">
  <p style="margin:0 0 4px;color:#889;font-size:12px;letter-spacing:.08em;text-transform:uppercase">North Star Peptide · specific request</p>
  <h1 style="margin:0 0 18px;font-size:24px;color:#111">${esc(name)} is asking about ${peptides.length ? esc(peptides.join(', ')) : 'something specific'}</h1>
  <div style="background:#fff;border-radius:12px;padding:18px 20px;margin-bottom:16px">
    ${message ? `<p style="margin:0;white-space:pre-wrap;color:#111">${esc(message)}</p>` : '<p style="margin:0;color:#99a">No message.</p>'}
  </div>
  <div style="background:#fff;border-radius:12px;padding:18px 20px">
    <table style="border-collapse:collapse;width:100%">
      ${row('Name', esc(name))}
      ${row('Email', `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}
      ${row('Address', `<span style="white-space:pre-line">${esc(address)}</span>`)}
      ${row('Peptides', esc(peptides.join(', ')))}
    </table>
  </div>
  <p style="color:#99a;font-size:12px;margin:18px 0 0">They confirmed they’re 18+ and okay with you contacting them. Hit reply to write back.</p>
</div></body></html>`;
  const text = [`Specific request from ${name}`, `Email: ${email}`, `Address: ${address.replace(/\s*\n\s*/g, ', ')}`,
    peptides.length && `Peptides: ${peptides.join(', ')}`, '', message].filter((x) => x !== false && x !== '').join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: NOTIFY_FROM, to: NOTIFY_TO.split(',').map((s) => s.trim()).filter(Boolean), reply_to: email,
        subject: `Request: ${name} · ${peptides.length ? peptides.slice(0, 3).join(', ') : 'specific ask'}`, html, text }),
    });
    if (!r.ok) { console.error('Resend error', r.status, await r.text()); return res.status(502).json({ error: 'Could not send' }); }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend request failed', err);
    return res.status(502).json({ error: 'Could not send' });
  }
}
