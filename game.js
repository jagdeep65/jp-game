'use strict';
NB.Game = class {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.world = { w: 1840, h: 1180 };
    this.state = NB.STATES.MENU; this.time = 0; this.menuTime = 0; this.previous = 0; this.accumulator = 0; this.frames = 0;
    this.camera = { x: 920, y: 590 }; this.touch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && innerWidth < 1000);
    this.input = { keys: {}, mouse: { x: 600, y: 300 }, mouseKnown: false, fire: false, dash: false, pulse: false, move: { x: 0, y: 0 }, aim: { x: 1, y: 0, active: false } };
    this.bullets = new NB.Pool(140); this.hostile = new NB.Pool(220); this.pickups = new NB.Pool(160); this.hazards = new NB.Pool(30);
    this.fx = new NB.Effects(); this.audio = new NB.Audio(); this.enemies = []; this.player = new NB.Player(920, 590); this.resetStats();
    this.resize(); addEventListener('resize', () => this.resize()); this.bindInput(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  resetStats() { this.wave = 1; this.score = 0; this.combo = 0; this.comboTimer = 0; this.maxCombo = 0; this.xp = 0; this.level = 1; this.xpNeed = 40; this.pendingUpgrades = 0; this.ranks = {}; this.runTime = 0; this.kills = 0; this.boss = null; this.waveSpawned = 0; this.waveTotal = 0; this.spawnTimer = 0; this.intermission = 0; this.waveStarted = false; this.victory = false; this.newBest = false; }
  resize() {
    this.w = innerWidth; this.h = innerHeight; this.dpr = Math.min(devicePixelRatio || 1, 1.5); this.canvas.width = Math.round(this.w * this.dpr); this.canvas.height = Math.round(this.h * this.dpr);
    this.zoom = NB.clamp(Math.min(this.w / 1320, this.h / 820), this.w < 700 ? .64 : .48, 1.25); this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.vignette = document.createElement('canvas'); this.vignette.width = this.w; this.vignette.height = this.h;
    const c = this.vignette.getContext('2d'), shade = c.createRadialGradient(this.w / 2, this.h / 2, this.h * .2, this.w / 2, this.h / 2, this.w * .75); shade.addColorStop(0, '#0000'); shade.addColorStop(1, '#030711aa'); c.fillStyle = shade; c.fillRect(0, 0, this.w, this.h);
  }
  active() { return this.state === NB.STATES.PLAYING || this.state === NB.STATES.BOSS; }
  clearInput() { this.input.keys = {}; this.input.fire = this.input.dash = this.input.pulse = false; this.input.move.x = this.input.move.y = 0; this.input.aim.active = false; }
  bindInput() {
    document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !this.touch) { this.touch = true; document.body.classList.add('touch'); if (this.active()) document.getElementById('touch-controls').hidden = false; } });
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (this.active() && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'Escape' && !e.repeat) { if (this.active()) this.pause(); else if (this.state === NB.STATES.PAUSED) this.ui?.resumeOrBack(); else if (this.state === NB.STATES.MENU) this.ui?.closePanel(); return; }
      this.input.keys[e.code] = true;
      if (this.active() && !e.repeat) { if (e.code === 'Space') this.input.dash = true; if (e.code === 'KeyE') this.input.pulse = true; }
      if (this.state === NB.STATES.UPGRADE && ['Digit1', 'Digit2', 'Digit3'].includes(e.code) && !e.repeat) this.ui?.chooseUpgrade(Number(e.code.slice(-1)) - 1);
    });
    addEventListener('keyup', e => { delete this.input.keys[e.code]; });
    this.canvas.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; this.input.mouse.x = e.clientX; this.input.mouse.y = e.clientY; this.input.mouseKnown = true; });
    this.canvas.addEventListener('pointerdown', e => { if (e.button !== 0 || e.pointerType === 'touch') return; this.audio.unlock(); if (this.active()) this.input.fire = true; });
    addEventListener('pointerup', e => { if (e.pointerType !== 'touch') this.input.fire = false; });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('blur', () => { this.clearInput(); if (this.active()) this.pause(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.clearInput(); if (this.active()) this.pause(); NB.Store.save(); } });
  }
  screenToWorld(x, y) { return { x: (x - this.w / 2) / this.zoom + this.camera.x, y: (y - this.h / 2) / this.zoom + this.camera.y }; }
  start() {
    this.audio.unlock(); this.clearInput(); for (const pool of [this.bullets, this.hostile, this.pickups, this.hazards]) pool.clear(); this.enemies.length = 0; this.fx.clear(); this.resetStats();
    this.player = new NB.Player(920, 660); this.camera.x = 920; this.camera.y = 660; this.state = NB.STATES.PLAYING; this.accumulator = 0; NB.settings.runs++; NB.Store.save(); this.ui?.showGame(); this.startWave?.(); this.canvas.focus({ preventScroll: true });
  }
  pause() { if (!this.active()) return; this.resumeState = this.state; this.state = NB.STATES.PAUSED; this.clearInput(); this.ui?.pause(); }
  resume() { if (this.state !== NB.STATES.PAUSED) return; this.state = this.resumeState; this.clearInput(); this.accumulator = 0; this.ui?.showGame(); this.canvas.focus({ preventScroll: true }); }
  menu() { NB.settings.best = Math.max(NB.settings.best, this.score); this.state = NB.STATES.MENU; this.clearInput(); this.fx.clear(); this.ui?.showMenu(); NB.Store.save(); }
  finish(won) { if (!this.active()) return; this.victory = won; this.state = NB.STATES.GAME_OVER; this.clearInput(); this.newBest = this.score > NB.settings.best; NB.settings.best = Math.max(this.score, NB.settings.best); if (won) NB.settings.clears++; NB.Store.save(); this.audio.play(won ? 'win' : 'warning'); this.ui?.result(); }
  update(dt) {
    this.time += dt; this.runTime += dt; this.player.update(dt, this); if (!this.active()) return;
    this.updateCombat?.(dt); if (!this.active()) return; this.updateWaves?.(dt); this.fx.update(dt);
    const follow = 1 - Math.exp(-9 * dt); this.camera.x += (this.player.x - this.camera.x) * follow; this.camera.y += (this.player.y - this.camera.y) * follow;
    this.comboTimer = Math.max(0, this.comboTimer - dt); if (this.comboTimer === 0) this.combo = 0;
    for (let i = this.bullets.items.length - 1; i >= 0; i--) { const b = this.bullets.items[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (b.life <= 0 || b.hit || b.x < 0 || b.y < 0 || b.x > this.world.w || b.y > this.world.h) this.bullets.remove(i); }
  }
  loop(timestamp) {
    const dt = Math.min(.1, (timestamp - (this.previous || timestamp)) / 1000); this.previous = timestamp; this.menuTime += dt;
    if (this.active()) { this.accumulator += dt; let ticks = 0; while (this.accumulator >= 1 / 60 && ticks++ < 6) { this.update(1 / 60); this.accumulator -= 1 / 60; if (!this.active()) { this.accumulator = 0; break; } } } else this.accumulator = 0;
    this.audio.update(this.active()); this.render(); this.ui?.tick(dt); this.frames++; requestAnimationFrame(this.loop);
  }
  render() {
    const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.fillStyle = '#080d16'; c.fillRect(0, 0, this.w, this.h);
    if (this.state === NB.STATES.MENU) { this.drawMenu(c); return; }
    c.save(); c.translate(this.w / 2 + (Math.random() - .5) * this.fx.shake, this.h / 2 + (Math.random() - .5) * this.fx.shake); c.scale(this.zoom, this.zoom); c.translate(-this.camera.x, -this.camera.y);
    this.drawArena(c); this.drawCombat?.(c); this.player.draw(c, this.time);
    c.lineCap = 'round'; for (const b of this.bullets.items) { c.strokeStyle = b.critical ? '#ffe2a8' : '#68ffe075'; c.lineWidth = 8; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx * .014, b.y - b.vy * .014); c.stroke(); c.strokeStyle = b.critical ? '#fff4d5' : '#dbfff3'; c.lineWidth = 2.5; c.stroke(); }
    this.fx.draw(c); c.restore();
    c.drawImage(this.vignette, 0, 0);
    if (this.fx.flash > 0) { c.fillStyle = `rgba(255,52,99,${this.fx.flash * .3})`; c.fillRect(0, 0, this.w, this.h); }
    if (this.active() && !this.touch) { const { x, y } = this.input.mouse; c.strokeStyle = '#a6ffdf'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 9, .2, 2.8); c.arc(x, y, 9, 3.35, 6.1); c.moveTo(x - 15, y); c.lineTo(x - 6, y); c.moveTo(x + 6, y); c.lineTo(x + 15, y); c.moveTo(x, y - 15); c.lineTo(x, y - 6); c.moveTo(x, y + 6); c.lineTo(x, y + 15); c.stroke(); c.fillStyle = '#effff7'; c.fillRect(x - 1, y - 1, 2, 2); }
  }
  drawArena(c) {
    if (!this.arenaArt) {
      this.arenaArt = document.createElement('canvas'); this.arenaArt.width = this.world.w + 440; this.arenaArt.height = this.world.h + 400;
      const painter = this.arenaArt.getContext('2d'); painter.translate(220, 200); this.paintArena(painter);
    }
    c.drawImage(this.arenaArt, -220, -200);
  }
  paintArena(c) {
    // Rooftop silhouettes frame the playable concourse; they are scenery, not obstacles.
    for (let i = 0; i < 12; i++) for (const y of [-165, this.world.h + 20]) {
      const x = -70 + i * 175, w = 135 + i % 3 * 7;
      c.fillStyle = '#101c2a'; c.fillRect(x, y, w, 142); c.strokeStyle = '#253845'; c.lineWidth = 2; c.strokeRect(x + 5, y + 5, w - 10, 132);
      c.fillStyle = '#080f19'; c.fillRect(x + 20, y + 20, 50, 74); c.strokeStyle = '#324650'; c.lineWidth = 1; c.strokeRect(x + 20, y + 20, 50, 74);
      c.fillStyle = i % 3 ? '#426869' : '#774861'; c.fillRect(x + 14, y + 126, w - 28, 3); c.fillStyle = '#20333f'; for (let j = 0; j < 4; j++) c.fillRect(x + 85, y + 22 + j * 19, 26, 8);
    }
    c.fillStyle = '#0b1520'; c.fillRect(0, 0, this.world.w, this.world.h);
    const left = 0, right = this.world.w, top = 0, bottom = this.world.h;
    c.lineWidth = 1; c.strokeStyle = '#172633'; c.beginPath(); for (let x = Math.floor(left / 64) * 64; x <= right; x += 64) { c.moveTo(x, top); c.lineTo(x, bottom); } for (let y = Math.floor(top / 64) * 64; y <= bottom; y += 64) { c.moveTo(left, y); c.lineTo(right, y); } c.stroke();
    c.strokeStyle = '#1b3740'; c.lineWidth = 2; c.strokeRect(32, 32, this.world.w - 64, this.world.h - 64); c.strokeStyle = '#68ffe016'; c.strokeRect(53, 53, this.world.w - 106, this.world.h - 106);
    c.save(); c.strokeStyle = '#37536140'; c.lineWidth = 3; c.setLineDash([30, 50]); c.beginPath(); c.moveTo(80, 178); c.lineTo(this.world.w - 80, 178); c.moveTo(80, this.world.h - 178); c.lineTo(this.world.w - 80, this.world.h - 178); c.stroke(); c.setLineDash([]);
    for (const x of [70, this.world.w - 122]) for (let y = 80; y < this.world.h - 80; y += 90) { c.fillStyle = '#2d49564d'; NB.poly(c, [[x, y], [x + 18, y], [x + 38, y + 24], [x + 20, y + 24]], '#2d49564d'); }
    c.restore();
    c.save(); c.translate(920, 590); c.strokeStyle = '#28475155'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 225, 0, NB.TAU); c.stroke(); c.setLineDash([3, 14]); c.beginPath(); c.arc(0, 0, 210, 0, NB.TAU); c.stroke(); c.setLineDash([]); c.strokeRect(-165, -165, 330, 330); c.strokeStyle = '#2a465150'; c.beginPath(); c.moveTo(-240, 0); c.lineTo(240, 0); c.moveTo(0, -240); c.lineTo(0, 240); c.stroke(); c.font = 'bold 78px monospace'; c.fillStyle = '#243b452f'; c.textAlign = 'center'; c.fillText('07', 0, 27); c.font = '10px monospace'; c.fillText('NEXUS // MUNICIPAL DEFENSE', 0, 260); c.restore();
    for (let i = 0; i < 12; i++) { const x = 100 + (i % 6) * 314, y = i < 6 ? 15 : this.world.h - 15; c.fillStyle = i % 3 === 0 ? '#b795ff' : '#68ffe0'; c.fillRect(x, y, 36, 3); c.fillStyle = '#68ffe008'; c.fillRect(x - 15, y - 12, 65, 27); }
    for (const [x, y, r] of [[280, 300, 0], [1510, 880, 0], [1520, 270, 1], [330, 900, 1]]) { c.save(); c.translate(x, y); c.rotate(r * Math.PI / 2); c.strokeStyle = '#2b414d'; c.fillStyle = '#0e1b28'; c.fillRect(-75, -40, 150, 80); c.strokeRect(-75, -40, 150, 80); c.strokeStyle = '#294351'; for (let j = -57; j < 68; j += 16) { c.beginPath(); c.moveTo(j, -28); c.lineTo(j, 28); c.stroke(); } c.fillStyle = '#4a767d'; c.fillRect(-64, -43, 23, 2); c.restore(); }
    c.font = '9px monospace'; c.fillStyle = '#4e718077'; c.textAlign = 'left'; c.fillText('TRANSIT CONCOURSE / 07', 92, 100); c.fillText('EMERGENCY LOCKDOWN // KEEP CLEAR', 1260, 1080);
  }
  enemyShot(x, y, angle, speed = 240, damage = 14, color = NB.color.pink, r = 5) {
    this.hostile.add({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, damage, color, life: 7 });
  }
  spawnEnemy(type, elite = false, position = null) {
    if (this.enemies.filter(e => !e.dead).length >= 32) return false;
    let x, y;
    if (position) { x = position.x; y = position.y; }
    else {
      for (let i = 0; i < 14; i++) { const a = Math.random() * NB.TAU, distance = NB.rand(470, 720); x = NB.clamp(this.player.x + Math.cos(a) * distance, 65, this.world.w - 65); y = NB.clamp(this.player.y + Math.sin(a) * distance, 65, this.world.h - 65); if ((x - this.player.x) ** 2 + (y - this.player.y) ** 2 > 350 ** 2) break; }
    }
    this.enemies.push(new NB.Enemy(type, x, y, this.wave, elite)); return true;
  }
  damageEnemy(enemy, amount, critical) {
    if (enemy.dead || enemy.spawn > 0) return;
    enemy.hp -= amount; enemy.flash = .075; this.audio.play('hit');
    if (critical) this.fx.text(enemy.x + NB.rand(-15, 15), enemy.y - enemy.r, Math.round(amount) + '!', NB.color.amber, 12);
    if (enemy.hp > 0) return;
    enemy.hp = 0; enemy.dead = true; this.kills++; this.player.kills++; this.combo++; this.comboTimer = 3.8; this.maxCombo = Math.max(this.maxCombo, this.combo);
    const reward = enemy.score * Math.min(5, 1 + Math.floor(this.combo / 5)); this.score += reward;
    this.fx.text(enemy.x, enemy.y - 15, '+' + reward, enemy.boss ? NB.color.pink : NB.color.cyan, enemy.boss ? 25 : 13); this.fx.burst(enemy.x, enemy.y, enemy.color, enemy.boss ? 65 : enemy.type === 'tank' ? 22 : 12, enemy.boss ? 450 : 160); this.fx.ring(enemy.x, enemy.y, enemy.color, enemy.boss ? 280 : enemy.r * 2, enemy.boss ? 1.5 : .4); this.fx.kick(enemy.boss ? 12 : enemy.type === 'tank' ? 3 : 1); this.audio.play('death');
    if (!this.pickups.add({ x: enemy.x, y: enemy.y, xp: enemy.xp, energy: enemy.boss ? 50 : enemy.type === 'swarm' ? 2 : 5, heal: 0, life: 24, bob: Math.random() * NB.TAU })) this.gainXP(enemy.xp);
    if (Math.random() < .09 || enemy.elite) this.pickups.add({ x: enemy.x + 20, y: enemy.y, xp: 0, energy: 0, heal: enemy.elite ? 25 : 10, life: 22, bob: 0 });
    if (enemy.boss) { for (const e of this.enemies) if (!e.boss && !e.dead) { e.dead = true; this.fx.burst(e.x, e.y, e.color, 8); } this.hostile.clear(); this.hazards.clear(); this.score += this.wave === 15 ? 10000 : 4000; this.ui?.announce('DEFENSE NODE DESTROYED', this.wave === 15 ? 'NEXUS OFFLINE' : 'WARDEN DOWN', this.wave === 15 ? 'THE CITY IS YOURS AGAIN.' : 'CORE ACCESS GRANTED', false, 2.4); }
  }
  gainXP(amount) {
    this.xp += amount;
    while (this.xp >= this.xpNeed) { this.xp -= this.xpNeed; this.level++; this.xpNeed = 24 + this.level * 16; this.pendingUpgrades++; this.ui?.toast('LEVEL ' + this.level + ' / MOD DRAFT QUEUED FOR WAVE CLEAR'); }
  }
  collect(pickup) {
    this.gainXP(pickup.xp); this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + pickup.energy);
    if (pickup.heal) { this.player.hp = Math.min(this.player.maxHp, this.player.hp + pickup.heal); this.fx.text(this.player.x, this.player.y - 30, '+' + pickup.heal + ' HP', '#a7ff98'); }
    this.fx.burst(pickup.x, pickup.y, pickup.heal ? '#a7ff98' : NB.color.cyan, 3, 55); this.audio.play('pickup');
  }
  updateCombat(dt) {
    for (const e of this.enemies) { if (!e.dead) e.update(dt, this); if (!this.active()) return; }
    // Small, bounded entity counts keep these broad-phase squared-distance checks cheap.
    for (let i = 0; i < this.enemies.length; i++) { const a = this.enemies[i]; if (a.dead || a.boss) continue;
      for (let j = i + 1; j < this.enemies.length; j++) { const b = this.enemies[j]; if (b.dead || b.boss) continue; const dx = a.x - b.x, dy = a.y - b.y, min = a.r + b.r + 3, d2 = dx * dx + dy * dy; if (d2 < min * min && d2 > .01) { const d = Math.sqrt(d2), push = (min - d) * .04; a.x += dx / d * push; a.y += dy / d * push; b.x -= dx / d * push; b.y -= dy / d * push; } }
    }
    for (const bullet of this.bullets.items) { if (bullet.hit) continue; const nx = bullet.x + bullet.vx * dt, ny = bullet.y + bullet.vy * dt;
      for (const e of this.enemies) { if (e.dead || e.spawn > 0 || Math.abs(e.x - bullet.x) > e.r + 25 || Math.abs(e.y - bullet.y) > e.r + 25) continue; if (NB.segmentHit(bullet.x, bullet.y, nx, ny, e, e.r + bullet.r)) { this.damageEnemy(e, bullet.damage, bullet.critical); bullet.hit = true; this.fx.burst(nx, ny, bullet.critical ? NB.color.amber : e.color, 4, 80); break; } }
    }
    for (let i = this.hostile.items.length - 1; i >= 0; i--) { const b = this.hostile.items[i], nx = b.x + b.vx * dt, ny = b.y + b.vy * dt; b.life -= dt;
      if (NB.segmentHit(b.x, b.y, nx, ny, this.player, b.r + this.player.r - 3)) { this.player.hurt(b.damage, this); this.hostile.remove(i); if (!this.active()) return; continue; }
      b.x = nx; b.y = ny; if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > this.world.w || b.y > this.world.h) this.hostile.remove(i);
    }
    for (let i = this.pickups.items.length - 1; i >= 0; i--) { const p = this.pickups.items[i], d = Math.sqrt(NB.dist2(p, this.player)); p.life -= dt; p.bob += dt * 3;
      if (d < this.player.magnet || this.intermission > 0) { const speed = this.intermission > 0 ? 1400 : 220 + (this.player.magnet - d) * 5; p.x += (this.player.x - p.x) / Math.max(1, d) * Math.min(d, speed * dt); p.y += (this.player.y - p.y) / Math.max(1, d) * Math.min(d, speed * dt); }
      if (d < 25) { this.collect(p); this.pickups.remove(i); } else if (p.life <= 0) this.pickups.remove(i);
    }
    this.updateHazards?.(dt);
    for (let i = this.enemies.length - 1; i >= 0; i--) if (this.enemies[i].dead) this.enemies.splice(i, 1);
  }
  updateHazards(dt) {
    for (let i = this.hazards.items.length - 1; i >= 0; i--) {
      const h = this.hazards.items[i];
      if (h.warm > 0) { h.warm -= dt; continue; }
      if (!h.fired) { h.fired = true; if (h.damage) { this.fx.kick(3); this.audio.play('hit'); } }
      h.life -= dt; if (h.life <= 0) { this.hazards.remove(i); continue; }
      if (!h.damage) continue;
      if (h.type === 'circle') { if (NB.dist2(h, this.player) < (h.r + this.player.r * .5) ** 2) this.player.hurt(h.damage, this); }
      else { const dx = Math.cos(h.angle) * h.length, dy = Math.sin(h.angle) * h.length; if (NB.segmentHit(h.x - (h.both ? dx : 0), h.y - (h.both ? dy : 0), h.x + dx, h.y + dy, this.player, h.r + this.player.r * .5)) this.player.hurt(h.damage, this); }
      if (!this.active()) return;
    }
  }
  drawHazards(c) {
    for (const h of this.hazards.items) {
      c.save(); c.translate(h.x, h.y); const warm = h.warm > 0; c.strokeStyle = h.color; c.fillStyle = h.color + (warm ? '15' : '60'); c.lineWidth = warm ? 1 : 3;
      if (h.type === 'circle') { c.beginPath(); c.arc(0, 0, h.r, 0, NB.TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(0, 0, h.r * (warm ? 1 - h.warm / h.totalWarm : .8), 0, NB.TAU); c.stroke(); c.font = 'bold 19px monospace'; c.textAlign = 'center'; c.fillStyle = h.color; c.fillText('+', 0, 7); }
      else { c.rotate(h.angle); const start = h.both ? -h.length : 0; c.fillRect(start, -h.r, h.length - start, h.r * 2); c.setLineDash(warm ? [14, 10] : []); c.beginPath(); c.moveTo(start, -h.r); c.lineTo(h.length, -h.r); c.moveTo(start, h.r); c.lineTo(h.length, h.r); c.stroke(); if (!warm) { c.strokeStyle = '#ffe2ef'; c.lineWidth = h.r * .55; c.setLineDash([]); c.beginPath(); c.moveTo(start, 0); c.lineTo(h.length, 0); c.stroke(); } }
      c.restore();
    }
  }
  startWave() {
    this.waveStarted = true; this.intermission = 0; this.waveSpawned = 0; this.spawnTimer = 1.5; this.waveTotal = 5 + this.wave * 2; this.boss = null;
    if ((this.wave === 10 || this.wave === 15) && NB.Boss.prototype.update) {
      this.state = NB.STATES.BOSS; this.waveTotal = 1; this.waveSpawned = 1; this.boss = new NB.Boss(this.wave === 10 ? 'warden' : 'nexus', 920, 440); this.enemies.push(this.boss);
      if (NB.dist2(this.player, this.boss) < 350 ** 2) { this.player.x = 920; this.player.y = 850; }
      this.ui?.announce('HOSTILE SIGNATURE / MAXIMUM THREAT', this.wave === 10 ? 'WARDEN' : 'NEXUS CORE', this.wave === 10 ? 'AUTONOMOUS DEFENSE MACHINE' : 'END THE CORRUPTION', true, 3); this.audio.play('warning');
    } else {
      this.state = NB.STATES.PLAYING;
      const subtitle = this.wave === 1 ? 'MOVE. AIM. SURVIVE.' : this.wave === 2 ? 'HUNTERS DETECTED / KEEP MOVING' : this.wave === 3 ? 'SWARM SIGNATURE DETECTED' : this.wave === 5 ? 'ELITE BULWARK INBOUND' : this.wave === 6 ? 'PHANTOM SIGNATURES / TRUST YOUR AIM' : 'PURGE ALL HOSTILES';
      this.ui?.announce(this.wave <= 5 ? 'OUTER DISTRICT' : this.wave <= 10 ? 'DEFENSE GRID' : 'CORE APPROACH', 'WAVE ' + NB.pad(this.wave), subtitle, this.wave === 5);
      if (this.wave === 5) { this.spawnEnemy('tank', true); this.waveSpawned++; }
    }
  }
  updateWaves(dt) {
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) {
        for (const p of this.pickups.items) this.collect(p); this.pickups.clear();
        if (this.wave === 15) { this.finish(true); return; }
        if (this.pendingUpgrades > 0 && this.ui?.upgrades) { this.state = NB.STATES.UPGRADE; this.clearInput(); this.ui.upgrades(); }
        else { this.wave++; this.startWave(); }
      }
      return;
    }
    if (!this.waveStarted) return;
    if (this.waveSpawned < this.waveTotal) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const roll = Math.random(); let type = 'drone';
        if (this.wave >= 6 && roll < .15) type = 'phantom'; else if (this.wave >= 4 && roll < .3) type = 'tank'; else if (this.wave >= 3 && roll < .49) type = 'swarm'; else if (this.wave >= 2 && roll < .73) type = 'hunter';
        const group = type === 'swarm' ? Math.min(3, this.waveTotal - this.waveSpawned) : 1;
        for (let i = 0; i < group; i++) if (this.spawnEnemy(type)) this.waveSpawned++;
        this.spawnTimer = Math.max(.35, .95 - this.wave * .035);
      }
    }
    if (this.waveSpawned >= this.waveTotal && !this.enemies.some(e => !e.dead)) {
      this.waveStarted = false; this.intermission = 2.8; this.hostile.clear(); this.hazards.clear(); this.score += this.wave * 150; this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8); this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 25);
      if ([2, 5, 8, 11, 14].includes(this.wave)) this.pendingUpgrades++;
      if (this.wave !== 10 && this.wave !== 15) this.ui?.announce('DISTRICT SECURED', 'WAVE CLEAR', '+8 HP / ENERGY RECOVERED / SALVAGING DATA', false, 2.2);
      this.audio.play('upgrade');
    }
  }
  drawCombat(c) {
    this.drawHazards?.(c);
    for (const p of this.pickups.items) { c.save(); c.translate(p.x, p.y + Math.sin(p.bob) * 3); c.globalAlpha = p.life < 3 ? .5 + Math.sin(p.life * 12) * .4 : 1; const color = p.heal ? '#a7ff98' : NB.color.cyan; c.fillStyle = p.heal ? '#a7ff9815' : '#68ffe012'; c.beginPath(); c.arc(0, 0, 13, 0, NB.TAU); c.fill(); if (p.heal) { c.fillStyle = color; c.fillRect(-6, -2, 12, 4); c.fillRect(-2, -6, 4, 12); } else NB.poly(c, [[0, -7], [5, 0], [0, 7], [-5, 0]], color, '#c8fff4'); c.restore(); }
    for (const e of this.enemies) if (!e.dead) e.draw(c, this.time);
    for (const b of this.hostile.items) { c.fillStyle = b.color + '30'; c.beginPath(); c.arc(b.x, b.y, b.r + 5, 0, NB.TAU); c.fill(); c.fillStyle = b.color; c.beginPath(); c.arc(b.x, b.y, b.r, 0, NB.TAU); c.fill(); c.fillStyle = '#fff2e3'; c.beginPath(); c.arc(b.x, b.y, b.r * .4, 0, NB.TAU); c.fill(); }
    // Edge pips reveal off-screen hostiles without filling the arena with arrows.
    const halfW = this.w / this.zoom / 2 - 50, halfH = this.h / this.zoom / 2 - 125;
    for (const e of this.enemies) { const dx = e.x - this.camera.x, dy = e.y - this.camera.y; if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) continue; const ratio = Math.min(halfW / Math.max(1, Math.abs(dx)), Math.max(80, halfH) / Math.max(1, Math.abs(dy))); c.save(); c.translate(this.camera.x + dx * ratio, this.camera.y + dy * ratio); c.rotate(Math.atan2(dy, dx)); c.globalAlpha = .65; NB.poly(c, [[7, 0], [-4, -4], [-4, 4]], e.color); c.restore(); }
  }
  drawMenu(c) {
    const t = this.menuTime, cx = this.w * .735, cy = this.h * .49, size = Math.min(this.w * .37, this.h * .52);
    const glow = c.createRadialGradient(cx, cy, 0, cx, cy, size * 1.35); glow.addColorStop(0, '#17333d'); glow.addColorStop(.6, '#0c1d29'); glow.addColorStop(1, '#080d16'); c.fillStyle = glow; c.fillRect(0, 0, this.w, this.h);
    c.save(); c.globalAlpha = this.w < 700 ? .28 : 1;
    c.strokeStyle = '#45697517'; c.lineWidth = 1; for (let y = 100; y < this.h; y += 46) { c.beginPath(); c.moveTo(this.w * .44, y); c.lineTo(this.w, y); c.stroke(); } for (let x = this.w * .44; x < this.w; x += 46) { c.beginPath(); c.moveTo(x, 100); c.lineTo(x, this.h); c.stroke(); }
    c.save(); c.translate(cx, cy); c.scale(size / 300, size / 300);
    for (let ring = 0; ring < 4; ring++) { c.save(); c.rotate(t * (.018 + ring * .007) * (ring % 2 ? 1 : -1)); c.strokeStyle = ring === 1 ? '#68ffe046' : '#456b7655'; c.lineWidth = ring === 1 ? 2 : 1; c.setLineDash(ring === 1 ? [68, 14, 6, 14] : [2, 10]); c.beginPath(); c.arc(0, 0, 185 + ring * 32, 0, NB.TAU); c.stroke(); c.restore(); }
    c.setLineDash([]); c.strokeStyle = '#68ffe032'; c.beginPath(); c.moveTo(-310, 0); c.lineTo(310, 0); c.moveTo(0, -300); c.lineTo(0, 300); c.stroke();
    c.save(); c.translate(5, 9 + Math.sin(t * .7) * 6); c.rotate(-.13);
    NB.poly(c, [[-77, -77], [-135, -40], [-167, 105], [-142, 202], [-92, 168], [-65, 75]], '#0a1722', '#244352', 2);
    NB.poly(c, [[30, -87], [84, -49], [129, 57], [106, 159], [69, 133], [55, 27]], '#122c37', '#447078', 2);
    NB.poly(c, [[-85, 78], [-20, 93], [-31, 211], [-59, 253], [-91, 247], [-88, 174], [-113, 113]], '#0c202d', '#365766', 2);
    NB.poly(c, [[-15, 93], [43, 64], [79, 137], [70, 232], [33, 246], [16, 173], [-11, 149]], '#102938', '#3b6874', 2);
    NB.poly(c, [[-86, -86], [-30, -107], [40, -82], [68, 16], [36, 103], [-48, 118], [-98, 48]], '#153440', '#63908f', 2);
    NB.poly(c, [[-72, -77], [-29, -91], [18, -72], [29, -18], [-32, 6], [-76, -16]], '#244953', '#659d9d', 1.5);
    NB.poly(c, [[-32, 19], [31, -9], [37, 56], [-5, 88], [-49, 71]], '#0b202d', '#355763');
    c.fillStyle = '#68ffe0'; c.fillRect(-71, -53, 24, 4); c.fillRect(-64, -41, 15, 3); c.fillRect(-5, 24, 4, 27);
    NB.poly(c, [[-97, -73], [-131, -34], [-118, 39], [-91, 61], [-68, 26], [-84, -5]], '#25424f', '#608c91', 2);
    NB.poly(c, [[52, -61], [84, -27], [101, 37], [81, 65], [49, 49], [51, 10]], '#1b3c48', '#55858d', 2);
    c.save(); c.translate(43, 43); c.rotate(-.46); NB.poly(c, [[-25, -20], [65, -25], [91, -8], [87, 140], [65, 165], [33, 161], [26, 36], [-25, 23]], '#0c1c29', '#547d87', 2); c.fillStyle = '#315567'; c.fillRect(43, 1, 29, 118); c.fillStyle = '#68ffe0'; c.fillRect(47, 8, 4, 93); c.fillStyle = '#94c7c7'; c.fillRect(41, -18, 37, 6); c.fillStyle = '#68ffe032'; c.fillRect(39, 143, 45, 32); c.restore();
    NB.poly(c, [[-67, -139], [-24, -159], [15, -139], [29, -107], [11, -74], [-28, -60], [-66, -83], [-79, -111]], '#0a1b28', '#6b969a', 2);
    NB.poly(c, [[-66, -133], [-23, -146], [9, -131], [13, -120], [-36, -119]], '#2b4e5a');
    NB.poly(c, [[-68, -115], [-20, -115], [21, -122], [19, -102], [-25, -95], [-61, -99]], '#22444a', '#68ffe0', 1.2);
    c.save(); c.shadowColor = '#68ffe0'; c.shadowBlur = 18; NB.poly(c, [[-63, -110], [-19, -108], [17, -115], [15, -106], [-23, -100], [-61, -104]], '#8bffe0'); c.restore();
    NB.poly(c, [[-34, -91], [9, -93], [1, -77], [-28, -68], [-47, -81]], '#163644', '#3c6574');
    for (let i = 0; i < 3; i++) { c.strokeStyle = '#477780'; c.beginPath(); c.moveTo(-24 + i * 9, -87); c.lineTo(-23 + i * 7, -77); c.stroke(); }
    c.restore(); c.font = '9px monospace'; c.fillStyle = '#6c9b9a'; c.textAlign = 'left'; c.fillText('NEURAL SIGNATURE', -265, -212); c.fillStyle = '#68ffe0'; c.fillText('VERIFIED / 98.7%', -265, -196); c.strokeStyle = '#68ffe055'; c.beginPath(); c.moveTo(-150, -194); c.lineTo(-80, -161); c.stroke(); c.restore();
    for (let i = 0; i < 35; i++) { const x = this.w * .42 + ((i * 131.7 + t * (i % 3 + 2)) % (this.w * .58)), y = (i * 91.3 - t * (7 + i % 4) + this.h * 10) % this.h; c.fillStyle = i % 5 === 0 ? '#ff5b8e80' : '#68ffe04d'; c.fillRect(x, y, i % 4 === 0 ? 3 : 1, 2); }
    c.restore(); const fade = c.createLinearGradient(0, 0, this.w * .68, 0); fade.addColorStop(0, '#080d16'); fade.addColorStop(.56, '#080d16e6'); fade.addColorStop(1, '#080d1600'); c.fillStyle = fade; c.fillRect(0, 0, this.w, this.h);
  }
};
