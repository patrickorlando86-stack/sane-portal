/* ============================================================
   S.A.N.E. Italia — comportamenti d'interfaccia condivisi
   (pagine pubbliche: index, scuole, biologi).

   Contiene: nav che si compatta allo scroll, barra di
   avanzamento lettura, reveal degli elementi al loro ingresso
   nel viewport, conteggio progressivo dei numeri.

   Tutto è opzionale: se questo file non viene caricato la
   pagina resta perfettamente leggibile e navigabile. La classe
   `js-reveal` che nasconde gli elementi da rivelare viene messa
   su <html> da uno script inline nel <head> di ogni pagina.
   ============================================================ */
(function () {
  'use strict';

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- nav compatta + barra di avanzamento ----
     Un solo listener passivo, lavoro reale dentro requestAnimationFrame. */
  var nav = document.querySelector('body > nav');
  var bar = document.getElementById('progressBar');
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY;
      if (nav) nav.classList.toggle('scrolled', y > 40);
      if (bar) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Senza IntersectionObserver (o con motion ridotto) si toglie la classe:
     i contenuti tornano visibili invece di restare nascosti per sempre. */
  if (reduced || !('IntersectionObserver' in window)) {
    document.documentElement.classList.remove('js-reveal');
    return;
  }

  /* ---- reveal degli elementi quando entrano nel viewport ---- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
      if (e.target.classList.contains('statband')) countUp(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  document.querySelectorAll('[data-reveal],[data-reveal-stagger]').forEach(function (el) {
    io.observe(el);
  });

  /* ---- conteggio progressivo dei numeri della fascia statistiche ----
     Salta i valori con intervallo (es. «6–18»): animarli non avrebbe senso. */
  function countUp(band) {
    band.querySelectorAll('.statband-n').forEach(function (el) {
      var raw = el.textContent.trim();
      if (raw.indexOf('–') > -1 || raw.indexOf('-') > -1) return;
      var m = raw.match(/^(\D*)(\d+)(\D*)$/);
      if (!m) return;
      var pre = m[1], target = +m[2], post = m[3];
      var dur = 1400, t0 = performance.now();
      function step(now) {
        var p = Math.min((now - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3); // ease-out cubica
        el.textContent = pre + Math.round(target * eased) + post;
        if (p < 1) requestAnimationFrame(step);
      }
      el.textContent = pre + '0' + post;
      requestAnimationFrame(step);
    });
  }
})();
