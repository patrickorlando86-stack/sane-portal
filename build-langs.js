/* Genera le versioni di lingua della homepage a partire da langs-data.js
   (testi IT/ES/EN + template dei blocchi generati).
   - index.html    : sorgente E output IT (i blocchi <!-- @gen:x --> e i testi
                     data-k vengono ri-riempiti in italiano)
   - es/index.html : output ES
   - en/index.html : output EN
   Uso: node build-langs.js
   NB: per modificare i contenuti si edita SOLO langs-data.js e si ri-lancia. */
'use strict';
const fs = require('fs');
const { T, TPL } = require('./langs-data.js');

const src = fs.readFileSync('index.html', 'utf8');

const META = {
  es: { label: 'ES', ogLocale: 'es_ES',
    title: 'S.A.N.E. Italia — Educación Alimentaria y Seguridad Alimentaria en las Escuelas',
    desc: 'S.A.N.E. Italia es la red de biólogos nutricionistas que lleva educación alimentaria y seguridad alimentaria a las escuelas. El programa «Mangiare Bene, Crescere Meglio» y el juego educativo «Il Piatto Sano» (web y Android), con gestión personalizada de los 14 alérgenos UE. Dirección científica Dott.ssa Serafina Cardaci, Bióloga Nutricionista.',
    ogTitle: 'S.A.N.E. Italia — Educación Alimentaria en las Escuelas',
    ogDesc: 'La red de biólogos nutricionistas para la educación y la seguridad alimentaria en las escuelas. Programa «Mangiare Bene, Crescere Meglio» y juego educativo «Il Piatto Sano» (web y Android) con gestión personalizada de los 14 alérgenos UE.',
    twDesc: 'Red de biólogos nutricionistas para educación y seguridad alimentaria en las escuelas. Programa «Mangiare Bene, Crescere Meglio» y juego «Il Piatto Sano» (web y Android), gestión 14 alérgenos UE.',
    skip: 'Ir al contenido',
    gplay: ['es_es', 'es', 'Disponible en Google Play'] },
  en: { label: 'EN', ogLocale: 'en_US',
    title: 'S.A.N.E. Italia — Food Education and Food Safety in Schools',
    desc: 'S.A.N.E. Italia is the network of nutritionist biologists bringing food education and food safety into schools. The «Mangiare Bene, Crescere Meglio» programme and «Il Piatto Sano» educational game (web and Android), with personalised management of the 14 EU allergens. Scientific direction by Dott.ssa Serafina Cardaci, Nutritionist Biologist.',
    ogTitle: 'S.A.N.E. Italia — Food Education in Schools',
    ogDesc: 'The network of nutritionist biologists for food education and safety in schools. The «Mangiare Bene, Crescere Meglio» programme and «Il Piatto Sano» game (web and Android) with management of the 14 EU allergens.',
    twDesc: 'Network of nutritionist biologists for food education and safety in schools. «Mangiare Bene, Crescere Meglio» programme and «Il Piatto Sano» game (web and Android), 14 EU allergens management.',
    skip: 'Skip to content',
    gplay: ['en_us', 'en', 'Get it on Google Play'] }
};

function rep(s, from, to, key) {
  if (!s.includes(from)) { console.warn('  ⚠ NON trovato:', key); return s; }
  return s.split(from).join(to);
}
function repRe(s, re, fn, key) {
  if (!re.test(s)) { console.warn('  ⚠ regex NON trovata:', key); return s; }
  return s.replace(re, fn);
}

function fill(lang) {
  const t = T[lang];
  let o = src;
  console.log('Genero versione', lang.toUpperCase());

  // 1. blocchi generati (marcatori @gen)
  o = o.replace(/<!-- @gen:([\w-]+) -->[\s\S]*?<!-- @\/gen:\1 -->/g, (m, name) => {
    if (!TPL[name]) { console.warn('  ⚠ template mancante:', name); return m; }
    return `<!-- @gen:${name} -->${TPL[name](t)}<!-- @/gen:${name} -->`;
  });

  // 2. testi statici data-k (nav0..navN → t.nav[N], altrimenti t[chiave])
  o = o.replace(/<([a-zA-Z0-9]+)((?:[^>]*?)\bdata-k="([\w-]+)"(?:[^>]*?))>[\s\S]*?<\/\1>/g,
    (m, tag, attrs, key) => {
      let v;
      if (/^nav\d+$/.test(key)) v = t.nav[+key.slice(3)];
      else v = t[key];
      if (typeof v !== 'string') { console.warn('  ⚠ chiave mancante in ' + lang + ':', key); return m; }
      return `<${tag}${attrs}>${v}</${tag}>`;
    });

  // 3. FAQ-LD rigenerato nella lingua target
  const faqJson = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
  const faqBlock = '<!-- FAQ-LD -->\n<script type="application/ld+json">\n' +
    JSON.stringify(faqJson, null, 2) + '\n</' + 'script>\n<!-- /FAQ-LD -->';
  o = repRe(o, /<!-- FAQ-LD -->[\s\S]*?<!-- \/FAQ-LD -->/, () => faqBlock, 'faq-ld');

  if (lang === 'it') return o;

  // 4. head / meta per es-en
  const m = META[lang];
  o = rep(o, '<html lang="it">', '<html lang="' + lang + '">', 'html-lang');
  o = rep(o, '<link rel="canonical" href="https://sane-italia.it/">',
             '<link rel="canonical" href="https://sane-italia.it/' + lang + '/">', 'canonical');
  o = rep(o, '<meta property="og:url" content="https://sane-italia.it/">',
             '<meta property="og:url" content="https://sane-italia.it/' + lang + '/">', 'og:url');
  o = repRe(o, /<title>[\s\S]*?<\/title>/, () => '<title>' + m.title + '</title>', 'title');
  o = repRe(o, /(<meta name="description" content=")[^"]*(">)/, (x, a, b) => a + m.desc + b, 'description');
  o = repRe(o, /(<meta property="og:title" content=")[^"]*(">)/, (x, a, b) => a + m.ogTitle + b, 'og:title');
  o = repRe(o, /(<meta property="og:description" content=")[^"]*(">)/, (x, a, b) => a + m.ogDesc + b, 'og:description');
  o = repRe(o, /(<meta property="og:locale" content=")[^"]*(">)/, (x, a, b) => a + m.ogLocale + b, 'og:locale');
  o = repRe(o, /(<meta name="twitter:title" content=")[^"]*(">)/, (x, a, b) => a + m.ogTitle + b, 'twitter:title');
  o = repRe(o, /(<meta name="twitter:description" content=")[^"]*(">)/, (x, a, b) => a + m.twDesc + b, 'twitter:description');

  // 5. skip-link, badge Google Play, selettore lingua
  o = rep(o, '>Vai al contenuto</a>', '>' + m.skip + '</a>', 'skip-link');
  o = repRe(o, /<img id="gplay-badge"[^>]*>/, () =>
    `<img id="gplay-badge" src="https://play.google.com/intl/${m.gplay[0]}/badges/static/images/badges/${m.gplay[1]}_badge_web_generic.png" alt="${m.gplay[2]}" loading="lazy">`, 'gplay');
  o = rep(o, 'class="gplay" aria-label="Disponibile su Google Play"',
             'class="gplay" aria-label="' + m.gplay[2] + '"', 'gplay-aria');
  o = rep(o, '<a class="lb active" href="/">IT</a>', '<a class="lb" href="/">IT</a>', 'sw-it');
  o = rep(o, '<a class="lb" href="/' + lang + '/">' + m.label + '</a>',
             '<a class="lb active" href="/' + lang + '/">' + m.label + '</a>', 'sw-active');

  return o;
}

// IT: index.html viene ri-riempito in place
fs.writeFileSync('index.html', fill('it'), 'utf8');
console.log('  ✓ scritto index.html');

for (const lang of ['es', 'en']) {
  const out = fill(lang);
  fs.mkdirSync(lang, { recursive: true });
  fs.writeFileSync(lang + '/index.html', out, 'utf8');
  console.log('  ✓ scritto ' + lang + '/index.html (' + out.length + ' byte)');
}
console.log('Fatto.');
