import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';

import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAZQFSKasHuCwg1I--hrvfT75nQJvdAyxU',
  authDomain: 'citas-e16ea.firebaseapp.com',
  projectId: 'citas-e16ea',
  appId: '1:922843428138:web:1d0df86ffa79eb414a5a53'
};

(function () {
  'use strict';

  // =========================================================
  // UTILIDADES
  // =========================================================

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const pad = n => String(n).padStart(2, '0');

  const iso = d =>
    d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate());

  const parse = s => {
    if (!s) return new Date();
    const p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };

  const todayISO = () => iso(new Date());

  const addDays = (s, n) => {
    const d = parse(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  };

  const dayDiff = (a, b) =>
    Math.round((parse(b) - parse(a)) / 86400000);

  const fmtLong = d =>
    new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(d);

  const fmtFull = d =>
    new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);

  const fmtShort = d =>
    new Intl.DateTimeFormat('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);

  const pl = (n, one, many) => n === 1 ? one : many;

  const reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // =========================================================
  // ICONOS
  // =========================================================

  const ICONS = {
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
    const s = document.createElement('span');
    s.className = 'ic';
    s.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      (ICONS[name] || '') +
      '</svg>';
    return s;
  }

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    const p = props || {};

    Object.keys(p).forEach(k => {
      const v = p[k];

      if (v == null || v === false) return;

      if (k === 'class') {
        el.className = v;
      } else if (k === 'text') {
        el.textContent = v;
      } else if (k === 'dataset') {
        Object.assign(el.dataset, v);
      } else if (k.slice(0, 2) === 'on') {
        el.addEventListener(k.slice(2), v);
      } else {
        el.setAttribute(k, v === true ? '' : v);
      }
    });

    children.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    });

    return el;
  }

  // =========================================================
  // CONFIGURACIÓN Y ESTADO
  // =========================================================

  const CATS = {
    comida: { l: 'Comida', c: 'var(--amber)' },
    salida: { l: 'Salida', c: 'var(--rose)' },
    descanso: { l: 'Descanso', c: 'var(--sky)' },
    stream: { l: 'Stream', c: 'var(--violet)' },
    casa: { l: 'Casa', c: 'var(--sage)' },
    otro: { l: 'Otro', c: 'var(--ink-3)' }
  };

  const KINDS = {
    serie: 'Serie',
    anime: 'Anime',
    pelicula: 'Película',
    juego: 'Videojuego'
  };

  const WSTAT = [
    ['por-ver', 'Por ver'],
    ['viendo', 'En curso'],
    ['terminado', 'Terminado']
  ];

  const PSTAT = [
    ['idea', 'Idea'],
    ['agendada', 'Agendada'],
    ['hecha', 'Hecha']
  ];

  const IDEAS = [
    'Cena especial en casa',
    'Picnic en el parque',
    'Noche de cine',
    'Caminata al atardecer',
    'Cocinar algo nuevo juntos',
    'Noche de juegos',
    'Café y libros',
    'Maratón en pijama'
  ];

  const WD = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  let savedMe = 'a';

  try {
    savedMe = localStorage.getItem('nd-me') || 'a';
  } catch (e) {}

  const S = {
    events: [],
    watch: [],
    plans: [],
    todos: [],
    memories: [],
    countdowns: [],
    polls: [],
    letters: [],

    loaded: {},

    settings: {
      nameA: 'Gary',
      nameB: 'Yumi'
    },

    me: savedMe,
    day: todayISO(),
    tab: 'hoy',
    sub: 'cartas',

    evCat: 'comida',
    wf: 'all',
    wkf: 'all',
    tf: 'all',

    yearly: false,
    pinLetter: true,

    uid: null,
    armed: null,
    pickId: null,
    editingRev: null
  };

  let db = null;
  let auth = null;
  let unsubs = [];
  let armTimer = 0;
  let toastTimer = 0;
  let pickTimer = 0;
  let searchTimer = null;

  const chains = {};

  // =========================================================
  // FIREBASE Y FUNCIONES GENERALES
  // =========================================================

  function seq(path, fn) {
    const prev = chains[path] || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    chains[path] = next;
    return next;
  }

  function toast(msg) {
    const t = $('#toast');
    if (!t) return;

    t.textContent = msg;
    t.hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      t.hidden = true;
    }, 3200);
  }

  function run(fn) {
    if (!db) {
      toast('Todavía no hay conexión con Firebase.');
      return Promise.resolve(false);
    }

    return Promise.resolve()
      .then(fn)
      .then(() => true)
      .catch(e => {
        console.error('Firebase:', e);

        const code = e && e.code;

        toast(
          code === 'permission-denied'
            ? 'No tienes permiso para guardar. Revisa las reglas de Firebase.'
            : code === 'resource-exhausted'
              ? 'Se llegó al límite gratuito de Firebase.'
              : 'No se pudo guardar. Intenta de nuevo.'
        );

        return false;
      });
  }

  function add(col, data) {
    return addDoc(collection(db, col), {
      ...data,
      createdAt: Date.now()
    });
  }

  function upd(col, id, data) {
    const p = col + '/' + id;

    return seq(p, () =>
      updateDoc(doc(db, p), data)
    );
  }

  function del(col, id) {
    const p = col + '/' + id;

    return seq(p, () =>
      deleteDoc(doc(db, p))
    );
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve('');

      const reader = new FileReader();

      reader.onload = ev => {
        const img = new Image();

        img.onload = () => {
          const maxW = 800;
          let w = img.width;
          let height = img.height;

          if (w > maxW) {
            height = Math.round(height * maxW / w);
            w = maxW;
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, height);

          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };

        img.onerror = reject;
        img.src = ev.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function nm(k) {
    if (k === 'a') return S.settings.nameA;
    if (k === 'b') return S.settings.nameB;
    return 'Ambos';
  }

  function emptyMsg(key, text) {
    return h('li', {
      class: 'empty',
      text: S.loaded[key] ? text : 'Cargando…'
    });
  }

  function chip(label, on, fn, extra) {
    return h(
      'button',
      {
        type: 'button',
        class: 'chip' + (on ? ' on' : ''),
        'aria-pressed': String(!!on),
        onclick: fn
      },
      label,
      extra || null
    );
  }

  function checkBtn(on, fn) {
    return h(
      'button',
      {
        type: 'button',
        class: 'icon-btn ok' + (on ? ' on' : ''),
        'aria-pressed': String(!!on),
        'aria-label': on ? 'Marcar como pendiente' : 'Marcar como hecha',
        onclick: fn
      },
      icon('check')
    );
  }

  function delBtn(col, id) {
    const key = col + '/' + id;
    const armed = S.armed === key;

    return h(
      'button',
      {
        type: 'button',
        class: 'icon-btn' + (armed ? ' armed' : ''),
        'aria-label': armed ? 'Confirmar borrado' : 'Borrar',

        onclick: function () {
          if (S.armed === key) {
            S.armed = null;

            run(() => del(col, id));
            renderAll();
            return;
          }

          S.armed = key;
          renderAll();

          clearTimeout(armTimer);

          armTimer = setTimeout(() => {
            if (S.armed === key) {
              S.armed = null;
              renderAll();
            }
          }, 3000);
        }
      },
      armed ? 'Borrar' : icon('trash')
    );
  }

  // =========================================================
  // SECCIÓN HOY
  // =========================================================

  function renderHoy() {
    const label = $('#day-label');
    const week = $('#week');
    const ul = $('#ev-list');

    if (!label || !week || !ul) return;

    const d = parse(S.day);
    label.textContent = fmtLong(d);
    week.replaceChildren();

    const dow = (d.getDay() + 6) % 7;
    const start = addDays(S.day, -dow);
    const has = {};

    S.events.forEach(e => {
      has[e.date] = true;
    });

    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      const dd = parse(date);

      week.append(
        h(
          'button',
          {
            type: 'button',
            class:
              'wd' +
              (date === S.day ? ' on' : '') +
              (date === todayISO() ? ' is-today' : ''),
            'aria-pressed': String(date === S.day),
            'aria-label': fmtLong(dd),

            onclick: function () {
              S.day = date;
              renderHoy();
            }
          },
          h('span', { class: 'wd-n', text: WD[i] }),
          h('span', { class: 'wd-d', text: dd.getDate() }),
          h('span', {
            class: 'wd-dot' + (has[date] ? ' has' : '')
          })
        )
      );
    }

    const items = S.events
      .filter(e => e.date === S.day)
      .sort((a, b) =>
        (a.time || '').localeCompare(b.time || '') ||
        (a.createdAt || 0) - (b.createdAt || 0)
      );

    ul.replaceChildren();

    if (!items.length) {
      ul.append(
        emptyMsg(
          'events',
          'Nada planeado para este día. Agrega la primera actividad arriba.'
        )
      );
    }

    items.forEach(e => {
      const cat = CATS[e.cat] || CATS.otro;

      ul.append(
        h(
          'li',
          {
            class: 'ev' + (e.done ? ' done' : ''),
            style: '--cat:' + cat.c
          },

          h('span', {
            class: 'ev-time',
            text: e.time || 'Todo el día'
          }),

          h('span', { class: 'ev-dot' }),

          h(
            'div',
            { class: 'ev-body' },
            h('span', { class: 'ev-title', text: e.title }),
            e.note
              ? h('span', { class: 'ev-note', text: e.note })
              : null,
            h('span', { class: 'tag', text: cat.l })
          ),

          h(
            'div',
            { class: 'row-actions' },
            checkBtn(e.done, () => {
              run(() => upd('events', e.id, { done: !e.done }));
            }),
            delBtn('events', e.id)
          )
        )
      );
    });

    const done = items.filter(e => e.done).length;

    const prog = $('#prog');
    const progT = $('#prog-t');
    const progB = $('#prog-b');

    if (prog) prog.hidden = !items.length;

    if (progT) {
      progT.textContent =
        done + ' de ' + items.length + ' ' +
        pl(items.length, 'hecha', 'hechas');
    }

    if (progB) {
      progB.style.width = items.length
        ? Math.round(done / items.length * 100) + '%'
        : '0';
    }
  }

  function buildCats() {
    const box = $('#ev-cats');
    if (!box) return;

    box.replaceChildren();

    Object.keys(CATS).forEach(k => {
      box.append(
        h(
          'button',
          {
            type: 'button',
            role: 'radio',
            class: 'chip' + (k === S.evCat ? ' on' : ''),
            'aria-checked': String(k === S.evCat),
            style: '--cat:' + CATS[k].c,
            dataset: { k },

            onclick: function () {
              S.evCat = k;

              $$('#ev-cats .chip').forEach(b => {
                const on = b.dataset.k === k;
                b.classList.toggle('on', on);
                b.setAttribute('aria-checked', String(on));
              });
            }
          },
          h('i', { class: 'cdot' }),
          CATS[k].l
        )
      );
    });
  }

  // =========================================================
  // CATÁLOGO: BÚSQUEDA Y AUTOCOMPLETADO
  // =========================================================

  function setDetectedPlatforms(plats, queryTitle, kind) {
    const box = $('#detected-plats-box');
    const list = $('#detected-plats');
    const input = $('#w-plat');

    if (!box || !list || !input) return;

    list.replaceChildren();

    const unique = [];

    (plats || []).forEach(p => {
      if (p && !unique.includes(p)) unique.push(p);
    });

    box.hidden = false;

    if (unique.length) {
      unique.forEach(p => {
        list.append(
          h(
            'button',
            {
              type: 'button',
              class: 'chip' + (input.value === p ? ' on' : ''),

              onclick: function () {
                input.value = p;

                $$('#detected-plats .chip').forEach(c => {
                  c.classList.toggle('on', c.textContent === p);
                });

                toast('Plataforma seleccionada: ' + p);
              }
            },
            p
          )
        );
      });
    } else {
      list.append(
        h('span', {
          class: 'auto-sub',
          text: 'No se encontraron plataformas verificadas.'
        })
      );
    }

    if (queryTitle) {
      list.append(
        h('a', {
          href:
            'https://www.justwatch.com/mx/buscar?q=' +
            encodeURIComponent(queryTitle),
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'chip',
          style:
            'text-decoration:none;border-style:dashed;color:var(--gold)',
          text: 'Consultar disponibilidad ↗'
        })
      );

      if (kind === 'anime') {
        const sites = [
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

        sites.forEach(site => {
          list.append(
            h('a', {
              href: site.url + encodeURIComponent(queryTitle),
              target: '_blank',
              rel: 'noopener noreferrer',
              class: 'chip',
              style: 'text-decoration:none',
              text: site.name + ' ↗'
            })
          );
        });
      }
    }
  }

  function fetchAllMatches(query) {
    if (!query || query.trim().length < 2) {
      return Promise.resolve([]);
    }

    const cleanQ = encodeURIComponent(query.trim());

    const pAnime = fetch(
      'https://api.jikan.moe/v4/anime?q=' + cleanQ + '&limit=5'
    )
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => {
        return (d.data || []).map(a => {
          const plats = [];

          if (Array.isArray(a.streaming)) {
            a.streaming.forEach(s => {
              if (s.name && !plats.includes(s.name)) {
                plats.push(s.name);
              }
            });
          }

          return {
            title: a.title_english || a.title,
            kind: 'anime',
            malId: a.mal_id,
            img:
              a.images &&
              a.images.jpg &&
              a.images.jpg.image_url
                ? a.images.jpg.image_url
                : '',
            plats
          };
        });
      })
      .catch(() => []);

    const pSeries = fetch(
      'https://api.tvmaze.com/search/shows?q=' + cleanQ
    )
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        return (Array.isArray(d) ? d.slice(0, 5) : []).map(s => {
          const sh = s.show || {};
          const plats = [];

          if (sh.webChannel && sh.webChannel.name) {
            plats.push(sh.webChannel.name);
          }

          if (sh.network && sh.network.name) {
            plats.push(sh.network.name);
          }

          const isAnime =
            sh.type === 'Animation' &&
            sh.language === 'Japanese';

          return {
            title: sh.name,
            kind: isAnime ? 'anime' : 'serie',
            img: sh.image && sh.image.medium ? sh.image.medium : '',
            plats
          };
        });
      })
      .catch(() => []);

    return Promise.all([pAnime, pSeries]).then(results => {
      const combined = [].concat(results[0], results[1]);
      const seen = {};

      return combined.filter(item => {
        if (!item.title) return false;

        const key =
          item.kind + ':' + item.title.toLowerCase().trim();

        if (seen[key]) return false;

        seen[key] = true;
        return true;
      });
    });
  }

  function setupAutocomplete() {
    const input = $('#w-title');
    const dropdown = $('#autocomplete-list');

    if (!input || !dropdown) return;

    let requestId = 0;

    input.addEventListener('input', function () {
      const val = this.value.trim();

      clearTimeout(searchTimer);
      requestId++;

      const currentRequest = requestId;

      if (val.length < 2) {
        dropdown.hidden = true;
        dropdown.replaceChildren();
        return;
      }

      searchTimer = setTimeout(() => {
        fetchAllMatches(val).then(items => {
          if (currentRequest !== requestId) return;

          dropdown.replaceChildren();

          if (!items.length) {
            dropdown.hidden = true;
            return;
          }

          dropdown.hidden = false;

          items.forEach(it => {
            dropdown.append(
              h(
                'button',
                {
                  type: 'button',
                  class: 'auto-item',

                  onclick: function () {
                    input.value = it.title;

                    $('#w-kind').value = it.kind;
                    $('#w-cover').value = it.img || '';
                    $('#w-plat').value =
                      it.plats.length ? it.plats[0] : '';

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
                  ? h('img', { src: it.img, alt: it.title })
                  : null,

                h(
                  'div',
                  { class: 'auto-info' },
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
              )
            );
          });
        });
      }, 350);
    });

    document.addEventListener('click', e => {
      if (
        !input.contains(e.target) &&
        !dropdown.contains(e.target)
      ) {
        dropdown.hidden = true;
      }
    });
  }

  function searchCoverAPI() {
    const input = $('#w-title');
    const q = input ? input.value.trim() : '';

    if (!q) {
      toast('Escribe primero el título para buscar.');
      if (input) input.focus();
      return;
    }

    const box = $('#api-box');
    const res = $('#api-results');
    const st = $('#api-status');

    if (!box || !res || !st) return;

    box.hidden = false;
    res.replaceChildren();
    st.textContent = 'Buscando en los catálogos...';

    fetchAllMatches(q)
      .then(items => {
        if (!items.length) {
          st.textContent =
            'No encontramos coincidencias. Puedes registrar el título manualmente.';

          setDetectedPlatforms([], q, $('#w-kind').value);
          return;
        }

        st.textContent = 'Selecciona el resultado correcto:';

        items.forEach(it => {
          const subtitle =
            (KINDS[it.kind] || 'Título') +
            (it.plats.length
              ? ' · ' + it.plats.join(', ')
              : ' · Sin plataforma verificada');

          res.append(
            h(
              'button',
              {
                type: 'button',
                class: 'api-item',

                onclick: function () {
                  $('#w-title').value = it.title;
                  $('#w-kind').value = it.kind;
                  $('#w-cover').value = it.img || '';

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
                ? h('img', { src: it.img, alt: it.title })
                : h('div', {
                    class: 'w-cover-empty',
                    text: 'Sin portada'
                  }),

              h('span', { text: it.title }),

              h('span', {
                style: 'font-size:.7rem;color:var(--rose)',
                text: subtitle
              })
            )
          );
        });
      })
      .catch(() => {
        st.textContent =
          'Error al consultar los catálogos. Intenta nuevamente.';
      });
  }

  // =========================================================
  // CATÁLOGO: RESEÑAS Y RENDERIZADO
  // =========================================================

  function calcMetacritic(w) {
    let sa = typeof w.scoreA === 'number' ? w.scoreA : null;
    let sb = typeof w.scoreB === 'number' ? w.scoreB : null;

    if (sa === null && sb === null && w.rating > 0) {
      sa = w.rating * 20;
    }

    const scores = [sa, sb].filter(v => v !== null);

    if (!scores.length) {
      return {
        avg: null,
        cls: 'tbd',
        verdict: 'Sin calificar todavía',
        sub: 'Cada quien puede poner su nota del 0 al 100'
      };
    }

    const avg = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );

    const cls =
      avg >= 75 ? 'green' :
      avg >= 50 ? 'yellow' : 'red';

    const verdict =
      avg >= 85 ? 'Obra maestra de pareja' :
      avg >= 75 ? 'Aclamada por ambos' :
      avg >= 60 ? 'Entretenida / Recomendable' :
      avg >= 50 ? 'Opiniones divididas' :
      'Decepción compartida';

    const sub =
      scores.length === 2
        ? 'Promedio entre ' + nm('a') + ' (' + sa +
          ') y ' + nm('b') + ' (' + sb + ')'
        : 'Falta la calificación de ' +
          (sa === null ? nm('a') : nm('b'));

    return { avg, cls, verdict, sub };
  }

  function stepper(label, val, min, fn) {
    return h(
      'div',
      { class: 'step' },
      h('span', { class: 'step-l', text: label }),

      h('button', {
        type: 'button',
        class: 'icon-btn',
        'aria-label': 'Restar ' + label.toLowerCase(),
        onclick: () => {
          if (val > min) fn(val - 1);
        }
      }, icon('minus')),

      h('span', { class: 'step-v', text: val }),

      h('button', {
        type: 'button',
        class: 'icon-btn',
        'aria-label': 'Sumar ' + label.toLowerCase(),
        onclick: () => fn(val + 1)
      }, icon('plus'))
    );
  }

  function renderWatch() {
    const kf = $('#w-kind-filters');
    const f = $('#w-filters');
    const ul = $('#w-list');

    if (!kf || !f || !ul) return;

    kf.replaceChildren();

    kf.append(
      chip('Todo ' + S.watch.length, S.wkf === 'all', () => {
        S.wkf = 'all';
        renderWatch();
      })
    );

    Object.keys(KINDS).forEach(k => {
      const c = S.watch.filter(
        w => (w.kind || 'serie') === k
      ).length;

      kf.append(
        chip(KINDS[k] + 's ' + c, S.wkf === k, () => {
          S.wkf = k;
          renderWatch();
        })
      );
    });

    f.replaceChildren();

    const byKind = S.watch.filter(
      w => S.wkf === 'all' || (w.kind || 'serie') === S.wkf
    );

    const count = s =>
      byKind.filter(w => (w.status || 'por-ver') === s).length;

    f.append(
      chip('Todos estados ' + byKind.length, S.wf === 'all', () => {
        S.wf = 'all';
        renderWatch();
      })
    );

    WSTAT.forEach(s => {
      f.append(
        chip(s[1] + ' ' + count(s[0]), S.wf === s[0], () => {
          S.wf = s[0];
          renderWatch();
        })
      );
    });

    const order = {
      viendo: 0,
      'por-ver': 1,
      terminado: 2
    };

    const list = byKind
      .filter(w => S.wf === 'all' || (w.status || 'por-ver') === S.wf)
      .sort((a, b) =>
        order[a.status || 'por-ver'] - order[b.status || 'por-ver'] ||
        (b.createdAt || 0) - (a.createdAt || 0)
      );

    ul.replaceChildren();

    if (!list.length) {
      ul.append(
        emptyMsg(
          'watch',
          S.watch.length
            ? 'No hay títulos con estos filtros.'
            : 'Agrega series, animes, películas o juegos arriba para armar su catálogo.'
        )
      );
    }

    list.forEach(w => {
      const status = w.status || 'por-ver';
      const season = w.season || 1;
      const ep = w.ep || 0;
      const mc = calcMetacritic(w);

      const showProgress =
        status === 'viendo' &&
        (w.kind === 'serie' || w.kind === 'anime');

      function revCard(whoKey) {
        const score = whoKey === 'a' ? w.scoreA : w.scoreB;
        const text = whoKey === 'a' ? w.revA : w.revB;

        const isEditing =
          S.editingRev === (w.id + ':' + whoKey);

        const color =
          whoKey === 'a' ? 'var(--rose)' : 'var(--sky)';

        let editForm = null;

        if (isEditing) {
          const inpScore = h('input', {
            type: 'number',
            min: '0',
            max: '100',
            placeholder: '0-100',
            value: typeof score === 'number' ? score : ''
          });

          const inpText = h('textarea', {
            maxlength: '300',
            placeholder: 'Tu reseña individual…'
          }, text || '');

          editForm = h(
            'div',
            { class: 'rev-edit' },

            h(
              'div',
              { class: 'rev-edit-row' },

              h('span', {
                class: 'step-l',
                text: 'Nota (0-100):'
              }),

              inpScore,

              h('button', {
                type: 'button',
                class: 'btn sm',

                onclick: function () {
                  const raw = inpScore.value.trim();

                  const val =
                    raw === ''
                      ? null
                      : Math.max(0, Math.min(100, Number(raw)));

                  const patch = {};

                  if (whoKey === 'a') {
                    patch.scoreA = val;
                    patch.revA = inpText.value.trim();
                  } else {
                    patch.scoreB = val;
                    patch.revB = inpText.value.trim();
                  }

                  S.editingRev = null;

                  run(() => upd('watch', w.id, patch));
                }
              }, 'Guardar'),

              h('button', {
                type: 'button',
                class: 'btn ghost sm',
                onclick: () => {
                  S.editingRev = null;
                  renderWatch();
                }
              }, 'Cancelar')
            ),

            inpText
          );
        }

        return h(
          'div',
          { class: 'rev-card' },

          h(
            'div',
            { class: 'rev-head' },

            h('span', {
              class: 'rev-who',
              style: 'color:' + color,
              text: nm(whoKey)
            }),

            h(
              'div',
              { style: 'display:flex;gap:6px;align-items:center' },

              h('span', {
                class: 'rev-score',
                text:
                  typeof score === 'number'
                    ? score + ' / 100'
                    : 'Sin nota'
              }),

              !isEditing
                ? h('button', {
                    type: 'button',
                    class: 'icon-btn',
                    style: 'height:26px;min-width:26px;font-size:.72rem',
                    onclick: () => {
                      S.editingRev = w.id + ':' + whoKey;
                      renderWatch();
                    }
                  }, 'Editar')
                : null
            )
          ),

          text
            ? h('p', { class: 'rev-text', text })
            : h('p', {
                class: 'rev-empty',
                text: 'Aún no escribe reseña.'
              }),

          editForm
        );
      }

      ul.append(
        h(
          'li',
          { class: 'w' },

          h(
            'div',
            { class: 'w-top' },

            w.cover
              ? h('img', {
                  class: 'w-cover',
                  src: w.cover,
                  alt: w.title
                })
              : h('div', {
                  class: 'w-cover-empty',
                  text: KINDS[w.kind] || 'Título'
                }),

            h(
              'div',
              {},

              h('h3', {
                class: 'w-title',
                text: w.title
              }),

              h('p', {
                class: 'w-meta',
                text: [
                  KINDS[w.kind] || 'Serie',
                  w.platform
                ].filter(Boolean).join(' · ')
              }),

              h(
                'div',
                {
                  class: 'w-controls',
                  style: 'margin-top:10px'
                },

                h(
                  'div',
                  {
                    class: 'seg',
                    role: 'group',
                    'aria-label': 'Estado'
                  },

                  WSTAT.map(s =>
                    h('button', {
                      type: 'button',
                      class: 'seg-b' + (status === s[0] ? ' on' : ''),
                      'aria-pressed': String(status === s[0]),

                      onclick: () => {
                        if (status !== s[0]) {
                          run(() =>
                            upd('watch', w.id, { status: s[0] })
                          );
                        }
                      }
                    }, s[1])
                  )
                ),

                showProgress
                  ? h(
                      'div',
                      { class: 'steps' },

                      stepper('Temp', season, 1, v => {
                        run(() => upd('watch', w.id, { season: v }));
                      }),

                      stepper('Ep', ep, 0, v => {
                        run(() => upd('watch', w.id, { ep: v }));
                      })
                    )
                  : null
              )
            ),

            delBtn('watch', w.id)
          ),

          h(
            'div',
            { class: 'mc-panel' },

            h(
              'div',
              { class: 'mc-header' },

              h('div', {
                class: 'mc-badge ' + mc.cls,
                text: mc.avg !== null ? mc.avg : 'TBD'
              }),

              h(
                'div',
                { class: 'mc-summary' },
                h('p', {
                  class: 'mc-verdict',
                  text: mc.verdict
                }),
                h('p', {
                  class: 'mc-sub',
                  text: mc.sub
                })
              )
            ),

            h(
              'div',
              { class: 'mc-reviews' },
              revCard('a'),
              revCard('b')
            )
          )
        )
      );
    });
  }

  // =========================================================
  // SORTEO DEL CATÁLOGO
  // =========================================================

  function pickRandom() {
    const pool = S.watch.filter(w =>
      (w.status || 'por-ver') === 'por-ver' &&
      (S.wkf === 'all' || (w.kind || 'serie') === S.wkf)
    );

    const box = $('#pick');
    const t = $('#pick-t');
    const m = $('#pick-m');
    const go = $('#pick-go');
    const again = $('#pick-again');

    if (!box || !t || !m || !go || !again) return;

    box.hidden = false;
    clearInterval(pickTimer);

    if (!pool.length) {
      S.pickId = null;
      t.textContent = 'Nada pendiente en este filtro';
      m.textContent =
        'Agrega títulos con el estado «Por ver» y vuelve a sortear.';
      go.hidden = true;
      again.hidden = true;
      return;
    }

    const final = pool[Math.floor(Math.random() * pool.length)];

    const show = w => {
      S.pickId = w.id;
      t.textContent = w.title;
      m.textContent = [
        KINDS[w.kind] || 'Serie',
        w.platform
      ].filter(Boolean).join(' · ');
    };

    go.hidden = true;
    again.hidden = true;

    const finish = () => {
      show(final);
      go.hidden = false;
      again.hidden = pool.length < 2;
    };

    if (reduce || pool.length < 2) {
      finish();
      return;
    }

    let n = 0;

    pickTimer = setInterval(() => {
      n++;

      if (n >= 9) {
        clearInterval(pickTimer);
        finish();
        return;
      }

      show(pool[Math.floor(Math.random() * pool.length)]);
    }, 80);
  }

  // =========================================================
  // PLANES
  // =========================================================

  function renderPlans() {
    const rank = {
      agendada: 0,
      idea: 1,
      hecha: 2
    };

    const list = S.plans.slice().sort((a, b) => {
      const sa = a.status || 'idea';
      const sb = b.status || 'idea';

      if (rank[sa] !== rank[sb]) {
        return rank[sa] - rank[sb];
      }

      if (sa === 'agendada') {
        return (a.date || '9999').localeCompare(b.date || '9999');
      }

      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    const ul = $('#p-list');
    if (!ul) return;

    ul.replaceChildren();

    if (!list.length) {
      ul.append(
        emptyMsg(
          'plans',
          'Todavía no hay planes. Toca una idea de arriba o escribe la tuya.'
        )
      );
    }

    list.forEach(p => {
      const status = p.status || 'idea';
      const bits = [];

      if (p.place) {
        bits.push(h('span', { text: p.place }));
      }

      if (p.date) {
        bits.push(
          h('span', {
            class: 'when',
            text: fmtLong(parse(p.date))
          })
        );
      }

      const meta = [];

      bits.forEach((b, i) => {
        if (i) meta.push(' · ');
        meta.push(b);
      });

      ul.append(
        h(
          'li',
          { class: 'plan st-' + status },

          h(
            'div',
            { class: 'plan-head' },

            h(
              'div',
              {},
              h('h3', { class: 'plan-t', text: p.title }),
              meta.length
                ? h('p', { class: 'plan-m' }, meta)
                : null
            ),

            delBtn('plans', p.id)
          ),

          h(
            'div',
            {
              class: 'seg',
              role: 'group',
              'aria-label': 'Estado'
            },

            PSTAT.map(s =>
              h('button', {
                type: 'button',
                class: 'seg-b' + (status === s[0] ? ' on' : ''),
                'aria-pressed': String(status === s[0]),

                onclick: () => {
                  if (status !== s[0]) {
                    run(() =>
                      upd('plans', p.id, { status: s[0] })
                    );
                  }
                }
              }, s[1])
            )
          )
        )
      );
    });
  }

  function buildIdeas() {
    const box = $('#p-ideas');
    if (!box) return;

    box.replaceChildren();

    IDEAS.forEach(t => {
      box.append(
        h('button', {
          type: 'button',
          class: 'chip',
          onclick: function () {
            const input = $('#p-title');
            if (!input) return;
            input.value = t;
            input.focus();
          }
        }, t)
      );
    });
  }

  // =========================================================
  // PENDIENTES
  // =========================================================

  function buildWho() {
    const sel = $('#td-who');

    if (sel) {
      const v = sel.value || 'both';

      sel.replaceChildren(
        h('option', { value: 'both', text: 'Ambos' }),
        h('option', { value: 'a', text: S.settings.nameA }),
        h('option', { value: 'b', text: S.settings.nameB })
      );

      sel.value = v;
    }

    const meSel = $('#who-am-i');

    if (meSel) {
      meSel.replaceChildren(
        h('option', { value: 'a', text: S.settings.nameA }),
        h('option', { value: 'b', text: S.settings.nameB })
      );

      meSel.value = S.me;
    }

    const nameA = $('#name-a');
    const nameB = $('#name-b');

    if (nameA) nameA.value = S.settings.nameA;
    if (nameB) nameB.value = S.settings.nameB;
  }

  const WHOC = {
    a: 'var(--rose)',
    b: 'var(--sky)',
    both: 'var(--gold)'
  };

  function renderTodos() {
    const f = $('#td-filters');
    const ul = $('#td-list');

    if (!f || !ul) return;

    f.replaceChildren();

    [
      ['all', 'Todos'],
      ['a', nm('a')],
      ['b', nm('b')],
      ['both', 'Ambos']
    ].forEach(o => {
      f.append(
        chip(o[1], S.tf === o[0], () => {
          S.tf = o[0];
          renderTodos();
        })
      );
    });

    const list = S.todos
      .filter(t =>
        S.tf === 'all' || (t.who || 'both') === S.tf
      )
      .sort((a, b) =>
        (a.done ? 1 : 0) - (b.done ? 1 : 0) ||
        (b.createdAt || 0) - (a.createdAt || 0)
      );

    ul.replaceChildren();

    if (!list.length) {
      ul.append(
        emptyMsg(
          'todos',
          S.todos.length
            ? 'No hay pendientes para esta persona.'
            : 'Sin pendientes por ahora. Agrega el primero arriba.'
        )
      );
    }

    let sepDone = false;

    list.forEach(t => {
      if (
        t.done &&
        !sepDone
      ) {
        sepDone = true;

        if (list.some(x => !x.done)) {
          ul.append(h('li', {
            class: 'sect',
            text: 'Hechos'
          }));
        }
      }

      const who = t.who || 'both';

      ul.append(
        h(
          'li',
          { class: 'td' + (t.done ? ' done' : '') },

          checkBtn(t.done, () => {
            run(() => upd('todos', t.id, { done: !t.done }));
          }),

          h('span', {
            class: 'td-t',
            text: t.title
          }),

          h('span', {
            class: 'who',
            style: '--cat:' + WHOC[who],
            text: nm(who)
          }),

          h(
            'div',
            { class: 'row-actions' },
            delBtn('todos', t.id)
          )
        )
      );
    });
  }

  // =========================================================
  // CARTITAS
  // =========================================================

  function renderLetters() {
    const list = S.letters.slice().sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );

    const pinned = list.find(l => l.pinned);
    const pBox = $('#pinned-box');

    if (pBox) {
      if (pinned) {
        pBox.hidden = false;

        pBox.replaceChildren(
          h(
            'div',
            { class: 'pinned-letter' },

            h(
              'div',
              {},

              h('p', {
                class: 'pinned-letter-k',
                text: 'Nota fijada de ' + nm(pinned.from || 'a')
              }),

              h('p', {
                class: 'pinned-letter-b',
                text: pinned.body
              }),

              h('p', {
                class: 'pinned-letter-m',
                text: fmtShort(new Date(pinned.createdAt || Date.now()))
              })
            ),

            pinned.from === S.me
              ? h('button', {
                  type: 'button',
                  class: 'icon-btn',
                  'aria-label': 'Desfijar',
                  onclick: () => {
                    run(() =>
                      upd('letters', pinned.id, { pinned: false })
                    );
                  }
                }, icon('pin'))
              : null
          )
        );
      } else {
        pBox.hidden = true;
      }
    }

    // El HTML utiliza lt-list, no letters-list.
    const ul = $('#lt-list');
    if (!ul) return;

    ul.replaceChildren();

    if (!list.length) {
      ul.append(
        h('p', {
          class: 'empty',
          text: S.loaded.letters
            ? 'No hay cartitas todavía. Escribe la primera arriba.'
            : 'Cargando…'
        })
      );

      return;
    }

    list.forEach(l => {
      ul.append(
        h(
          'div',
          {
            class: 'letter-card' + (l.pinned ? ' is-pinned' : '')
          },

          h(
            'div',
            { class: 'letter-header' },

            h('span', {
              class: 'letter-from',
              text: 'De ' + nm(l.from || 'a')
            }),

            h(
              'div',
              {
                style: 'display:flex;gap:6px;align-items:center'
              },

              h('span', {
                class: 'letter-date',
                text: fmtShort(new Date(l.createdAt || Date.now()))
              }),

              l.from === S.me
                ? h('button', {
                    type: 'button',
                    class: 'icon-btn' + (l.pinned ? ' on' : ''),
                    'aria-label': l.pinned ? 'Desfijar' : 'Fijar nota',

                    onclick: function () {
                      const willPin = !l.pinned;
                      let p = Promise.resolve();

                      if (willPin) {
                        S.letters.forEach(x => {
                          if (x.pinned && x.id !== l.id) {
                            p = p.then(() =>
                              upd('letters', x.id, { pinned: false })
                            );
                          }
                        });
                      }

                      p.then(() =>
                        run(() =>
                          upd('letters', l.id, { pinned: willPin })
                        )
                      );
                    }
                  }, icon('pin'))
                : null,

              l.from === S.me
                ? delBtn('letters', l.id)
                : null
            )
          ),

          h('p', {
            class: 'letter-body',
            text: l.body
          })
        )
      );
    });
  }

  // =========================================================
  // CUENTAS REGRESIVAS
  // =========================================================

  function renderCountdowns() {
    const ul = $('#cd-list');
    if (!ul) return;

    ul.replaceChildren();

    const list = S.countdowns.slice().sort(
      (a, b) => (a.date || '').localeCompare(b.date || '')
    );

    if (!list.length) {
      ul.append(
        h('p', {
          class: 'empty',
          text: S.loaded.countdowns
            ? 'No hay cuentas regresivas. Agrega una fecha especial arriba.'
            : 'Cargando…'
        })
      );

      return;
    }

    const now = todayISO();

    list.forEach(c => {
      const diff = dayDiff(now, c.date);

      const badgeText =
        diff > 0
          ? 'Faltan ' + diff + ' ' + pl(diff, 'día', 'días')
          : diff === 0
            ? '¡Es hoy!'
            : 'Pasó hace ' + Math.abs(diff) + ' ' +
              pl(Math.abs(diff), 'día', 'días');

      ul.append(
        h(
          'li',
          { class: 'cd-card' },

          h(
            'div',
            {},
            h('h3', {
              class: 'cd-title',
              text: c.title
            }),
            h('p', {
              class: 'cd-date',
              text: fmtFull(parse(c.date))
            })
          ),

          h(
            'div',
            {
              style: 'display:flex;gap:12px;align-items:center'
            },

            h('span', {
              class:
                'cd-badge' +
                (diff === 0 ? ' today' : diff < 0 ? ' past' : '')
            }, badgeText),

            delBtn('countdowns', c.id)
          )
        )
      );
    });
  }

  // =========================================================
  // VOTACIONES
  // =========================================================

  function renderPolls() {
    // El HTML utiliza v-list, no poll-list.
    const ul = $('#v-list');
    if (!ul) return;

    ul.replaceChildren();

    if (!S.polls.length) {
      ul.append(
        h('p', {
          class: 'empty',
          text: S.loaded.polls
            ? 'No hay votaciones activas. Crea una encuesta arriba.'
            : 'Cargando…'
        })
      );

      return;
    }

    S.polls.forEach(p => {
      const votesA = p.votesA || [];
      const votesB = p.votesB || [];

      const votedA = votesA.includes(S.me);
      const votedB = votesB.includes(S.me);

      ul.append(
        h(
          'div',
          { class: 'poll-card' },

          h('h3', {
            class: 'poll-q',
            text: p.question
          }),

          h(
            'div',
            { class: 'poll-opts' },

            h(
              'button',
              {
                type: 'button',
                class: 'poll-opt' + (votedA ? ' selected' : ''),

                onclick: function () {
                  const nA = votedA
                    ? votesA.filter(x => x !== S.me)
                    : votesA.concat([S.me]);

                  const nB = votesB.filter(x => x !== S.me);

                  run(() =>
                    upd('polls', p.id, {
                      votesA: nA,
                      votesB: nB
                    })
                  );
                }
              },

              h('span', { text: p.optA }),

              h('span', {
                class: 'poll-count',
                text: votesA.length + ' ' +
                  pl(votesA.length, 'voto', 'votos')
              })
            ),

            h(
              'button',
              {
                type: 'button',
                class: 'poll-opt' + (votedB ? ' selected' : ''),

                onclick: function () {
                  const nB = votedB
                    ? votesB.filter(x => x !== S.me)
                    : votesB.concat([S.me]);

                  const nA = votesA.filter(x => x !== S.me);

                  run(() =>
                    upd('polls', p.id, {
                      votesA: nA,
                      votesB: nB
                    })
                  );
                }
              },

              h('span', { text: p.optB }),

              h('span', {
                class: 'poll-count',
                text: votesB.length + ' ' +
                  pl(votesB.length, 'voto', 'votos')
              })
            )
          ),

          h(
            'div',
            {
              style: 'display:flex;justify-content:flex-end;margin-top:8px'
            },
            delBtn('polls', p.id)
          )
        )
      );
    });
  }

  // =========================================================
  // RECUERDOS
  // =========================================================

  function renderMemories() {
    // El HTML utiliza m-list, no mem-grid.
    const grid = $('#m-list');
    if (!grid) return;

    grid.replaceChildren();

    const list = S.memories.slice().sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );

    if (!list.length) {
      grid.append(
        h('p', {
          class: 'empty',
          text: S.loaded.memories
            ? 'Aún no hay recuerdos guardados. Sube la primera foto arriba.'
            : 'Cargando recuerdos…'
        })
      );

      return;
    }

    list.forEach(m => {
      grid.append(
        h(
          'div',
          { class: 'mem-card' },

          m.image
            ? h('img', {
                src: m.image,
                alt: m.caption || 'Recuerdo'
              })
            : h('div', {
                class: 'mem-noimg',
                text: 'Sin foto'
              }),

          h(
            'div',
            { class: 'mem-body' },

            m.caption
              ? h('p', {
                  class: 'mem-cap',
                  text: m.caption
                })
              : null,

            h(
              'div',
              { class: 'mem-foot' },

              h('span', {
                class: 'mem-date',
                text: fmtShort(new Date(m.createdAt || Date.now()))
              }),

              delBtn('memories', m.id)
            )
          )
        )
      );
    });
  }

  // =========================================================
  // RENDERIZADO GENERAL
  // =========================================================

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

  // =========================================================
  // PESTAÑAS
  // =========================================================

  function setupTabs() {
    $$('.tab').forEach(btn => {
      btn.addEventListener('click', function () {
        const t = this.dataset.tab;
        S.tab = t;

        $$('.tab').forEach(b => {
          const on = b.dataset.tab === t;
          b.classList.toggle('on', on);
          b.setAttribute('aria-selected', String(on));
        });

        $$('.panel').forEach(p => {
          p.hidden = p.id !== 'tab-' + t;
        });
      });
    });

    $$('.subtabs [data-sub]').forEach(btn => {
      btn.addEventListener('click', function () {
        const s = this.dataset.sub;
        S.sub = s;

        $$('.subtabs [data-sub]').forEach(b => {
          const on = b.dataset.sub === s;
          b.classList.toggle('on', on);
          b.setAttribute('aria-selected', String(on));
        });

        ['cartas', 'recuerdos', 'cuenta', 'votos'].forEach(key => {
          const panel = $('#sub-' + key);
          if (panel) panel.hidden = key !== s;
        });
      });
    });
  }

  // =========================================================
  // FORMULARIOS
  // =========================================================

  function setupForms() {
    // ACTIVIDADES
    const evForm = $('#f-ev');

    if (evForm) {
      evForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const title = $('#ev-title').value.trim();
        const time = $('#ev-time').value;
        const note = $('#ev-note').value.trim();

        if (!title) return;

        run(() =>
          add('events', {
            title,
            date: S.day,
            time,
            cat: S.evCat,
            note,
            done: false
          })
        ).then(ok => {
          if (ok) {
            $('#ev-title').value = '';
            $('#ev-note').value = '';
            toast('¡Actividad agregada!');
          }
        });
      });
    }

    // CATÁLOGO
    const watchForm = $('#f-watch');

    if (watchForm) {
      watchForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const title = $('#w-title').value.trim();
        const kind = $('#w-kind').value;
        const cover = $('#w-cover').value.trim();
        const platform = $('#w-plat').value.trim();

        if (!title) return;

        run(() =>
          add('watch', {
            title,
            kind: kind === 'auto' ? 'serie' : kind,
            cover,
            platform,
            status: 'por-ver',
            season: 1,
            ep: 0,
            rating: 0,
            scoreA: null,
            scoreB: null,
            revA: '',
            revB: ''
          })
        ).then(ok => {
          if (ok) {
            $('#w-title').value = '';
            $('#w-cover').value = '';
            $('#w-plat').value = '';
            $('#api-box').hidden = true;
            $('#detected-plats-box').hidden = true;
            $('#autocomplete-list').hidden = true;
            toast('¡Título agregado al catálogo!');
          }
        });
      });
    }

    // PLANES
    const planForm = $('#f-plan');

    if (planForm) {
      planForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const title = $('#p-title').value.trim();
        const place = $('#p-place').value.trim();
        const date = $('#p-date').value;

        if (!title) return;

        run(() =>
          add('plans', {
            title,
            place,
            date,
            status: date ? 'agendada' : 'idea'
          })
        ).then(ok => {
          if (ok) {
            $('#p-title').value = '';
            $('#p-place').value = '';
            toast('¡Plan guardado!');
          }
        });
      });
    }

    // PENDIENTES
    const todoForm = $('#f-todo');

    if (todoForm) {
      todoForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const title = $('#td-title').value.trim();
        const who = $('#td-who').value;

        if (!title) return;

        run(() =>
          add('todos', {
            title,
            who,
            done: false
          })
        ).then(ok => {
          if (ok) {
            $('#td-title').value = '';
            toast('¡Pendiente agregado!');
          }
        });
      });
    }

    // CARTITAS
    const letterForm = $('#f-letter');

    if (letterForm) {
      letterForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const body = $('#lt-body').value.trim();
        if (!body) return;

        run(() =>
          add('letters', {
            body,
            from: S.me,
            pinned: false
          })
        ).then(ok => {
          if (ok) {
            $('#lt-body').value = '';
            toast('¡Cartita enviada!');
          }
        });
      });
    }

    // FIJAR CARTITA
    const pinButton = $('#lt-pin');

    if (pinButton) {
      pinButton.addEventListener('click', function () {
        S.pinLetter = !S.pinLetter;

        this.classList.toggle('on', S.pinLetter);
        this.setAttribute('aria-pressed', String(S.pinLetter));
      });
    }

    // CUENTA REGRESIVA
    const cdForm = $('#f-cd');

    if (cdForm) {
      cdForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const title = $('#cd-title').value.trim();
        const date = $('#cd-date').value;

        if (!title || !date) return;

        run(() =>
          add('countdowns', {
            title,
            date,
            yearly: S.yearly
          })
        ).then(ok => {
          if (ok) {
            $('#cd-title').value = '';
            toast('¡Cuenta regresiva creada!');
          }
        });
      });
    }

    // REPETIR ANUALMENTE
    const yearlyButton = $('#cd-yearly');

    if (yearlyButton) {
      yearlyButton.addEventListener('click', function () {
        S.yearly = !S.yearly;
        this.classList.toggle('on', S.yearly);
        this.setAttribute('aria-pressed', String(S.yearly));
      });
    }

    // VOTACIONES
    const pollForm = $('#f-poll');

    if (pollForm) {
      pollForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const question = $('#v-q').value.trim();
        const optA = $('#v-a').value.trim();
        const optB = $('#v-b').value.trim();

        if (!question || !optA || !optB) return;

        run(() =>
          add('polls', {
            question,
            optA,
            optB,
            votesA: [],
            votesB: []
          })
        ).then(ok => {
          if (ok) {
            $('#v-q').value = '';
            $('#v-a').value = '';
            $('#v-b').value = '';
            toast('¡Encuesta creada!');
          }
        });
      });
    }

    // RECUERDOS
    const memForm = $('#f-mem');

    if (memForm) {
      memForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const title = $('#m-title').value.trim();
        const date = $('#m-date').value;
        const note = $('#m-note').value.trim();
        const fileInput = $('#m-photo');
        const file = fileInput.files && fileInput.files[0];

        if (!title || !date) {
          toast('Agrega un nombre y una fecha al recuerdo.');
          return;
        }

        try {
          const image = file ? await compressImage(file) : '';

          const ok = await run(() =>
            add('memories', {
              caption: title,
              date,
              note,
              image
            })
          );

          if (ok) {
            $('#m-title').value = '';
            $('#m-date').value = todayISO();
            $('#m-note').value = '';
            fileInput.value = '';
            toast('¡Recuerdo guardado!');
          }
        } catch (err) {
          console.error(err);
          toast('No se pudo procesar la imagen.');
        }
      });
    }

    // CONFIGURACIÓN DE NOMBRES
    const namesForm = $('#f-names');

    if (namesForm) {
      namesForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const nameA = $('#name-a').value.trim();
        const nameB = $('#name-b').value.trim();

        if (!nameA || !nameB) {
          toast('Escribe los dos nombres.');
          return;
        }

        const me = $('#who-am-i').value;

        run(() =>
          setDoc(
            doc(db, 'settings', 'config'),
            { nameA, nameB },
            { merge: true }
          )
        ).then(ok => {
          if (ok) {
            S.settings.nameA = nameA;
            S.settings.nameB = nameB;
            S.me = me;

            try {
              localStorage.setItem('nd-me', S.me);
            } catch (err) {}

            buildWho();
            renderAll();

            const namesPanel = $('#names');
            if (namesPanel) namesPanel.hidden = true;

            toast('¡Nombres guardados!');
          }
        });
      });
    }
  }

  // =========================================================
  // BOTONES Y NAVEGACIÓN DE FECHAS
  // =========================================================

  function setupButtons() {
    const prev = $('#day-prev');
    const next = $('#day-next');
    const today = $('#day-today');

    if (prev) {
      prev.addEventListener('click', () => {
        S.day = addDays(S.day, -1);
        renderHoy();
      });
    }

    if (next) {
      next.addEventListener('click', () => {
        S.day = addDays(S.day, 1);
        renderHoy();
      });
    }

    if (today) {
      today.addEventListener('click', () => {
        S.day = todayISO();
        renderHoy();
      });
    }

    const searchButton = $('#btn-search-api');

    if (searchButton) {
      searchButton.addEventListener('click', searchCoverAPI);
    }

    const apiClose = $('#api-close');

    if (apiClose) {
      apiClose.addEventListener('click', () => {
        $('#api-box').hidden = true;
      });
    }

    const pickButton = $('#btn-pick');

    if (pickButton) {
      pickButton.addEventListener('click', pickRandom);
    }

    const pickGo = $('#pick-go');

    if (pickGo) {
      pickGo.addEventListener('click', function () {
        if (!S.pickId) return;

        run(() =>
          upd('watch', S.pickId, { status: 'viendo' })
        ).then(ok => {
          if (ok) {
            $('#pick').hidden = true;
            toast('¡Marcado como En curso!');
          }
        });
      });
    }

    const pickAgain = $('#pick-again');

    if (pickAgain) {
      pickAgain.addEventListener('click', pickRandom);
    }

    // El HTML actual no tiene botón pick-close.
    // No es necesario para que funcione el resto de la aplicación.

    const btnGoogle = $('#btn-google');

    if (btnGoogle) {
      btnGoogle.addEventListener('click', function () {
        if (!auth) {
          toast('Firebase todavía no está listo.');
          return;
        }

        signInWithPopup(auth, new GoogleAuthProvider())
          .catch(err => {
            console.error('Inicio de sesión:', err);
            toast('No se pudo iniciar sesión con Google.');
          });
      });
    }

    const btnOut = $('#btn-out');

    if (btnOut) {
      btnOut.addEventListener('click', function () {
        if (auth) signOut(auth);
      });
    }

    const btnNames = $('#btn-names');

    if (btnNames) {
      btnNames.addEventListener('click', function () {
        const panel = $('#names');
        if (panel) panel.hidden = !panel.hidden;
      });
    }

    const who = $('#who-am-i');

    if (who) {
      who.addEventListener('change', function () {
        S.me = this.value;

        try {
          localStorage.setItem('nd-me', S.me);
        } catch (e) {}

        renderAll();
        toast('Ahora eres ' + nm(S.me));
      });
    }
  }

  // =========================================================
  // AUTENTICACIÓN
  // =========================================================

  function setupAuth() {
    try {
      const app = initializeApp(firebaseConfig);

      auth = getAuth(app);
      db = getFirestore(app);

      onAuthStateChanged(auth, user => {
        const login = $('#login');
        const shell = $('#shell');
        const offline = $('#offline');
        const btnNames = $('#btn-names');
        const names = $('#names');

        if (user) {
          S.uid = user.uid;

          if (login) login.hidden = true;
          if (shell) shell.hidden = false;
          if (offline) offline.hidden = true;
          if (btnNames) btnNames.hidden = false;

          loadData();

          toast('¡Bienvenido a Nuestro Día!');
        } else {
          S.uid = null;

          if (login) login.hidden = false;
          if (shell) shell.hidden = true;
          if (btnNames) btnNames.hidden = true;
          if (names) names.hidden = true;

          unsubs.forEach(fn => fn());
          unsubs = [];
        }
      });
    } catch (e) {
      console.error('Error al inicializar Firebase:', e);

      const offline = $('#offline');
      if (offline) {
        offline.hidden = false;
        offline.textContent =
          'No se pudo conectar con Firebase. Revisa la configuración.';
      }

      toast('Error al inicializar Firebase.');
    }
  }

  // =========================================================
  // CARGA DE DATOS
  // =========================================================

  function loadData() {
    if (!db || !S.uid) return;

    unsubs.forEach(fn => fn());
    unsubs = [];

    const cols = [
      'events',
      'watch',
      'plans',
      'todos',
      'memories',
      'countdowns',
      'polls',
      'letters'
    ];

    cols.forEach(col => {
      const unsub = onSnapshot(
        collection(db, col),

        snap => {
          S[col] = snap.docs.map(d => ({
            ...d.data(),
            id: d.id
          }));

          S.loaded[col] = true;
          renderAll();
        },

        err => {
          console.error('Error leyendo ' + col + ':', err);
          S.loaded[col] = true;
          renderAll();
        }
      );

      unsubs.push(unsub);
    });

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'config'),

      snap => {
        if (snap.exists()) {
          const data = snap.data();

          if (data.nameA) S.settings.nameA = data.nameA;
          if (data.nameB) S.settings.nameB = data.nameB;

          buildWho();
          renderAll();
        }
      },

      err => {
        console.error('Error leyendo configuración:', err);
      }
    );

    unsubs.push(unsubSettings);
  }

  // =========================================================
  // INICIALIZACIÓN
  // =========================================================

  document.addEventListener('DOMContentLoaded', function () {
    // Ya no se utiliza #w-day: ese elemento no existe en el HTML.
    // La fecha de las actividades se obtiene de S.day.

    const pDate = $('#p-date');
    const cdDate = $('#cd-date');
    const mDate = $('#m-date');

    if (pDate) pDate.value = todayISO();
    if (cdDate) cdDate.value = todayISO();
    if (mDate) mDate.value = todayISO();

    // Iconos de navegación
    $$('[data-ic]').forEach(el => {
      const name = el.dataset.ic;

      if (ICONS[name]) {
        el.replaceChildren(icon(name));
      }
    });

    const pencil = $('#ic-pencil');

    if (pencil) {
      pencil.replaceChildren(icon('pencil'));
    }

    buildCats();
    buildIdeas();
    buildWho();

    setupAutocomplete();
    setupTabs();
    setupForms();
    setupButtons();
    setupAuth();
  });

})();