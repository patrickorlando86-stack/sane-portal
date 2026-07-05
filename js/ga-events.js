/* GA4 — eventi personalizzati S.A.N.E. Italia
   Tracciamento delegato: un solo listener sul document, nessuna modifica
   ai singoli elementi. Si appoggia al tag gtag.js gia presente nell'head.
   Eventi inviati:
     - scarica_pdf        : click su link .pdf (es. locandina)
                            (nome custom per non collidere con l'evento
                            "file_download" della Misurazione avanzata GA4)
     - contatto_email     : click su link mailto: (incl. CTA adesione/candidatura)
     - contatto_telefono  : click su link tel:
     - contatto_whatsapp  : click su link WhatsApp
     - gioca_demo         : click verso la demo / il gioco «Il Piatto Sano»
     - cambio_lingua      : click sul selettore lingua (.lb)
     - genera_questionari : click su «Genera e Stampa Questionari» (questionario.html)
*/
(function () {
  'use strict';

  function track(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  }

  // Estrae il parametro "subject" da un href mailto:
  function mailSubject(href) {
    var m = href.match(/[?&]subject=([^&]*)/i);
    try { return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; }
    catch (e) { return m ? m[1] : ''; }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button');
    if (!el) return;

    var href = el.getAttribute('href') || '';
    var hrefL = href.toLowerCase();
    var text = (el.textContent || '').trim();

    // Download PDF
    if (/\.pdf(\?|#|$)/i.test(hrefL)) {
      track('scarica_pdf', {
        file_name: hrefL.split('/').pop().split(/[?#]/)[0],
        link_text: text.slice(0, 100)
      });
      return;
    }

    // WhatsApp
    if (hrefL.indexOf('wa.me') > -1 || hrefL.indexOf('api.whatsapp') > -1 || hrefL.indexOf('whatsapp.com') > -1) {
      track('contatto_whatsapp', { link_url: href });
      return;
    }

    // Email (mailto) — copre anche i CTA adesione scuole / candidatura biologi
    if (hrefL.indexOf('mailto:') === 0) {
      track('contatto_email', {
        indirizzo: href.slice(7).split('?')[0],
        oggetto: mailSubject(href).slice(0, 100)
      });
      return;
    }

    // Telefono
    if (hrefL.indexOf('tel:') === 0) {
      track('contatto_telefono', { numero: href.slice(4) });
      return;
    }

    // Demo / gioco «Il Piatto Sano»
    if (/(^|\/)demo(\.html|\/|$)/i.test(hrefL) || hrefL.indexOf('piattosano') > -1 || hrefL.indexOf('play.google') > -1) {
      track('gioca_demo', { destinazione: href, link_text: text.slice(0, 100) });
      return;
    }

    // Cambio lingua (selettore .lb, sia <a> che <button>)
    if (el.classList && el.classList.contains('lb')) {
      var lang = '';
      var oc = el.getAttribute('onclick') || '';
      var mm = oc.match(/setLang\(['"]([a-z]{2})['"]\)/i);
      if (mm) lang = mm[1].toUpperCase();
      else if (/^(IT|EN|ES)$/i.test(text)) lang = text.toUpperCase();
      else if (/\/(en|es)\//.test(hrefL)) lang = hrefL.match(/\/(en|es)\//)[1].toUpperCase();
      else if (href === '/') lang = 'IT';
      track('cambio_lingua', { lingua: lang || text.slice(0, 10) });
      return;
    }

    // Genera questionari (strumento questionario.html)
    if (el.classList && el.classList.contains('btn-gen')) {
      track('genera_questionari', {});
      return;
    }
  }, true);
})();
