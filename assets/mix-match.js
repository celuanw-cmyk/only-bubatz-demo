/* ==========================================================================
   Mix & Match — Bundle-Baukasten
   - ein aktives Bundle, Slots werden aus dem Produkt-Pool gefüllt
   - Summen/Ersparnis live aus den Cent-Preisen der Produkte
   - Warenkorb über /cart/add.js, danach Cart-Drawer oder /cart
   ========================================================================== */
(function () {
  'use strict';

  var roots = document.querySelectorAll('[data-mix]');
  if (!roots.length) { return; }
  Array.prototype.forEach.call(roots, init);

  function init(root) {
    var dataEl = root.querySelector('[data-mix-bundles]');
    var bundles = [];
    try { bundles = JSON.parse(dataEl.textContent || '[]'); } catch (e) { bundles = []; }
    if (!bundles.length) { return; }

    bundles = bundles.map(function (b) {
      return {
        name: String(b.name || 'Mix'),
        slots: Math.max(1, parseInt(b.slots, 10) || 3),
        price: Math.max(0, parseInt(b.price, 10) || 0)
      };
    });

    var slotsEl = root.querySelector('[data-mix-slots]');
    var grid = root.querySelector('[data-mix-grid]');
    var panel = root.querySelector('[data-mix-panel]');
    var nameEl = root.querySelector('[data-mix-name]');
    var sumEl = root.querySelector('[data-mix-sum]');
    var fixedEl = root.querySelector('[data-mix-fixed]');
    var saveEl = root.querySelector('[data-mix-save]');
    var savePctEl = root.querySelector('[data-mix-save-pct]');
    var statusEl = root.querySelector('[data-mix-status]');
    var addBtn = root.querySelector('[data-mix-add]');
    var bundleBtns = Array.prototype.slice.call(root.querySelectorAll('[data-mix-bundle]'));
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-mix-product]'));
    var ctaLabel = (addBtn && addBtn.getAttribute('data-label')) || 'Bundle in den Warenkorb';

    var state = { index: 0, slots: [] };

    function activeBundle() { return bundles[state.index] || bundles[0]; }

    function money(cents) {
      try {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
      } catch (e) {
        return (cents / 100).toFixed(2).replace('.', ',') + ' €';
      }
    }

    function esc(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
    }

    /* ---------- Slots ---------- */

    function slotMarkup(index, product) {
      var n = index + 1;
      var label = product
        ? 'Slot ' + n + ': ' + product.title + ' – Produkt im Raster wählen'
        : 'Slot ' + n + ': leer – Produkt im Raster wählen';
      var media = product && product.image
        ? '<img src="' + esc(product.image) + '" alt="" width="120" height="120" loading="lazy" decoding="async">'
        : '<span class="mix-slot__num" aria-hidden="true">' + n + '</span>';
      var caption = product
        ? ''
        : '<span class="mix-slot__hint" aria-hidden="true">frei</span>';

      return '<button type="button" class="mix-slot__btn" data-slot="' + index + '" aria-label="' + esc(label) + '">' +
          '<span class="mix-slot__media">' + media + '</span>' + caption +
        '</button>' +
        '<button type="button" class="mix-slot__clear" data-slot-clear="' + index + '"' +
          ' aria-label="Slot ' + n + ' leeren' + (product ? ': ' + esc(product.title) : '') + '"' +
          (product ? '' : ' hidden') + '>&times;</button>';
    }

    function paintSlot(index) {
      var li = slotsEl.children[index];
      if (!li) { return; }
      var product = state.slots[index];
      li.className = 'mix-slot' + (product ? ' is-filled' : '');
      li.innerHTML = slotMarkup(index, product);
    }

    function buildSlots() {
      var bundle = activeBundle();
      state.slots = state.slots.slice(0, bundle.slots);
      while (state.slots.length < bundle.slots) { state.slots.push(null); }

      slotsEl.innerHTML = '';
      for (var i = 0; i < bundle.slots; i++) {
        var li = document.createElement('li');
        li.className = 'mix-slot';
        li.setAttribute('data-slot-wrap', String(i));
        slotsEl.appendChild(li);
        paintSlot(i);
      }
    }

    /* ---------- Status + Summen ---------- */

    function filledProducts() {
      return state.slots.filter(function (p) { return !!p; });
    }

    function announce(text) {
      if (statusEl) { statusEl.textContent = text; }
    }

    function updateStatus(prefix) {
      var bundle = activeBundle();
      var filled = filledProducts().length;
      var missing = bundle.slots - filled;
      var sum = filledProducts().reduce(function (acc, p) { return acc + p.price; }, 0);
      var save = Math.max(0, sum - bundle.price);
      var parts = [];

      if (prefix) { parts.push(prefix); }
      if (missing > 0) {
        parts.push(filled + ' von ' + bundle.slots + ' Slots belegt. Noch ' +
          (missing === 1 ? '1 Slot' : missing + ' Slots') + ' füllen.');
      } else {
        parts.push('Alle ' + bundle.slots + ' Slots belegt.');
      }
      if (filled > 0) {
        parts.push(save > 0
          ? 'Ersparnis ' + money(save) + '.'
          : 'Fixpreis ' + money(bundle.price) + ', Einzelpreise ' + money(sum) + '.');
      }
      announce(parts.join(' '));
    }

    function updateTotals() {
      var bundle = activeBundle();
      var filled = filledProducts();
      var sum = filled.reduce(function (acc, p) { return acc + p.price; }, 0);
      var save = Math.max(0, sum - bundle.price);
      var pct = sum > 0 ? Math.round((save / sum) * 100) : 0;

      if (sumEl) { sumEl.textContent = money(sum); }
      if (fixedEl) { fixedEl.textContent = money(bundle.price); }
      if (saveEl) { saveEl.textContent = money(save); }
      if (savePctEl) {
        var showPct = save > 0 && pct > 0;
        savePctEl.textContent = showPct ? ' · ' + pct + ' %' : '';
        savePctEl.hidden = !showPct;
      }
      if (panel) { panel.classList.toggle('is-saving', save > 0); }
    }

    function updateCards() {
      cards.forEach(function (card) {
        var id = card.getAttribute('data-id');
        var picked = state.slots.some(function (p) { return p && String(p.id) === String(id); });
        card.setAttribute('aria-pressed', picked ? 'true' : 'false');
        var action = card.querySelector('[data-mix-action]');
        if (action) { action.textContent = picked ? 'Aus dem Bundle entfernen' : 'Zum Bundle hinzufügen'; }
      });
    }

    function updateButton() {
      if (!addBtn) { return; }
      var bundle = activeBundle();
      var missing = bundle.slots - filledProducts().length;
      if (missing > 0) {
        addBtn.disabled = true;
        addBtn.textContent = missing === 1 ? 'Noch 1 Slot füllen' : 'Noch ' + missing + ' Slots füllen';
      } else {
        addBtn.disabled = false;
        addBtn.textContent = ctaLabel + ' · ' + money(bundle.price);
      }
    }

    function updateAll(prefix) {
      updateTotals();
      updateCards();
      updateButton();
      updateStatus(prefix);
    }

    /* ---------- Auswahl ---------- */

    function productFromCard(card) {
      return {
        id: card.getAttribute('data-id'),
        title: card.getAttribute('data-title') || '',
        price: parseInt(card.getAttribute('data-price'), 10) || 0,
        image: card.getAttribute('data-image') || ''
      };
    }

    function slotOf(id) {
      for (var i = 0; i < state.slots.length; i++) {
        if (state.slots[i] && String(state.slots[i].id) === String(id)) { return i; }
      }
      return -1;
    }

    function toggleProduct(card) {
      if (!card || card.disabled) { return; }
      var id = card.getAttribute('data-id');
      var existing = slotOf(id);

      if (existing > -1) {
        state.slots[existing] = null;
        paintSlot(existing);
        updateAll(card.getAttribute('data-title') + ' aus dem Bundle entfernt.');
        return;
      }

      var free = state.slots.indexOf(null);
      if (free === -1) {
        announce('Alle Slots belegt. Erst einen Slot leeren, dann diesen Artikel wählen.');
        return;
      }

      state.slots[free] = productFromCard(card);
      paintSlot(free);
      updateAll(card.getAttribute('data-title') + ' in Slot ' + (free + 1) + '.');
    }

    function clearSlot(index) {
      if (!state.slots[index]) { return; }
      state.slots[index] = null;
      paintSlot(index);
      updateAll('Slot ' + (index + 1) + ' geleert.');
      var btn = slotsEl.querySelector('[data-slot="' + index + '"]');
      if (btn) { btn.focus(); }
    }

    function focusPool() {
      var target = null;
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (!card.disabled && slotOf(card.getAttribute('data-id')) === -1) { target = card; break; }
      }
      if (!target) { target = cards[0]; }
      if (!target) { return; }
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    }

    /* ---------- Bundle wechseln ---------- */

    function selectBundle(index) {
      if (index === state.index) { return; }
      var prevFilled = filledProducts().length;
      state.index = index;
      bundleBtns.forEach(function (btn, i) {
        btn.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      });
      var bundle = activeBundle();
      if (nameEl) { nameEl.textContent = bundle.name; }
      buildSlots();
      var dropped = Math.max(0, prevFilled - loadedCount());
      updateAll(bundle.name + ' gewählt, Fixpreis ' + money(bundle.price) + '.' +
        (dropped > 0 ? ' ' + dropped + ' Artikel entfernt, weil das Bundle weniger Plätze hat.' : ''));
    }

    function loadedCount() {
      return state.slots.filter(function (p) { return !!p; }).length;
    }

    /* ---------- Warenkorb ---------- */

    function addToCart() {
      var items = state.slots.filter(function (p) { return !!p; }).map(function (p) {
        return { id: Number(p.id), quantity: 1 };
      });
      if (!items.length || !addBtn) { return; }

      addBtn.disabled = true;
      addBtn.textContent = 'Wird hinzugefügt …';
      if (panel) { panel.setAttribute('aria-busy', 'true'); }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ items: items })
      })
        .then(function (res) {
          if (!res.ok) {
            return res.json().catch(function () { return {}; }).then(function (err) {
              throw new Error(err.description || 'Das Bundle konnte nicht hinzugefügt werden.');
            });
          }
          return res.json();
        })
        .then(function () {
          if (panel) { panel.removeAttribute('aria-busy'); }
          updateAll();
          announce('Bundle liegt im Warenkorb.');
          var opener = document.querySelector('[data-cart-open]');
          if (opener && typeof window.OBopenCart === 'function') {
            window.OBopenCart();
          } else if (opener) {
            opener.click();
          } else {
            window.location.href = '/cart';
          }
        })
        .catch(function (err) {
          if (panel) { panel.removeAttribute('aria-busy'); }
          updateAll();
          announce(err && err.message ? err.message : 'Das Bundle konnte nicht hinzugefügt werden.');
        });
    }

    /* ---------- Events ---------- */

    root.addEventListener('click', function (event) {
      var bundleBtn = event.target.closest('[data-mix-bundle]');
      if (bundleBtn) {
        selectBundle(parseInt(bundleBtn.getAttribute('data-mix-bundle'), 10) || 0);
        return;
      }

      var clearBtn = event.target.closest('[data-slot-clear]');
      if (clearBtn) {
        clearSlot(parseInt(clearBtn.getAttribute('data-slot-clear'), 10));
        return;
      }

      var slotBtn = event.target.closest('[data-slot]');
      if (slotBtn) {
        focusPool();
        return;
      }

      var card = event.target.closest('[data-mix-product]');
      if (card) {
        toggleProduct(card);
        return;
      }

      if (event.target.closest('[data-mix-add]')) {
        addToCart();
      }
    });

    /* ---------- Start ---------- */
    state.index = 0;
    state.slots = new Array(activeBundle().slots).fill(null);
    if (nameEl) { nameEl.textContent = activeBundle().name; }
    buildSlots();
    updateAll();
  }
})();
