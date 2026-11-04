/* Bewegung — 12 Stile, je Bereich einstellbar.
   Zwei Dinge, die über „sichtbar oder nicht" entscheiden:
   1. WANN gestartet wird: erst wenn ein sinnvoller Teil im Bild steht.
      (Vorher startete ein 1300-px-Bereich bei 6 % Sichtbarkeit — die Animation
      war vorbei, bevor der Kunde hinsah.)
   2. WAS gestaffelt wird: nicht das eine .page-Element, sondern die echten
      Karten einer Liste — sonst bewegt sich nur ein Klotz.
   Ohne JavaScript bleibt alles sichtbar. */
(function () {
  var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-ob-anim]'));
  if (!nodes.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CURVES = {
    smooth: 'cubic-bezier(.22, 1, .36, 1)',
    spring: 'cubic-bezier(.34, 1.56, .64, 1)',
    linear: 'linear'
  };
  var vh = window.innerHeight;

  /* Ruhiger Modus (Kartenstil „Fenster"): eine Bewegung für die ganze Seite —
     12 px hoch + einblenden, 380 ms, Listen leicht gestaffelt (TASTE Regel 17).
     Die Einzelstile aus dem Editor (Vorhang, Wischblende, Unschärfe, Kippen …) gelten nur im klassischen Stil. */
  if (document.body.classList.contains('ob-cards-window')) {
    nodes.forEach(function (n) {
      var s = n.getAttribute('data-ob-anim');
      if (s === 'none') return;
      n.setAttribute('data-ob-anim', s === 'stagger' ? 'stagger' : 'rise');
      n.setAttribute('data-ob-speed', '380');
      n.setAttribute('data-ob-distance', '12');
      n.setAttribute('data-ob-delay', '0');
      n.setAttribute('data-ob-stagger', '60');
    });
  }

  function items(n) {
    var liste = n.querySelector('.product-grid, .ob-grid, [data-anim-items], .cat-grid, .usp__inner');
    var eltern = liste || n.querySelector('.page') || n;
    return Array.prototype.slice.call(eltern.children);
  }

  function setup(n) {
    var speed = parseInt(n.getAttribute('data-ob-speed'), 10) || 800;
    var dist = parseInt(n.getAttribute('data-ob-distance'), 10) || 48;
    var delay = parseInt(n.getAttribute('data-ob-delay'), 10) || 0;
    var stagger = parseInt(n.getAttribute('data-ob-stagger'), 10) || 90;
    var ease = CURVES[n.getAttribute('data-ob-ease')] || CURVES.smooth;

    n.style.setProperty('--ob-dur', (speed / 1000) + 's');
    n.style.setProperty('--ob-dist', dist + 'px');
    n.style.setProperty('--ob-delay', (delay / 1000) + 's');
    n.style.setProperty('--ob-stagger', stagger + 'ms');
    n.style.setProperty('--ob-ease', ease);

    if (n.getAttribute('data-ob-anim') === 'stagger') {
      items(n).forEach(function (c, i) {
        c.classList.add('ob-stagger-item');
        c.style.setProperty('--i', i);
      });
    }
    n.classList.add('ob-anim-ready');
  }

  if (reduce) {
    nodes.forEach(function (n) { n.classList.add('is-in'); });
    return;
  }

  nodes.forEach(setup);

  /* Startlinie: kleine Bereiche, sobald sie zu 80 % im Bild stehen;
     hohe Bereiche (höher als der Bildschirm), sobald ihr oberer Rand
     die Bildmitte erreicht hat — dann sieht der Kunde schon die Hälfte. */
  function startLinie(n) {
    var h = n.offsetHeight || 0;
    var faktor = h > vh * 0.9 ? 0.52 : 0.80;
    return vh * faktor;
  }

  /* Für Staffelung: die Karten selbst sind die Beobachter — nur so sieht der
     Kunde die Bewegung. Der Bereich als Ganzes wird sofort freigegeben. */
  var karten = [];
  nodes.forEach(function (n) {
    if (n.getAttribute('data-ob-anim') === 'stagger') {
      n.classList.add('is-in');
      items(n).forEach(function (c, i) {
        if (!c.classList.contains('ob-stagger-item')) {
          c.classList.add('ob-stagger-item');
          c.style.setProperty('--i', i);
        }
        karten.push(c);
      });
    }
  });

  var offen = nodes.filter(function (n) { return n.getAttribute('data-ob-anim') !== 'stagger'; });

  function pruefen() {
    var rest = [];
    var batch = 0;
    for (var i = 0; i < offen.length; i++) {
      var n = offen[i];
      if (n.classList.contains('is-in')) continue;
      var r = n.getBoundingClientRect();
      // schon überscrollt (oberhalb des Bildschirms) = sofort sichtbar, sonst fehlt der Bereich beim Hochscrollen
      if (r.bottom <= 0 || r.top < startLinie(n)) {
        n.classList.add('is-in');
      } else {
        rest.push(n);
      }
    }
    offen = rest;

    var kartenRest = [];
    for (var j = 0; j < karten.length; j++) {
      var c = karten[j];
      if (c.classList.contains('is-in')) continue;
      var cr = c.getBoundingClientRect();
      if (cr.bottom <= 0) { c.style.setProperty('--ob-delay', '0s'); c.classList.add('is-in'); continue; }
      // Karte gilt als „dran", sobald sie zu ~12 % im Bild steht
      if (cr.top < vh * 0.94) {
        c.style.setProperty('--ob-delay', ((batch++ % 6) * (parseInt(c.parentElement.style.getPropertyValue('--ob-stagger'), 10) || 90) / 1000) + 's');
        c.classList.add('is-in');
      } else {
        kartenRest.push(c);
      }
    }
    karten = kartenRest;
    // erst abschalten, wenn Bereiche UND Karten fertig sind — sonst bleiben Karten für immer unsichtbar
    if (!offen.length && !karten.length) {
      window.removeEventListener('scroll', anstossen);
      window.removeEventListener('resize', anstossen);
    }
  }

  var tick = false;
  function anstossen() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { tick = false; pruefen(); });
  }

  window.addEventListener('scroll', anstossen, { passive: true });
  window.addEventListener('resize', function () { vh = window.innerHeight; anstossen(); });
  // Start: was schon im Bild steht, wird kurz nach dem Laden gezeigt (kein Aufblitzen)
  setTimeout(pruefen, 80);
})();
