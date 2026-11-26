// Arma el texto del aviso según lo que se agregó. Sin dependencias (fácil de probar).
const KINDS = { serie: 'Serie', anime: 'Anime', pelicula: 'Película', juego: 'Videojuego' };

function cut(t, n) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function build(col, d, names) {
  const who = d.by === 'b' ? names.b : names.a;
  switch (col) {
    case 'letters':
      return { title: '💌 Cartita de ' + who, body: cut(d.body, 120), tab: 'nosotros', sub: 'cartas' };
    case 'todos':
      return { title: '✅ Nuevo pendiente', body: who + ': ' + cut(d.title, 100), tab: 'pendientes', sub: '' };
    case 'countdowns':
      return { title: '⏳ Nueva fecha especial', body: who + ' agregó: ' + cut(d.title, 80) + (d.date ? ' (' + d.date + ')' : ''), tab: 'nosotros', sub: 'cuenta' };
    case 'watch':
      return { title: '🎬 Nuevo en el catálogo', body: who + ' agregó ' + (KINDS[d.kind] ? KINDS[d.kind].toLowerCase() + ': ' : '') + cut(d.title, 80), tab: 'ver', sub: '' };
    case 'events':
      return { title: '📅 Nuevo evento', body: who + ': ' + cut(d.title, 80) + (d.date ? ' (' + d.date + (d.time ? ' ' + d.time : '') + ')' : ''), tab: 'hoy', sub: '' };
    case 'plans':
      return { title: '📍 Nuevo plan', body: who + ': ' + cut(d.title, 80), tab: 'planes', sub: '' };
    default:
      return null;
  }
}

module.exports = { build, cut };
