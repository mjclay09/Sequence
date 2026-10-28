// "Got a vial?" mixing demo for Peptides Simplified pages.
// Pick a vial size and a water amount, watch an animated walkthrough of mixing,
// and see how many mcg each syringe mark holds. Converts numbers only: no dose advice.
(() => {
  const root = document.querySelector('[data-mix]');
  if (!root) return;
  const name = root.dataset.name;
  const sizes = JSON.parse(root.dataset.sizes || '[]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Bigger vials are usually mixed with more water.
  const watersFor = (mg) => (mg >= 200 ? [5, 10, 20] : mg >= 50 ? [2, 3, 5] : [1, 2, 3]);
  let WATERS = [1, 2, 3];
  const st = { mg: null, ml: 2 };
  const $ = (s) => root.querySelector(s);
  const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('en-US', { maximumFractionDigits: d });

  root.innerHTML = `
    <div class="mix-pick">
      <p class="mix-label">1. Tap the vial you have</p>
      <div class="mix-chips" role="group" aria-label="Vial size">${sizes.map((s) => `<button type="button" class="mix-chip" data-mg="${s}" aria-pressed="false">${fmt(s, 2)} mg</button>`).join('')}</div>
      <div class="mix-water" hidden>
        <p class="mix-label">2. Water you add <span>(bacteriostatic water)</span></p>
        <div class="mix-chips" role="group" aria-label="Water amount" id="mx-waters"></div>
      </div>
    </div>
    <div class="mix-body" hidden>
      <div class="mix-stage">
        <svg viewBox="0 -40 360 270" role="img" aria-label="Animation of mixing a peptide vial">
          <defs>
            <linearGradient id="mx-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#93D5CD" stop-opacity=".55"/><stop offset="1" stop-color="#93D5CD" stop-opacity=".25"/></linearGradient>
            <linearGradient id="mx-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2C48D" stop-opacity=".55"/><stop offset="1" stop-color="#93D5CD" stop-opacity=".3"/></linearGradient>
          </defs>
          <g class="mx-vial" id="mx-wv">
            <rect x="45" y="104" width="50" height="10" rx="3" fill="#C9D4D2" opacity=".7"/>
            <rect x="50" y="114" width="40" height="8" fill="rgba(255,255,255,.08)"/>
            <rect x="40" y="122" width="60" height="92" rx="10" fill="rgba(255,255,255,.04)" stroke="rgba(196,222,217,.4)"/>
            <rect class="mx-liq" id="mx-wl" x="43" y="140" width="54" height="71" rx="8" fill="url(#mx-w)"/>
            <text x="70" y="226" text-anchor="middle" class="mx-cap">Bac water</text>
          </g>
          <g class="mx-vial" id="mx-pv">
            <rect x="245" y="104" width="50" height="10" rx="3" fill="#E2C48D" opacity=".75"/>
            <rect x="250" y="114" width="40" height="8" fill="rgba(255,255,255,.08)"/>
            <rect x="240" y="122" width="60" height="92" rx="10" fill="rgba(255,255,255,.04)" stroke="rgba(226,196,141,.45)"/>
            <rect class="mx-liq" id="mx-pl" x="243" y="140" width="54" height="71" rx="8" fill="url(#mx-p)"/>
            <rect id="mx-powder" x="250" y="198" width="40" height="11" rx="4" fill="#EDF2F0" opacity=".85"/>
            <text x="270" y="226" text-anchor="middle" class="mx-cap" id="mx-pname"></text>
          </g>
          <g id="mx-syr">
            <rect x="-7" y="-96" width="14" height="78" rx="3" fill="rgba(255,255,255,.06)" stroke="rgba(237,242,240,.55)"/>
            <rect class="mx-liq" id="mx-sl" x="-5" y="-62" width="10" height="42" rx="2" fill="#93D5CD" opacity=".7"/>
            <rect id="mx-plunger" x="-2" y="-128" width="4" height="40" fill="rgba(237,242,240,.6)"/>
            <rect x="-9" y="-130" width="18" height="4" rx="2" fill="rgba(237,242,240,.7)"/>
            <line x1="0" y1="-18" x2="0" y2="0" stroke="#EDF2F0" stroke-width="1.5"/>
          </g>
        </svg>
        <div class="mix-steps">
          <ol id="mx-steps">
            <li>Wipe both rubber tops with an alcohol swab.</li>
            <li>Draw <b class="mx-ml"></b> of bacteriostatic water into the syringe.</li>
            <li>Push the water in slowly, aimed down the inside wall of the vial, not straight onto the powder.</li>
            <li>Gently swirl or roll the vial until it is clear. Don’t shake it.</li>
            <li>Write the concentration and date on the label. Store it the way your pharmacy directs.</li>
          </ol>
          <button type="button" class="btn mix-play" id="mx-play">▶ Play the demo</button>
        </div>
      </div>
      <div class="mix-out">
        <dl class="mix-stats">
          <div><dt>Concentration</dt><dd id="mx-conc"></dd></div>
          <div><dt>Each unit holds</dt><dd id="mx-unit"></dd></div>
          <div><dt>10 units holds</dt><dd id="mx-ten"></dd></div>
        </dl>
        <table class="mix-table"><caption>On a 100-unit (1 mL) insulin syringe</caption>
          <thead><tr><th>Units drawn</th><th>Amount of ${name}</th></tr></thead><tbody id="mx-rows"></tbody></table>
        <p class="mix-note">This shows what each mark on the syringe holds after mixing. It is not a dose. Your dose should come from a licensed clinician.</p>
        <a class="btn primary" id="mx-calc" href="/calculator/">Work out your prescribed dose in the calculator →</a>
      </div>
    </div>`;
  $('#mx-pname').textContent = name.length > 14 ? name.slice(0, 13) + '…' : name;

  const rows = [5, 10, 20, 25, 30, 50];
  function render() {
    if (!st.mg) return;
    const conc = st.mg / st.ml; // mg per mL
    const perUnit = conc * 10;   // mcg per unit (1 unit = 0.01 mL)
    $('#mx-conc').textContent = fmt(conc, 2) + ' mg/mL';
    $('#mx-unit').textContent = fmt(perUnit, 1) + ' mcg';
    $('#mx-ten').textContent = perUnit * 10 >= 1000 ? fmt(perUnit / 100, 2) + ' mg' : fmt(perUnit * 10, 0) + ' mcg';
    $('#mx-rows').innerHTML = rows.map((u) => { const mcg = perUnit * u; return `<tr><td>${u} units</td><td>${mcg >= 1000 ? fmt(mcg / 1000, 2) + ' mg' : fmt(mcg, 0) + ' mcg'}</td></tr>`; }).join('');
    root.querySelectorAll('.mx-ml').forEach((e) => (e.textContent = st.ml + ' mL'));
    $('#mx-calc').href = `/calculator/?vial=${st.mg}&water=${st.ml}&name=${encodeURIComponent(name)}`;
    resetScene(true);
  }

  function waterChips() {
    $('#mx-waters').innerHTML = WATERS.map((w) => `<button type="button" class="mix-chip" data-ml="${w}" aria-pressed="${w === st.ml}">${w} mL</button>`).join('');
    root.querySelectorAll('[data-ml]').forEach((b) => b.addEventListener('click', () => {
      st.ml = +b.dataset.ml;
      root.querySelectorAll('[data-ml]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    }));
  }
  root.querySelectorAll('[data-mg]').forEach((b) => b.addEventListener('click', () => {
    st.mg = +b.dataset.mg;
    const next = watersFor(st.mg);
    if (next.join() !== WATERS.join()) { WATERS = next; st.ml = next[1]; }
    waterChips();
    root.querySelectorAll('[data-mg]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('.mix-water').hidden = false; $('.mix-body').hidden = false; render();
  }));
  // ---------- Animation ----------
  const syr = $('#mx-syr'), wl = $('#mx-wl'), pl = $('#mx-pl'), sl = $('#mx-sl'), powder = $('#mx-powder'), pv = $('#mx-pv'), plunger = $('#mx-plunger');
  const steps = [...root.querySelectorAll('#mx-steps li')];
  const frac = () => st.ml / WATERS[WATERS.length - 1]; // fill share of the syringe and vial, 3 mL = full
  let running = false;
  const set = (el, t) => { el.getAnimations().forEach((a) => a.cancel()); el.style.transform = t; };
  const go = (el, from, to, ms, extra = {}) => {
    const a = el.animate([{ transform: from }, { transform: to }], { duration: reduce ? 1 : ms, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards', ...extra });
    return a.finished.then(() => { el.style.transform = to; a.cancel(); });
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const mark = (i) => steps.forEach((s, k) => s.classList.toggle('on', k === i));

  function resetScene(soft) {
    if (running && soft) return;
    set(syr, 'translate(170px, 150px)');
    set(wl, 'scaleY(1)'); set(pl, 'scaleY(0)'); set(sl, 'scaleY(0)'); set(plunger, 'translateY(0px)'); set(pv, 'rotate(0deg)');
    powder.style.opacity = '.85'; mark(-1);
  }
  async function play() {
    if (running) return;
    running = true; $('#mx-play').disabled = true; resetScene();
    const f = frac();
    mark(0); await wait(900);
    mark(1);
    await go(syr, 'translate(170px, 150px)', 'translate(70px, 128px)', 700);
    await Promise.all([go(sl, 'scaleY(0)', `scaleY(${f})`, 1100), go(plunger, 'translateY(0px)', `translateY(${-30 * f}px)`, 1100), go(wl, 'scaleY(1)', `scaleY(${1 - 0.6 * f})`, 1100)]);
    mark(2);
    await go(syr, 'translate(70px, 128px)', 'translate(70px, 100px)', 400);
    await go(syr, 'translate(70px, 100px)', 'translate(270px, 100px)', 650);
    await go(syr, 'translate(270px, 100px)', 'translate(266px, 128px)', 450);
    const fade = powder.animate([{ opacity: .85 }, { opacity: .35 }], { duration: reduce ? 1 : 1500, fill: 'forwards' });
    await Promise.all([go(sl, `scaleY(${f})`, 'scaleY(0)', 1500), go(plunger, `translateY(${-30 * f}px)`, 'translateY(0px)', 1500), go(pl, 'scaleY(0)', `scaleY(${0.25 + 0.75 * f})`, 1500)]);
    await go(syr, 'translate(266px, 128px)', 'translate(335px, 150px)', 600);
    mark(3);
    if (!reduce) await pv.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0deg)' }], { duration: 1800, easing: 'ease-in-out' }).finished;
    powder.animate([{ opacity: .35 }, { opacity: 0 }], { duration: reduce ? 1 : 700, fill: 'forwards' }); fade.cancel(); powder.style.opacity = '0';
    await wait(800);
    mark(4); await wait(1400);
    running = false; $('#mx-play').disabled = false; $('#mx-play').textContent = '↻ Replay the demo';
  }
  $('#mx-play').addEventListener('click', play);
})();
