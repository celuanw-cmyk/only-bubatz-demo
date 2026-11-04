/* Only Bubatz — Session Theme JS
   Cart (AJAX), Drawer, Age-Gate, Mobile-Nav, Toast, Qty-Stepper
   Barrierefrei: Fokus-Falle im Drawer, aria-live für Statusmeldungen */
(function () {
  "use strict";

  var CDN = (window.Shopify && Shopify.routes && Shopify.routes.root) ? Shopify.routes.root : "";
  var AGE_KEY = "ob_age_ok_v1";

  /* ---------- Helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(cents) {
    var fmt = (window.OB_MONEY_FORMAT || "{{amount_with_comma_separator}} €");
    var value = (cents / 100).toFixed(2).replace(".", ",");
    if (fmt.indexOf("{{amount_with_comma_separator}}") !== -1) return fmt.replace("{{amount_with_comma_separator}}", value);
    return value + " €";
  }

  var toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add("is-visible"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2600);
  }
  window.OBtoast = toast;

  /* ---------- Age gate ---------- */
  function initAgeGate() {
    var gate = $("#ageGate");
    if (!gate) return;
    var ok = false;
    try { ok = localStorage.getItem(AGE_KEY) === "1"; } catch (e) { ok = false; }
    if (ok) { gate.hidden = true; document.body.style.overflow = ""; return; }

    gate.hidden = false;
    document.body.style.overflow = "hidden";
    var yes = $("#ageGateYes", gate);
    var no = $("#ageGateNo", gate);
    if (yes) {
      yes.focus();
      yes.addEventListener("click", function () {
        try { localStorage.setItem(AGE_KEY, "1"); } catch (e) {}
        gate.hidden = true;
        document.body.style.overflow = "";
      });
    }
    if (no) no.addEventListener("click", function () {
      try { localStorage.removeItem(AGE_KEY); } catch (e) {}
      window.location.href = "https://www.bzga.de/";
    });
  }

  /* ---------- Mobile nav ---------- */
  function initNav() {
    var btn = $("#navToggle"), nav = $("#siteNav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Cart state ---------- */
  function setCount(n) {
    $$("[data-cart-count]").forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  function renderCart(cart) {
    setCount(cart.item_count);
    var body = $("#cartBody");
    var foot = $("#cartFoot");
    if (!body) return;

    if (!cart.items.length) {
      body.innerHTML = '<p class="cart-empty">Dein Warenkorb ist noch leer.<br>Schau dir das Sortiment an — Versand ab 49 € kostenfrei.</p>';
      if (foot) foot.innerHTML = '<a class="btn btn--block" href="/collections/all">Sortiment ansehen</a>';
      return;
    }

    body.innerHTML = cart.items.map(function (it) {
      var img = it.image ? it.image.replace(/(\.[a-z]{3,4})(\?|$)/i, "_160x160$1$2") : "";
      return '' +
        '<div class="cart-line" data-line="' + it.key + '">' +
          (img ? '<img src="' + img + '" alt="" width="74" height="74" loading="lazy">' : '<div></div>') +
          '<div>' +
            '<h3>' + it.product_title + '</h3>' +
            (it.variant_title && it.variant_title !== "Default Title" ? '<p class="cart-price" style="font-weight:500;font-size:14px">' + it.variant_title + '</p>' : '') +
            '<p class="cart-price">' + money(it.final_line_price) + '</p>' +
            '<button type="button" data-cart-remove="' + it.key + '">Entfernen</button>' +
          '</div>' +
          '<div style="text-align:right;font-size:15px;font-weight:700">' + it.quantity + '×</div>' +
        '</div>';
    }).join("");

    var threshold = window.OB_FREE_FROM || 4900;
    var remaining = Math.max(0, threshold - cart.total_price);
    var pct = Math.min(100, Math.round((cart.total_price / threshold) * 100));
    if (foot) {
      foot.innerHTML = '' +
        '<div class="shipping-hint">' + (remaining > 0
          ? 'Noch <strong>' + money(remaining) + '</strong> bis versandkostenfrei'
          : '<strong>Versandkostenfrei</strong> — geschafft.') + '</div>' +
        '<div class="shipping-bar" role="img" aria-label="Versandfortschritt ' + pct + ' Prozent"><span style="width:' + pct + '%"></span></div>' +
        (window.obUpsellHtml ? window.obUpsellHtml(cart, remaining) : '') +
        '<div class="cart-subtotal"><span>Zwischensumme</span><span>' + money(cart.total_price) + '</span></div>' +
        '<p class="shipping-hint">inkl. MwSt., zzgl. Versand · diskret verpackt</p>' +
        '<p class="ob-ship-cd ob-ship-cd--cart" data-ship-cd data-ship-where="cart"></p>' +
        '<a class="btn btn--block" href="/checkout">Zur Kasse</a>' +
        '<a class="btn btn--ghost btn--block" href="/cart" style="margin-top:10px;color:var(--ink)">Warenkorb ansehen</a>';
    }
    if (window.obShipCd) window.obShipCd();
  }

  function fetchCart() {
    return fetch(CDN + "cart.js", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(renderCart)
      .catch(function () {});
  }

  function addToCart(id, qty, btn) {
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Wird hinzugefügt…"; }
    fetch(CDN + "cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ id: id, quantity: qty || 1 })
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) { throw new Error(e.description || "Fehler"); });
        return r.json();
      })
      .then(function () { return fetchCart(); })
      .then(function () { openCart(); toast("In den Warenkorb gelegt"); })
      .catch(function (e) { toast(e.message || "Konnte nicht hinzugefügt werden"); })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "In den Warenkorb"; }
      });
  }

  /* ---------- Drawer ---------- */
  var lastFocus = null;
  function openCart() {
    var d = $("#cartDrawer");
    if (!d) return;
    lastFocus = document.activeElement;
    d.classList.add("is-open");
    d.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    fetchCart();
    var close = $("#cartClose");
    if (close) close.focus();
  }
  function closeCart() {
    var d = $("#cartDrawer");
    if (!d) return;
    d.classList.remove("is-open");
    d.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.OBopenCart = openCart;

  function initDrawer() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("[data-cart-open]")) { e.preventDefault(); openCart(); return; }
      if (t.closest("[data-cart-close]")) { e.preventDefault(); closeCart(); return; }

      var add = t.closest("[data-add]");
      if (add) {
        e.preventDefault();
        addToCart(add.getAttribute("data-add"), 1, add);
        return;
      }
      var rm = t.closest("[data-cart-remove]");
      if (rm) {
        e.preventDefault();
        fetch(CDN + "cart/change.js", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ id: rm.getAttribute("data-cart-remove"), quantity: 0 })
        }).then(function (r) { return r.json(); }).then(renderCart).catch(function () {});
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeCart();
      if (e.key === "Tab") {
        var d = $("#cartDrawer");
        if (!d || !d.classList.contains("is-open")) return;
        var f = $$('a[href], button:not([disabled]), input, select, textarea', d);
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Product page ---------- */
  function initProduct() {
    var form = $("#productForm");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var idEl = form.querySelector("[name='id']");
        var qtyEl = form.querySelector("[name='quantity']");
        if (!idEl) return;
        addToCart(idEl.value, qtyEl ? parseInt(qtyEl.value, 10) || 1 : 1, form.querySelector("[type=submit]"));
      });
    }
    $$("[data-qty]").forEach(function (box) {
      var input = box.querySelector("input");
      box.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-step]");
        if (!b || !input) return;
        e.preventDefault();
        var v = parseInt(input.value, 10) || 1;
        v += parseInt(b.getAttribute("data-step"), 10);
        input.value = Math.max(1, v);
      });
    });
    var thumbs = $$("[data-thumb]");
    thumbs.forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        var main = $("#pdpMainImage");
        if (!main) return;
        var src = thumb.getAttribute("data-src");
        if (!src) return;
        /* srcset zuerst ersetzen: der Browser nimmt sonst weiter das alte srcset und ignoriert src */
        main.srcset = thumb.getAttribute("data-srcset") || "";
        main.src = src;
        main.alt = thumb.getAttribute("alt") || "";
        main.setAttribute("data-full", thumb.getAttribute("data-full") || main.getAttribute("data-full"));
        main.setAttribute("data-src", src);
        thumbs.forEach(function (t) { t.classList.toggle("is-active", t === thumb); });
      });
    });
    if (thumbs.length) thumbs[0].classList.add("is-active");
    /* Produktbild-Zoom (Lightbox) */
    var lightbox = $("#pdpLightbox");
    var pdpImg = $("#pdpMainImage");
    if (lightbox && pdpImg) {
      pdpImg.addEventListener("click", function () {
        var lbImg = lightbox.querySelector("img");
        lbImg.src = pdpImg.getAttribute("data-full") || pdpImg.src;
        lbImg.alt = pdpImg.alt || "";
        lightbox.hidden = false;
      });
      lightbox.addEventListener("click", function (ev) {
        if (ev.target === lightbox || ev.target.closest(".pdp-lightbox__close")) {
          lightbox.hidden = true;
        }
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && !lightbox.hidden) lightbox.hidden = true;
      });
    }
  }

  /* ---------- Init ---------- */
  function boot() {
    initAgeGate();
    initNav();
    initDrawer();
    initProduct();
    fetchCart();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
