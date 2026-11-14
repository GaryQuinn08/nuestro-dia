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
  function add(col, data) { data.createdAt = Date.now(); return addDoc(collection(db, col), data); }
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

function setDetectedPlatforms(plats, queryTitle, kind) {
  var box = $('#detected-plats-box');
  var list = $('#detected-plats');

  list.replaceChildren();

  var unique = [];

  (plats || []).forEach(function (p) {
    if (p && unique.indexOf(p) === -1) {
      unique.push(p);
    }
  });

  box.hidden = false;

  if (unique.length) {
    unique.forEach(function (p) {
      list.append(h('button', {
        type: 'button',
        class: 'chip' + ($('#w-plat').value === p ? ' on' : ''),
        onclick: function () {
          $('#w-plat').value = p;

          $$('#detected-plats .chip').forEach(function (c) {
            c.classList.toggle('on', c.textContent === p);
          });

          toast('Plataforma seleccionada: ' + p);
        }
      }, p));
    });
  } else {
    list.append(h('span', {
      class: 'auto-sub',
      text: 'No se encontraron plataformas verificadas.'
    }));
  }

  if (queryTitle) {
    list.append(h('a', {
      href: 'https://www.justwatch.com/mx/buscar?q=' +
        encodeURIComponent(queryTitle),
      target: '_blank',
      rel: 'noopener noreferrer',
      class: 'chip',
      style: 'text-decoration:none;border-style:dashed;color:var(--gold)',
      text: 'Consultar disponibilidad ↗'
    }));

    if (kind === 'anime') {
      var sites = [
        {
          name: 'JKanime',
          url: 'https://jkanime.net/es/buscar/?q='
        },
        {
          name: 'AnimeFLV',
          url: 'https://animeflv.net/browse?q='
        },
        {
          name: 'MonosChinos',
          url: 'https://monoschinos2.com/'
        }
      ];

      sites.forEach(function (site) {
        list.append(h('a', {
          href: site.url + encodeURIComponent(queryTitle),
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'chip',
          style: 'text-decoration:none',
          text: site.name + ' ↗'
        }));
      });
    }
  }
}
  var searchTimer = null;

function fetchAllMatches(query) {
  if (!query || query.trim().length < 2) {
    return Promise.resolve([]);
  }

  var cleanQ = encodeURIComponent(query.trim());

  var pAnime = fetch(
    'https://api.jikan.moe/v4/anime?q=' + cleanQ + '&limit=5'
  )
    .then(function (r) {
      return r.ok ? r.json() : { data: [] };
    })
    .then(function (d) {
      return (d.data || []).map(function (a) {
        var plats = [];

        if (Array.isArray(a.streaming)) {
          a.streaming.forEach(function (s) {
            if (s.name && plats.indexOf(s.name) === -1) {
              plats.push(s.name);
            }
          });
        }

        return {
          title: a.title_english || a.title,
          kind: 'anime',
          malId: a.mal_id,
          img: (a.images &&
                a.images.jpg &&
                a.images.jpg.image_url) || '',
          plats: plats
        };
      });
    })
    .catch(function () {
      return [];
    });

  var pSeries = fetch(
    'https://api.tvmaze.com/search/shows?q=' + cleanQ
  )
    .then(function (r) {
      return r.ok ? r.json() : [];
    })
    .then(function (d) {
      return (Array.isArray(d) ? d.slice(0, 5) : [])
        .map(function (s) {
          var sh = s.show || {};
          var plats = [];

          if (sh.webChannel && sh.webChannel.name) {
            plats.push(sh.webChannel.name);
          }

          if (sh.network && sh.network.name) {
            plats.push(sh.network.name);
          }

          var isAnime =
            sh.type === 'Animation' &&
            sh.language === 'Japanese';

          return {
            title: sh.name,
            kind: isAnime ? 'anime' : 'serie',
            img: (sh.image && sh.image.medium) || '',
            plats: plats
          };
        });
    })
    .catch(function () {
      return [];
    });

  return Promise.all([pAnime, pSeries])
    .then(function (results) {
      var combined = [].concat(results[0], results[1]);
      var seen = {};

      combined = combined.filter(function (item) {
        if (!item.title) return false;

        var key = item.kind + ':' +
          item.title.toLowerCase().trim();

        if (seen[key]) return false;

        seen[key] = true;
        return true;
      });

      return combined;
    });
}

function setupAutocomplete() {
  var input = $('#w-title');
  var dropdown = $('#autocomplete-list');
  var requestId = 0;

  input.addEventListener('input', function () {
    var val = this.value.trim();

    clearTimeout(searchTimer);

    requestId++;

    var currentRequest = requestId;

    if (val.length < 2) {
      dropdown.hidden = true;
      dropdown.replaceChildren();
      return;
    }

    searchTimer = setTimeout(function () {
      fetchAllMatches(val).then(function (items) {

        if (currentRequest !== requestId) return;

        dropdown.replaceChildren();

        if (!items.length) {
          dropdown.hidden = true;
          return;
        }

        dropdown.hidden = false;

        items.forEach(function (it) {
          dropdown.append(h('button', {
            type: 'button',
            class: 'auto-item',

            onclick: function () {
              input.value = it.title;

              $('#w-kind').value = it.kind;
              $('#w-cover').value = it.img;

              $('#w-plat').value = '';

              if (it.plats.length) {
                $('#w-plat').value = it.plats[0];
              }

              setDetectedPlatforms(
                it.plats,
                it.title,
                it.kind
              );

              dropdown.hidden = true;

              toast('¡Título seleccionado!');
            }
          },

            it.img
              ? h('img', {
                  src: it.img,
                  alt: it.title
                })
              : null,

            h('div', { class: 'auto-info' },

              h('span', {
                class: 'auto-title',
                text: it.title
              }),

              h('span', {
                class: 'auto-sub',
                text:
                  (KINDS[it.kind] || 'Título') +
                  (it.plats.length
                    ? ' · ' + it.plats.join(', ')
                    : ' · Plataforma no verificada')
              })

            )
          ));
        });

      });
    }, 350);
  });

  document.addEventListener('click', function (e) {
    if (
      !input.contains(e.target) &&
      !dropdown.contains(e.target)
    ) {
      dropdown.hidden = true;
    }
  });
}

  function searchCoverAPI() {
  var q = $('#w-title').value.trim();

  if (!q) {
    toast('Escribe primero el título para buscar.');
    $('#w-title').focus();
    return;
  }

  var box = $('#api-box');
  var res = $('#api-results');
  var st = $('#api-status');

  var requestId = Date.now();

  box.hidden = false;
  res.replaceChildren();

  st.textContent = 'Buscando en los catálogos...';

  fetchAllMatches(q).then(function (items) {

    if (!items.length) {
      st.textContent =
        'No encontramos coincidencias. Puedes registrar el título manualmente.';

      setDetectedPlatforms([], q, $('#w-kind').value);

      return;
    }

    st.textContent = 'Selecciona el resultado correcto:';

    items.forEach(function (it) {

      var subtitle =
        (KINDS[it.kind] || 'Título') +
        (it.plats.length
          ? ' · ' + it.plats.join(', ')
          : ' · Sin plataforma verificada');

      res.append(h('button', {
        type: 'button',
        class: 'api-item',

        onclick: function () {

          $('#w-title').value = it.title;
          $('#w-kind').value = it.kind;
          $('#w-cover').value = it.img;

          $('#w-plat').value =
            it.plats.length ? it.plats[0] : '';

          box.hidden = true;

          setDetectedPlatforms(
            it.plats,
            it.title,
            it.kind
          );

          toast(
            'Detectado como ' +
            (KINDS[it.kind] || it.kind)
          );
        }

      },

        it.img
          ? h('img', {
              src: it.img,
              alt: it.title
            })
          : h('div', {
              class: 'w-cover-empty',
              text: 'Sin portada'
            }),

        h('span', {
          text: it.title
        }),

        h('span', {
          style: 'font-size:.7rem;color:var(--rose)',
          text: subtitle
        })

      ));

    });

  }).catch(function () {
    st.textContent =
      'Error al consultar los catálogos. Intenta nuevamente.';
  });
}

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
                  onclick: function () { if (status !== s[0]) run(function () { return upd('watch', w.id, { status: s[0] }); }); } }, s[1]);
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

    var ul = $('#letters-list');
    ul.replaceChildren();
    if (!list.length) {
      ul.append(emptyMsg('letters', 'No hay cartitas todavía. Escribe la primera arriba.'));
      return;
    }
    list.forEach(function (l) {
      ul.append(h('div', { class: 'letter-card' + (l.pinned ? ' is-pinned' : '') },
        h('div', { class: 'letter-header' },
          h('span', { class: 'letter-from', text: 'De ' + nm(l.from || 'a') }),
          h('div', { style: 'display:flex;gap:6px;align-items:center' },
            h('span', { class: 'letter-date', text: fmtShort(new Date(l.createdAt || Date.now())) }),
            l.from === S.me ? h('button', {
              type: 'button', class: 'icon-btn' + (l.pinned ? ' on' : ''),
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
    var list = S.countdowns.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    if (!list.length) {
      ul.append(emptyMsg('countdowns', 'No hay cuentas regresivas. Agrega una fecha especial arriba.'));
      return;
    }
    var now = todayISO();
    list.forEach(function (c) {
      var diff = dayDiff(now, c.date);
      var badgeText = diff > 0 ? 'Faltan ' + diff + ' ' + pl(diff, 'día', 'días') : diff === 0 ? '¡Es hoy!' : 'Pasó hace ' + Math.abs(diff) + ' ' + pl(Math.abs(diff), 'día', 'días');
      ul.append(h('li', { class: 'cd-card' },
        h('div', {},
          h('h3', { class: 'cd-title', text: c.title }),
          h('p', { class: 'cd-date', text: fmtFull(parse(c.date)) })
        ),
        h('div', { style: 'display:flex;gap:12px;align-items:center' },
          h('span', { class: 'cd-badge' + (diff === 0 ? ' today' : diff < 0 ? ' past' : '') }, badgeText),
          delBtn('countdowns', c.id)
        )
      ));
    });
  }

  function renderPolls() {
    var ul = $('#poll-list');
    ul.replaceChildren();
    if (!S.polls.length) {
      ul.append(emptyMsg('polls', 'No hay votaciones activas. Crea una encuesta arriba.'));
      return;
    }
    S.polls.forEach(function (p) {
      var votesA = p.votesA || [];
      var votesB = p.votesB || [];
      var votedA = votesA.includes(S.me);
      var votedB = votesB.includes(S.me);

      ul.append(h('div', { class: 'poll-card' },
        h('h3', { class: 'poll-q', text: p.question }),
        h('div', { class: 'poll-opts' },
          h('button', {
            type: 'button', class: 'poll-opt' + (votedA ? ' selected' : ''),
            onclick: function () {
              var nA = votedA ? votesA.filter(function (x) { return x !== S.me; }) : votesA.concat([S.me]);
              var nB = votesB.filter(function (x) { return x !== S.me; });
              run(function () { return upd('polls', p.id, { votesA: nA, votesB: nB }); });
            }
          },
            h('span', { text: p.optA }),
            h('span', { class: 'poll-count', text: votesA.length + ' ' + pl(votesA.length, 'voto', 'votos') })
          ),
          h('button', {
            type: 'button', class: 'poll-opt' + (votedB ? ' selected' : ''),
            onclick: function () {
              var nB = votedB ? votesB.filter(function (x) { return x !== S.me; }) : votesB.concat([S.me]);
              var nA = votesA.filter(function (x) { return x !== S.me; });
              run(function () { return upd('polls', p.id, { votesA: nA, votesB: nB }); });
            }
          },
            h('span', { text: p.optB }),
            h('span', { class: 'poll-count', text: votesB.length + ' ' + pl(votesB.length, 'voto', 'votos') })
          )
        ),
        h('div', { style: 'display:flex;justify-content:flex-end;margin-top:8px' }, delBtn('polls', p.id))
      ));
    });
  }

  function renderMemories() {
    var grid = $('#mem-grid');
    grid.replaceChildren();
    var list = S.memories.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    if (!list.length) {
      grid.append(h('p', { class: 'empty', text: S.loaded.memories ? 'Aún no hay recuerdos guardados. Sube la primera foto arriba.' : 'Cargando recuerdos…' }));
      return;
    }
    list.forEach(function (m) {
      grid.append(h('div', { class: 'mem-card' },
        m.image ? h('img', { src: m.image, alt: m.caption || 'Recuerdo' }) : h('div', { class: 'mem-noimg', text: 'Sin foto' }),
        h('div', { class: 'mem-body' },
          m.caption ? h('p', { class: 'mem-cap', text: m.caption }) : null,
          h('div', { class: 'mem-foot' },
            h('span', { class: 'mem-date', text: fmtShort(new Date(m.createdAt || Date.now())) }),
            delBtn('memories', m.id)
          )
        )
      ));
    });
  }

  function renderAll() {
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
    $('#w-day').value = todayISO();
    $('#p-date').value = todayISO();
    $('#cd-date').value = todayISO();
    buildCats();
    buildIdeas();
    setupAutocomplete();

    $$('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = this.dataset.tab;
        S.tab = t;
        $$('.tab-btn').forEach(function (b) {
          var on = b.dataset.tab === t;
          b.classList.toggle('on', on);
          b.setAttribute('aria-selected', String(on));
        });
        $$('.tab-pane').forEach(function (p) {
          p.hidden = p.id !== 'tab-' + t;
        });
      });
    });

    $$('.sub-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s = this.dataset.sub;
        S.sub = s;
        $$('.sub-tab').forEach(function (b) {
          var on = b.dataset.sub === s;
          b.classList.toggle('on', on);
          b.setAttribute('aria-selected', String(on));
        });
        $$('.sub-pane').forEach(function (p) {
          p.hidden = p.id !== 'sub-' + s;
        });
      });
    });

    $('#who-am-i').addEventListener('change', function () {
      S.me = this.value;
      try { localStorage.setItem('nd-me', S.me); } catch (e) {}
      renderAll();
      toast('Ahora eres ' + nm(S.me));
    });

    $('#ev-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#ev-title').value.trim();
      var date = $('#ev-date').value || S.day;
      var time = $('#ev-time').value;
      var note = $('#ev-note').value.trim();
      if (!title) return;
      run(function () {
        return add('events', { title: title, date: date, time: time, cat: S.evCat, note: note, done: false });
      }).then(function (ok) {
        if (ok) {
          $('#ev-title').value = '';
          $('#ev-note').value = '';
          toast('¡Actividad agregada!');
        }
      });
    });

    $('#w-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#w-title').value.trim();
      var kind = $('#w-kind').value;
      var cover = $('#w-cover').value.trim();
      var platform = $('#w-plat').value.trim();
      if (!title) return;
      run(function () {
        return add('watch', {
          title: title, kind: kind, cover: cover, platform: platform,
          status: 'por-ver', season: 1, ep: 0, rating: 0,
          scoreA: null, scoreB: null, revA: '', revB: ''
        });
      }).then(function (ok) {
        if (ok) {
          $('#w-title').value = '';
          $('#w-cover').value = '';
          $('#w-plat').value = '';
          $('#api-box').hidden = true;
          $('#detected-plats-box').hidden = true;
          toast('¡Título agregado al catálogo!');
        }
      });
    });

    $('#api-close').addEventListener('click', function () { $('#api-box').hidden = true; });
    $('#w-search-api').addEventListener('click', searchCoverAPI);

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
    $('#pick-close').addEventListener('click', function () { $('#pick').hidden = true; });

    $('#p-form').addEventListener('submit', function (e) {
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

    $('#td-form').addEventListener('submit', function (e) {
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

    $('#letter-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var body = $('#letter-body').value.trim();
      if (!body) return;
      run(function () {
        return add('letters', { body: body, from: S.me, pinned: false });
      }).then(function (ok) {
        if (ok) {
          $('#letter-body').value = '';
          toast('¡Cartita enviada!');
        }
      });
    });

    $('#cd-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('#cd-title').value.trim();
      var date = $('#cd-date').value;
      if (!title || !date) return;
      run(function () {
        return add('countdowns', { title: title, date: date });
      }).then(function (ok) {
        if (ok) {
          $('#cd-title').value = '';
          toast('¡Cuenta regresiva creada!');
        }
      });
    });

    $('#poll-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = $('#poll-q').value.trim();
      var optA = $('#poll-optA').value.trim();
      var optB = $('#poll-optB').value.trim();
      if (!q || !optA || !optB) return;
      run(function () {
        return add('polls', { question: q, optA: optA, optB: optB, votesA: [], votesB: [] });
      }).then(function (ok) {
        if (ok) {
          $('#poll-q').value = '';
          $('#poll-optA').value = '';
          $('#poll-optB').value = '';
          toast('¡Encuesta creada!');
        }
      });
    });

    $('#mem-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      compressImage(file).then(function (dataUrl) {
        var cap = $('#mem-cap').value.trim();
        run(function () {
          return add('memories', { image: dataUrl, caption: cap });
        }).then(function (ok) {
          if (ok) {
            $('#mem-file').value = '';
            $('#mem-cap').value = '';
            toast('¡Recuerdo guardado con éxito!');
          }
        });
      }).catch(function () {
        toast('No se pudo procesar la imagen.');
      });
    });

    try {
      var app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);

      onAuthStateChanged(auth, function (user) {
        var btn = $('#auth-btn');
        if (user) {
          S.uid = user.uid;
          btn.textContent = 'Salir (' + (user.displayName || user.email || 'Conectado') + ')';
          btn.onclick = function () { signOut(auth); };
          loadData();
        } else {
          S.uid = null;
          btn.textContent = 'Iniciar sesión con Google';
          btn.onclick = function () {
            signInWithPopup(auth, new GoogleAuthProvider()).catch(function (e) {
              toast('No se pudo iniciar sesión.');
            });
          };
          loadData(); // Permite lectura anónima si las reglas de Firestore lo permiten
        }
      });
    } catch (e) {
      toast('Error al inicializar Firebase.');
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