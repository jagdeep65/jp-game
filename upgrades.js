'use strict';
NB.Upgrades = {
  catalog: [
    { id: 'damage', name: 'Overcharge', icon: '[+]', category: 'WEAPON / OUTPUT', description: '+22% base weapon damage. Your EMP pulse scales with it.', max: 5, apply: p => { p.damage += 17 * .22; } },
    { id: 'fire', name: 'Rapid Fire', icon: '>>>', category: 'WEAPON / CYCLING', description: '14% faster firing interval. More pressure, fewer survivors.', max: 5, apply: p => { p.fireRate *= .86; } },
    { id: 'dash', name: 'Phase Dash', icon: '//', category: 'MOBILITY / PHASE', description: '18% shorter dash cooldown. Stay one step outside reality.', max: 4, apply: p => { p.dashCooldown *= .82; } },
    { id: 'shield', name: 'Nano Shield', icon: '<>', category: 'DEFENSE / BARRIER', description: '+22 regenerating shield. Recharges after 5 seconds unharmed.', max: 5, apply: p => { p.maxShield += 22; p.shield = p.maxShield; } },
    { id: 'magnet', name: 'Magnet Core', icon: '(*)', category: 'UTILITY / SALVAGE', description: '+65 pickup radius. Pull in XP, energy and medical cells.', max: 4, apply: p => { p.magnet += 65; } },
    { id: 'crit', name: 'Critical Pulse', icon: '!*', category: 'WEAPON / PRECISION', description: '+10% critical chance. Critical shots deal double damage.', max: 5, apply: p => { p.crit += .1; } },
    { id: 'reactor', name: 'Energy Reactor', icon: '|||', category: 'ENERGY / REGEN', description: '+3 energy per second. Dash more. Unleash more EMP pulses.', max: 4, apply: p => { p.regen += 3; } },
    { id: 'vitality', name: 'Reinforced Frame', icon: '++', category: 'DEFENSE / VITALS', description: '+25 maximum HP and heal 35 HP. Built to breach.', max: 4, apply: p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 35); } },
    { id: 'speed', name: 'Vector Drive', icon: '/>', category: 'MOBILITY / VELOCITY', description: '+8% base movement speed. Outmaneuver the defense grid.', max: 3, apply: p => { p.speed += 275 * .08; } }
  ],
  choices(g) {
    const pool = this.catalog.filter(upgrade => (g.ranks[upgrade.id] || 0) < upgrade.max);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    if (!pool.length) return [{ id: 'repair', name: 'Emergency Restore', icon: '++', category: 'SYSTEM / RESTORE', description: 'All modules maxed. Restore your health, shield and energy.', max: Infinity, apply: p => { p.hp = p.maxHp; p.shield = p.maxShield; p.energy = p.maxEnergy; } }];
    return pool.slice(0, 3);
  },
  install(g, upgrade, overclock = false) {
    let ranks = 1;
    if (overclock && g.player.energy >= 45 && (g.ranks[upgrade.id] || 0) + 1 < upgrade.max && upgrade.id !== 'repair') { g.player.energy -= 45; ranks = 2; }
    for (let i = 0; i < ranks; i++) { upgrade.apply(g.player); g.ranks[upgrade.id] = (g.ranks[upgrade.id] || 0) + 1; }
    g.pendingUpgrades = Math.max(0, g.pendingUpgrades - 1); g.audio.play('upgrade'); return ranks;
  }
};
