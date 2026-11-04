/* „Weitere Produkte laden" — hängt die nächste Seite an das Grid an,
   ohne die Seite neu zu laden. Ohne JavaScript bleibt die Seiten-Navigation
   darunter bestehen, es geht also nichts verloren. */
(function () {
  var wrap = document.querySelector('[data-loadmore]');
  if (!wrap || !window.fetch) return;

  var btn = wrap.querySelector('.loadmore');
  var status = wrap.querySelector('.loadmore-status');
  var grid = document.querySelector('.pgrid');
  if (!btn || !grid) return;

  var laeuft = false;
  var MAX = 40;   // Sicherung gegen Endlosschleifen

  function melde(text) { if (status) status.textContent = text || ''; }

  /* eine weitere Seite laden; Promise → true, wenn danach noch mehr kommt */
  function ladeNaechste() {
    var url = btn.getAttribute('data-next');
    if (!url || laeuft) return Promise.resolve(false);
    laeuft = true;
    btn.disabled = true;
    var alt = btn.textContent;
    btn.textContent = 'Lädt …';
    melde('');
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var neue = doc.querySelectorAll('.pgrid > *');
        if (!neue.length) throw new Error('leer');
        var weiter, naechste, text;
        if (window.obShuffle) {
          naechste = window.obShuffle.append(Array.prototype.map.call(neue, function (el) { return document.importNode(el, true); }));
          text = window.obShuffle.label();
        } else {
          var frag = document.createDocumentFragment();
          Array.prototype.forEach.call(neue, function (el) { frag.appendChild(document.importNode(el, true)); });
          grid.appendChild(frag);
          weiter = doc.querySelector('[data-loadmore] .loadmore');
          naechste = weiter ? weiter.getAttribute('data-next') : null;
          text = weiter ? weiter.textContent.trim() : '';
        }
        MAX -= 1;
        laeuft = false;
        if (naechste && MAX > 0) {
          btn.setAttribute('data-next', naechste);
          btn.disabled = false;
          btn.textContent = text || 'Weitere Produkte laden';
          melde(neue.length + ' Produkte ergänzt');
          return true;
        }
        btn.removeAttribute('data-next');
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        return false;
      })
      .catch(function () {
        laeuft = false;
        btn.disabled = false;
        btn.textContent = alt;
        melde('Hat nicht geklappt — bitte die Seiten-Zahlen unten benutzen.');
        return false;
      });
  }

  btn.addEventListener('click', function () {
    ladeNaechste().then(function () { if (window.obFilterRefresh) window.obFilterRefresh(); });
  });

  /* Für Sortieren/Filtern: alle restlichen Seiten nachladen (shopfilter.js) */
  var alles = null;
  window.obLoadAll = function () {
    if (alles) return alles;
    alles = (function schleife() {
      return ladeNaechste().then(function (mehr) { return mehr ? schleife() : true; });
    })();
    return alles;
  };
  window.obAllLoaded = function () { return !btn.getAttribute('data-next') || !document.body.contains(btn); };
})();
