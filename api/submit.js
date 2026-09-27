// POST /api/submit
// Receives a finished quiz from the page and emails it to you through Resend.
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  required  your Resend API key (re_...)
//   NOTIFY_TO       required  where results go, e.g. you@example.com (comma-separate for several)
//   NOTIFY_FROM     optional  sender, e.g. "North Star Peptide <hello@northstarpeptide.org>" once your domain is verified in Resend.
//                             Defaults to Resend's test sender, which can only deliver to your own Resend account email.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  optional  saves each result and emails the person a private link (see api/_db.js)

import { dbReady, newId, cleanAnswers, insertResult, SITE_URL } from './_db.js';

const MAX_BODY = 20_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (v, n) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const clipMulti = (v, n) => String(v ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { RESEND_API_KEY, NOTIFY_TO, NOTIFY_FROM = 'North Star Peptide <onboarding@resend.dev>' } = process.env;
  if (!RESEND_API_KEY || !NOTIFY_TO) {
    console.error('Missing RESEND_API_KEY or NOTIFY_TO');
    return res.status(500).json({ error: 'Email is not set up yet' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    if (body.length > MAX_BODY) return res.status(413).json({ error: 'Too large' });
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Missing body' });
  if (JSON.stringify(body).length > MAX_BODY) return res.status(413).json({ error: 'Too large' });

  // Honeypot: real people never fill the hidden "company" field. Pretend success for bots.
  if (body.company) return res.status(200).json({ ok: true });

  const name = clip(body.name, 80);
  const email = clip(body.email, 120);
  const address = clipMulti(body.address, 300);
  const goal = clip(body.goal, 60);
  if (!name || !EMAIL_RE.test(email) || address.length < 8) return res.status(400).json({ error: 'Name, a valid email and a mailing address are required' });
  if (body.consent !== true) return res.status(400).json({ error: 'Consent is required' });

  const answers = (Array.isArray(body.answers) ? body.answers : []).slice(0, 12)
    .map((x) => ({ q: clip(x?.q, 120), a: clip(x?.a, 300) }));
  const stack = (Array.isArray(body.stack) ? body.stack : []).slice(0, 5)
    .map((x) => ({ name: clip(x?.name, 60), tier: clip(x?.tier, 40), routes: clip(x?.routes, 80), why: clip(x?.why, 300) }));
  const notes = (Array.isArray(body.notes) ? body.notes : []).slice(0, 5).map((n) => clip(n, 300));

  // Save the result so the person can come back to it through a private link.
  let id = null;
  if (dbReady()) {
    try {
      id = newId();
      await insertResult({ id, name, email, address, goal, answers: cleanAnswers(body.raw), answer_labels: answers, stack, notes });
    } catch (err) {
      console.error('Save failed', err);
      id = null;
    }
  }
  const link = id ? `${SITE_URL}/r/${id}` : '';

  const when = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' });

  const row = (k, v) => `<tr><td style="padding:8px 12px 8px 0;color:#667;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:8px 0;color:#111">${v}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5">
<div style="max-width:600px;margin:0 auto;padding:28px 20px">
  <p style="margin:0 0 4px;color:#889;font-size:12px;letter-spacing:.08em;text-transform:uppercase">North Star Peptide · new match · ${esc(when)}</p>
  <h1 style="margin:0 0 20px;font-size:24px;color:#111">${esc(name)} wants a ${esc(goal.toLowerCase())} stack</h1>
  <div style="background:#fff;border-radius:12px;padding:18px 20px;margin-bottom:16px">
    <table style="border-collapse:collapse;width:100%">
      ${row('Name', esc(name))}
      ${row('Email', `<a href="mailto:${esc(email)}">${esc(email)}</a>`)}
      ${row('Address', esc(address).replace(/\n/g, '<br>'))}
    </table>
  </div>
  <div style="background:#fff;border-radius:12px;padding:18px 20px;margin-bottom:16px">
    <h2 style="margin:0 0 10px;font-size:16px;color:#111">Their stack</h2>
    ${stack.map((s, i) => `<div style="padding:10px 0;border-top:${i ? '1px solid #eee' : '0'}">
      <div style="font-weight:600;color:#111">${i + 1}. ${esc(s.name)} <span style="font-weight:400;color:#889;font-size:13px">· ${esc(s.tier)} · ${esc(s.routes)}</span></div>
      ${s.why ? `<div style="color:#445;font-size:14px">${esc(s.why)}</div>` : ''}
    </div>`).join('') || '<p style="margin:0;color:#99a">No stack matched.</p>'}
    ${notes.map((n) => `<p style="margin:10px 0 0;padding:10px 12px;background:#fdf1ee;border-radius:8px;color:#8a3b2a;font-size:13px">${esc(n)}</p>`).join('')}
  </div>
  <div style="background:#fff;border-radius:12px;padding:18px 20px">
    <h2 style="margin:0 0 6px;font-size:16px;color:#111">Their answers</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${answers.map((x) => row(x.q, esc(x.a))).join('')}</table>
  </div>
  ${link ? `<p style="margin:16px 0 0;font-size:14px"><a href="${link}" style="color:#0b6e63">Open their saved results</a></p>` : ''}
  <p style="color:#99a;font-size:12px;margin:18px 0 0">They agreed to share these answers with you. Hit reply to write back to ${esc(name)}.</p>
  <p style="color:#99a;font-size:12px;margin:8px 0 0">North Star Peptide · Your compass for peptide research.</p>
</div></body></html>`;

  const text = [
    `New North Star Peptide match: ${name} (${goal})`,
    `Email: ${email}`,
    `Address: ${address}`,
    '',
    'Stack:',
    ...stack.map((s, i) => `${i + 1}. ${s.name} (${s.tier}, ${s.routes})${s.why ? ' - ' + s.why : ''}`),
    ...(notes.length ? ['', 'Notes:', ...notes] : []),
    '',
    'Answers:',
    ...answers.map((x) => `- ${x.q} ${x.a}`),
  ].join('\n');

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: NOTIFY_TO.split(',').map((s) => s.trim()).filter(Boolean),
        reply_to: email,
        subject: `New stack match: ${name} · ${goal}`,
        html,
        text,
      }),
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text());
      return res.status(502).json({ error: 'Could not send email', id });
    }
    let emailedLink = false;
    if (link) emailedLink = await sendPersonalLink({ RESEND_API_KEY, from: NOTIFY_FROM, replyTo: NOTIFY_TO.split(',')[0].trim(), name, email, goal, stack, link });
    return res.status(200).json({ ok: true, id, emailedLink });
  } catch (err) {
    console.error('Resend request failed', err);
    return res.status(502).json({ error: 'Could not send email' });
  }
}

// The person's own copy: their stack and a private link back to it.
async function sendPersonalLink({ RESEND_API_KEY, from, replyTo, name, email, goal, stack, link }) {
  const html = `<!doctype html><html><body style="margin:0;background:#090E11;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#EDF2F0">
<div style="max-width:560px;margin:0 auto;padding:32px 22px">
  <p style="margin:0 0 6px;color:#E2C48D;font-size:12px;letter-spacing:.14em;text-transform:uppercase">North Star Peptide</p>
  <h1 style="margin:0 0 14px;font-size:26px;line-height:1.15">${esc(name)}, here’s your ${esc(goal.toLowerCase())} stack</h1>
  <p style="margin:0 0 20px;color:#93A4A1">Based on the research, this may be a stack worth considering. Keep this email: the button below opens your saved results anytime, and lets you retake the quiz with your answers filled in.</p>
  <div style="border:1px solid #26343a;border-radius:14px;padding:6px 18px;margin-bottom:22px">
    ${stack.map((s, i) => `<div style="padding:12px 0;border-top:${i ? '1px solid #1d282d' : '0'}"><b style="color:#EDF2F0">${esc(s.name)}</b><span style="color:#61726F;font-size:13px"> · ${esc(s.tier)}</span>${s.why ? `<div style="color:#93A4A1;font-size:14px">${esc(s.why)}</div>` : ''}</div>`).join('')}
  </div>
  <p style="margin:0 0 26px"><a href="${link}" style="display:inline-block;background:#E2C48D;color:#191307;text-decoration:none;font-weight:600;padding:14px 22px;border-radius:999px">Open my results</a></p>
  <p style="margin:0;color:#61726F;font-size:12px">This link is private to you. Anyone you forward it to can see your results. Educational only, not medical advice. Talk with a licensed clinician before starting anything.<br>North Star Peptide · Your compass for peptide research.</p>
</div></body></html>`;
  const text = `${name}, here's your ${goal.toLowerCase()} stack from North Star Peptide:\n\n${stack.map((s, i) => `${i + 1}. ${s.name} (${s.tier})`).join('\n')}\n\nOpen your saved results anytime: ${link}\n\nEducational only, not medical advice.`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], reply_to: replyTo, subject: 'Your North Star Peptide stack', html, text }),
    });
    if (!r.ok) console.error('Personal email failed', r.status, await r.text());
    return r.ok;
  } catch (err) {
    console.error('Personal email failed', err);
    return false;
  }
}
