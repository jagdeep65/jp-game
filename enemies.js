'use strict';
NB.enemyTypes = {
  drone: { hp: 32, speed: 108, r: 17, damage: 12, xp: 7, score: 100, color: '#ff718f' },
  hunter: { hp: 62, speed: 88, r: 23, damage: 15, xp: 12, score: 180, color: '#ffbe76' },
  tank: { hp: 190, speed: 48, r: 31, damage: 23, xp: 24, score: 350, color: '#c5a3ff' },
  swarm: { hp: 15, speed: 155, r: 11, damage: 8, xp: 3, score: 55, color: '#ff91cc' },
  phantom: { hp: 76, speed: 110, r: 22, damage: 18, xp: 15, score: 240, color: '#9aa7ff' }
};
NB.Enemy = class {
  constructor(type, x, y, wave, elite = false) {
    Object.assign(this, NB.enemyTypes[type]); this.type = type; this.x = x; this.y = y; this.hp *= 1 + (wave - 1) * .065; this.speed *= 1 + Math.min(.35, (wave - 1) * .018);
    this.elite = elite; if (elite) { this.hp *= 2.7; this.r *= 1.25; this.score *= 3; this.xp *= 3; }
    this.maxHp = this.hp; this.dead = false; this.boss = false; this.angle = 0; this.clock = Math.random() * NB.TAU; this.cooldown = NB.rand(1, 2.4); this.spawn = .75; this.flash = 0; this.stun = 0; this.alpha = 1; this.orbit = Math.random() < .5 ? -1 : 1;
  }
  update(dt, g) {
    this.clock += dt; this.flash = Math.max(0, this.flash - dt); this.stun = Math.max(0, this.stun - dt);
    if (this.spawn > 0) { this.spawn -= dt; return; } if (this.stun > 0) return;
    const p = g.player, dx = p.x - this.x, dy = p.y - this.y, distance = Math.hypot(dx, dy) || 1, nx = dx / distance, ny = dy / distance;
    this.angle = Math.atan2(dy, dx); this.cooldown -= dt;
    let vx = nx * this.speed, vy = ny * this.speed;
    if (this.type === 'drone') { const sway = Math.sin(this.clock * 4.8) * 40; vx -= ny * sway; vy += nx * sway; }
    if (this.type === 'swarm') { const sway = Math.sin(this.clock * 8) * 35; vx -= ny * sway; vy += nx * sway; }
    if (this.type === 'hunter') {
      const approach = distance < 240 ? -.8 : distance > 360 ? 1 : 0;
      vx = nx * this.speed * approach - ny * this.speed * .7 * this.orbit; vy = ny * this.speed * approach + nx * this.speed * .7 * this.orbit;
      if (this.cooldown <= 0 && distance < 700) { g.enemyShot(this.x + nx * 25, this.y + ny * 25, this.angle, 245 + g.wave * 3, 13, this.color); this.cooldown = Math.max(1.1, 2.5 - g.wave * .055); g.fx.ring(this.x, this.y, this.color, 33, .2); }
    }
    if (this.type === 'tank' && this.cooldown <= 0 && distance < 680) { for (let i = -1; i <= 1; i++) g.enemyShot(this.x, this.y, this.angle + i * .23, this.elite ? 230 : 195, 17, this.color, 7); this.cooldown = this.elite ? 1.8 : 3.6; g.fx.ring(this.x, this.y, this.color, 42, .3); }
    if (this.type === 'phantom') {
      const phase = this.clock % 5.5; this.alpha = phase < 2.8 ? .18 : 1;
      const speed = phase > 4.7 ? this.speed * 2.2 : this.speed * .85;
      vx = nx * speed - ny * Math.sin(this.clock * 2) * 80; vy = ny * speed + nx * Math.sin(this.clock * 2) * 80;
      if (phase > 4.65 && phase < 4.65 + dt) g.fx.ring(this.x, this.y, this.color, 45, .4);
    }
    this.x = NB.clamp(this.x + vx * dt, this.r + 20, g.world.w - this.r - 20); this.y = NB.clamp(this.y + vy * dt, this.r + 20, g.world.h - this.r - 20);
    if (distance < p.r + this.r) { p.hurt(this.damage, g); if (p.dashTime <= 0) { this.x -= nx * 38 * dt; this.y -= ny * 38 * dt; } }
  }
  draw(c, time) {
    c.save(); c.translate(this.x, this.y);
    if (this.spawn > 0) {
      c.strokeStyle = this.color; c.globalAlpha = .25 + Math.sin(this.spawn * 25) * .15; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, this.r + 17, 0, NB.TAU); c.stroke(); c.beginPath(); c.moveTo(-9, 0); c.lineTo(9, 0); c.moveTo(0, -9); c.lineTo(0, 9); c.stroke(); c.restore(); return;
    }
    c.globalAlpha = this.alpha; c.fillStyle = '#0006'; c.beginPath(); c.ellipse(0, 9, this.r * 1.15, this.r * .6, 0, 0, NB.TAU); c.fill();
    c.rotate(this.angle); c.scale(this.elite ? 1.25 : 1, this.elite ? 1.25 : 1);
    const color = this.flash > 0 ? '#f2ffed' : this.color, fill = this.flash > 0 ? '#b7c4c4' : '#162332';
    if (this.type === 'drone') {
      NB.poly(c, [[23, 0], [0, -13], [-18, -10], [-7, 0], [-18, 10], [0, 13]], fill, color, 1.5);
      NB.poly(c, [[9, 0], [-1, -5], [-6, 0], [-1, 5]], color);
      c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -16); c.lineTo(5, -17); c.moveTo(-12, 16); c.lineTo(5, 17); c.stroke();
    } else if (this.type === 'hunter') {
      for (let i = 0; i < 3; i++) { c.save(); c.rotate(i * NB.TAU / 3 + Math.PI); const step = Math.sin(this.clock * 7 + i * 2) * 3; c.strokeStyle = '#664f43'; c.lineWidth = 5; c.beginPath(); c.moveTo(9, 0); c.lineTo(20, 9 + step); c.lineTo(29, 6 + step); c.stroke(); c.strokeStyle = color; c.lineWidth = 1.5; c.stroke(); c.restore(); }
      NB.poly(c, [[18, 0], [-10, -15], [-15, 0], [-10, 15]], fill, color, 1.5); c.fillStyle = color; c.fillRect(3, -3, 25, 6); c.fillStyle = '#fff2d8'; c.fillRect(4, -2, 6, 4);
      if (this.cooldown < .5) { c.strokeStyle = color + '65'; c.lineWidth = 1; c.setLineDash([5, 6]); c.beginPath(); c.moveTo(32, 0); c.lineTo(155, 0); c.stroke(); c.setLineDash([]); }
    } else if (this.type === 'tank') {
      for (const y of [-28, 19]) { c.fillStyle = '#1a2334'; c.fillRect(-24, y, 49, 10); c.strokeStyle = '#6d5f89'; c.lineWidth = 1; c.strokeRect(-24, y, 49, 10); for (let x = -21; x < 24; x += 8) { c.fillStyle = '#71698c'; c.fillRect(x, y + 2, 3, 6); } }
      NB.poly(c, [[29, -13], [16, -23], [-19, -23], [-29, -12], [-29, 12], [-19, 23], [16, 23], [29, 13]], fill, color, 2);
      c.fillStyle = '#34364d'; c.fillRect(-12, -14, 25, 28); c.strokeStyle = color; c.strokeRect(-12, -14, 25, 28); c.fillStyle = '#b9b0d8'; c.fillRect(2, -5, 32, 10); c.fillStyle = color; c.fillRect(29, -4, 7, 8); c.fillStyle = color; c.fillRect(-20, -16, 3, 32);
    } else if (this.type === 'swarm') {
      NB.poly(c, [[15, 0], [-11, -11], [-5, 0], [-11, 11]], fill, color, 1.5); NB.poly(c, [[8, 0], [-3, -3], [-3, 3]], color);
    } else {
      c.save(); c.rotate(Math.sin(time * 2) * .25); for (let i = 0; i < 3; i++) { c.rotate(NB.TAU / 3); NB.poly(c, [[8, -5], [27, -17], [15, 5], [7, 12], [0, 6]], fill, color, 1.5); } c.restore(); c.fillStyle = color; c.beginPath(); c.arc(0, 0, 5, 0, NB.TAU); c.fill();
      c.strokeStyle = color; c.globalAlpha = Math.max(.35, this.alpha); c.setLineDash([3, 9]); c.beginPath(); c.arc(0, 0, 29, time, time + NB.TAU); c.stroke(); c.setLineDash([]);
    }
    c.restore();
    if (this.hp < this.maxHp || this.elite) { const w = this.r * 2; c.fillStyle = '#080d16'; c.fillRect(this.x - w / 2, this.y - this.r - 13, w, 3); c.fillStyle = this.color; c.fillRect(this.x - w / 2, this.y - this.r - 13, w * this.hp / this.maxHp, 3); }
    if (this.elite) { c.font = '8px monospace'; c.fillStyle = this.color; c.textAlign = 'center'; c.fillText('BULWARK / ELITE', this.x, this.y - this.r - 21); }
  }
};
