/* Mix & Match v30 — Bundles mit Fixpreis.
   Daten kommen aus <script data-mxb-data> (sections/mix-bundles.liquid).
   Ablauf: Karte wählen → Variante (falls mehrere) → je Gruppe genau N Artikel (+/−, mehrfach erlaubt)
   → Bundle-Produkt mit Fixpreis in den Warenkorb, Auswahl als Eigenschaften. */
(function () {
  var root = document.querySelector('[data-mxb]');
  if (!root) return;
  var dataEl = root.querySelector('[data-mxb-data]');
  if (!dataEl) return;
  var DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  function money(c) { return fmt.format((c || 0) / 100); }
  function $(s, el) { return (el || root).querySelector(s); }

  var builder = $('[data-mxb-builder]');
  var state = { b: -1, o: -1, picks: [] };   // picks[gruppe] = { variantId: anzahl }

  /* „Spar bis zu" je Karte: teuerste mögliche Auswahl − Fixpreis, über alle verfügbaren Varianten */
  DATA.bundles.forEach(function (b, i) {
    var best = 0;
    b.options.forEach(function (o) {
      if (!o.available) return;
      var sum = 0, ok = true;
      o.groups.forEach(function (g) {
        if (!g.items.length) { ok = false; return; }
        var max = Math.max.apply(null, g.items.map(function (it) { return it.p; }));
        sum += max * g.count;
      });
      if (ok) best = Math.max(best, sum - b.price);
    });
    var el = root.querySelector('[data-mxb-card="' + i + '"] [data-mxb-save]');
    if (el && best > 0 && !b.soon) { el.textContent = (root.getAttribute('data-save-upto') || 'Spar bis zu') + ' ' + money(best); el.hidden = false; }
  });

  function group(gi) { return DATA.bundles[state.b].options[state.o].groups[gi]; }
  function countIn(gi) {
    var n = 0, p = state.picks[gi];
    for (var k in p) n += p[k];
    return n;
  }
  function itemById(gi, id) {
    var items = group(gi).items;
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }

  function openBundle(bi) {
    var b = DATA.bundles[bi];
    if (!b || b.soon) return;
    state.b = bi;
    $('[data-mxb-bname]').textContent = b.name + ' · ' + money(b.price) + ' Fixpreis';
    $('[data-mxb-pname]').textContent = b.name;
    $('[data-mxb-fixed]').textContent = money(b.price);
    root.querySelectorAll('.mxb-card').forEach(function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-mxb-card') === String(bi));
    });
    var opts = $('[data-mxb-opts]');
    opts.innerHTML = '';
    var first = -1;
    if (b.options.length > 1) {
      b.options.forEach(function (o, oi) {
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'mxb-opt';
        btn.innerHTML = '<b>' + esc(o.code) + '</b> ' + esc(o.name) + (o.available ? '' : ' <small>bald</small>');
        btn.disabled = !o.available;
        btn.addEventListener('click', function () { openOption(oi); });
        opts.appendChild(btn);
        if (first < 0 && o.available) first = oi;
      });
    } else if (b.options[0] && b.options[0].available) {
      first = 0;
    }
    builder.hidden = false;
    openOption(first);
    builder.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function openOption(oi) {
    state.o = oi;
    var wrap = $('[data-mxb-groups]');
    wrap.innerHTML = '';
    root.querySelectorAll('.mxb-opt').forEach(function (btn, i) { btn.setAttribute('aria-pressed', i === oi ? 'true' : 'false'); });
    if (oi < 0) { render(); return; }
    var o = DATA.bundles[state.b].options[oi];
    state.picks = o.groups.map(function () { return {}; });
    o.groups.forEach(function (g, gi) {
      var sec = document.createElement('section');
      sec.className = 'mxb-group';
      var head = '<header class="mxb-group__head"><h3>' + esc(g.label) + '</h3><span data-mxb-gcount="' + gi + '">0 / ' + g.count + '</span></header>';
      if (!g.items.length) {
        sec.innerHTML = head + '<p class="mxb-group__empty">Zurzeit keine Artikel in dieser Auswahl.</p>';
        wrap.appendChild(sec); return;
      }
      var tiles = g.items.map(function (it) {
        return '<div class="mxb-tile" data-gi="' + gi + '" data-id="' + it.id + '">' +
          '<span class="mxb-tile__img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" width="300" height="300">' : '') + '</span>' +
          '<span class="mxb-tile__v">' + esc(it.v || '') + '</span>' +
          '<span class="mxb-tile__t">' + esc(it.t) + '</span>' +
          '<span class="mxb-tile__p">' + money(it.p) + '</span>' +
          '<span class="mxb-tile__ctl"><button type="button" data-step="-1" aria-label="weniger ' + esc(it.t) + '">−</button>' +
          '<output data-n>0</output><button type="button" data-step="1" aria-label="mehr ' + esc(it.t) + '">+</button></span></div>';
      }).join('');
      sec.innerHTML = head + '<div class="mxb-group__grid">' + tiles + '</div>';
      wrap.appendChild(sec);
    });
    render();
  }

  root.addEventListener('click', function (e) {
    var open = e.target.closest('[data-mxb-open]');
    if (open) { openBundle(parseInt(open.getAttribute('data-mxb-open'), 10)); return; }
    var card = e.target.closest('.mxb-card');
    if (card && !card.classList.contains('is-soon') && !e.target.closest('button')) {
      openBundle(parseInt(card.getAttribute('data-mxb-card'), 10)); return;
    }
    var step = e.target.closest('[data-step]');
    if (step) {
      var tile = step.closest('.mxb-tile');
      var gi = parseInt(tile.getAttribute('data-gi'), 10), id = parseInt(tile.getAttribute('data-id'), 10);
      var d = parseInt(step.getAttribute('data-step'), 10);
      var p = state.picks[gi], cur = p[id] || 0;
      if (d > 0 && countIn(gi) >= group(gi).count) return;    // Gruppe voll
      cur = Math.max(0, cur + d);
      if (cur) p[id] = cur; else delete p[id];
      render();
      return;
    }
    var tileClick = e.target.closest('.mxb-tile');
    if (tileClick) { tileClick.querySelector('[data-step="1"]').click(); }
  });

  function render() {
    var list = $('[data-mxb-list]'), status = $('[data-mxb-status]'), add = $('[data-mxb-add]');
    var b = DATA.bundles[state.b];
    list.innerHTML = '';
    if (state.o < 0) {
      status.textContent = 'Diese Variante ist bald verfügbar.'; add.disabled = true; return;
    }
    var o = b.options[state.o], sum = 0, missing = 0;
    o.groups.forEach(function (g, gi) {
      var n = countIn(gi);
      missing += g.count - n;
      var gc = root.querySelector('[data-mxb-gcount="' + gi + '"]');
      if (gc) { gc.textContent = n + ' / ' + g.count; gc.classList.toggle('is-full', n === g.count); }
      root.querySelectorAll('.mxb-tile[data-gi="' + gi + '"]').forEach(function (t) {
        var c = state.picks[gi][parseInt(t.getAttribute('data-id'), 10)] || 0;
        t.querySelector('[data-n]').textContent = c;
        t.classList.toggle('is-picked', c > 0);
        t.classList.toggle('is-locked', n >= g.count && !c);
      });
      for (var id in state.picks[gi]) {
        var it = itemById(gi, parseInt(id, 10)), q = state.picks[gi][id];
        sum += it.p * q;
        var li = document.createElement('li');
        li.innerHTML = '<span>' + q + '× ' + esc(it.t) + '</span><em>' + esc(g.label) + '</em>';
        list.appendChild(li);
      }
    });
    $('[data-mxb-sum]').textContent = money(sum);
    $('[data-mxb-saved]').textContent = money(Math.max(0, sum - b.price));
    status.textContent = missing > 0 ? 'Noch ' + missing + (missing === 1 ? ' Artikel' : ' Artikel') + ' wählen.' : 'Komplett — ab in den Warenkorb.';
    add.disabled = missing > 0 || !b.variant;
  }

  $('[data-mxb-add]').addEventListener('click', function () {
    var b = DATA.bundles[state.b], o = b.options[state.o], btn = this;
    var props = {};
    if (b.options.length > 1) props['Variante'] = o.code + ' · ' + o.name;
    var ids = [];
    o.groups.forEach(function (g, gi) {
      var parts = [];
      for (var id in state.picks[gi]) {
        var it = itemById(gi, parseInt(id, 10)), q = state.picks[gi][id];
        parts.push(q + '× ' + it.t);
        for (var k = 0; k < q; k++) ids.push(id);
      }
      props[g.label] = parts.join(', ');
    });
    props['_mix_items'] = ids.join(',');
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Wird hinzugefügt …';
    fetch('/cart/add.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: b.variant, quantity: 1, properties: props }] })
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (er) { throw new Error(er.description || 'Fehler'); });
      return r.json();
    }).then(function () {
      btn.textContent = label;
      $('[data-mxb-status]').textContent = 'Bundle liegt im Warenkorb.';
      if (typeof window.OBopenCart === 'function') window.OBopenCart(); else window.location.href = '/cart';
      openOption(state.o);
    }).catch(function (err) {
      btn.textContent = label; btn.disabled = false;
      $('[data-mxb-status]').textContent = 'Konnte nicht hinzugefügt werden: ' + err.message;
    });
  });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
})();
