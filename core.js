'use strict';
window.NB = {};
NB.TAU = Math.PI * 2;
NB.clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
NB.rand = (lo, hi) => lo + Math.random() * (hi - lo);
NB.dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
NB.pad = (n, size = 2) => String(Math.floor(n)).padStart(size, '0');
NB.color = { cyan: '#68ffe0', pink: '#ff5b8e', purple: '#b795ff', amber: '#ffbe76' };
NB.STATES = Object.freeze({ MENU: 'MENU', PLAYING: 'PLAYING', PAUSED: 'PAUSED', UPGRADE: 'UPGRADE', BOSS: 'BOSS', GAME_OVER: 'GAME_OVER' });
NB.Store = {
  key: 'neon-breach-v1', available: true,
  defaults: { best: 0, clears: 0, runs: 0, audio: true, music: true, volume: .45, shake: true, effects: true },
  load() {
    let data = {};
    try { data = JSON.parse(localStorage.getItem(this.key) || '{}') || {}; } catch (_) { this.available = false; }
    const result = { ...this.defaults };
    for (const key in result) if (typeof data[key] === typeof result[key]) result[key] = data[key];
    for (const key of ['best', 'clears', 'runs']) result[key] = Number.isFinite(result[key]) ? Math.max(0, Math.floor(result[key])) : 0;
    result.volume = NB.clamp(Number.isFinite(result.volume) ? result.volume : .45, 0, 1);
    return result;
  },
  save() { try { localStorage.setItem(this.key, JSON.stringify(NB.settings)); this.available = true; } catch (_) { this.available = false; } }
};
NB.settings = NB.Store.load();
if (matchMedia('(prefers-reduced-motion: reduce)').matches) NB.settings.shake = false;
NB.Pool = class {
  constructor(capacity) { this.items = []; this.free = Array.from({ length: capacity }, () => ({})); this.capacity = capacity; }
  add(data) { const item = this.free.pop(); if (!item) return null; Object.assign(item, data); this.items.push(item); return item; }
  remove(index) { const item = this.items[index]; const last = this.items.pop(); if (index < this.items.length) this.items[index] = last; this.free.push(item); }
  clear() { while (this.items.length) this.free.push(this.items.pop()); }
};
NB.segmentHit = (x1, y1, x2, y2, target, radius) => {
  const dx = x2 - x1, dy = y2 - y1, len = dx * dx + dy * dy;
  const t = len ? NB.clamp(((target.x - x1) * dx + (target.y - y1) * dy) / len, 0, 1) : 0;
  return (x1 + dx * t - target.x) ** 2 + (y1 + dy * t - target.y) ** 2 < radius * radius;
};
NB.poly = (ctx, points, fill, stroke, width = 1) => {
  ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
};
