const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { build } = require('./messages');

// Debe ser la misma región que tu Firestore (ver Firebase → Firestore → Datos → ubicación).
setGlobalOptions({ region: process.env.FN_REGION || 'us-central1', maxInstances: 3 });

admin.initializeApp();
const db = admin.firestore();

const COLS = ['letters', 'todos', 'countdowns', 'watch', 'events', 'plans'];

async function notify(col, snap) {
  const d = snap.data() || {};
  const cfg = (await db.doc('settings/config').get()).data() || {};
  const names = { a: cfg.nameA || 'Gary', b: cfg.nameB || 'Yumi' };
  const msg = build(col, d, names);
  if (!msg) return;

  const devs = await db.collection('settings').where('kind', '==', 'device').get();
  // Se avisa a los celulares de la OTRA persona (los sin dueño conocido también).
  const targets = devs.docs.filter((x) => x.data().token && x.data().me !== d.by);
  if (!targets.length) return;

  const res = await admin.messaging().sendEachForMulticast({
    tokens: targets.map((x) => x.data().token),
    data: { title: msg.title, body: msg.body, tab: msg.tab, sub: msg.sub, tag: col },
    webpush: { headers: { Urgency: 'high', TTL: '86400' } }
  });

  // Borra celulares que ya no existen.
  const dead = [];
  res.responses.forEach((r, i) => {
    const c = r.error && r.error.code;
    if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-registration-token') dead.push(targets[i].ref.delete());
  });
  await Promise.all(dead);
}

for (const col of COLS) {
  exports['aviso_' + col] = onDocumentCreated(col + '/{id}', (event) => notify(col, event.data));
}
