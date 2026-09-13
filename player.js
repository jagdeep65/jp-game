'use strict';
NB.Player = class {
  constructor(x, y) {
    Object.assign(this, { x, y, r: 16, vx: 0, vy: 0, angle: 0, hp: 100, maxHp: 100, shield: 0, maxShield: 0, energy: 100, maxEnergy: 100, regen: 7, speed: 275, damage: 17, fireRate: .14, crit: .05, magnet: 95, dashCooldown: 2.4, dashTimer: 0, dashTime: 0, invuln: 0, shootTimer: 0, muzzle: 0, hurtTime: 0, trailTimer: 0, pulseTimer: 0, kills: 0 });
  }
  update(dt, g) {
    const input = g.input;
    this.dashTimer = Math.max(0, this.dashTimer - dt); this.shootTimer -= dt; this.invuln = Math.max(0, this.invuln - dt); this.muzzle = Math.max(0, this.muzzle - dt); this.hurtTime += dt; this.pulseTimer = Math.max(0, this.pulseTimer - dt);
    this.energy = Math.min(this.maxEnergy, this.energy + this.regen * dt);
    if (this.hurtTime > 5) this.shield = Math.min(this.maxShield, this.shield + 7 * dt);
    let dx = Number(input.keys.KeyD || input.keys.ArrowRight || 0) - Number(input.keys.KeyA || input.keys.ArrowLeft || 0) + input.move.x;
    let dy = Number(input.keys.KeyS || input.keys.ArrowDown || 0) - Number(input.keys.KeyW || input.keys.ArrowUp || 0) + input.move.y;
    const length = Math.hypot(dx, dy); if (length > 1) { dx /= length; dy /= length; }
    if (input.aim.active) this.angle = Math.atan2(input.aim.y, input.aim.x);
    else if (!g.touch || input.mouseKnown) { const aim = g.screenToWorld(input.mouse.x, input.mouse.y); this.angle = Math.atan2(aim.y - this.y, aim.x - this.x); }
    if (input.dash) { this.dash(g, dx, dy); input.dash = false; }
    if (input.pulse) { this.pulse(g); input.pulse = false; }
    if (this.dashTime > 0) {
      this.dashTime -= dt; this.x += this.vx * dt; this.y += this.vy * dt; this.trailTimer -= dt;
      if (this.trailTimer <= 0) { g.fx.trail(this.x, this.y, this.angle); this.trailTimer = .025; }
    } else { this.x += dx * this.speed * dt; this.y += dy * this.speed * dt; }
    this.x = NB.clamp(this.x, 42, g.world.w - 42); this.y = NB.clamp(this.y, 42, g.world.h - 42);
    if ((input.fire || input.aim.active) && this.shootTimer <= 0) this.shoot(g);
  }
  shoot(g) {
    this.shootTimer = this.fireRate; this.muzzle = .055;
    const a = this.angle + NB.rand(-.016, .016), critical = Math.random() < this.crit;
    g.bullets.add({ x: this.x + Math.cos(a) * 29, y: this.y + Math.sin(a) * 29, vx: Math.cos(a) * 940, vy: Math.sin(a) * 940, r: 4, life: .85, damage: this.damage * (critical ? 2 : 1), critical, hit: false });
    g.audio.play('shoot');
  }
  dash(g, dx, dy) {
    if (this.dashTimer > 0 || this.dashTime > 0) return;
    if (this.energy < 18) { g.ui?.toast('DASH REQUIRES 18 ENERGY'); return; }
    const length = Math.hypot(dx, dy); if (length < .1) { dx = Math.cos(this.angle); dy = Math.sin(this.angle); } else { dx /= length; dy /= length; }
    this.energy -= 18; this.dashTime = .17; this.invuln = .25; this.dashTimer = this.dashCooldown; this.vx = dx * 1050; this.vy = dy * 1050;
    g.fx.ring(this.x, this.y, NB.color.cyan, 55, .3); g.fx.kick(2); g.audio.play('dash');
  }
  pulse(g) {
    if (this.pulseTimer > 0) return;
    if (this.energy < 70) { g.ui?.toast('EMP REQUIRES 70 ENERGY'); return; }
    this.energy -= 70; this.pulseTimer = 1; this.invuln = .4;
    g.hostile.clear();
    for (const e of g.enemies) if (!e.dead && NB.dist2(this, e) < 320 ** 2) { g.damageEnemy(e, this.damage * 6, false); e.stun = 1.2; }
    g.fx.ring(this.x, this.y, NB.color.purple, 330, .65); g.fx.ring(this.x, this.y, NB.color.cyan, 300, .5); g.fx.burst(this.x, this.y, NB.color.purple, 28, 310); g.fx.kick(5); g.audio.play('pulse');
  }
  hurt(amount, g) {
    if (this.invuln > 0 || !g.active()) return false;
    const absorbed = Math.min(this.shield, amount); this.shield -= absorbed; this.hp = Math.max(0, this.hp - amount + absorbed);
    this.invuln = .65; this.hurtTime = 0; g.combo = 0; g.comboTimer = 0; g.fx.flash = .36; g.fx.kick(6); g.fx.burst(this.x, this.y, NB.color.pink, 13); g.audio.play('hurt');
    if (this.hp <= 0) g.finish(false);
    return true;
  }
  draw(ctx, time) {
    ctx.save(); ctx.translate(this.x, this.y);
    ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(0, 8, 23, 13, 0, 0, NB.TAU); ctx.fill();
    if (this.maxShield > 0 && this.shield > 0) { ctx.strokeStyle = `rgba(183,149,255,${.2 + this.shield / this.maxShield * .35})`; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 24, time, time + NB.TAU - .5); ctx.stroke(); }
    if (this.invuln > .25) ctx.globalAlpha = .5 + Math.sin(time * 50) * .22;
    ctx.rotate(this.angle);
    NB.poly(ctx, [[-7, -12], [-22, -8], [-29, -2], [-18, 4], [-11, 11], [2, 9]], '#163e46', '#397c7e');
    NB.poly(ctx, [[-13, -13], [3, -17], [14, -9], [12, 10], [1, 17], [-13, 11], [-7, 0]], '#122837', NB.color.cyan, 1.5);
    NB.poly(ctx, [[-7, -10], [3, -13], [6, -7], [-4, -4]], '#94bab8');
    NB.poly(ctx, [[-6, 7], [6, 5], [8, 13], [-3, 14]], '#345968');
    ctx.fillStyle = '#325665'; ctx.fillRect(3, -4, 26, 8); ctx.fillStyle = '#b6d9d0'; ctx.fillRect(12, -4, 13, 3); ctx.fillStyle = NB.color.cyan; ctx.fillRect(23, -2, 9, 4);
    NB.poly(ctx, [[-7, -6], [4, -8], [12, -2], [9, 6], [-2, 8], [-9, 2]], '#10212e', '#69a5a4');
    ctx.fillStyle = NB.color.cyan; ctx.fillRect(4, -4, 5, 8);
    if (this.muzzle > 0) { NB.poly(ctx, [[31, -7], [54, 0], [31, 7], [37, 0]], '#dcfff4'); ctx.strokeStyle = NB.color.cyan; ctx.strokeRect(30, -5, 6, 10); }
    ctx.restore();
  }
};
