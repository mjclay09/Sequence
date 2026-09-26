// Builds the "Peptides Simplified" section as static, SEO-friendly HTML.
//   node scripts/build-learn.mjs
// Set SITE_URL (e.g. https://yourdomain.com) to add canonical URLs and generate sitemap.xml:
//   SITE_URL=https://yourdomain.com node scripts/build-learn.mjs
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PEPTIDES, TIERS, TAGS, UPDATED, SITE_NAME, TAGLINE } from './peptides-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'peptides');
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const abs = (p) => (SITE_URL ? SITE_URL + p : p);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const bySlug = Object.fromEntries(PEPTIDES.map((p) => [p.slug, p]));

const CLS = (ch) => (/^(Cu|Aib|Nal|Nle|Dmt|Hyp)$/.test(ch) ? 'm' : 'DEKRH'.includes(ch) ? 'c' : 'STNQYCG'.includes(ch) ? 'p' : 'h');
function ribbon(seq, max = 18) {
  if (!seq) return '';
  const t = Array.isArray(seq) ? seq : seq.split('');
  const shown = t.slice(0, max).map((x) => `<i class="bead ${CLS(x)}">${esc(x)}</i>`).join('');
  return `<div class="ribbon" aria-hidden="true">${shown}${t.length > max ? `<i class="bead more">+${t.length - max}</i>` : ''}</div>`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,500..800&display=swap">`;

function head({ title, description, path, jsonld = [], ogType = 'website' }) {
  const canon = SITE_URL ? `<link rel="canonical" href="${abs(path)}">\n<meta property="og:url" content="${abs(path)}">` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#090E11">
${canon}
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${FONTS}
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta property="og:image" content="${abs('/assets/og-image.jpg')}">
<link rel="stylesheet" href="/peptides/styles.css">
<link rel="stylesheet" href="/assets/menu.css">
<script src="/assets/menu.js" defer></script>
${[{ '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, slogan: TAGLINE, logo: abs('/assets/icon-512.png'), ...(SITE_URL && { url: SITE_URL + '/' }) }, ...jsonld].map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>`;
}

const nav = (current) => `<header class="nav"><div class="wrap">
  <a class="brand" href="/" aria-label="North Star Peptide home"><img src="/assets/north-star-mark.png" srcset="/assets/north-star-mark@2x.png 2x" width="46" height="46" alt=""><span class="wordmark">North Star<small>Peptide</small></span></a>
  <nav class="nav-links" aria-label="Main">
    <a class="btn primary" href="/"><span class="lg-only">Find my stack</span><span class="sm">Quiz</span></a>
    <button class="menu-btn" type="button" aria-label="Open menu"><i></i><i></i><i></i></button>
  </nav>
</div></header>`;

const footer = `<footer><div class="wrap">
  <span><b style="color:var(--text);font-weight:500">${SITE_NAME}</b> · ${TAGLINE}<br>© ${new Date(UPDATED).getFullYear()} ${SITE_NAME}. Educational only, not medical advice.</span>
  <span><a href="/peptides/">Peptides Simplified</a> · <a href="/calculator/">Mixing calculator</a> · <a href="/">Find my stack</a></span>
</div></footer>`;

const DISCLAIMER = `<p class="disclaimer">This page explains published research in plain language. It is not medical advice, a diagnosis, or a recommendation to take anything, and it does not give dosing. Most peptides here are not FDA-approved, and products sold online vary widely in purity. Rules around peptides are changing, so check the current status and talk with a licensed clinician before starting anything. Last reviewed ${UPDATED}.</p>`;

const cta = `<div class="cta"><div><h2>Not sure where to start?</h2><p>Answer 8 quick questions and see which peptides the research points to for your goal.</p></div><a class="btn primary lg" href="/">Find my stack</a></div>`;

// ---------- Hub page ----------
const HUB_FAQ = [
  ['What is a peptide in simple terms?', 'A peptide is a short chain of amino acids, the same building blocks that make up protein. Most peptides are 2 to 50 amino acids long. Your body uses them as messengers that tell cells what to do, like "you are full" or "release growth hormone".'],
  ['What is the difference between a peptide and a protein?', 'Length. Chains of about 2 to 50 amino acids are usually called peptides. Longer chains that fold into complex shapes are called proteins.'],
  ['Are peptides steroids?', 'No. Steroids like testosterone are built from cholesterol and have a ring-shaped structure. Peptides are chains of amino acids and work by switching on specific receptors.'],
  ['Are peptides legal?', 'It depends on the peptide. Some, like semaglutide and tirzepatide, are FDA-approved prescription drugs. Collagen peptides are sold as supplements. Many others are not approved for human use. In 2026, HHS announced plans to let licensed compounding pharmacies make about 14 of them with a prescription, and the FDA is still reviewing several. Rules are changing, so check current status.'],
  ['Are peptides safe?', 'Approved peptides have large safety studies behind them. Many popular peptides have only been tested in animals, so their long-term safety in people is unknown. Products bought online as "research chemicals" are not quality-controlled and may not contain what the label says.'],
  ['Why do most peptides need to be injected?', 'Your stomach digests peptides the same way it digests food protein, breaking them apart before they can work. That is why most are injected or used as nasal sprays. A few, like oral semaglutide, are specially designed to survive digestion.'],
  ['Are peptides banned in sports?', 'Many are. The World Anti-Doping Agency bans growth hormone releasing peptides, BPC-157, TB-500 and others. Athletes who are tested should check the current WADA list before using anything.'],
];

function hub() {
  const tagChips = Object.entries(TAGS).map(([k, v]) => `<button class="chip" type="button" data-tag="${k}" aria-pressed="false">${esc(v)}</button>`).join('');
  const cards = PEPTIDES.map((p) => `<a class="card" href="/peptides/${p.slug}/" data-tags="${p.tags.join(' ')}" data-search="${esc([p.name, p.aka, p.short, ...p.tags.map((t) => TAGS[t])].join(' ').toLowerCase())}">
      <div class="card-head"><div><h3>${esc(p.name)}</h3><p class="aka">${esc(p.aka)}</p></div><span class="pill tier-${p.tier}">${TIERS[p.tier].label}</span></div>
      ${ribbon(p.seq, 12)}
      <p>${esc(clip(p.short, 150))}</p>
      <span class="more">What studies show →</span>
    </a>`).join('\n');

  const description = 'Your compass for peptide research. What is a peptide, why is everyone talking about them, and what does the research actually show? Plain-English guides to BPC-157, semaglutide, tirzepatide, GHK-Cu and more.';
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Peptides Simplified', description, dateModified: UPDATED, ...(SITE_URL && { url: abs('/peptides/') }),
      mainEntity: { '@type': 'ItemList', itemListElement: PEPTIDES.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, url: abs(`/peptides/${p.slug}/`) })) } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: HUB_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];

  return `${head({ title: 'Peptides Simplified: What Peptides Are and What the Research Shows', description, path: '/peptides/', jsonld })}
${nav('hub')}
<main>
  <section class="hero"><div class="wrap">
    <p class="eyebrow">Peptides Simplified</p>
    <h1>Peptides, explained <em>in plain English.</em></h1>
    <p class="lede"><strong>Your compass for peptide research.</strong> What a peptide is, why they are suddenly everywhere, and <strong>what studies actually show</strong> for ${PEPTIDES.length} of the most talked-about ones. No hype, no jargon.</p>
    <div style="display:flex;flex-wrap:wrap;gap:12px"><a class="btn primary lg" href="#library">Look up a peptide</a><a class="btn lg" href="#what">What is a peptide?</a><a class="btn lg" href="/calculator/">Mixing calculator</a></div>
  </div></section>

  <section id="what"><div class="wrap split">
    <div>
      <p class="eyebrow">The basics</p>
      <h2>What is a peptide?</h2>
      <p>Everything in your body that is made of protein, from muscle to hormones, is built from <strong>20 amino acids</strong>. Think of them as Lego bricks.</p>
      <p>Snap about <strong>2 to 50</strong> of those bricks into a chain and you get a <strong>peptide</strong>. Keep going past about 50 and the chain folds into a bigger shape called a <strong>protein</strong>.</p>
      <p>Most peptides in your body work as <strong>messengers</strong>. They carry short, specific instructions from one place to another: "you are full", "release growth hormone", "start repairing here". Oxytocin, the bonding hormone, is a peptide just 9 amino acids long.</p>
      <p class="muted">Because your stomach digests peptides like food, most peptide medicines are injected or sprayed in the nose rather than swallowed.</p>
    </div>
    <div class="diagram" aria-label="Amino acid, peptide and protein compared">
      <div class="scale">
        <div class="scale-row"><b>Amino acid</b><span>One building block</span><div class="ribbon"><i class="bead c">K</i></div></div>
        <div class="scale-row"><b>Peptide</b><span>A short chain, like oxytocin (9)</span><div class="ribbon"><i class="bead p">C</i><i class="bead p">Y</i><i class="bead h">I</i><i class="bead p">Q</i><i class="bead p">N</i><i class="bead p">C</i><i class="bead h">P</i><i class="bead h">L</i><i class="bead p">G</i></div></div>
        <div class="scale-row"><b>Protein</b><span>A long chain that folds up, often hundreds of blocks</span><div class="ribbon">${'<i class="bead h"> </i>'.repeat(4)}${'<i class="bead p"> </i>'.repeat(3)}${'<i class="bead c"> </i>'.repeat(3)}${'<i class="bead h"> </i>'.repeat(4)}<i class="bead more">+ hundreds</i></div></div>
      </div>
    </div>
  </div></section>

  <section id="why"><div class="wrap">
    <p class="eyebrow">Why now</p>
    <h2>Why is everyone talking about peptides?</h2>
    <p class="lede">Peptides have been used in medicine for a century, since insulin in the 1920s. Four things pushed them into the mainstream.</p>
    <div class="reasons">
      <div class="reason"><h3>The GLP-1 effect</h3><p>Semaglutide and tirzepatide, both peptides, produced weight loss of 15 to 20% in large trials. That success made people curious about every other peptide.</p></div>
      <div class="reason"><h3>Rules are loosening</h3><p>In February 2026, HHS announced plans to let licensed compounding pharmacies make about 14 popular peptides, like BPC-157, with a prescription. The FDA reviewed several of them in July 2026.</p></div>
      <div class="reason"><h3>Podcasts and social media</h3><p>Athletes, biohackers and longevity influencers talk about peptides for healing, sleep and aging, often well ahead of the research.</p></div>
      <div class="reason"><h3>They are targeted</h3><p>Each peptide flips a specific switch in the body. That precision is appealing compared with broad supplements, but it also means effects can be strong.</p></div>
    </div>
  </div></section>

  <section id="evidence"><div class="wrap">
    <p class="eyebrow">Reading the research</p>
    <h2>How strong is the evidence?</h2>
    <p class="lede">Every peptide here gets one of three grades. Each finding is also tagged by where it was seen: in <strong>people</strong>, in <strong>animals</strong>, or in a <strong>lab dish</strong>. Results in rats often do not carry over to people.</p>
    <div class="tiers">${Object.entries(TIERS).map(([k, t]) => `<div><span class="pill tier-${k}">${t.label}</span><p>${esc(t.blurb)}</p></div>`).join('')}</div>
  </div></section>

  <section id="library"><div class="wrap">
    <p class="eyebrow">The library</p>
    <h2>Look up a peptide</h2>
    <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="q" type="search" aria-label="Search peptides" placeholder="Search by name or goal, like BPC-157 or sleep" autocomplete="off"></div>
    <div class="chips" role="group" aria-label="Filter by goal"><button class="chip" type="button" data-tag="" aria-pressed="true">All</button>${tagChips}</div>
    <div class="grid" id="grid">
${cards}
    </div>
    <p class="empty" id="empty" hidden>No peptides match that. Try a different name or goal.</p>
  </div></section>

  <section id="faq"><div class="wrap narrow faq">
    <p class="eyebrow">Questions</p>
    <h2>Peptide FAQ</h2>
    ${HUB_FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n    ')}
  </div></section>

  <section><div class="wrap">${cta}${DISCLAIMER}</div></section>
</main>
${footer}
<script>
(() => {
  const q = document.getElementById('q'), cards = [...document.querySelectorAll('#grid .card')], chips = [...document.querySelectorAll('.chip')], empty = document.getElementById('empty');
  let tag = '';
  const apply = () => {
    const term = q.value.trim().toLowerCase(); let n = 0;
    cards.forEach(c => { const ok = (!tag || c.dataset.tags.split(' ').includes(tag)) && (!term || c.dataset.search.includes(term)); c.hidden = !ok; if (ok) n++; });
    empty.hidden = n > 0;
  };
  q.addEventListener('input', apply);
  chips.forEach(ch => ch.addEventListener('click', () => { tag = ch.dataset.tag; chips.forEach(c => c.setAttribute('aria-pressed', c === ch)); apply(); }));
})();
</script>
</body>
</html>
`;
}

// ---------- Peptide page ----------
function page(p) {
  const tagWord = { human: 'In people', animal: 'In animals', lab: 'In the lab' };
  const faq = [
    [`What is ${p.name}?`, `${p.short} ${p.what}`],
    [`What does the research say about ${p.name}?`, p.studies.map(([, t]) => t).join(' ')],
    [`Is ${p.name} FDA approved?`, p.legal],
    [`What are the side effects of ${p.name}?`, p.cautions.join(' ')],
  ];
  const title = `${p.name}: What It Is and What Studies Show, in Plain English`;
  const description = clip(`${p.name} explained simply. ${p.short}`, 158);
  const path = `/peptides/${p.slug}/`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'MedicalWebPage', name: title, description, dateModified: UPDATED, ...(SITE_URL && { url: abs(path) }),
      about: { '@type': 'Drug', name: p.name, alternateName: p.aka }, audience: { '@type': 'PeopleAudience', audienceType: 'Patient' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Peptides Simplified', item: abs('/peptides/') },
      { '@type': 'ListItem', position: 2, name: p.name, item: abs(path) } ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const related = (p.related || []).filter((s) => bySlug[s]).map((s) => `<a href="/peptides/${s}/">${esc(bySlug[s].name)}</a>`).join('');

  return `${head({ title, description, path, jsonld, ogType: 'article' })}
${nav()}
<main><article class="wrap narrow article" style="padding-block:40px 20px">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/peptides/">Peptides Simplified</a><span aria-hidden="true">/</span><span>${esc(p.name)}</span></nav>
  <p class="eyebrow">${p.tags.map((t) => esc(TAGS[t])).join(' · ')}</p>
  <h1>${esc(p.name)}, <em>simplified.</em></h1>
  <p class="muted" style="margin:-8px 0 18px">Also called ${esc(p.aka)}</p>
  <span class="pill tier-${p.tier}">${TIERS[p.tier].label}</span>
  <p class="short">${esc(p.short)}</p>
  ${ribbon(p.seq, 20)}
  <dl class="facts">
    <div><dt>Size</dt><dd>${esc(p.len)}</dd></div>
    <div><dt>How it is taken</dt><dd>${esc(p.routes)}</dd></div>
    <div><dt>Status</dt><dd>${esc(p.status)}</dd></div>
  </dl>

  <h2>What is it?</h2>
  <p>${esc(p.what)}</p>

  <h2>What studies show</h2>
  <ul class="findings">${p.studies.map(([k, t]) => `<li><span class="tag ${k}">${tagWord[k]}</span><span>${esc(t)}</span></li>`).join('')}</ul>

  <h2>What we don’t know yet</h2>
  <ul class="list">${p.unknown.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>

  <h2>Side effects and cautions</h2>
  <ul class="list">${p.cautions.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>

  <h2>Is it legal?</h2>
  <p class="legal">${esc(p.legal)}</p>

  <h2>Common questions</h2>
  <div class="faq">${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>

  ${related ? `<h2>Related peptides</h2><div class="related">${related}</div>` : ''}

  <div style="margin-top:48px">${cta}</div>
  ${DISCLAIMER}
</article></main>
${footer}
</body>
</html>
`;
}

import { calcPage } from './calc-page.mjs';
// ---------- Write ----------
mkdirSync(OUT, { recursive: true });
for (const d of readdirSync(OUT, { withFileTypes: true })) if (d.isDirectory() && !bySlug[d.name]) rmSync(join(OUT, d.name), { recursive: true });
writeFileSync(join(OUT, 'index.html'), hub());
mkdirSync(join(ROOT, 'calculator'), { recursive: true });
writeFileSync(join(ROOT, 'calculator', 'index.html'), calcPage({ head, nav, footer, esc, abs, SITE_URL, UPDATED }));
for (const p of PEPTIDES) {
  mkdirSync(join(OUT, p.slug), { recursive: true });
  writeFileSync(join(OUT, p.slug, 'index.html'), page(p));
}
writeFileSync(join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n${SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml\n` : ''}`);
if (SITE_URL) {
  const urls = ['/', '/peptides/', '/calculator/', ...PEPTIDES.map((p) => `/peptides/${p.slug}/`)];
  writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`);
} else if (existsSync(join(ROOT, 'sitemap.xml'))) {
  console.warn('SITE_URL not set: left existing sitemap.xml untouched.');
} else {
  console.warn('SITE_URL not set: skipped canonical URLs and sitemap.xml. Run with SITE_URL=https://yourdomain.com');
}
console.log(`Built ${PEPTIDES.length} peptide pages + hub.`);
