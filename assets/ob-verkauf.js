/* Only Bubatz – Verkaufs-Helfer: „Passt dazu“ im Warenkorb + Versand-Countdown.
   Einstellungen: Theme-Einstellungen → Warenkorb / Versand-Countdown. */
(function () {
  'use strict';
  function money(c) { var v = (c / 100).toFixed(2).replace('.', ','); var f = window.OB_MONEY_FORMAT || '{{amount_with_comma_separator}} €'; return f.indexOf('{{amount_with_comma_separator}}') > -1 ? f.replace('{{amount_with_comma_separator}}', v) : v + ' €'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- „Passt dazu“ ---------- */
  function getPool() { try { var el = document.getElementById('obUpsell'); return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } }
  window.obUpsellHtml = function (cart, remaining) {
    var cfg = window.OB_UPSELL_CFG, pool = getPool(); if (!pool || !pool.length || !cfg || !cart.items.length) return '';
    var title = remaining > 0 ? cfg.t : cfg.tf; if (!title) return '';
    var inCart = {}; cart.items.forEach(function (it) { inCart[it.handle] = 1; inCart[it.variant_id] = 1; });
    var seen = {}, list = pool.filter(function (x) { if (inCart[x.h] || inCart[x.v] || seen[x.h]) return false; seen[x.h] = 1; return true; });
    if (!list.length) return '';
    var pick;
    if (remaining > 0) {
      /* zuerst das günstigste Produkt, das die Lücke allein schließt, dann die günstigsten */
      var bridge = list.filter(function (x) { return x.p >= remaining; }).sort(function (a, b) { return a.p - b.p; });
      var rest = list.filter(function (x) { return x.p < remaining; }).sort(function (a, b) { return b.p - a.p; });
      pick = bridge.slice(0, 1).concat(rest).concat(bridge.slice(1));
    } else {
      pick = list.slice().sort(function (a, b) { return a.p - b.p; });
    }
    pick = pick.slice(0, cfg.n || 3);
    return '<div class="ob-upsell"><p class="ob-upsell__title">' + esc(title).replace('[betrag]', '<strong>' + money(remaining) + '</strong>') + '</p><ul class="ob-upsell__list">' +
      pick.map(function (x) {
        return '<li class="ob-upsell__item"><a class="ob-upsell__img" href="' + esc(x.u) + '"><img src="' + esc(x.i) + '" alt="" width="56" height="56" loading="lazy"></a>' +
          '<a class="ob-upsell__name" href="' + esc(x.u) + '">' + esc(x.t) + '</a><span class="ob-upsell__price">' + money(x.p) + '</span>' +
          '<button type="button" class="ob-upsell__add" data-add="' + x.v + '" aria-label="' + esc(x.t) + ' in den Warenkorb">+</button></li>';
      }).join('') + '</ul></div>';
  };

  /* ---------- Versand-Countdown (deutsche Zeit) ---------- */
  var S = window.OB_SHIP || {}, hol = {};
  function readHol() { S = window.OB_SHIP || {}; hol = {}; String(S.hol || '').split(/[,;\s]+/).forEach(function (d) { var m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (m) hol[m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2)] = 1; }); }
  var TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  function berlin(d) {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(d);
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    return { ymd: o.year + '-' + o.month + '-' + o.day, h: +o.hour, m: +o.minute, s: +o.second, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday) };
  }
  function shipDay(b) { return b.wd !== 0 && (b.wd !== 6 || S.sat) && !hol[b.ymd]; }
  function text() {
    readHol();
    var now = new Date(), b = berlin(now), cut = +S.cut || 14;
    var secs = (cut * 3600) - (b.h * 3600 + b.m * 60 + b.s);
    if (shipDay(b) && secs > 0) {
      var h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
      var z = h > 0 ? h + ' Std. ' + m + ' Min.' : m + ' Min.';
      return { cls: 'heute', t: String(S.today || '').replace('[zeit]', '<strong>' + z + '</strong>') };
    }
    for (var i = 1; i < 15; i++) {
      var nb = berlin(new Date(now.getTime() + i * 86400000));
      if (shipDay(nb)) { var tag = i === 1 ? 'morgen' : 'am ' + TAGE[nb.wd]; return { cls: 'spaeter', t: String(S.later || '').replace('[tag]', '<strong>' + tag + '</strong>') }; }
    }
    return null;
  }
  window.obShipCd = function () {
    readHol(); if (!S.on) return;
    var r = text();
    document.querySelectorAll('[data-ship-cd]').forEach(function (el) {
      if (!r || (el.getAttribute('data-ship-where') === 'cart' && !S.cart)) { el.hidden = true; return; }
      el.hidden = false; el.className = el.className.replace(/\sis-(heute|spaeter)/g, '') + ' is-' + r.cls;
      el.innerHTML = '<span class="ob-ship-cd__icon" aria-hidden="true">🚚</span><span>' + r.t + '</span>';
    });
  };
  window.obShipCd(); setInterval(window.obShipCd, 30000);

  /* ---------- Produktseite: Variante (Menü oder Mengen-Knopf) → bestellte Variante + Preis ---------- */
  (function () {
    var form = document.getElementById('productForm'); if (!form) return;
    var idEl = form.querySelector("[name='id']"), sel = document.getElementById('variantSelect');
    var priceEl = document.querySelector('.pdp-price .price'), cmpEl = document.querySelector('.pdp-price .price--compare');
    var prices = {};
    if (sel) [].forEach.call(sel.options, function (o) { var m = o.textContent.match(/—\s*([\d.,]+)/); prices[o.value] = m ? m[1] : null; });
    function setVar(id, cents, compare) {
      if (!id || !idEl) return;
      idEl.value = id;
      if (sel && sel.value !== String(id)) sel.value = String(id);
      var r = form.querySelector('input[name="ob_tier"][value="' + id + '"]'); if (r) r.checked = true;
      if (priceEl && cents != null) priceEl.textContent = money(+cents);
      if (cmpEl) cmpEl.hidden = !(compare && +compare > +cents);
      try { var u = new URL(location.href); u.searchParams.set('variant', id); history.replaceState(null, '', u); } catch (e) {}
      showImg(id);
    }
    /* Variante → passendes Bild; Klick auf ein Vorschaubild → passende Variante */
    var vimg = {}; try { var ve = document.getElementById('obVariantImages'); if (ve) vimg = JSON.parse(ve.textContent); } catch (e) {}
    var busy = false;
    function showImg(id) {
      var m = vimg[id]; if (!m || busy) return;
      var th = document.querySelector('[data-thumb][data-img-id="' + m.id + '"]');
      busy = true;
      if (th) th.click();
      else {
        var main = document.getElementById('pdpMainImage');
        if (main) { main.srcset = m.ss || ''; main.src = m.s; main.alt = m.a || ''; main.setAttribute('data-full', m.f || m.s); }
        document.querySelectorAll('[data-thumb]').forEach(function (t) { t.classList.remove('is-active'); });
      }
      busy = false;
    }
    document.addEventListener('click', function (e) {
      var th = e.target.closest && e.target.closest('[data-thumb]'); if (!th || busy) return;
      var imgId = th.getAttribute('data-img-id');
      for (var vid in vimg) {
        if (String(vimg[vid].id) === imgId) {
          var opt = sel && [].filter.call(sel.options, function (o) { return o.value === vid; })[0];
          if (opt && opt.disabled) return;
          busy = true;
          var r = form.querySelector('input[name="ob_tier"][value="' + vid + '"]');
          if (r) setVar(vid, r.getAttribute('data-price'), r.getAttribute('data-compare'));
          else if (sel) { sel.value = vid; idEl.value = vid; var txt = prices[vid]; if (priceEl && txt) priceEl.textContent = txt + ' €'; try { var u = new URL(location.href); u.searchParams.set('variant', vid); history.replaceState(null, '', u); } catch (e2) {} }
          busy = false;
          return;
        }
      }
    });
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'ob_tier') setVar(t.value, t.getAttribute('data-price'), t.getAttribute('data-compare'));
      else if (t === sel) {
        var r = form.querySelector('input[name="ob_tier"][value="' + sel.value + '"]');
        if (r) setVar(sel.value, r.getAttribute('data-price'), r.getAttribute('data-compare'));
        else { idEl.value = sel.value; var txt = prices[sel.value]; if (priceEl && txt) priceEl.textContent = txt + ' €'; showImg(sel.value); }
      }
    });
  })();
})();
