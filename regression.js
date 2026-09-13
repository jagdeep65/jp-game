/* Run in the game's browser context. Never loaded by the game itself. */
window.runNeonRegression = async function () {
  const g = NB.game, settings = { ...NB.settings }, results = [], max = { enemies: 0, friendly: 0, hostile: 0, particles: 0, pickups: 0, hazards: 0 };
  NB.settings.audio = false; g.audio.sync();
  const check = (name, condition, details = '') => results.push({ name, pass: Boolean(condition), details });
  const fresh = () => { g.start(); g.player.invuln = 9999; };
  const step = count => { for (let i = 0; i < count && g.active(); i++) g.update(1 / 60); };
  const resetEnemies = () => { g.enemies.length = 0; g.waveSpawned = 0; g.waveTotal = 999; g.spawnTimer = 9999; };
  fresh(); resetEnemies();
  const x = g.player.x; g.input.keys.KeyD = true; step(60); g.clearInput(); check('Frame-independent movement', Math.abs(g.player.x - x - 275) < .01);
  g.input.keys.KeyA = true; g.input.keys.KeyW = true; const a = { x: g.player.x, y: g.player.y }; step(30); g.clearInput(); check('Normalized diagonal movement', Math.abs(Math.sqrt(NB.dist2(a, g.player)) - 137.5) < .01);
  g.input.mouse = { x: g.w / 2 + 200, y: g.h / 2 }; g.camera.x = g.player.x; g.camera.y = g.player.y; step(1); check('Mouse aiming', Math.abs(g.player.angle) < .01);
  g.input.fire = true; step(12); g.input.fire = false; check('Held-fire projectile generation', g.bullets.items.length >= 2);
  g.player.energy = 100; g.player.invuln = 0; g.player.dash(g, 1, 0); const hp = g.player.hp; g.player.hurt(25, g); check('Dash cost, cooldown and invulnerability', g.player.energy === 82 && g.player.dashTimer === 2.4 && g.player.hp === hp); step(180); check('Dash cooldown recovers', g.player.dashTimer === 0);
  g.player.energy = 0; g.player.dash(g, 1, 0); check('Low-energy dash is blocked', g.player.dashTime <= 0);
  fresh(); resetEnemies();
  for (const type of Object.keys(NB.enemyTypes)) { const e = new NB.Enemy(type, g.player.x + 300, g.player.y, 7); e.spawn = 0; const before = { x: e.x, y: e.y }; e.update(1 / 60, g); check(type + ' has working AI', Number.isFinite(e.x) && NB.dist2(e, before) > 0); }
  const drone = new NB.Enemy('drone', g.player.x + 80, g.player.y, 1); drone.spawn = 0; g.enemies.push(drone); g.player.angle = 0; g.player.shoot(g); step(8); check('Projectile collision damages enemy', drone.hp < drone.maxHp);
  g.damageEnemy(drone, 999, false); check('Enemy death awards score and pickup', drone.dead && g.score > 0 && g.pickups.items.length > 0);
  const oldXP = g.xp; g.player.x = g.pickups.items[0].x; g.player.y = g.pickups.items[0].y; step(1); check('Pickup grants XP', g.xp > oldXP);
  g.player.invuln = 0; const health = g.player.hp; g.player.hurt(12, g); check('Contact damage and combo reset', g.player.hp === health - 12 && g.combo === 0);
  g.gainXP(200); check('XP thresholds queue upgrades', g.pendingUpgrades >= 2 && g.level > 2);
  const shield = NB.Upgrades.catalog.find(u => u.id === 'shield'); g.player.energy = 100; const ranks = NB.Upgrades.install(g, shield, true); check('Overclock adds two ranks and spends energy', ranks === 2 && g.ranks.shield === 2 && g.player.maxShield === 44 && g.player.energy === 55);
  for (let i = 0; i < 3; i++) NB.Upgrades.install(g, shield); check('Maxed upgrade is excluded', !NB.Upgrades.choices(g).some(u => u.id === 'shield'));
  const health2 = g.player.hp; g.player.invuln = 0; g.player.hurt(10, g); check('Shield absorbs damage', g.player.hp === health2 && g.player.shield === 100);
  g.player.energy = 100; g.enemyShot(g.player.x + 100, g.player.y, 0); const pulseEnemy = new NB.Enemy('tank', g.player.x + 150, g.player.y, 1); pulseEnemy.spawn = 0; g.enemies.push(pulseEnemy); g.player.pulse(g); check('EMP consumes energy, clears bullets and damages enemies', g.player.energy === 30 && g.hostile.items.length === 0 && pulseEnemy.hp < pulseEnemy.maxHp && pulseEnemy.stun === 1.2);
  fresh(); g.pause(); const pausedX = g.player.x, pausedTime = g.runTime; await new Promise(r => setTimeout(r, 120)); check('Pause freezes simulation', g.player.x === pausedX && g.runTime === pausedTime); g.resume(); check('Resume restores playing state', g.state === 'PLAYING');
  for (const wave of [10, 15]) {
    fresh(); g.wave = wave; g.enemies.length = 0; g.startWave(); const b = g.boss; step(600); check(b.type + ' begins and attacks', g.state === 'BOSS' && b.attack >= 2);
    b.hp = b.maxHp * .6; step(1); check(b.type + ' phase 2', b.phase === 2); b.hp = b.maxHp * .3; step(1); check(b.type + ' phase 3', b.phase === 3);
    if (wave === 15) { b.pattern = 1; b.fire(g); check('NEXUS area attack has advance warning', g.hazards.items.length >= 4 && g.hazards.items.every(h => h.warm > 0)); b.pattern = 2; b.fire(g); check('NEXUS beam attack', g.hazards.items.some(h => h.type === 'line' && h.both)); }
    g.damageEnemy(b, 999999, false); step(180); check(b.type + ' defeat transitions correctly', wave === 15 ? g.state === 'GAME_OVER' && g.victory : g.state === 'UPGRADE');
  }
  fresh(); resetEnemies(); g.player.invuln = 0; g.score = 98765; g.player.hurt(999, g); check('Game over screen and persistent best', g.state === 'GAME_OVER' && !g.victory && NB.Store.load().best >= 98765 && Boolean(document.getElementById('restart')));
  document.getElementById('restart').click(); check('Restart resets run without duplicate resources', g.state === 'PLAYING' && g.score === 0 && g.wave === 1 && g.enemies.length === 0 && g.player.hp === 100 && g.bullets.items.length === 0);
  fresh(); let drafts = 0, simulated = 0; const campaignStart = performance.now();
  while (g.active() || g.state === 'UPGRADE') {
    if (g.state === 'UPGRADE') { drafts++; g.ui.chooseUpgrade(0); continue; }
    g.player.invuln = 9999; g.update(1 / 60); simulated++;
    for (const e of [...g.enemies]) if (e.spawn <= 0) g.damageEnemy(e, 999999, false);
    if (simulated % 1000 === 0) await new Promise(r => setTimeout(r, 0));
    if (simulated > 60000) break;
  }
  check('All 15 waves complete through real progression', g.state === 'GAME_OVER' && g.victory && g.wave === 15, { drafts, simulatedSeconds: simulated / 60, wallMs: Math.round(performance.now() - campaignStart) });
  fresh(); resetEnemies(); g.wave = 14; const chunks = [];
  for (let chunk = 0; chunk < 12; chunk++) {
    const started = performance.now();
    for (let tick = 0; tick < 3600; tick++) {
      g.player.invuln = 9999; g.player.x = 920 + Math.cos(g.time * .3) * 450; g.player.y = 590 + Math.sin(g.time * .3) * 330;
      if (tick % 30 === 0) g.spawnEnemy(Object.keys(NB.enemyTypes)[tick / 30 % 5]);
      if (tick % 6 === 0) g.player.shoot(g);
      if (tick % 50 === 0) { const e = g.enemies.find(e => e.spawn <= 0); if (e) g.damageEnemy(e, 9999, false); }
      g.update(1 / 60);
      if (tick % 60 === 0) { max.enemies = Math.max(max.enemies, g.enemies.length); max.friendly = Math.max(max.friendly, g.bullets.items.length); max.hostile = Math.max(max.hostile, g.hostile.items.length); max.particles = Math.max(max.particles, g.fx.particles.items.length); max.pickups = Math.max(max.pickups, g.pickups.items.length); max.hazards = Math.max(max.hazards, g.hazards.items.length); }
    }
    chunks.push(performance.now() - started); await new Promise(r => setTimeout(r, 0));
  }
  check('12-minute stress simulation stays bounded', max.enemies <= 32 && max.friendly <= 140 && max.hostile <= 220 && max.particles <= 360 && max.pickups <= 160 && max.hazards <= 30, max);
  const pools = [g.bullets, g.hostile, g.pickups, g.hazards, g.fx.particles, g.fx.rings, g.fx.texts]; check('Object pools preserve capacity', pools.every(p => p.items.length + p.free.length === p.capacity));
  check('No non-finite entity positions', [...g.enemies, ...g.bullets.items, ...g.hostile.items].every(e => Number.isFinite(e.x) && Number.isFinite(e.y)));
  const first = chunks.slice(2, 5).reduce((a, b) => a + b) / 3, last = chunks.slice(-3).reduce((a, b) => a + b) / 3;
  check('Sustained update cost remains stable', last < first * 2.5 + 30, { earlyMinuteMs: Math.round(first), lateMinuteMs: Math.round(last), simulationMinutes: 12 });
  g.resetStats(); g.menu(); Object.assign(NB.settings, settings); NB.Store.save(); g.audio.sync(); g.ui.showMenu(); g.ui.syncAudio();
  return { passed: results.filter(r => r.pass).length, failed: results.filter(r => !r.pass).length, results, runtimeErrors: window.__qaErrors || [] };
};
