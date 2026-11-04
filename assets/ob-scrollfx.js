/* Scroll-Effekte — alle vertikal, kein Seiten-Scrollen.
   1) Scroll-Fortschritt (dünne Linie oben)
   2) Zahlen hochzählen (USP / Vertrauensleiste)
   3) Parallax auf dem Hero-Medium (nur Desktop)
   Respektiert prefers-reduced-motion. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- 1) Scroll-Fortschritt ---------- */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  var fill = document.createElement('span');
  bar.appendChild(fill);
  document.body.appendChild(bar);

  /* ---------- 2) Zahlen hochzählen (nur Textknoten anfassen) ---------- */
  function prepareCounts() {
    var items = document.querySelectorAll('.usp-item, .trust-item, .trust__item, [data-ob-count]');
    Array.prototype.forEach.call(items, function (el) {
      if (el.__prepared) return;
      el.__prepared = true;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      var node;
      while ((node = walker.nextNode())) {
        var m = node.textContent.match(/\d+/);
        if (!m) continue;
        var before = node.textContent.slice(0, m.index);
        var num = m[0];
        var after = node.textContent.slice(m.index + num.length);
        var b = document.createElement('b');
        b.className = 'ob-count-num';
        b.textContent = num;
        node.textContent = before;
        var parent = node.parentNode;
        parent.insertBefore(b, node.nextSibling);
        if (after) parent.insertBefore(document.createTextNode(after), b.nextSibling);
        el.dataset.count = num;
        break;
      }
    });
  }

  function runCount(b) {
    var target = parseInt(b.textContent, 10);
    if (!target || b.__done) return;
    b.__done = true;
    if (reduce) { b.textContent = target; return; }
    var start = null, dur = 1100;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      b.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(frame); else b.textContent = target;
    }
    requestAnimationFrame(frame);
  }

  prepareCounts();

  /* ---------- 3) Parallax (nur Desktop) ---------- */
  var stage = document.querySelector('.ob-hero__stage');
  var media = stage ? stage.querySelector('.ob-hero__media') : null;
  if (stage && media && !reduce && window.innerWidth > 720) stage.classList.add('has-parallax');

  var ticking = false;
  function tick() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var p = max > 0 ? y / max : 0;

    fill.style.width = (p * 100).toFixed(2) + '%';

    if (stage && media && stage.classList.contains('has-parallax')) {
      var heroH = stage.offsetHeight || 1;
      var shift = Math.min(y, heroH) * 0.12;
      media.style.translate = '0 ' + shift.toFixed(1) + 'px';
    }
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  window.addEventListener('resize', function () { if (!ticking) { ticking = true; requestAnimationFrame(tick); } });
  tick();

  /* ---------- 2b) hochzählen, wenn sichtbar ---------- */
  var targets = document.querySelectorAll('.ob-count-num');
  if (!targets.length) return;
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCount(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(targets, function (b) { io.observe(b); });
  } else {
    Array.prototype.forEach.call(targets, runCount);
  }
})();
