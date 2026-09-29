// "Ask for something specific" page: a short form that notifies Mark, who follows up personally.
export function requestPage({ head, nav, footer, esc, PEPTIDES, UPDATED }) {
  const title = 'Ask for a Specific Peptide or Stack';
  const description = 'Already know what you want? Tell us the peptide or stack you have in mind and we’ll reach out personally.';
  const chips = PEPTIDES.map((p) => `<button type="button" class="pchip" data-slug="${p.slug}" aria-pressed="false">${esc(p.name)}</button>`).join('');

  return `${head({ title, description, path: '/request/' })}
<style>
.req{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:36px;align-items:start}
@media (max-width:900px){.req{grid-template-columns:minmax(0,1fr)}}
.panel{border:1px solid var(--line);border-radius:24px;padding:24px;background:var(--surface)}
.field{display:grid;gap:7px;margin-bottom:16px}
.field label,.flabel{font-size:.9rem;color:var(--muted)}
.field label span,.flabel span{color:var(--faint)}
.field input,.field textarea,.field select{width:100%;font:inherit;font-size:1rem;color:var(--text);background:var(--bg2);border:1px solid var(--line-2);border-radius:14px;padding:14px 16px}
.field textarea{min-height:120px;resize:vertical}
.field input:focus,.field textarea:focus,.field select:focus{outline:none;border-color:var(--gold)}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:560px){.two{grid-template-columns:1fr}}
.pchips{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 18px}
.pchip{font:inherit;font-size:.88rem;border:1px solid var(--line-2);background:transparent;color:var(--muted);border-radius:999px;padding:8px 14px;cursor:pointer;transition:background .2s,color .2s,transform .1s}
.pchip:active{transform:scale(.96)}
.pchip[aria-pressed="true"]{background:var(--gold);color:var(--gold-ink);border-color:transparent}
.consent{display:flex;gap:12px;align-items:flex-start;font-size:.9rem;color:var(--muted);margin:6px 0 18px;cursor:pointer;line-height:1.45}
.consent input{flex:none;width:20px;height:20px;margin:1px 0 0;accent-color:var(--gold)}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.err{color:var(--rose);font-size:.9rem;margin:0 0 12px}
.err:empty{display:none}
.done{text-align:left}
.done h2{margin-bottom:10px}
.side h3{margin-top:0}
.side ol{margin:0;padding-left:1.2em;color:var(--muted)}
.side li{margin-bottom:10px}
</style>
${nav('ask')}
<main>
  <section class="hero" style="padding-bottom:20px"><div class="wrap">
    <p class="eyebrow">Ask directly</p>
    <h1>Know what you want? <em>Just ask.</em></h1>
    <p class="lede">Skip the quiz. Tell us the <strong>peptide or stack</strong> you have in mind, and Mark will reach out to you personally.</p>
  </div></section>

  <section style="padding-top:0"><div class="wrap req">
    <div class="panel" id="panel">
      <form id="req-form" novalidate>
        <p class="flabel">What are you interested in? <span>(tap any that apply)</span></p>
        <div class="pchips" id="pchips">${chips}</div>

        <div class="field"><label for="r-msg">Tell us more <span>(the stack you’re after, your goal, questions)</span></label>
          <textarea id="r-msg" maxlength="1500" placeholder="e.g. Looking for BPC-157 and TB-500 for a shoulder injury. Have used both before."></textarea></div>

        <div class="two">
          <div class="field"><label for="r-name">First name</label><input id="r-name" autocomplete="given-name" maxlength="80"></div>
          <div class="field"><label for="r-email">Email</label><input id="r-email" type="email" inputmode="email" autocomplete="email" maxlength="120"></div>
        </div>
        <div class="field"><label for="r-addr">Mailing address</label><textarea id="r-addr" rows="3" style="min-height:0" autocomplete="street-address" maxlength="300" placeholder="Street, city, state, ZIP"></textarea></div>
        <div class="hp" aria-hidden="true"><label for="r-company">Company</label><input id="r-company" tabindex="-1" autocomplete="off"></div>

        <label class="consent" for="r-consent"><input type="checkbox" id="r-consent"><span>I’m 18 or older, and it’s okay for Mark to contact me about this request.</span></label>
        <p class="err" id="r-err" role="alert"></p>
        <button class="btn primary lg" type="submit" id="r-submit">Send my request</button>
      </form>
    </div>

    <aside class="side">
      <div class="panel">
        <h3>What happens next</h3>
        <ol>
          <li>Your request goes straight to Mark.</li>
          <li>He’ll reach out to you personally.</li>
          <li>Nothing is shared with anyone else.</li>
        </ol>
        <p class="muted" style="margin:16px 0 0;font-size:.9rem">Not sure what you need? <a href="/">Take the 2-minute quiz</a> or browse <a href="/peptides/">Peptides Simplified</a>.</p>
      </div>
    </aside>
  </div></section>

  <section style="padding-top:0"><div class="wrap narrow">
    <p class="disclaimer">North Star Peptide is an educational resource. It isn’t medical advice, a diagnosis, or a prescription. Talk with a licensed clinician before starting anything. Last reviewed ${UPDATED}.</p>
  </div></section>
</main>
${footer}
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const chips = [...document.querySelectorAll('.pchip')];
  const pre = new URLSearchParams(location.search).get('p');
  chips.forEach((c) => {
    if (pre && c.dataset.slug === pre) c.setAttribute('aria-pressed', 'true');
    c.addEventListener('click', () => c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')));
  });
  // Prefill name/email from a previous visit on this device, if any.
  try { const s = JSON.parse(localStorage.getItem('nsp:last') || 'null'); if (s) { $('r-name').value = s.name || ''; $('r-email').value = s.email || ''; $('r-addr').value = s.address || ''; } } catch (e) {}

  $('req-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('r-err'), btn = $('r-submit');
    const peptides = chips.filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.textContent);
    const body = {
      peptides, message: $('r-msg').value.trim(),
      name: $('r-name').value.trim(), email: $('r-email').value.trim(), address: $('r-addr').value.trim(),
      consent: $('r-consent').checked, company: $('r-company').value
    };
    if (!peptides.length && body.message.length < 3) { err.textContent = 'Pick a peptide or tell us what you’re looking for.'; return; }
    if (!body.name) { err.textContent = 'Add your first name.'; $('r-name').focus(); return; }
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(body.email)) { err.textContent = 'Enter an email like you@example.com.'; $('r-email').focus(); return; }
    if (body.address.length < 8) { err.textContent = 'Add your mailing address.'; $('r-addr').focus(); return; }
    if (!body.consent) { err.textContent = 'Tick the box so Mark can contact you.'; return; }
    err.textContent = ''; btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await fetch('/api/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw 0;
      const panel = $('panel');
      panel.innerHTML = '<div class="done"><p class="eyebrow">Request sent</p><h2>Thanks, <span id="dn"></span>. Mark has it.</h2><p class="muted">He’ll reach out soon. In the meantime, you can read up in <a href="/peptides/">Peptides Simplified</a>.</p></div>';
      $('dn').textContent = body.name.split(' ')[0];
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (x) {
      btn.disabled = false; btn.textContent = 'Send my request';
      err.textContent = 'Couldn’t send right now. Please try again in a minute.';
    }
  });
})();
</script>
</body>
</html>
`;
}
