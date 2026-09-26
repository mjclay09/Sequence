// POST /api/submit
// Receives a finished quiz from the page and emails it to you through Resend.
//
// Environment variables (set in Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  required  your Resend API key (re_...)
//   NOTIFY_TO       required  where results go, e.g. you@example.com (comma-separate for several)
//   NOTIFY_FROM     optional  sender, e.g. "North Star Peptide <hello@yourdomain.com>" once your domain is verified in Resend.
//                             Defaults to Resend's test sender, which can only deliver to your own Resend account email.

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
      return res.status(502).json({ error: 'Could not send email' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Resend request failed', err);
    return res.status(502).json({ error: 'Could not send email' });
  }
}
