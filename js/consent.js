/* Banner cookie + Google Consent Mode v2 — S.A.N.E. Italia
   Nel <head> di ogni pagina il default è "denied" (vedi snippet gtag):
   GA4 parte in modalità cookieless finché l'utente non accetta.
   - Scelta salvata in localStorage ("sane-consent": granted | denied)
   - Se accetta: gtag('consent','update') abilita analytics_storage
   - Link "Preferenze cookie" aggiunto al footer per revocare la scelta */
(function () {
  'use strict';

  var KEY = 'sane-consent';

  var TXT = {
    it: {
      msg: 'Questo sito usa cookie di misurazione (Google Analytics) per capire come vengono usate le pagine e migliorare i contenuti. Nessun cookie pubblicitario.',
      accept: 'Accetta',
      reject: 'Rifiuta',
      prefs: 'Preferenze cookie'
    },
    en: {
      msg: 'This site uses measurement cookies (Google Analytics) to understand how pages are used and improve content. No advertising cookies.',
      accept: 'Accept',
      reject: 'Decline',
      prefs: 'Cookie preferences'
    },
    es: {
      msg: 'Este sitio usa cookies de medición (Google Analytics) para entender cómo se usan las páginas y mejorar los contenidos. Sin cookies publicitarias.',
      accept: 'Aceptar',
      reject: 'Rechazar',
      prefs: 'Preferencias de cookies'
    }
  };

  var lang = (document.documentElement.lang || 'it').slice(0, 2);
  var t = TXT[lang] || TXT.it;

  function grant() {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  function save(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* storage pieno o bloccato */ }
  }

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function showBanner() {
    if (document.getElementById('sane-cookie-banner')) return;

    var css = '#sane-cookie-banner{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:9999;' +
      'max-width:560px;margin:0 auto;background:#0A2647;color:#fff;border-radius:14px;' +
      'padding:1rem 1.2rem;box-shadow:0 10px 30px rgba(0,0,0,.3);' +
      'font-family:Inter,system-ui,sans-serif;font-size:.85rem;line-height:1.5}' +
      '#sane-cookie-banner p{margin:0 0 .8rem}' +
      '#sane-cookie-banner .scb-btns{display:flex;gap:.6rem;justify-content:flex-end}' +
      '#sane-cookie-banner button{cursor:pointer;border:0;border-radius:8px;' +
      'padding:.5rem 1.1rem;font:inherit;font-weight:700}' +
      '#scb-accept{background:#2C74B3;color:#fff}' +
      '#scb-reject{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4)}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var box = document.createElement('div');
    box.id = 'sane-cookie-banner';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-live', 'polite');
    box.setAttribute('aria-label', t.prefs);

    var p = document.createElement('p');
    p.textContent = t.msg;

    var btns = document.createElement('div');
    btns.className = 'scb-btns';

    var reject = document.createElement('button');
    reject.id = 'scb-reject';
    reject.type = 'button';
    reject.textContent = t.reject;
    reject.addEventListener('click', function () {
      save('denied');
      box.remove();
    });

    var accept = document.createElement('button');
    accept.id = 'scb-accept';
    accept.type = 'button';
    accept.textContent = t.accept;
    accept.addEventListener('click', function () {
      save('granted');
      grant();
      box.remove();
    });

    btns.appendChild(reject);
    btns.appendChild(accept);
    box.appendChild(p);
    box.appendChild(btns);
    document.body.appendChild(box);
  }

  // Link discreto nel footer per rivedere la scelta (revocabilità)
  function addFooterLink() {
    var footer = document.querySelector('footer');
    if (!footer) return;
    var a = document.createElement('a');
    a.href = '#';
    a.textContent = t.prefs;
    a.style.cssText = 'display:inline-block;margin-top:.6rem;font-size:.8rem;opacity:.8';
    a.addEventListener('click', function (e) {
      e.preventDefault();
      showBanner();
    });
    footer.appendChild(a);
  }

  function init() {
    var choice = stored();
    if (choice === 'granted') grant();
    else if (choice !== 'denied') showBanner();
    addFooterLink();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
