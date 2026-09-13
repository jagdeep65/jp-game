'use strict';
NB.Boss = class {
  constructor(type, x, y) {
    Object.assign(this, { type, x, y, boss: true, elite: false, dead: false, r: type === 'warden' ? 67 : 77, hp: type === 'warden' ? 7600 : 24000, score: type === 'warden' ? 3500 : 8000, xp: type === 'warden' ? 130 : 250, color: '#ff5b8e', damage: 25, spawn: 2.5, phase: 1, angle: Math.PI / 2, clock: 0, flash: 0, stun: 0, cooldown: 1.2, attack: 0, windup: 0, charge: 0, spiral: 0, spiralTick: 0, aim: 0, pattern: 0 }); this.maxHp = this.hp;
  }
  update(dt, g) {
    this.clock += dt; this.flash = Math.max(0, this.flash - dt); this.stun = Math.max(0, this.stun - dt);
    if (this.spawn > 0) { this.spawn -= dt; return; }
    const phase = this.hp < this.maxHp * .33 ? 3 : this.hp < this.maxHp * .66 ? 2 : 1;
    if (phase > this.phase) {
      this.phase = phase; this.cooldown = 1.5; this.windup = this.charge = this.spiral = 0; g.hostile.clear(); g.hazards.clear(); g.fx.ring(this.x, this.y, NB.color.pink, 240, 1); g.audio.play('warning');
      g.ui?.announce('THREAT LEVEL INCREASED', 'PHASE 0' + phase, this.type === 'nexus' && phase === 3 ? 'NO MORE FIREWALLS. FINISH THIS.' : 'ATTACK PATTERNS RECONFIGURED', true, 1.8);
      for (let i = 0; i < phase; i++) g.spawnEnemy(this.type === 'nexus' && phase === 3 ? 'phantom' : 'drone');
    }
    const dx = g.player.x - this.x, dy = g.player.y - this.y, distance = Math.hypot(dx, dy) || 1;
    this.angle = Math.atan2(dy, dx);
    if (this.charge > 0) { this.charge -= dt; this.x += Math.cos(this.aim) * 620 * dt; this.y += Math.sin(this.aim) * 620 * dt; if (Math.floor(this.clock * 30) % 2 === 0) g.fx.burst(this.x, this.y, '#ffbe76', 1, 30); }
    else if (this.type === 'warden' && this.windup <= 0) { const speed = distance > 330 ? 48 : distance < 220 ? -32 : 0; this.x += (dx / distance * speed - dy / distance * 22) * dt; this.y += (dy / distance * speed + dx / distance * 22) * dt; }
    else if (this.type === 'nexus' && this.windup <= 0) { this.x += (920 + Math.sin(this.clock * .25) * 130 - this.x) * dt * .4; this.y += (475 + Math.sin(this.clock * .4) * 80 - this.y) * dt * .4; }
    this.x = NB.clamp(this.x, 110, g.world.w - 110); this.y = NB.clamp(this.y, 110, g.world.h - 110);
    if (distance < this.r + g.player.r) g.player.hurt(this.charge > 0 ? 32 : 23, g);
    if (this.windup > 0) { this.windup -= dt; if (this.windup <= 0) this.fire(g); return; }
    if (this.spiral > 0) { this.spiral -= dt; this.spiralTick -= dt; if (this.spiralTick <= 0) { for (let i = 0; i < 3; i++) g.enemyShot(this.x, this.y, this.clock * 1.6 + i * NB.TAU / 3, 190 + this.phase * 15, 14, this.color, 5); this.spiralTick = .16; } }
    this.cooldown -= dt;
    if (this.cooldown <= 0 && this.charge <= 0) {
      this.aim = this.angle; this.pattern = this.attack++ % (this.type === 'warden' ? 3 : 4); this.windup = this.type === 'warden' ? .85 : 1; this.cooldown = this.type === 'warden' ? 2.7 - this.phase * .3 : 3.1 - this.phase * .3;
      if (this.type === 'warden' && this.pattern === 2) g.hazards.add({ type: 'line', x: this.x, y: this.y, angle: this.aim, length: 480, r: 38, warm: .85, totalWarm: .85, life: .02, damage: 0, color: '#ffbe76', fired: false, both: false });
    }
  }
  fire(g) {
    g.fx.ring(this.x, this.y, this.color, 110, .3);
    if (this.type === 'warden') {
      if (this.pattern === 0) { for (let i = -this.phase - 1; i <= this.phase + 1; i++) g.enemyShot(this.x + Math.cos(this.aim) * 60, this.y + Math.sin(this.aim) * 60, this.aim + i * .14, 280 + this.phase * 12, 16, '#ffbe76', 7); }
      if (this.pattern === 1) { const count = 18 + this.phase * 4; for (let i = 2; i < count - 1; i++) g.enemyShot(this.x, this.y, this.aim + i * NB.TAU / count, 180 + this.phase * 12, 15, this.color, 6); }
      if (this.pattern === 2) this.charge = .65;
    } else {
      if (this.pattern === 0) { const count = 22 + this.phase * 4; for (let i = 2; i < count - 1; i++) g.enemyShot(this.x, this.y, this.aim + i * NB.TAU / count, 195 + this.phase * 16, 16, this.color, 6); if (this.phase >= 2) this.spiral = 1.7; }
      if (this.pattern === 1) {
        const positions = [{ x: g.player.x, y: g.player.y }]; for (let i = 0; i < 3 + this.phase; i++) { const a = i * NB.TAU / (3 + this.phase); positions.push({ x: g.player.x + Math.cos(a) * 150, y: g.player.y + Math.sin(a) * 150 }); }
        for (const p of positions) g.hazards.add({ type: 'circle', x: NB.clamp(p.x, 80, g.world.w - 80), y: NB.clamp(p.y, 80, g.world.h - 80), r: 60 + this.phase * 6, warm: 1.1, totalWarm: 1.1, life: .45, damage: 22, color: this.color, fired: false });
      }
      if (this.pattern === 2) { for (let i = 0; i < (this.phase === 3 ? 3 : 2); i++) g.hazards.add({ type: 'line', x: this.x, y: this.y, angle: this.aim + i * Math.PI / (this.phase === 3 ? 3 : 2), length: 2000, r: 24, warm: 1.1, totalWarm: 1.1, life: .55, damage: 26, color: this.color, fired: false, both: true }); }
      if (this.pattern === 3) { this.spiral = 2.3; if (g.enemies.length < 9) for (let i = 0; i < this.phase + 1; i++) g.spawnEnemy(this.phase === 3 && i === 0 ? 'tank' : 'hunter'); }
    }
    g.audio.play('hit');
  }
  draw(c, time) {
    c.save(); c.translate(this.x, this.y);
    const color = this.flash > 0 ? '#ffffff' : this.color;
    if (this.spawn > 0) { c.globalAlpha = .4; c.strokeStyle = color; c.lineWidth = 2; c.setLineDash([12, 12]); c.beginPath(); c.arc(0, 0, 110 + Math.sin(this.spawn * 5) * 10, time, time + NB.TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = NB.clamp(1 - this.spawn / 2.5, .1, 1); }
    c.fillStyle = '#0007'; c.beginPath(); c.ellipse(0, 22, 95, 64, 0, 0, NB.TAU); c.fill();
    if (this.type === 'warden') {
      c.rotate(this.charge > 0 ? this.aim : this.angle);
      for (const side of [-1, 1]) for (const end of [-1, 1]) { c.save(); c.translate(end * 34, side * 48); c.rotate(side * end * -.2); NB.poly(c, [[-22, -14], [23, -14], [28, 13], [16, 23], [-25, 18]], '#222536', '#685168', 2); c.fillStyle = color; c.fillRect(-16, side > 0 ? 14 : -13, 25, 3); for (let x = -15; x < 20; x += 9) { c.fillStyle = '#665b75'; c.fillRect(x, -6, 3, 17); } c.restore(); }
      NB.poly(c, [[64, -31], [37, -52], [-40, -52], [-66, -24], [-66, 24], [-40, 52], [37, 52], [64, 31]], '#222336', color, 2.5);
      NB.poly(c, [[-49, -34], [-10, -42], [18, -26], [18, 26], [-10, 42], [-49, 34]], '#393045', '#98788e', 1.5);
      c.fillStyle = '#615569'; c.fillRect(13, -29, 63, 15); c.fillRect(13, 14, 63, 15); c.fillStyle = '#ffbe76'; c.fillRect(66, -27, 16, 11); c.fillRect(66, 16, 16, 11);
      c.fillStyle = '#121728'; c.beginPath(); c.arc(-5, 0, 29, 0, NB.TAU); c.fill(); c.strokeStyle = color; c.lineWidth = 3; c.stroke(); c.fillStyle = color; c.fillRect(-4, -17, 12, 34); c.fillStyle = '#ffe3e9'; c.fillRect(0, -12, 3, 24);
      for (let i = 0; i < this.phase; i++) { c.fillStyle = '#ffbe76'; c.fillRect(-47, -14 + i * 13, 10, 5); }
    } else {
      c.save(); c.rotate(time * (.18 + this.phase * .08));
      for (let i = 0; i < 6; i++) { c.rotate(NB.TAU / 6); c.strokeStyle = '#78445e'; c.lineWidth = 2; c.beginPath(); c.moveTo(43, 0); c.lineTo(97, 0); c.stroke(); NB.poly(c, [[59, -10], [86, -28], [108, -8], [91, 12], [66, 19]], '#30243e', color, 1.8); NB.poly(c, [[81, -14], [98, -7], [85, 5], [73, 7]], this.phase === 3 ? '#ff9faf' : '#bd90ef'); }
      c.restore(); c.strokeStyle = '#ff5b8e75'; c.lineWidth = 1.5; c.setLineDash([22, 12]); c.beginPath(); c.arc(0, 0, 67, -time * .5, -time * .5 + NB.TAU); c.stroke(); c.setLineDash([]);
      const glow = c.createRadialGradient(0, 0, 7, 0, 0, 58); glow.addColorStop(0, '#ffd5f1'); glow.addColorStop(.28, this.phase === 3 ? '#ff638b' : '#b789ec'); glow.addColorStop(.65, '#5e2658'); glow.addColorStop(1, '#121a2e'); c.fillStyle = glow; c.beginPath(); c.arc(0, 0, 52, 0, NB.TAU); c.fill(); c.strokeStyle = color; c.lineWidth = 2; c.stroke();
      c.save(); c.rotate(-time * .4); NB.poly(c, [[0, -33], [30, 0], [0, 33], [-30, 0]], '#241b38', '#ffcbe5', 2); NB.poly(c, [[0, -17], [15, 0], [0, 17], [-15, 0]], '#ffe6f4'); c.restore();
    }
    c.restore();
    if (this.windup > 0) { c.save(); c.translate(this.x, this.y); c.strokeStyle = this.type === 'warden' ? '#ffbe76' : '#ff87b6'; c.globalAlpha = .6; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, this.r + 22, -Math.PI / 2, -Math.PI / 2 + NB.TAU * (1 - this.windup)); c.stroke(); if (this.type === 'warden' && this.pattern === 0) { c.rotate(this.aim); c.lineWidth = 1; for (const angle of [-.4, .4]) { c.beginPath(); c.moveTo(60, 0); c.lineTo(Math.cos(angle) * 420, Math.sin(angle) * 420); c.stroke(); } } c.restore(); }
  }
};
