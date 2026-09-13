'use strict';
NB.Effects = class {
  constructor() { this.particles = new NB.Pool(360); this.rings = new NB.Pool(30); this.texts = new NB.Pool(40); this.shake = 0; this.flash = 0; }
  burst(x, y, color, count = 12, speed = 150) {
    count = NB.settings.effects ? count : Math.ceil(count * .3);
    for (let i = 0; i < count; i++) { const a = Math.random() * NB.TAU, s = NB.rand(speed * .2, speed); this.particles.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: NB.rand(.18, .6), max: .6, color, size: NB.rand(1.5, 3.5), trail: false }); }
  }
  trail(x, y, a) { this.particles.add({ x, y, vx: 0, vy: 0, life: .23, max: .23, color: NB.color.cyan, size: 15, angle: a, trail: true }); }
  ring(x, y, color, radius = 55, life = .45) { this.rings.add({ x, y, color, radius, life, max: life }); }
  text(x, y, text, color = NB.color.cyan, size = 13) { this.texts.add({ x, y, text, color, size, life: .85, max: .85 }); }
  kick(amount) { if (NB.settings.shake) this.shake = Math.min(13, Math.max(this.shake, amount)); }
  clear() { this.particles.clear(); this.rings.clear(); this.texts.clear(); this.flash = this.shake = 0; }
  update(dt) {
    this.shake = Math.max(0, this.shake - dt * 24); this.flash = Math.max(0, this.flash - dt * 3);
    for (const pool of [this.particles, this.rings, this.texts]) for (let i = pool.items.length - 1; i >= 0; i--) {
      const p = pool.items[i]; p.life -= dt; if (p.life <= 0) { pool.remove(i); continue; }
      if (pool === this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-3 * dt); p.vy *= Math.exp(-3 * dt); }
      else if (pool === this.texts) p.y -= 37 * dt;
    }
  }
  draw(ctx) {
    for (const p of this.particles.items) {
      ctx.globalAlpha = NB.clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color;
      if (p.trail) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle); NB.poly(ctx, [[20, 0], [-12, -11], [-6, 0], [-12, 11]], p.color); ctx.restore(); }
      else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    for (const r of this.rings.items) { ctx.globalAlpha = r.life / r.max; ctx.strokeStyle = r.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.radius * (1 - r.life / r.max), 0, NB.TAU); ctx.stroke(); }
    for (const p of this.texts.items) { ctx.globalAlpha = Math.min(1, p.life * 3); ctx.font = `bold ${p.size}px monospace`; ctx.textAlign = 'center'; ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); }
    ctx.globalAlpha = 1;
  }
};
