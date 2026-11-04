/* Only Bubatz — „Alle Produkte" jedes Mal anders.
   Shopify liefert die Collection immer in derselben Reihenfolge (und die Seite ist gecacht),
   darum mischt der Browser:
   1. Die Seiten der Collection werden zufällig angeordnet. Der Besuch startet auf einer
      zufälligen Seite (nie dieselbe wie beim letzten Besuch).
   2. Die Karten jeder Seite werden gemischt (Fisher-Yates). Ausverkaufte bleiben hinten,
      wenn das Theme-Setting „Ausverkaufte ans Ende" an ist.
   3. „Weitere Produkte laden" folgt der zufälligen Seitenfolge (ob-loadmore.js fragt hier nach).
   Wählt der Kunde eine Sortierung, Seite oder einen Filter in der Adresse, bleibt alles wie geliefert. */
(function () {
  'use strict';
  var grid = document.querySelector('.pgrid[data-shuffle]');
  if (!grid) return;
  if (/[?&](sort_by|page|q|filter\.[^=]*)=/.test(location.search)) { grid.classList.remove('ob-shuf-wait'); return; }

  var base = grid.getAttribute('data-url') || location.pathname;
  var pages = Math.max(1, parseInt(grid.getAttribute('data-pages') || '1', 10));
  var total = parseInt(grid.getAttribute('data-total') || '0', 10);
  var outLast = grid.getAttribute('data-soldout-last') === '1';
  var KEY = 'obShufStart:' + base;

  function rnd(n) {
    if (window.crypto && crypto.getRandomValues) { var a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
    return Math.floor(Math.random() * n);
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function isOut(c) { return c.getAttribute && c.getAttribute('data-stock') === '0'; }
  /* gemischt, Ausverkaufte (optional) hinten */
  function mix(list) {
    var ok = [], out = [];
    Array.prototype.forEach.call(list, function (c) { (outLast && isOut(c) ? out : ok).push(c); });
    return shuffle(ok).concat(shuffle(out));
  }
  function pageUrl(n) { return base + (base.indexOf('?') < 0 ? '?' : '&') + 'page=' + n; }

  /* Seitenfolge: zufällig, Start nie wie beim letzten Besuch */
  var order = [];
  for (var p = 1; p <= pages; p++) order.push(p);
  shuffle(order);
  var last = null;
  try { last = localStorage.getItem(KEY); } catch (e) {}
  if (pages > 1 && String(order[0]) === last) {
    var k = 1 + rnd(pages - 1), t = order[0]; order[0] = order[k]; order[k] = t;
  }
  try { localStorage.setItem(KEY, String(order[0])); } catch (e) {}
  var queue = order.slice(1);

  /* „Weitere laden“ erst nach dem Mischen freigeben */
  var lmBtn = document.querySelector('[data-loadmore] .loadmore');
  if (lmBtn) lmBtn.disabled = true;

  /* Karten einsetzen: Verfügbare vor die erste ausverkaufte Karte, Ausverkaufte ans Ende */
  function place(cards) {
    var firstOut = outLast ? grid.querySelector('.card[data-stock="0"]') : null;
    cards.forEach(function (c) {
      if (firstOut && !isOut(c)) grid.insertBefore(c, firstOut);
      else grid.appendChild(c);
    });
  }
  function shown() { return grid.querySelectorAll('.card').length; }
  function label() {
    var rest = total - shown();
    return 'Weitere Produkte laden' + (rest > 0 ? ' (' + rest + ')' : '');
  }
  function syncButton() {
    var wrap = document.querySelector('[data-loadmore]');
    var btn = wrap && wrap.querySelector('.loadmore');
    if (!btn) return;
    if (queue.length) { btn.setAttribute('data-next', pageUrl(queue[0])); btn.textContent = label(); btn.disabled = false; }
    else if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }
  function refresh() { if (window.obFilterRefresh) window.obFilterRefresh(); }
  function done() { syncButton(); refresh(); grid.classList.remove('ob-shuf-wait'); }

  /* Schnittstelle für ob-loadmore.js */
  window.obShuffle = {
    /* neue Karten einer nachgeladenen Seite einsetzen; gibt die nächste Adresse zurück (oder null) */
    append: function (nodes) {
      queue.shift();
      place(mix(nodes));
      return queue.length ? pageUrl(queue[0]) : null;
    },
    label: label
  };

  function mixHere() {
    var cards = Array.prototype.slice.call(grid.children).filter(function (el) { return el.classList.contains('card'); });
    cards.forEach(function (c) { grid.removeChild(c); });
    place(mix(cards));
  }

  if (order[0] === 1 || !window.fetch) {
    if (order[0] !== 1) { queue = order.filter(function (n) { return n !== 1; }); }
    mixHere();
    done();
    return;
  }

  /* Startseite ist nicht Seite 1: diese Seite holen und die Karten ersetzen */
  fetch(pageUrl(order[0]), { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var neue = doc.querySelectorAll('.pgrid > .card');
      if (!neue.length) throw new Error('leer');
      var imported = Array.prototype.map.call(neue, function (el) { return document.importNode(el, true); });
      Array.prototype.slice.call(grid.querySelectorAll('.card')).forEach(function (c) { grid.removeChild(c); });
      place(mix(imported));
    })
    .catch(function () {
      /* Seite 1 bleibt, wird aber trotzdem gemischt */
      queue = order.filter(function (n) { return n !== 1; });
      mixHere();
    })
    .then(done);
})();
