/* Genera le versioni di lingua di index.html (es/index.html, en/index.html)
   a partire da index.html (versione IT = sorgente).
   Uso: node build-langs.js
   NB: modifica i contenuti SOLO in index.html (oggetto T) e ri-lancia. */
const fs = require('fs');

const src = fs.readFileSync('index.html', 'utf8');
const T = eval('(' + src.match(/const T = (\{[\s\S]*?\n\});/)[1] + ')');

// elementi col testo statico pre-riempito (key -> tag di chiusura)
const STATIC = { hero_eyebrow:'p', hero_title:'h1', hero_sub:'p',
  chi_eyebrow:'p', chi_title:'h2', chi_p1:'p', chi_p2:'p',
  method_title:'h2', game_title:'h2' };

const META = {
  es: { label:'ES', ogLocale:'es_ES',
    title:'S.A.N.E. Italia — Educación Alimentaria y Seguridad Alimentaria en las Escuelas',
    desc:'S.A.N.E. Italia es la red de biólogos nutricionistas que lleva educación alimentaria y seguridad alimentaria a las escuelas. El programa «Mangiare Bene, Crescere Meglio» y el juego educativo «Il Piatto Sano» (web y Android), con gestión personalizada de los 14 alérgenos UE. Dirección científica Dott.ssa Serafina Cardaci, Bióloga Nutricionista.',
    ogTitle:'S.A.N.E. Italia — Educación Alimentaria en las Escuelas',
    ogDesc:'La red de biólogos nutricionistas para la educación y la seguridad alimentaria en las escuelas. Programa «Mangiare Bene, Crescere Meglio» y juego educativo «Il Piatto Sano» (web y Android) con gestión personalizada de los 14 alérgenos UE.',
    twDesc:'Red de biólogos nutricionistas para educación y seguridad alimentaria en las escuelas. Programa «Mangiare Bene, Crescere Meglio» y juego «Il Piatto Sano» (web y Android), gestión 14 alérgenos UE.' },
  en: { label:'EN', ogLocale:'en_US',
    title:'S.A.N.E. Italia — Food Education and Food Safety in Schools',
    desc:'S.A.N.E. Italia is the network of nutritionist biologists bringing food education and food safety into schools. The «Mangiare Bene, Crescere Meglio» programme and «Il Piatto Sano» educational game (web and Android), with personalised management of the 14 EU allergens. Scientific direction by Dott.ssa Serafina Cardaci, Nutritionist Biologist.',
    ogTitle:'S.A.N.E. Italia — Food Education in Schools',
    ogDesc:'The network of nutritionist biologists for food education and safety in schools. The «Mangiare Bene, Crescere Meglio» programme and «Il Piatto Sano» game (web and Android) with management of the 14 EU allergens.',
    twDesc:'Network of nutritionist biologists for food education and safety in schools. «Mangiare Bene, Crescere Meglio» programme and «Il Piatto Sano» game (web and Android), 14 EU allergens management.' }
};

function rep(s, from, to, key) {
  if (!s.includes(from)) { console.warn('  ⚠ NON trovato:', key); return s; }
  return s.split(from).join(to);
}
function repRe(s, re, fn, key) {
  if (!re.test(s)) { console.warn('  ⚠ regex NON trovata:', key); return s; }
  return s.replace(re, fn);
}

for (const lang of ['es', 'en']) {
  const m = META[lang];
  let o = src;
  console.log('Genero', lang + '/index.html');

  o = rep(o, '<html lang="it">', '<html lang="' + lang + '">', 'html-lang');
  o = rep(o, '<link rel="canonical" href="https://sane-italia.it/">',
             '<link rel="canonical" href="https://sane-italia.it/' + lang + '/">', 'canonical');
  o = rep(o, '<meta property="og:url" content="https://sane-italia.it/">',
             '<meta property="og:url" content="https://sane-italia.it/' + lang + '/">', 'og:url');

  o = repRe(o, /<title>[\s\S]*?<\/title>/, () => '<title>' + m.title + '</title>', 'title');
  o = repRe(o, /(<meta name="description" content=")[^"]*(">)/, (x,a,b)=>a+m.desc+b, 'description');
  o = repRe(o, /(<meta property="og:title" content=")[^"]*(">)/, (x,a,b)=>a+m.ogTitle+b, 'og:title');
  o = repRe(o, /(<meta property="og:description" content=")[^"]*(">)/, (x,a,b)=>a+m.ogDesc+b, 'og:description');
  o = repRe(o, /(<meta property="og:locale" content=")[^"]*(">)/, (x,a,b)=>a+m.ogLocale+b, 'og:locale');
  o = repRe(o, /(<meta name="twitter:title" content=")[^"]*(">)/, (x,a,b)=>a+m.ogTitle+b, 'twitter:title');
  o = repRe(o, /(<meta name="twitter:description" content=")[^"]*(">)/, (x,a,b)=>a+m.twDesc+b, 'twitter:description');

  // testo statico nel body -> lingua target
  for (const [key, tag] of Object.entries(STATIC)) {
    o = rep(o, 'data-k="' + key + '">' + T.it[key] + '</' + tag + '>',
               'data-k="' + key + '">' + T[lang][key] + '</' + tag + '>', 'static:' + key);
  }

  // init render + variabile lingua
  o = rep(o, "render('it');", "render('" + lang + "');", 'init-render');
  o = rep(o, "let lang = 'it';", "let lang = '" + lang + "';", 'let-lang');

  // selettore lingua: sposta .active sulla lingua corrente
  o = rep(o, '<a class="lb active" href="/">IT</a>', '<a class="lb" href="/">IT</a>', 'sw-it');
  o = rep(o, '<a class="lb" href="/' + lang + '/">' + m.label + '</a>',
             '<a class="lb active" href="/' + lang + '/">' + m.label + '</a>', 'sw-active');

  fs.mkdirSync(lang, { recursive: true });
  fs.writeFileSync(lang + '/index.html', o, 'utf8');
  console.log('  ✓ scritto', lang + '/index.html', '(' + o.length + ' byte)');
}
console.log('Fatto.');
