import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAZQFSKasHuCwg1I--hrvfT75nQJvdAyxU',
  authDomain: 'citas-e16ea.firebaseapp.com',
  projectId: 'citas-e16ea',
  appId: '1:922843428138:web:1d0df86ffa79eb414a5a53'
};

(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var todayISO = function () { return iso(new Date()); };
  var addDays = function (s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  var dayDiff = function (a, b) { return Math.round((parse(b) - parse(a)) / 86400000); };
  var fmtLong = function (d) { return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(d); };
  var fmtFull = function (d) { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); };
  var fmtShort = function (d) { return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(d); };
  var pl = function (n, one, many) { return n === 1 ? one : many; };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICONS = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    tv: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    list: '<path d="M4 7l2 2 3-3M4 17l2 2 3-3M13 8h7M13 18h7"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    pencil: '<path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>'
  };
  function icon(name) {
    var s = document.createElement('span');
    s.className = 'ic';
    s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
    return s;
  }

  function h(tag, props) {
    var el = document.createElement(tag);
    var p = props || {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var kids = [].concat(arguments[i]);
      for (var j = 0; j < kids.length; j++) {
        var c = kids[j];
        if (c == null || c === false) continue;
        el.append(c.nodeType ? c : document.createTextNode(String(c)));
      }
    }
    return el;
  }

  var CATS = {
    comida: { l: 'Comida', c: 'var(--amber)' },
    salida: { l: 'Salida', c: 'var(--rose)' },
    descanso: { l: 'Descanso', c: 'var(--sky)' },
    stream: { l: 'Stream', c: 'var(--violet)' },
    casa: { l: 'Casa', c: 'var(--sage)' },
    otro: { l: 'Otro', c: 'var(--ink-3)' }
  };
  var KINDS = { serie: 'Serie', anime: 'Anime', pelicula: 'Película', juego: 'Videojuego' };
  var WSTAT = [['por-ver', 'Por ver'], ['viendo', 'En curso'], ['terminado', 'Terminado']];
  var PSTAT = [['idea', 'Idea'], ['agendada', 'Agendada'], ['hecha', 'Hecha']];
  var IDEAS = ['Cena especial en casa', 'Picnic en el parque', 'Noche de cine', 'Caminata al atardecer', 'Cocinar algo nuevo juntos', 'Noche de juegos', 'Café y libros', 'Maratón en pijama'];
  var WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  var savedMe = 'a';
  try { savedMe = localStorage.getItem('nd-me') || 'a'; } catch (e) {}

  var S = {
    events: [], watch: [], plans: [], todos: [], memories: [], countdowns: [], polls: [], letters: [],
    loaded: {},
    settings: { nameA: 'Gary', nameB: 'Yumi' },
    me: savedMe,
    day: todayISO(), tab: 'hoy', sub: 'cartas',
    evCat: 'comida', wf: 'all', wkf: 'all', tf: 'all', yearly: false, pinLetter: true,
    uid: null, armed: null, pickId: null, ties: {}, editingRev: null
  };
  var db = null, auth = null, unsubs = [], armTimer = 0, toastTimer = 0, pickTimer = 0;

  var chains = {};
  function seq(path, fn) {
    var prev = chains[path] || Promise.resolve();
    var next = prev.catch(function () {}).then(fn);
    chains[path] = next;
    return next;
  }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function run(fn) {
    if (!db) { toast('Todavía no hay conexión con Firebase.'); return Promise.resolve(false); }
    return Promise.resolve().then(fn).then(function () { return true; }).catch(function (e) {
      var code = e && e.code;
      toast(code === 'permission-denied' ? 'No tienes permiso para guardar. Entra con tu correo.'
        : code === 'resource-exhausted' ? 'Se llegó al límite gratuito de Firebase por hoy.'
        : 'No se pudo guardar. Intenta de nuevo.');
      return false;
    });
  }
  function add(col, data) { data.createdAt = Date.now(); data.by = S.me; return addDoc(collection(db, col), data); }

  /* ---------- Notificaciones (Firebase Cloud Messaging) ---------- */
  // Clave pública Web Push (Firebase → Configuración → Cloud Messaging → Certificados push web).
  // Mientras esté vacía, la sección de avisos no aparece.
  var VAPID_KEY = '';
  var FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

  function pushSupported() {
    return !!VAPID_KEY && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }
  function saveDevice(token) {
    token = token || localStorage.getItem('nd-push-token');
    if (!db || !token || !S.uid) return Promise.resolve();
    return setDoc(doc(db, 'settings', 'device-' + token), {
      kind: 'device', token: token, me: S.me, uid: S.uid, updatedAt: Date.now()
    }, { merge: true });
  }
  function enablePush() {
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error('denied');
      return Promise.all([import(FIREBASE_SDK + 'firebase-messaging.js'), navigator.serviceWorker.ready]);
    }).then(function (r) {
      var m = r[0];
      return m.getToken(m.getMessaging(), { vapidKey: VAPID_KEY, serviceWorkerRegistration: r[1] });
    }).then(function (token) {
      if (!token) throw new Error('notoken');
      try { localStorage.setItem('nd-push-token', token); } catch (e) {}
      return saveDevice(token);
    });
  }
  function setupNotifications() {
    var box = $('#notif-box');
    if (!box) return;
    var txt = $('#notif-txt'), btn = $('#btn-notif');
    if (!VAPID_KEY) { box.hidden = true; return; }
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    box.hidden = false;
    if (ios && !standalone) {
      txt.textContent = 'En iPhone los avisos solo funcionan con la app instalada: Safari → Compartir → Agregar a pantalla de inicio, y actívalos desde ahí.';
      btn.hidden = true;
      return;
    }
    if (!pushSupported()) {
      txt.textContent = 'Este navegador no permite avisos.';
      btn.hidden = true;
      return;
    }
    function paint() {
      var on = Notification.permission === 'granted' && !!localStorage.getItem('nd-push-token');
      if (Notification.permission === 'denied') {
        txt.textContent = 'Los avisos están bloqueados. Actívalos en los ajustes del navegador o de la app.';
        btn.hidden = true;
      } else if (on) {
        txt.textContent = 'Avisos activados en este celular ✓ (te llegan los cambios que haga la otra persona).';
        btn.hidden = true;
      } else {
        txt.textContent = 'Recibe un aviso cuando la otra persona agregue una cartita, pendiente, fecha, plan o algo al catálogo. Primero elige arriba "En este celular soy".';
        btn.hidden = false;
      }
    }
    btn.addEventListener('click', function () {
      btn.disabled = true;
      enablePush().then(function () { toast('¡Avisos activados!'); }).catch(function (e) {
        toast(e && e.message === 'denied' ? 'No diste permiso para los avisos.' : 'No se pudieron activar los avisos.');
      }).then(function () { btn.disabled = false; paint(); });
    });
    paint();
  }
  function goTo(tab, sub) {
    var t = $('.tab[data-tab="' + tab + '"]');
    if (t) t.click();
    if (sub) { var c = $('.chip[data-sub="' + sub + '"]'); if (c) c.click(); }
  }
  function setupDeepLink() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get('tab')) goTo(q.get('tab'), q.get('sub'));
      if (q.get('wrapped')) setTimeout(openWrapped, 1200);
    } catch (e) {}
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function (ev) {
        if (ev.data && ev.data.type === 'nd-goto') goTo(ev.data.tab, ev.data.sub);
      });
    }
  }

  function upd(col, id, data) { var p = col + '/' + id; return seq(p, function () { return updateDoc(doc(db, p), data); }); }
  function del(col, id) { var p = col + '/' + id; return seq(p, function () { return deleteDoc(doc(db, p)); }); }

  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve('');
      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          var maxW = 800, w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function checkBtn(on, fn) {
    return h('button', { type: 'button', class: 'icon-btn ok' + (on ? ' on' : ''), 'aria-pressed': String(!!on), 'aria-label': on ? 'Marcar como pendiente' : 'Marcar como hecha', onclick: fn }, icon('check'));
  }
  function delBtn(col, id) {
    var key = col + '/' + id, armed = S.armed === key;
    return h('button', {
      type: 'button', class: 'icon-btn' + (armed ? ' armed' : ''), 'aria-label': armed ? 'Confirmar borrado' : 'Borrar',
      onclick: function () {
        if (S.armed === key) { S.armed = null; run(function () { return del(col, id); }); renderAll(); return; }
        S.armed = key; renderAll();
        clearTimeout(armTimer);
        armTimer = setTimeout(function () { if (S.armed === key) { S.armed = null; renderAll(); } }, 3000);
      }
    }, armed ? 'Borrar' : icon('trash'));
  }
  function emptyMsg(key, text) { return h('li', { class: 'empty', text: S.loaded[key] ? text : 'Cargando…' }); }
  function nm(k) { return k === 'a' ? S.settings.nameA : k === 'b' ? S.settings.nameB : 'Ambos'; }
  function chip(label, on, fn, extra) {
    return h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), 'aria-pressed': String(!!on), onclick: fn }, label, extra || null);
  }

  function renderRibbon() {
    var rib = $('#ribbon');
    var now = todayISO();
    var upcoming = S.countdowns.map(function (c) {
      var target = c.date;
      if (c.yearly && target) {
        var curYear = new Date().getFullYear();
        var md = target.slice(5);
        target = curYear + '-' + md;
        if (dayDiff(now, target) < 0) target = (curYear + 1) + '-' + md;
      }
      return { title: c.title, diff: dayDiff(now, target) };
    }).filter(function (c) { return c.diff >= 0; }).sort(function (a, b) { return a.diff - b.diff; });

    if (!upcoming.length) {
      rib.hidden = true;
      return;
    }
    rib.hidden = false;
    var next = upcoming[0];
    rib.replaceChildren(
      next.diff === 0
        ? h('span', {}, '¡Hoy es ', h('b', { text: next.title }), '!')
        : h('span', {}, 'Faltan ', h('b', { text: next.diff + ' ' + pl(next.diff, 'día', 'días') }), ' para ', h('b', { text: next.title }))
    );
  }

  function renderHoy() {
    var d = parse(S.day);
    $('#day-label').textContent = fmtLong(d);
    var week = $('#week');
    week.replaceChildren();
    var dow = (d.getDay() + 6) % 7, start = addDays(S.day, -dow), has = {};
    S.events.forEach(function (e) { has[e.date] = true; });
    for (var i = 0; i < 7; i++) {
      (function (s, i) {
        var dd = parse(s);
        week.append(h('button', {
          type: 'button', class: 'wd' + (s === S.day ? ' on' : '') + (s === todayISO() ? ' is-today' : ''),
          'aria-pressed': String(s === S.day), 'aria-label': fmtLong(dd),
          onclick: function () { S.day = s; renderHoy(); }
        }, h('span', { class: 'wd-n', text: WD[i] }), h('span', { class: 'wd-d', text: dd.getDate() }), h('span', { class: 'wd-dot' + (has[s] ? ' has' : '') })));
      })(addDays(start, i), i);
    }
    var items = S.events.filter(function (e) { return e.date === S.day; })
      .sort(function (a, b) { return (a.time || '').localeCompare(b.time || '') || (a.createdAt || 0) - (b.createdAt || 0); });
    var ul = $('#ev-list');
    ul.replaceChildren();
    if (!items.length) ul.append(emptyMsg('events', 'Nada planeado para este día. Agrega la primera actividad arriba.'));
    items.forEach(function (e) {
      var cat = CATS[e.cat] || CATS.otro;
      ul.append(h('li', { class: 'ev' + (e.done ? ' done' : ''), style: '--cat:' + cat.c },
        h('span', { class: 'ev-time', text: e.time || 'Todo el día' }),
        h('span', { class: 'ev-dot' }),
        h('div', { class: 'ev-body' },
          h('span', { class: 'ev-title', text: e.title }),
          e.note ? h('span', { class: 'ev-note', text: e.note }) : null,
          h('span', { class: 'tag', text: cat.l })),
        h('div', { class: 'row-actions' },
          checkBtn(e.done, function () { run(function () { return upd('events', e.id, { done: !e.done }); }); }),
          delBtn('events', e.id))));
    });
    var done = items.filter(function (e) { return e.done; }).length;
    $('#prog').hidden = !items.length;
    $('#prog-t').textContent = done + ' de ' + items.length + ' ' + pl(items.length, 'hecha', 'hechas');
    $('#prog-b').style.width = items.length ? Math.round(done / items.length * 100) + '%' : '0';
  }

  function buildCats() {
    var box = $('#ev-cats');
    Object.keys(CATS).forEach(function (k) {
      box.append(h('button', {
        type: 'button', role: 'radio', class: 'chip' + (k === S.evCat ? ' on' : ''), 'aria-checked': String(k === S.evCat),
        style: '--cat:' + CATS[k].c, dataset: { k: k },
        onclick: function () {
          S.evCat = k;
          $$('#ev-cats .chip').forEach(function (b) { var on = b.dataset.k === k; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
        }
      }, h('i', { class: 'cdot' }), CATS[k].l));
    });
  }

  /* ============================================================
     BÚSQUEDA (rápida, progresiva, con detección de categoría)
     ------------------------------------------------------------
     Una sola barra para todo. Busca por título en español, inglés
     o romaji (ej. "Koi to Uso" = "Love and Lies").
     Fuentes sin llave (funcionan tal cual):
       Anime        -> AniList (romaji, inglés, nativo y sinónimos)
       Serie        -> TVMaze + iTunes (tienda MX, títulos en español)
       Película     -> iTunes (tienda MX, títulos en español)
       Videojuego   -> CheapShark (PC)
     Opcional: pega una llave gratuita de RAWG para mejores
     resultados de videojuegos (https://rawg.io/apidocs).
     ============================================================ */
  var RAWG_KEY = '';
  // Llave gratis de TMDB (themoviedb.org → Configuración → API). Mejora mucho la búsqueda de películas en español.
  var TMDB_KEY = 'c0c4040a9c629e4f871e96dbf4bdb8ff';
  var SEARCH_TIMEOUT = 5000;
  var DEBOUNCE_MS = 180;
  var MAX_SUGGESTIONS = 8;

  var searchTimer = null;
  var searchCache = {};
  var activeSearch = null;
  var kindAuto = false;      // true cuando la categoría la puso la detección automática
  var currentItems = [];
  var activeIdx = -1;

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  function httpsUrl(u) { return u ? String(u).replace(/^http:\/\//i, 'https://') : ''; }
  function yearOf(s) { var m = /^(\d{4})/.exec(s || ''); return m ? m[1] : ''; }
  function getJson(url, opts) {
    return fetch(url, opts).then(function (r) { return r.ok ? r.json() : null; });
  }

  /* ---------- Fuentes ---------- */
  function srcAnime(q, signal) {
    var gql = 'query($s:String){Page(perPage:5){media(search:$s,type:ANIME,sort:SEARCH_MATCH){' +
      'seasonYear synonyms title{romaji english native} coverImage{large} externalLinks{site type}}}}';
    return getJson('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: gql, variables: { s: q } }),
      signal: signal
    }).then(function (d) {
      if (!d || !d.data || !d.data.Page) return null;
      return (d.data.Page.media || []).map(function (m) {
        var t = m.title || {};
        var plats = (m.externalLinks || []).filter(function (l) { return l.type === 'STREAMING' && l.site; })
          .map(function (l) { return l.site; });
        var title = t.english || t.romaji || '';
        var alts = [t.romaji, t.english, t.native].concat(m.synonyms || []).filter(function (x) { return x && x !== title; });
        return {
          title: title,
          aka: t.romaji && t.romaji !== title ? t.romaji : '',
          alts: alts,
          kind: 'anime',
          img: httpsUrl(m.coverImage && m.coverImage.large),
          plats: plats,
          year: m.seasonYear ? String(m.seasonYear) : '',
          src: 'anilist'
        };
      });
    });
  }

  function srcSeries(q, signal) {
    return getJson('https://api.tvmaze.com/search/shows?q=' + encodeURIComponent(q), { signal: signal })
      .then(function (d) {
        if (!Array.isArray(d)) return null;
        return d.slice(0, 4).map(function (s) {
          var sh = s.show || {};
          var plats = [];
          if (sh.webChannel && sh.webChannel.name) plats.push(sh.webChannel.name);
          if (sh.network && sh.network.name) plats.push(sh.network.name);
          var isAnime = (sh.genres || []).indexOf('Anime') !== -1 || (sh.type === 'Animation' && sh.language === 'Japanese');
          return {
            title: sh.name || '',
            kind: isAnime ? 'anime' : 'serie',
            img: httpsUrl(sh.image && (sh.image.medium || sh.image.original)),
            plats: plats,
            year: yearOf(sh.premiered),
            src: 'tvmaze'
          };
        });
      });
  }

  // Series en español (tienda MX). Muestra el nombre de la serie, no el de cada temporada.
  function srcTvItunes(q, signal) {
    var url = 'https://itunes.apple.com/search?media=tvShow&entity=tvSeason&limit=10&country=MX&term=' + encodeURIComponent(q);
    return getJson(url, { signal: signal }).then(function (d) {
      if (!d || !Array.isArray(d.results)) return null;
      var out = [], seen = {};
      d.results.forEach(function (r) {
        var name = r.artistName ||
          String(r.collectionName || '').replace(/,\s*(temporada|season|parte|part|volumen|vol\.?)\s*\d+.*$/i, '');
        var k = norm(name);
        if (!k || seen[k]) return;
        seen[k] = true;
        // Descarta resultados que no se parecen a lo escrito.
        if (matchScore({ title: name }, q) > 2) return;
        var art = httpsUrl(r.artworkUrl100 || '').replace(/\/\d+x\d+bb\.(jpg|png)/, '/300x450bb.$1');
        out.push({ title: name, kind: 'serie', img: art, plats: [], year: yearOf(r.releaseDate), src: 'itunes-tv' });
      });
      return out.slice(0, 3);
    });
  }

  function srcMovies(q, signal) {
    var url = 'https://itunes.apple.com/search?media=movie&entity=movie&limit=8&country=MX&term=' + encodeURIComponent(q);
    return getJson(url, { signal: signal }).then(function (d) {
      if (!d || !Array.isArray(d.results)) return null;
      return d.results.map(function (m) {
        var art = httpsUrl(m.artworkUrl100 || '').replace(/\/\d+x\d+bb\.(jpg|png)/, '/300x450bb.$1');
        return { title: m.trackName || '', kind: 'pelicula', img: art, plats: [], year: yearOf(m.releaseDate), src: 'itunes-movie' };
      });
    });
  }

  function srcMoviesTmdb(q, signal) {
    if (!TMDB_KEY) return Promise.resolve([]);
    var url = 'https://api.themoviedb.org/3/search/movie?include_adult=false&language=es-MX&page=1&api_key=' +
      encodeURIComponent(TMDB_KEY) + '&query=' + encodeURIComponent(q);
    return getJson(url, { signal: signal }).then(function (d) {
      if (!d || !Array.isArray(d.results)) return null;
      return Promise.all(d.results.slice(0, 6).map(function (m) {
        var title = m.title || m.original_title || '';
        var item = {
          title: title,
          aka: m.original_title && m.original_title !== title ? m.original_title : '',
          alts: [m.original_title],
          kind: 'pelicula',
          img: m.poster_path ? 'https://image.tmdb.org/t/p/w300' + m.poster_path : '',
          plats: [],
          year: yearOf(m.release_date),
          src: 'tmdb'
        };
        // Dónde verla en México (suscripción primero; si no hay, renta o compra).
        var purl = 'https://api.themoviedb.org/3/movie/' + m.id + '/watch/providers?api_key=' + encodeURIComponent(TMDB_KEY);
        return getJson(purl, { signal: signal }).then(function (pd) {
          var mx = pd && pd.results && pd.results.MX;
          var list = mx ? (mx.flatrate && mx.flatrate.length ? mx.flatrate : (mx.rent || mx.buy || [])) : [];
          item.plats = list.map(function (x) { return x.provider_name; }).filter(Boolean).slice(0, 4);
          return item;
        }).catch(function () { return item; });
      }));
    });
  }

  function srcGames(q, signal) {
    if (RAWG_KEY) {
      var url = 'https://api.rawg.io/api/games?page_size=4&search_precise=true&key=' + encodeURIComponent(RAWG_KEY) +
        '&search=' + encodeURIComponent(q);
      return getJson(url, { signal: signal }).then(function (d) {
        if (!d || !Array.isArray(d.results)) return null;
        return d.results.map(function (g) {
          var plats = (g.platforms || []).map(function (p) { return p.platform && p.platform.name; }).filter(Boolean);
          return { title: g.name || '', kind: 'juego', img: httpsUrl(g.background_image), plats: plats.slice(0, 3), year: yearOf(g.released) };
        });
      });
    }
    return getJson('https://www.cheapshark.com/api/1.0/games?limit=4&title=' + encodeURIComponent(q), { signal: signal })
      .then(function (d) {
        if (!Array.isArray(d)) return null;
        return d.map(function (g) {
          return { title: g.external || '', kind: 'juego', img: httpsUrl(g.thumb), plats: ['PC'], year: '' };
        });
      });
  }

  var SOURCES = { anime: [srcAnime], serie: [srcSeries, srcTvItunes], pelicula: [srcMoviesTmdb, srcMovies], juego: [srcGames] };

  /* ---------- Relevancia ----------
     0 = igual, 1 = empieza con, 2 = contiene (o tiene todas las palabras), 3 = otro.
     Mira el título y todos sus nombres alternos (romaji, inglés, sinónimos). */
  function matchScore(it, q) {
    var qq = norm(q), toks = qq.split(' '), best = 3;
    if (!qq) return best;
    [it.title].concat(it.alts || []).forEach(function (t) {
      var n = norm(t);
      if (!n) return;
      var sc = n === qq ? 0 : n.indexOf(qq) === 0 ? 1
        : (n.indexOf(qq) !== -1 || toks.every(function (w) { return n.indexOf(w) !== -1; })) ? 2 : 3;
      if (sc < best) best = sc;
    });
    return best;
  }
  function rank(items, q) {
    // Misma relevancia: gana el título más corto (más parecido a lo escrito); luego, el que llegó primero.
    return items.map(function (it, i) { return { it: it, score: matchScore(it, q), len: String(it.title || '').length, i: i }; })
      .sort(function (a, b) {
        return a.score - b.score || (a.score < 3 ? a.len - b.len : 0) || a.i - b.i;
      })
      .map(function (x) { return x.it; });
  }

  /* ---------- Búsqueda progresiva ----------
     onPartial(items, done) se llama cada vez que responde una fuente.
     Devuelve un handle con abort(). */
  function searchProgressive(query, kindHint, onPartial) {
    var q = (query || '').trim();
    var key = norm(q) + '|' + (kindHint || 'auto');
    var ctrl = new AbortController();
    var handle = { dead: false, abort: function () { handle.dead = true; ctrl.abort(); } };

    if (q.length < 2) { onPartial([], true); return handle; }
    if (searchCache[key]) { onPartial(searchCache[key], true); return handle; }

    var kinds = kindHint && SOURCES[kindHint] ? [kindHint] : Object.keys(SOURCES);
    var jobs = [];
    kinds.forEach(function (k) { SOURCES[k].forEach(function (fn) { jobs.push(fn); }); });
    // Si AniList está activo, ignora los animes que TVMaze marca (AniList los trae mejor).
    var dropTvAnime = kinds.indexOf('anime') !== -1;
    var pending = jobs.length, all = [], seen = {}, failed = false;
    var timer = setTimeout(function () { ctrl.abort(); }, SEARCH_TIMEOUT);

    function finishOne(items, ok) {
      if (handle.dead) return;
      if (!ok) failed = true;
      (items || []).forEach(function (it) {
        if (dropTvAnime && it.src === 'tvmaze' && it.kind === 'anime') return;
        var k = norm(it.title) + '|' + it.kind;
        if (!norm(it.title)) return;
        if (seen[k] !== undefined) {           // repetido: completa lo que falte
          var cur = all[seen[k]];
          if (!cur.img && it.img) cur.img = it.img;
          if (!cur.year && it.year) cur.year = it.year;
          if (!(cur.plats && cur.plats.length) && it.plats) cur.plats = it.plats;
          return;
        }
        seen[k] = all.length;
        all.push(it);
      });
      pending--;
      var done = pending === 0;
      var sorted = rank(all, q);
      if (done) {
        clearTimeout(timer);
        if (!failed) searchCache[key] = sorted;
      }
      onPartial(sorted, done);
    }

    jobs.forEach(function (fn) {
      var p;
      try { p = fn(q, ctrl.signal); } catch (e) { p = Promise.reject(e); }
      p.then(
        function (items) { finishOne(items || [], items !== null && items !== undefined); },
        function () { finishOne([], false); }
      );
    });
    return handle;
  }

  // Versión en promesa: espera a que terminen todas las fuentes.
  function fetchAllMatches(query, kindHint) {
    return new Promise(function (resolve) {
      searchProgressive(query, kindHint || null, function (items, done) { if (done) resolve(items); });
    });
  }

  /* ---------- Plataformas detectadas ---------- */
  function setDetectedPlatforms(plats, queryTitle, kind) {
    var box = $('#detected-plats-box'), list = $('#detected-plats');
    list.replaceChildren();
    var unique = [];
    (plats || []).forEach(function (p) { if (p && unique.indexOf(p) === -1) unique.push(p); });

    var animeSites = ['JKanime', 'AnimeFLV', 'MonosChinos'];
    var extra = kind === 'anime' ? animeSites
              : kind === 'juego' ? ['PC', 'Xbox', 'PlayStation', 'Switch']
              : [];
    extra.forEach(function (site) { if (unique.indexOf(site) === -1) unique.push(site); });

    if (!unique.length && !queryTitle) { box.hidden = true; return; }
    box.hidden = false;
    unique.forEach(function (p) {
      var isCustomWeb = animeSites.indexOf(p) !== -1;
      var chipClass = 'chip' + ($('#w-plat').value === p ? ' on' : '');

      if (isCustomWeb && queryTitle) {
        var searchUrl = p === 'JKanime' ? 'https://jkanime.net/es/buscar/?q=' + encodeURIComponent(queryTitle)
                      : p === 'AnimeFLV' ? 'https://animeskak.com/browse?q=' + encodeURIComponent(queryTitle)
                      : 'https://monoschinos.com/animes?q=' + encodeURIComponent(queryTitle);

        list.append(h('a', {
          href: searchUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: chipClass,
          style: 'text-decoration:none;',
          text: p + ' ↗'
        }));
      } else {
        list.append(h('button', {
          type: 'button',
          class: chipClass,
          onclick: function () {
            $('#w-plat').value = p;
            $$('#detected-plats .chip').forEach(function (c) { c.classList.toggle('on', c.textContent === p); });
            toast('Plataforma elegida: ' + p);
          }
        }, p));
      }
    });

    if (queryTitle && kind !== 'juego') {
      list.append(h('a', {
        href: 'https://www.justwatch.com/mx/buscar?q=' + encodeURIComponent(queryTitle),
        target: '_blank', rel: 'noopener noreferrer',
        class: 'chip', style: 'text-decoration:none;border-style:dashed;color:var(--gold)',
        text: 'Verificar en JustWatch MX ↗'
      }));
    }
  }

  /* ---------- Elegir un resultado ---------- */
  function applyPick(it) {
    $('#w-title').value = it.title;
    $('#w-kind').value = it.kind;
    kindAuto = true;
    $('#w-cover').value = it.img || '';
    $('#w-plat').value = (it.plats && it.plats[0]) || '';
    setDetectedPlatforms(it.plats, it.title, it.kind);
    toast('Detectado como ' + (KINDS[it.kind] || it.kind));
  }

  function itemSub(it) {
    return (KINDS[it.kind] || 'Título') + (it.year ? ' · ' + it.year : '') + (it.plats && it.plats[0] ? ' · ' + it.plats[0] : '');
  }
  function placeholderThumb(it) {
    return h('span', { class: 'auto-ph', text: (KINDS[it.kind] || '?').slice(0, 5) });
  }

  // Reparte los lugares entre categorías (cada una aporta su mejor resultado primero),
  // para que las series no tapen a las películas ni a los juegos.
  function diversify(items, max) {
    var groups = {}, order = [];
    items.forEach(function (it) {
      if (!groups[it.kind]) { groups[it.kind] = []; order.push(it.kind); }
      groups[it.kind].push(it);
    });
    var out = [], round = 0;
    while (out.length < max && order.some(function (k) { return groups[k].length > round; })) {
      order.forEach(function (k) { if (out.length < max && groups[k][round]) out.push(groups[k][round]); });
      round++;
    }
    return out;
  }

  /* ---------- Desplegable tipo buscador ---------- */
  function setupAutocomplete() {
    var input = $('#w-title');
    var dropdown = $('#autocomplete-list');
    var kindSel = $('#w-kind');

    function markActive() {
      var els = $$('.auto-item', dropdown);
      els.forEach(function (el, i) { el.classList.toggle('active', i === activeIdx); });
      if (els[activeIdx] && els[activeIdx].scrollIntoView) els[activeIdx].scrollIntoView({ block: 'nearest' });
    }

    function renderDropdown(items, done) {
      currentItems = diversify(items, MAX_SUGGESTIONS);
      activeIdx = -1;
      dropdown.replaceChildren();
      dropdown.hidden = false;
      if (!currentItems.length) {
        dropdown.append(h('div', { class: 'auto-note', text: done ? 'Sin coincidencias. Puedes escribirlo a mano.' : 'Buscando…' }));
        return;
      }
      currentItems.forEach(function (it, i) {
        var thumb = it.img
          ? h('img', { src: it.img, alt: '', loading: 'lazy', onerror: function () { this.replaceWith(placeholderThumb(it)); } })
          : placeholderThumb(it);
        dropdown.append(h('button', {
          type: 'button', class: 'auto-item',
          onmousedown: function (e) { e.preventDefault(); },
          onclick: function () { applyPick(it); dropdown.hidden = true; }
        },
          thumb,
          h('div', { class: 'auto-info' },
            h('span', { class: 'auto-title', text: it.title }),
            it.aka ? h('span', { class: 'auto-aka', text: it.aka }) : null,
            h('span', { class: 'auto-sub', text: itemSub(it) })
          )
        ));
      });
      if (!done) dropdown.append(h('div', { class: 'auto-note', text: 'Buscando más…' }));
    }

    input.addEventListener('input', function () {
      var val = this.value.trim();
      clearTimeout(searchTimer);
      if (activeSearch) activeSearch.abort();
      // Si la categoría la había puesto la detección, vuelve a automático para el nuevo título.
      if (kindAuto) { kindSel.value = 'auto'; kindAuto = false; }
      $('#w-cover').value = '';     // la portada guardada era del título anterior
      if (val.length < 2) { dropdown.hidden = true; return; }
      searchTimer = setTimeout(function () {
        var kind = kindSel.value === 'auto' ? null : kindSel.value;
        activeSearch = searchProgressive(val, kind, renderDropdown);
      }, DEBOUNCE_MS);
    });

    input.addEventListener('keydown', function (e) {
      if (dropdown.hidden) return;
      var n = currentItems.length;
      if (e.key === 'Escape') { dropdown.hidden = true; return; }
      if (!n) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = activeIdx < 0 ? 0 : (activeIdx + 1) % n; markActive(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = activeIdx < 0 ? n - 1 : (activeIdx - 1 + n) % n; markActive(); }
      else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); applyPick(currentItems[activeIdx]); dropdown.hidden = true; }
    });

    // Si cambias la categoría a mano, deja de ser automática.
    kindSel.addEventListener('change', function () { kindAuto = false; });

    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.hidden = true;
    });
  }

  /* ============== FIN BÚSQUEDA ============== */

  function calcMetacritic(w) {
    var sa = typeof w.scoreA === 'number' ? w.scoreA : null;
    var sb = typeof w.scoreB === 'number' ? w.scoreB : null;
    if (sa === null && sb === null && w.rating > 0) {
      sa = w.rating * 20;
    }
    var scores = [sa, sb].filter(function (v) { return v !== null; });
    if (!scores.length) return { avg: null, cls: 'tbd', verdict: 'Sin calificar todavía', sub: 'Cada quien puede poner su nota del 0 al 100' };
    var avg = Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length);
    var cls = avg >= 75 ? 'green' : avg >= 50 ? 'yellow' : 'red';
    var verdict = avg >= 85 ? 'Obra maestra de pareja' : avg >= 75 ? 'Aclamada por ambos' : avg >= 60 ? 'Entretenida / Recomendable' : avg >= 50 ? 'Opiniones divididas' : 'Decepción compartida';
    var sub = scores.length === 2 ? 'Promedio entre ' + nm('a') + ' (' + sa + ') y ' + nm('b') + ' (' + sb + ')' : 'Falta la calificación de ' + (sa === null ? nm('a') : nm('b'));
    return { avg: avg, cls: cls, verdict: verdict, sub: sub };
  }

  function renderWatch() {
    var kf = $('#w-kind-filters');
    kf.replaceChildren();
    kf.append(chip('Todo ' + S.watch.length, S.wkf === 'all', function () { S.wkf = 'all'; renderWatch(); }));
    Object.keys(KINDS).forEach(function (k) {
      var c = S.watch.filter(function (w) { return (w.kind || 'serie') === k; }).length;
      kf.append(chip(KINDS[k] + 's ' + c, S.wkf === k, function () { S.wkf = k; renderWatch(); }));
    });

    var f = $('#w-filters');
    f.replaceChildren();
    var byKind = S.watch.filter(function (w) { return S.wkf === 'all' || (w.kind || 'serie') === S.wkf; });
    var count = function (s) { return byKind.filter(function (w) { return (w.status || 'por-ver') === s; }).length; };
    f.append(chip('Todos estados ' + byKind.length, S.wf === 'all', function () { S.wf = 'all'; renderWatch(); }));
    WSTAT.forEach(function (s) { f.append(chip(s[1] + ' ' + count(s[0]), S.wf === s[0], function () { S.wf = s[0]; renderWatch(); })); });

    var order = { viendo: 0, 'por-ver': 1, terminado: 2 };
    var list = byKind.filter(function (w) { return S.wf === 'all' || (w.status || 'por-ver') === S.wf; })
      .sort(function (a, b) { return order[a.status || 'por-ver'] - order[b.status || 'por-ver'] || (b.createdAt || 0) - (a.createdAt || 0); });
    var ul = $('#w-list');
    ul.replaceChildren();
    if (!list.length) ul.append(emptyMsg('watch', S.watch.length ? 'No hay títulos con estos filtros.' : 'Agrega series, animes, películas o juegos arriba para armar su catálogo.'));

    list.forEach(function (w) {
      var status = w.status || 'por-ver', season = w.season || 1, ep = w.ep || 0;
      var mc = calcMetacritic(w);
      var showProgress = status === 'viendo' && (w.kind === 'serie' || w.kind === 'anime');

      var revCard = function (whoKey) {
        var score = whoKey === 'a' ? w.scoreA : w.scoreB;
        var text = whoKey === 'a' ? w.revA : w.revB;
        var isEditing = S.editingRev === (w.id + ':' + whoKey);
        var color = whoKey === 'a' ? 'var(--rose)' : 'var(--sky)';

        var editForm = null;
        if (isEditing) {
          var inpScore = h('input', { type: 'number', min: '0', max: '100', placeholder: '0-100', value: typeof score === 'number' ? score : '' });
          var inpText = h('textarea', { maxlength: '300', placeholder: 'Tu reseña individual…' }, text || '');
          editForm = h('div', { class: 'rev-edit' },
            h('div', { class: 'rev-edit-row' },
              h('span', { class: 'step-l', text: 'Nota (0-100):' }),
              inpScore,
              h('button', {
                type: 'button', class: 'btn sm',
                onclick: function () {
                  var raw = inpScore.value.trim();
                  var val = raw === '' ? null : Math.max(0, Math.min(100, Number(raw)));
                  var patch = {};
                  if (whoKey === 'a') { patch.scoreA = val; patch.revA = inpText.value.trim(); }
                  else { patch.scoreB = val; patch.revB = inpText.value.trim(); }
                  S.editingRev = null;
                  run(function () { return upd('watch', w.id, patch); });
                }
              }, 'Guardar'),
              h('button', { type: 'button', class: 'btn ghost sm', onclick: function () { S.editingRev = null; renderWatch(); } }, 'Cancelar')
            ),
            inpText
          );
        }

        return h('div', { class: 'rev-card' },
          h('div', { class: 'rev-head' },
            h('span', { class: 'rev-who', style: 'color:' + color, text: nm(whoKey) }),
            h('div', { style: 'display:flex;gap:6px;align-items:center' },
              h('span', { class: 'rev-score', text: typeof score === 'number' ? score + ' / 100' : 'Sin nota' }),
              !isEditing ? h('button', {
                type: 'button', class: 'icon-btn', style: 'height:26px;min-width:26px;font-size:.72rem',
                onclick: function () { S.editingRev = w.id + ':' + whoKey; renderWatch(); }
              }, 'Editar') : null
            )
          ),
          text ? h('p', { class: 'rev-text', text: text }) : h('p', { class: 'rev-empty', text: 'Aún no escribe reseña.' }),
          editForm
        );
      };

      ul.append(h('li', { class: 'w' },
        h('div', { class: 'w-top' },
          w.cover ? h('img', { class: 'w-cover', src: w.cover, alt: w.title }) : h('div', { class: 'w-cover-empty', text: KINDS[w.kind] || 'Título' }),
          h('div', {},
            h('h3', { class: 'w-title', text: w.title }),
            h('p', { class: 'w-meta', text: [KINDS[w.kind] || 'Serie', w.platform].filter(Boolean).join(' · ') }),
            h('div', { class: 'w-controls', style: 'margin-top:10px' },
              h('div', { class: 'seg', role: 'group', 'aria-label': 'Estado' }, WSTAT.map(function (s) {
                return h('button', { type: 'button', class: 'seg-b' + (status === s[0] ? ' on' : ''), 'aria-pressed': String(status === s[0]),
                  onclick: function () { if (status !== s[0]) run(function () { return upd('watch', w.id, s[0] === 'terminado' ? { status: s[0], finishedAt: Date.now() } : { status: s[0] }); }); } }, s[1]);
              })),
              showProgress ? h('div', { class: 'steps' },
                stepper('Temp', season, 1, function (v) { run(function () { return upd('watch', w.id, { season: v }); }); }),
                stepper('Ep', ep, 0, function (v) { run(function () { return upd('watch', w.id, { ep: v }); }); })) : null
            )
          ),
          delBtn('watch', w.id)
        ),
        h('div', { class: 'mc-panel' },
          h('div', { class: 'mc-header' },
            h('div', { class: 'mc-badge ' + mc.cls, text: mc.avg !== null ? mc.avg : 'TBD' }),
            h('div', { class: 'mc-summary' },
              h('p', { class: 'mc-verdict', text: mc.verdict }),
              h('p', { class: 'mc-sub', text: mc.sub })
            )
          ),
          h('div', { class: 'mc-reviews' }, revCard('a'), revCard('b'))
        )
      ));
    });
  }

  function stepper(label, val, min, fn) {
    return h('div', { class: 'step' },
      h('span', { class: 'step-l', text: label }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Restar ' + label.toLowerCase(), onclick: function () { if (val > min) fn(val - 1); } }, icon('minus')),
      h('span', { class: 'step-v', text: val }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Sumar ' + label.toLowerCase(), onclick: function () { fn(val + 1); } }, icon('plus')));
  }

  function pickRandom() {
    var pool = S.watch.filter(function (w) { return (w.status || 'por-ver') === 'por-ver' && (S.wkf === 'all' || (w.kind || 'serie') === S.wkf); });
    var box = $('#pick'), t = $('#pick-t'), m = $('#pick-m'), go = $('#pick-go'), again = $('#pick-again');
    box.hidden = false;
    clearInterval(pickTimer);
    if (!pool.length) {
      S.pickId = null; t.textContent = 'Nada pendiente en este filtro'; m.textContent = 'Agrega títulos con el estado «Por ver» y vuelve a sortear.'; go.hidden = true; again.hidden = true; return;
    }
    var final = pool[Math.floor(Math.random() * pool.length)];
    var show = function (w) {
      S.pickId = w.id; t.textContent = w.title;
      m.textContent = [KINDS[w.kind] || 'Serie', w.platform].filter(Boolean).join(' · ');
    };
    go.hidden = true; again.hidden = true;
    var finish = function () { show(final); go.hidden = false; again.hidden = pool.length < 2; };
    if (reduce || pool.length < 2) { finish(); return; }
    var n = 0;
    pickTimer = setInterval(function () {
      n++;
      if (n >= 9) { clearInterval(pickTimer); finish(); return; }
      show(pool[Math.floor(Math.random() * pool.length)]);
    }, 80);
  }

  function renderPlans() {
    var rank = { agendada: 0, idea: 1, hecha: 2 };
    var list = S.plans.slice().sort(function (a, b) {
      var sa = a.status || 'idea', sb = b.status || 'idea';
      if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
      if (sa === 'agendada') return (a.date || '9999').localeCompare(b.date || '9999');
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    var ul = $('#p-list');
    ul.replaceChildren();
    if (!list.length) ul.append(emptyMsg('plans', 'Todavía no hay planes. Toca una idea de arriba o escribe la tuya.'));
    list.forEach(function (p) {
      var status = p.status || 'idea', bits = [];
      if (p.place) bits.push(h('span', { text: p.place }));
      if (p.date) bits.push(h('span', { class: 'when', text: fmtLong(parse(p.date)) }));
      var meta = [];
      bits.forEach(function (b, i) { if (i) meta.push(' · '); meta.push(b); });
      ul.append(h('li', { class: 'plan st-' + status },
        h('div', { class: 'plan-head' },
          h('div', {}, h('h3', { class: 'plan-t', text: p.title }), meta.length ? h('p', { class: 'plan-m' }, meta) : null),
          delBtn('plans', p.id)),
        h('div', { class: 'seg', role: 'group', 'aria-label': 'Estado' }, PSTAT.map(function (s) {
          return h('button', { type: 'button', class: 'seg-b' + (status === s[0] ? ' on' : ''), 'aria-pressed': String(status === s[0]),
            onclick: function () { if (status !== s[0]) run(function () { return upd('plans', p.id, { status: s[0] }); }); } }, s[1]);
        }))));
    });
  }
  function buildIdeas() {
    var box = $('#p-ideas');
    IDEAS.forEach(function (t) {
      box.append(h('button', { type: 'button', class: 'chip', onclick: function () { var i = $('#p-title'); i.value = t; i.focus(); } }, t));
    });
  }

  function buildWho() {
    var sel = $('#td-who'), v = sel.value || 'both';
    sel.replaceChildren(h('option', { value: 'both', text: 'Ambos' }), h('option', { value: 'a', text: S.settings.nameA }), h('option', { value: 'b', text: S.settings.nameB }));
    sel.value = v;
    var meSel = $('#who-am-i');
    if (meSel) {
      meSel.replaceChildren(h('option', { value: 'a', text: S.settings.nameA }), h('option', { value: 'b', text: S.settings.nameB }));
      meSel.value = S.me;
    }
  }
  var WHOC = { a: 'var(--rose)', b: 'var(--sky)', both: 'var(--gold)' };
  function renderTodos() {
    var f = $('#td-filters');
    f.replaceChildren();
    [['all', 'Todos'], ['a', nm('a')], ['b', nm('b')], ['both', 'Ambos']].forEach(function (o) {
      f.append(chip(o[1], S.tf === o[0], function () { S.tf = o[0]; renderTodos(); }));
    });
    var list = S.todos.filter(function (t) { return S.tf === 'all' || (t.who || 'both') === S.tf; })
      .sort(function (a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || (b.createdAt || 0) - (a.createdAt || 0); });
    var ul = $('#td-list');
    ul.replaceChildren();
    if (!list.length) ul.append(emptyMsg('todos', S.todos.length ? 'No hay pendientes para esta persona.' : 'Sin pendientes por ahora. Agrega el primero arriba.'));
    var sepDone = false;
    list.forEach(function (t) {
      if (t.done && !sepDone) { sepDone = true; if (list.some(function (x) { return !x.done; })) ul.append(h('li', { class: 'sect', text: 'Hechos' })); }
      var who = t.who || 'both';
      ul.append(h('li', { class: 'td' + (t.done ? ' done' : '') },
        checkBtn(t.done, function () { run(function () { return upd('todos', t.id, { done: !t.done }); }); }),
        h('span', { class: 'td-t', text: t.title }),
        h('span', { class: 'who', style: '--cat:' + WHOC[who], text: nm(who) }),
        h('div', { class: 'row-actions' }, delBtn('todos', t.id))));
    });
  }

  function renderLetters() {
    var list = S.letters.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    var pinned = list.find(function (l) { return l.pinned; });
    var pBox = $('#pinned-box');
    if (pinned) {
      pBox.hidden = false;
      pBox.replaceChildren(h('div', { class: 'pinned-letter' },
        h('div', {},
          h('p', { class: 'pinned-letter-k', text: 'Nota fijada de ' + nm(pinned.from || 'a') }),
          h('p', { class: 'pinned-letter-b', text: pinned.body }),
          h('p', { class: 'pinned-letter-m', text: fmtShort(new Date(pinned.createdAt || Date.now())) })
        ),
        pinned.from === S.me ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Desfijar', onclick: function () { run(function () { return upd('letters', pinned.id, { pinned: false }); }); } }, icon('pin')) : null
      ));
    } else {
      pBox.hidden = true;
    }

    var ul = $('#lt-list');
    ul.replaceChildren();
    if (!list.length) {
      ul.append(h('p', { class: 'empty', text: S.loaded.letters ? 'No hay cartitas todavía. Escribe la primera arriba.' : 'Cargando…' }));
      return;
    }
    list.forEach(function (l) {
      ul.append(h('div', { class: 'letter' + (l.pinned ? ' pinned' : '') },
        h('div', { class: 'letter-head' },
          h('span', { class: 'letter-from', text: 'De ' + nm(l.from || 'a') }),
          h('div', { style: 'display:flex;gap:6px;align-items:center' },
            h('span', { class: 'letter-date', text: fmtShort(new Date(l.createdAt || Date.now())) }),
            l.from === S.me ? h('button', {
              type: 'button', class: 'icon-btn' + (l.pinned ? ' ok on' : ''),
              'aria-label': l.pinned ? 'Desfijar' : 'Fijar nota',
              onclick: function () {
                var willPin = !l.pinned;
                var p = Promise.resolve();
                if (willPin) {
                  S.letters.forEach(function (x) {
                    if (x.pinned && x.id !== l.id) p = p.then(function () { return upd('letters', x.id, { pinned: false }); });
                  });
                }
                p.then(function () { return run(function () { return upd('letters', l.id, { pinned: willPin }); }); });
              }
            }, icon('pin')) : null,
            l.from === S.me ? delBtn('letters', l.id) : null
          )
        ),
        h('p', { class: 'letter-body', text: l.body })
      ));
    });
  }

  function renderCountdowns() {
    var ul = $('#cd-list');
    ul.replaceChildren();
    var now = todayISO();
    var list = S.countdowns.map(function (c) {
      var target = c.date;
      if (c.yearly && target) {
        var curYear = new Date().getFullYear();
        var md = target.slice(5);
        target = curYear + '-' + md;
        if (dayDiff(now, target) < 0) target = (curYear + 1) + '-' + md;
      }
      return Object.assign({}, c, { nextDate: target, diff: dayDiff(now, target) });
    }).sort(function (a, b) { return (a.nextDate || '').localeCompare(b.nextDate || ''); });

    if (!list.length) {
      ul.append(h('p', { class: 'empty', text: S.loaded.countdowns ? 'No hay cuentas regresivas. Agrega una fecha especial arriba.' : 'Cargando…' }));
      return;
    }
    list.forEach(function (c) {
      var abs = Math.abs(c.diff);
      var kText = c.diff > 0 ? 'Faltan' : c.diff === 0 ? '¡Es hoy!' : 'Pasó hace';
      ul.append(h('div', { class: 'cd' },
        delBtn('countdowns', c.id),
        h('span', { class: 'cd-k', text: kText }),
        h('span', { class: 'cd-n', text: c.diff === 0 ? '0' : abs }),
        h('span', { class: 'cd-u', text: pl(abs, 'día', 'días') }),
        h('h3', { class: 'cd-t', text: c.title }),
        h('p', { class: 'cd-d', text: fmtFull(parse(c.nextDate)) + (c.yearly ? ' · Anual' : '') })
      ));
    });
  }

  function renderPolls() {
    var ul = $('#v-list');
    ul.replaceChildren();
    if (!S.polls.length) {
      ul.append(h('p', { class: 'empty', text: S.loaded.polls ? 'No hay votaciones activas. Crea una arriba.' : 'Cargando…' }));
      return;
    }
    S.polls.forEach(function (p) {
      var votes = p.votes || {};
      var myVote = votes[S.me] || null;
      var otherKey = S.me === 'a' ? 'b' : 'a';
      var otherVote = votes[otherKey] || null;
      var bothVoted = Boolean(myVote && otherVote);

      var countA = (votes.a === 'a' ? 1 : 0) + (votes.b === 'a' ? 1 : 0);
      var countB = (votes.a === 'b' ? 1 : 0) + (votes.b === 'b' ? 1 : 0);

      var voteFn = function (opt) {
        var nextVotes = Object.assign({}, votes);
        if (nextVotes[S.me] === opt) delete nextVotes[S.me];
        else nextVotes[S.me] = opt;
        run(function () { return upd('polls', p.id, { votes: nextVotes }); });
      };

      var statusText = bothVoted
        ? (countA === countB ? '¡Empate! Toca decidir juntos.' : 'Ganó: ' + (countA > countB ? p.a : p.b))
        : (myVote ? 'Esperando el voto de ' + nm(otherKey) + '…' : 'Toca tu opción favorita.');

      ul.append(h('div', { class: 'poll' },
        h('div', { class: 'poll-head' },
          h('h3', { class: 'poll-q', text: p.q }),
          delBtn('polls', p.id)
        ),
        h('div', { class: 'opts' },
          h('button', {
            type: 'button',
            class: 'opt' + (myVote === 'a' ? ' mine' : '') + (bothVoted && countA > countB ? ' win' : ''),
            onclick: function () { voteFn('a'); }
          },
            h('strong', { text: p.a }),
            bothVoted ? h('span', { class: 'opt-n', text: countA + ' ' + pl(countA, 'voto', 'votos') }) : null
          ),
          h('button', {
            type: 'button',
            class: 'opt' + (myVote === 'b' ? ' mine' : '') + (bothVoted && countB > countA ? ' win' : ''),
            onclick: function () { voteFn('b'); }
          },
            h('strong', { text: p.b }),
            bothVoted ? h('span', { class: 'opt-n', text: countB + ' ' + pl(countB, 'voto', 'votos') }) : null
          )
        ),
        h('p', { class: 'poll-s', text: statusText })
      ));
    });
  }

  function renderMemories() {
    var grid = $('#m-list');
    grid.replaceChildren();
    var list = S.memories.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0); });
    if (!list.length) {
      grid.append(h('p', { class: 'empty', text: S.loaded.memories ? 'Aún no hay recuerdos guardados. Agrega el primero arriba.' : 'Cargando…' }));
      return;
    }
    list.forEach(function (m) {
      grid.append(h('div', { class: 'mem-card' },
        m.photo ? h('img', { class: 'mem-img', src: m.photo, alt: m.title }) : null,
        h('div', { class: 'mem-body' },
          h('div', { class: 'mem-top' },
            h('div', {},
              m.date ? h('time', { text: fmtFull(parse(m.date)) }) : null,
              h('h3', { class: 'mem-t', text: m.title })
            ),
            delBtn('memories', m.id)
          ),
          m.note ? h('p', { class: 'mem-n', text: m.note }) : null
        )
      ));
    });
  }

  /* ---------- Vistas directas (?vista=notas / ?vista=fotos) ---------- */
  function setupSoloView() {
    var v = new URLSearchParams(location.search).get('vista');
    if (v !== 'notas' && v !== 'fotos') return;
    var titulo = v === 'notas' ? 'Notas' : 'Fotos';
    document.body.classList.add('solo', 'solo-' + v);
    document.title = titulo + ' · Nuestro Día';
    var h1 = $('.top h1'); if (h1) h1.textContent = titulo;
    var metaTitle = $('meta[name="apple-mobile-web-app-title"]'); if (metaTitle) metaTitle.setAttribute('content', titulo);
    var touch = $('link[rel="apple-touch-icon"]'); if (touch) touch.setAttribute('href', 'icons/' + v + '-192.png');
    $('.tab[data-tab="nosotros"]').click();
    $('.subtabs .chip[data-sub="' + (v === 'notas' ? 'cartas' : 'recuerdos') + '"]').click();
  }

  /* ---------- Instalar como app ---------- */
  function setupInstall() {
    var txt = $('#install-txt'), btn = $('#btn-install'), short = $('#install-short');
    var deferred = null;
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var android = /android/i.test(navigator.userAgent);

    if (standalone) {
      txt.hidden = true;
    } else {
      txt.textContent = ios
        ? 'Para instalarla en iPhone: ábrela en Safari, toca Compartir y luego «Agregar a pantalla de inicio».'
        : 'Instálala como app para abrirla desde la pantalla de inicio, sin la barra del navegador.';
    }
    short.textContent = ios
      ? 'Para un icono aparte de notas o fotos: abre «Solo notas» o «Solo fotos» en Safari y agrégalo a la pantalla de inicio.'
      : android
        ? 'Para un icono aparte de notas o fotos: con la app instalada, mantén presionado su icono y arrastra «Notas» o «Fotos» a la pantalla de inicio.'
        : 'Para un icono aparte de notas o fotos, usa estos accesos directos desde el celular.';

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      btn.hidden = false;
    });
    btn.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; btn.hidden = true; });
    });
    window.addEventListener('appinstalled', function () { btn.hidden = true; toast('¡App instalada!'); });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }


  /* ---------- Wrapped (1 de enero → 2 de diciembre) ---------- */
  function wrappedRange() {
    var y = new Date().getFullYear();
    return { y: y, from: y + '-01-01', to: y + '-12-02', ready: todayISO() >= y + '-12-02' };
  }
  function inISO(d, r) { return !!d && d >= r.from && d <= r.to; }
  function tsISO(t) { return t ? iso(new Date(t)) : ''; }
  function topKey(map) {
    var best = null;
    Object.keys(map).forEach(function (k) { if (best === null || map[k] > map[best]) best = k; });
    return best;
  }

  function wrappedStats() {
    var r = wrappedRange();
    var ev = S.events.filter(function (e) { return inISO(e.date, r); });
    var cat = {}, month = {};
    ev.forEach(function (e) {
      cat[e.cat || 'otro'] = (cat[e.cat || 'otro'] || 0) + 1;
      var m = Number(String(e.date).slice(5, 7)) - 1;
      month[m] = (month[m] || 0) + 1;
    });
    var seen = S.watch.filter(function (w) { return w.status === 'terminado' && inISO(tsISO(w.finishedAt || w.createdAt), r); });
    var kinds = {};
    seen.forEach(function (w) { kinds[w.kind] = (kinds[w.kind] || 0) + 1; });
    var rated = seen.map(function (w) { return { w: w, avg: calcMetacritic(w).avg }; })
      .filter(function (x) { return x.avg !== null; }).sort(function (a, b) { return b.avg - a.avg; });
    var letters = S.letters.filter(function (l) { return inISO(tsISO(l.createdAt), r); });
    var byA = letters.filter(function (l) { return l.from === 'a'; }).length;
    var mem = S.memories.filter(function (m) { return inISO(m.date || tsISO(m.createdAt), r); });
    var todosDone = S.todos.filter(function (t) { return t.done && inISO(tsISO(t.createdAt), r); }).length;
    var plansDone = S.plans.filter(function (p) { return p.status === 'hecha' && inISO(p.date || tsISO(p.createdAt), r); }).length;
    return {
      r: r, events: ev, evDone: ev.filter(function (e) { return e.done; }).length,
      topCat: topKey(cat), topMonth: topKey(month), cat: cat,
      seen: seen, kinds: kinds, rated: rated,
      letters: letters.length, lettersA: byA, lettersB: letters.length - byA,
      mem: mem, todosDone: todosDone, plansDone: plansDone
    };
  }

  function wrappedSlides() {
    var st = wrappedStats(), slides = [];
    var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var names = nm('a') + ' y ' + nm('b');

    slides.push({ tone: 'rose', kicker: names, big: 'Nuestro ' + st.r.y, sub: 'Del 1 de enero al 2 de diciembre.' + (st.r.ready ? '' : ' (Avance: todavía no llega el 2 de diciembre.)') });

    if (st.events.length) {
      slides.push({
        tone: 'amber', kicker: 'Nuestros días', big: String(st.events.length),
        sub: pl(st.events.length, 'actividad', 'actividades') + ' juntos, ' + st.evDone + ' ya hechas.',
        extra: [
          st.topCat ? 'Lo que más hicimos: ' + (CATS[st.topCat] ? CATS[st.topCat].l : st.topCat).toLowerCase() + ' (' + st.cat[st.topCat] + ')' : '',
          st.topMonth !== null ? 'Nuestro mes más activo: ' + MONTHS[Number(st.topMonth)] : ''
        ]
      });
    }
    if (st.seen.length) {
      var kindTxt = Object.keys(st.kinds).map(function (k) { return st.kinds[k] + ' ' + (KINDS[k] || k).toLowerCase() + (st.kinds[k] === 1 ? '' : 's'); }).join(' · ');
      slides.push({ tone: 'violet', kicker: 'Catálogo', big: String(st.seen.length), sub: pl(st.seen.length, 'título terminado', 'títulos terminados') + ' juntos.', extra: [kindTxt],
        covers: st.seen.filter(function (w) { return w.cover; }).slice(0, 6).map(function (w) { return w.cover; }) });
    }
    if (st.rated.length) {
      var top = st.rated[0];
      slides.push({ tone: 'sage', kicker: 'Lo mejor calificado', big: top.w.title, sub: 'Promedio de ' + top.avg + ' / 100', small: true,
        covers: top.w.cover ? [top.w.cover] : [],
        extra: st.rated.slice(1, 4).map(function (x, i) { return (i + 2) + '. ' + x.w.title + ' (' + x.avg + ')'; }) });
    }
    if (st.letters) {
      slides.push({ tone: 'rose', kicker: 'Cartitas', big: String(st.letters), sub: pl(st.letters, 'cartita escrita', 'cartitas escritas'),
        extra: [nm('a') + ': ' + st.lettersA + ' · ' + nm('b') + ': ' + st.lettersB] });
    }
    if (st.mem.length) {
      slides.push({ tone: 'sky', kicker: 'Recuerdos', big: String(st.mem.length), sub: pl(st.mem.length, 'recuerdo guardado', 'recuerdos guardados'),
        covers: st.mem.filter(function (m) { return m.photo; }).slice(0, 6).map(function (m) { return m.photo; }) });
    }
    if (st.todosDone || st.plansDone) {
      slides.push({ tone: 'gold', kicker: 'Cumplimos', big: String(st.todosDone + st.plansDone), sub: 'cosas hechas',
        extra: [st.todosDone + ' ' + pl(st.todosDone, 'pendiente', 'pendientes') + ' · ' + st.plansDone + ' ' + pl(st.plansDone, 'plan', 'planes')] });
    }
    slides.push({ tone: 'rose', kicker: 'Y lo que viene', big: 'Más de nosotros', sub: 'Gracias por cada día, ' + names + ' ❤' });
    return slides;
  }

  var wrappedEl = null;
  function openWrapped() {
    var slides = wrappedSlides(), idx = 0;
    if (wrappedEl) wrappedEl.remove();
    var bars = slides.map(function () { return h('i', {}); });
    var stage = h('div', { class: 'wr-stage' });
    wrappedEl = h('div', { class: 'wrapped', role: 'dialog', 'aria-label': 'Nuestro Wrapped' },
      h('div', { class: 'wr-bars' }, bars),
      h('button', { type: 'button', class: 'wr-close', 'aria-label': 'Cerrar', onclick: close }, '✕'),
      stage,
      h('button', { type: 'button', class: 'wr-nav wr-prev', 'aria-label': 'Anterior', onclick: function () { go(idx - 1); } }),
      h('button', { type: 'button', class: 'wr-nav wr-next', 'aria-label': 'Siguiente', onclick: function () { go(idx + 1); } })
    );
    function close() { document.removeEventListener('keydown', key); if (wrappedEl) { wrappedEl.remove(); wrappedEl = null; } }
    function key(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(idx + 1);
      else if (e.key === 'ArrowLeft') go(idx - 1);
    }
    function go(n) {
      if (n >= slides.length) return close();
      if (n < 0) n = 0;
      idx = n;
      var sl = slides[n];
      stage.replaceChildren();
      stage.className = 'wr-stage tone-' + sl.tone;
      var kids = [
        h('p', { class: 'wr-k', text: sl.kicker }),
        h('h2', { class: 'wr-big' + (sl.small ? ' sm' : ''), text: sl.big }),
        h('p', { class: 'wr-sub', text: sl.sub })
      ];
      if (sl.covers && sl.covers.length) {
        kids.push(h('div', { class: 'wr-covers n' + Math.min(sl.covers.length, 6) },
          sl.covers.map(function (c) { return h('img', { src: c, alt: '', loading: 'lazy' }); })));
      }
      (sl.extra || []).filter(Boolean).forEach(function (t) { kids.push(h('p', { class: 'wr-x', text: t })); });
      kids.forEach(function (k) { stage.append(k); });
      bars.forEach(function (b, i) { b.className = i <= n ? 'on' : ''; });
    }
    document.body.append(wrappedEl);
    document.addEventListener('keydown', key);
    go(0);
  }
  function setupWrapped() {
    var btn = $('#btn-wrapped');
    if (!btn) return;
    var r = wrappedRange();
    btn.textContent = r.ready ? '✨ ¡Nuestro Wrapped ' + r.y + ' ya está!' : '✨ Avance de nuestro Wrapped ' + r.y;
    btn.classList.toggle('hot', r.ready);
    btn.addEventListener('click', openWrapped);
  }

  function renderAll() {
    renderRibbon();
    renderHoy();
    renderWatch();
    renderPlans();
    renderTodos();
    renderLetters();
    renderCountdowns();
    renderPolls();
    renderMemories();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('#today').textContent = fmtLong(new Date());
    $('#ic-pencil').append(icon('pencil'));
    $$('[data-ic]').forEach(function (el) {
      el.append(icon(el.dataset.ic));
    });

    $('#p-date').value = todayISO();
    $('#m-date').value = todayISO();
    $('#cd-date').value = todayISO();

    buildCats();
    buildIdeas();
    buildWho();
    setupAutocomplete();

    $('#btn-names').addEventListener('click', function () {
      var box = $('#names');
      var open = box.hidden;
      box.hidden = !open;
      this.setAttribute('aria-expanded', String(open));
      if (open) {
        $('#name-a').value = S.settings.nameA;
        $('#name-b').value = S.settings.nameB;
        $('#who-am-i').value = S.me;
      }
    });

    $('#f-names').addEventListener('submit', function (e) {
      e.preventDefault();
      var na = $('#name-a').value.trim() || 'Gary';
      var nb = $('#name-b').value.trim() || 'Yumi';
      var me = $('#who-am-i').value;
      S.me = me;
      try { localStorage.setItem('nd-me', me); } catch (err) {}
      saveDevice().catch(function () {});
      run(function () {
        return setDoc(doc(db, 'settings', 'config'), { nameA: na, nameB: nb }, { merge: true });
      }).then(function (ok) {
        if (ok) {
          $('#names').hidden = true;
          $('#btn-names').setAttribute('aria-expanded', 'false');
          toast('¡Nombres guardados!');
        }
      });
    });

    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = this.dataset.tab;
        S.tab = t;
        $$('.tab').forEach(function (b) {
          b.setAttribute('aria-selected', String(b.dataset.tab === t));
        });
        $$('.panel').forEach(function (p) {
          p.hidden = p.id !== 'tab-' + t;
        });
      });
    });

    $$('.subtabs .chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = this.dataset.sub;
        S.sub = s;
        $$('.subtabs .chip').forEach(function (b) {
          b.classList.toggle('on', b.dataset.sub === s);
        });
        ['cartas', 'recuerdos', 'cuenta', 'votos'].forEach(function (k) {
          $('#sub-' + k).hidden = k !== s;
        });
      });
    });

    $('#day-prev').addEventListener('click', function () { S.day = addDays(S.day, -1); renderHoy(); });
    $('#day-next').addEventListener('click', function () { S.day = addDays(S.day, 1); renderHoy(); });
    $('#day-today').addEventListener('click', function () { S.day = todayISO(); renderHoy(); });

    $('#f-ev').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#ev-title').value.trim();
      var time = $('#ev-time').value;
      var note = $('#ev-note').value.trim();
      if (!title) return;
      run(function () {
        return add('events', { title: title, date: S.day, time: time, cat: S.evCat, note: note, done: false });
      }).then(function (ok) {
        if (ok) {
          $('#ev-title').value = '';
          $('#ev-note').value = '';
          toast('¡Actividad agregada!');
        }
      });
    });

    $('#f-watch').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#w-title').value.trim();
      var kindVal = $('#w-kind').value;
      var cover = $('#w-cover').value.trim();
      var platform = $('#w-plat').value.trim();
      if (!title) return;
      var btn = $('#f-watch button[type="submit"]');

      // Si no elegiste una sugerencia, se busca el título y se toma lo del mejor resultado:
      // categoría, portada y, si coincide exacto con algún nombre (romaji, inglés, español),
      // el título oficial.
      var prep = Promise.resolve({ title: title, kind: kindVal === 'auto' ? 'serie' : kindVal, cover: cover, platform: platform });
      if (kindVal === 'auto' || !cover) {
        btn.disabled = true;
        prep = fetchAllMatches(title, kindVal === 'auto' ? null : kindVal).then(function (items) {
          var best = items[0], sc = best ? matchScore(best, title) : 3;
          var kind = kindVal === 'auto' ? (best && sc <= 2 ? best.kind : 'serie') : kindVal;
          if (best && sc === 0) {
            return {
              title: best.title, kind: kind,
              cover: cover || best.img || '',
              platform: platform || (best.plats && best.plats[0]) || ''
            };
          }
          return { title: title, kind: kind, cover: cover, platform: platform };
        });
      }

      prep.then(function (info) {
        return run(function () {
          return add('watch', {
            title: info.title, kind: info.kind, cover: info.cover, platform: info.platform,
            status: 'por-ver', season: 1, ep: 0, rating: 0,
            scoreA: null, scoreB: null, revA: '', revB: ''
          });
        }).then(function (ok) { return { ok: ok, kind: info.kind, title: info.title }; });
      }).then(function (res) {
        btn.disabled = false;
        if (res.ok) {
          $('#w-title').value = '';
          $('#w-cover').value = '';
          $('#w-plat').value = '';
          $('#w-kind').value = 'auto';
          kindAuto = false;
          $('#detected-plats-box').hidden = true;
          $('#autocomplete-list').hidden = true;
          toast('¡' + res.title + ' agregado como ' + (KINDS[res.kind] || 'serie').toLowerCase() + '!');
        }
      });
    });

    $('#btn-pick').addEventListener('click', pickRandom);

    $('#pick-go').addEventListener('click', function () {
      if (!S.pickId) return;
      run(function () { return upd('watch', S.pickId, { status: 'viendo' }); }).then(function (ok) {
        if (ok) {
          $('#pick').hidden = true;
          toast('¡Marcado como En curso!');
        }
      });
    });
    $('#pick-again').addEventListener('click', pickRandom);

    $('#f-plan').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#p-title').value.trim();
      var place = $('#p-place').value.trim();
      var date = $('#p-date').value;
      if (!title) return;
      run(function () {
        return add('plans', { title: title, place: place, date: date, status: date ? 'agendada' : 'idea' });
      }).then(function (ok) {
        if (ok) {
          $('#p-title').value = '';
          $('#p-place').value = '';
          toast('¡Plan guardado!');
        }
      });
    });

    $('#f-todo').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#td-title').value.trim();
      var who = $('#td-who').value;
      if (!title) return;
      run(function () {
        return add('todos', { title: title, who: who, done: false });
      }).then(function (ok) {
        if (ok) {
          $('#td-title').value = '';
          toast('¡Pendiente agregado!');
        }
      });
    });

    $('#lt-pin').addEventListener('click', function () {
      S.pinLetter = !S.pinLetter;
      this.setAttribute('aria-pressed', String(S.pinLetter));
      this.classList.toggle('on', S.pinLetter);
    });
    $('#lt-pin').classList.add('on');

    $('#f-letter').addEventListener('submit', function (e) {
      e.preventDefault();
      var body = $('#lt-body').value.trim();
      if (!body) return;
      var willPin = S.pinLetter;
      var p = Promise.resolve();
      if (willPin) {
        S.letters.forEach(function (x) {
          if (x.pinned) p = p.then(function () { return upd('letters', x.id, { pinned: false }); });
        });
      }
      p.then(function () {
        return run(function () {
          return add('letters', { body: body, from: S.me, pinned: willPin });
        });
      }).then(function (ok) {
        if (ok) {
          $('#lt-body').value = '';
          toast('¡Cartita enviada!');
        }
      });
    });

    $('#cd-yearly').addEventListener('click', function () {
      S.yearly = !S.yearly;
      this.setAttribute('aria-pressed', String(S.yearly));
      this.classList.toggle('on', S.yearly);
    });

    $('#f-cd').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#cd-title').value.trim();
      var date = $('#cd-date').value;
      if (!title || !date) return;
      run(function () {
        return add('countdowns', { title: title, date: date, yearly: S.yearly });
      }).then(function (ok) {
        if (ok) {
          $('#cd-title').value = '';
          toast('¡Cuenta regresiva creada!');
        }
      });
    });

    $('#f-poll').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = $('#v-q').value.trim();
      var a = $('#v-a').value.trim();
      var b = $('#v-b').value.trim();
      if (!q || !a || !b) return;
      run(function () {
        return add('polls', { q: q, a: a, b: b, votes: {} });
      }).then(function (ok) {
        if (ok) {
          $('#v-q').value = '';
          $('#v-a').value = '';
          $('#v-b').value = '';
          toast('¡Votación creada!');
        }
      });
    });

    $('#f-mem').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#m-title').value.trim();
      var date = $('#m-date').value;
      var note = $('#m-note').value.trim();
      var fileInput = $('#m-photo');
      var file = fileInput.files && fileInput.files[0];
      if (!title) return;

      compressImage(file).then(function (dataUrl) {
        return run(function () {
          return add('memories', { title: title, date: date, note: note, photo: dataUrl });
        });
      }).then(function (ok) {
        if (ok) {
          $('#m-title').value = '';
          $('#m-note').value = '';
          fileInput.value = '';
          toast('¡Recuerdo guardado!');
        }
      }).catch(function () {
        toast('No se pudo procesar la imagen.');
      });
    });

    setupSoloView();
    setupInstall();
    setupNotifications();
    setupDeepLink();
    setupWrapped();

    try {
      var app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);

      $('#btn-google').addEventListener('click', function () {
        signInWithPopup(auth, new GoogleAuthProvider()).catch(function (e) {
          $('#lg-msg').textContent = e.message || 'No se pudo iniciar sesión.';
        });
      });

      $('#btn-out').addEventListener('click', function () {
        signOut(auth);
      });

      onAuthStateChanged(auth, function (user) {
        if (user) {
          S.uid = user.uid;
          saveDevice().catch(function () {});
          $('#login').hidden = true;
          $('#shell').hidden = false;
          $('#btn-names').hidden = false;
          loadData();
        } else {
          S.uid = null;
          $('#login').hidden = false;
          $('#shell').hidden = true;
          $('#btn-names').hidden = true;
          unsubs.forEach(function (fn) { fn(); });
          unsubs = [];
        }
      });
    } catch (e) {
      $('#offline').hidden = false;
    }
  });

  function loadData() {
    unsubs.forEach(function (fn) { fn(); });
    unsubs = [];

    var cols = ['events', 'watch', 'plans', 'todos', 'memories', 'countdowns', 'polls', 'letters'];
    cols.forEach(function (col) {
      var unsub = onSnapshot(collection(db, col), function (snap) {
        S[col] = snap.docs.map(function (d) {
          var data = d.data();
          data.id = d.id;
          return data;
        });
        S.loaded[col] = true;
        renderAll();
      }, function () {
        S.loaded[col] = true;
        renderAll();
      });
      unsubs.push(unsub);
    });

    var unsubSettings = onSnapshot(doc(db, 'settings', 'config'), function (d) {
      if (d.exists()) {
        var data = d.data();
        if (data.nameA) S.settings.nameA = data.nameA;
        if (data.nameB) S.settings.nameB = data.nameB;
        buildWho();
        renderAll();
      }
    }, function () {});
    unsubs.push(unsubSettings);
  }
})();
