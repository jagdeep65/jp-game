'use strict';
NB.UI = class {
  constructor(g) {
    this.g = g; this.modal = document.getElementById('modal'); this.card = document.getElementById('modal-card'); this.hudTimer = 0; this.announceTime = 0; this.toastTime = 0; this.panel = null;
    document.getElementById('start').onclick = () => g.start();
    document.getElementById('pause-button').onclick = () => g.pause();
    document.getElementById('audio-toggle').onclick = () => { g.audio.unlock(); NB.settings.audio = !NB.settings.audio; g.audio.sync(); NB.Store.save(); this.syncAudio(); };
    document.querySelector('.brand').onclick = e => e.preventDefault();
    document.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => this.openPanel(b.dataset.panel));
    this.touchReset = []; this.bindTouch();
    document.addEventListener('keydown', e => {
      if (e.code !== 'Tab' || this.modal.hidden) return;
      const focusable = [...this.card.querySelectorAll('button:not(:disabled), input')]; if (!focusable.length) return;
      if (e.shiftKey && document.activeElement === focusable[0]) { e.preventDefault(); focusable.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === focusable.at(-1)) { e.preventDefault(); focusable[0].focus(); }
    });
    document.body.classList.toggle('touch', g.touch); this.showMenu(); this.syncAudio();
  }
  syncAudio() { const b = document.getElementById('audio-toggle'); b.textContent = NB.settings.audio ? 'SOUND ON' : 'SOUND OFF'; b.setAttribute('aria-label', NB.settings.audio ? 'Mute audio' : 'Enable audio'); }
  showGame() { this.modal.hidden = true; this.panel = null; document.getElementById('menu').hidden = true; document.getElementById('hud').hidden = false; document.getElementById('touch-controls').hidden = !this.g.touch; document.body.classList.add('in-game'); this.hudTimer = 1; }
  showMenu() { this.modal.hidden = true; this.panel = null; document.getElementById('menu').hidden = false; document.getElementById('hud').hidden = true; document.getElementById('touch-controls').hidden = true; document.getElementById('announcement').hidden = true; document.getElementById('toast').hidden = true; document.body.classList.remove('in-game'); document.getElementById('menu-best').textContent = NB.pad(NB.settings.best, 6); document.getElementById('menu-clears').textContent = NB.settings.clears ? `${NB.settings.clears} SUCCESSFUL BREACHES` : 'NO SUCCESSFUL BREACHES'; }
  open(html, wide = false) { this.card.classList.toggle('wide', wide); this.card.innerHTML = html; this.modal.hidden = false; this.g.clearInput(); this.touchReset.forEach(reset => reset()); document.getElementById('touch-controls').hidden = true; requestAnimationFrame(() => this.card.querySelector('button')?.focus({ preventScroll: true })); }
  pause() {
    this.panel = null; const g = this.g;
    const mods = NB.Upgrades.catalog.filter(u => g.ranks[u.id]).map(u => `<span>${u.name.toUpperCase()} ${g.ranks[u.id]}</span>`).join('');
    this.open(`<div class="eyebrow">CONNECTION SUSPENDED / WAVE ${NB.pad(g.wave)}</div><h2 id="modal-title">BREACH PAUSED.</h2><p>The network can wait. Your run is safe here.</p><div class="mod-list">${mods || '<span>NO MODULES INSTALLED YET</span>'}</div><div class="modal-actions"><button class="primary" id="resume">RESUME BREACH</button><button class="secondary" id="pause-settings">SETTINGS</button></div><div class="modal-actions"><button class="secondary" id="pause-help">FIELD MANUAL</button><button class="secondary" id="quit">END RUN</button></div><p class="fine-print">ESC to resume. Leaving ends this run; your best score is kept.</p>`);
    document.getElementById('resume').onclick = () => g.resume(); document.getElementById('pause-settings').onclick = () => this.openPanel('settings'); document.getElementById('pause-help').onclick = () => this.openPanel('how');
    document.getElementById('quit').onclick = () => { this.open('<div class="eyebrow">DISCONNECT OPERATIVE</div><h2 id="modal-title">END THIS RUN?</h2><p>Wave progress and upgrades will be lost. Your best score will be saved.</p><div class="modal-actions"><button class="primary" id="keep-playing">KEEP PLAYING</button><button class="secondary" id="end-run">END RUN</button></div>'); document.getElementById('keep-playing').onclick = () => this.pause(); document.getElementById('end-run').onclick = () => g.menu(); };
  }
  resumeOrBack() { if (this.panel) this.pause(); else this.g.resume(); }
  closePanel() { if (this.g.state === NB.STATES.MENU) { this.modal.hidden = true; this.panel = null; document.getElementById('start').focus({ preventScroll: true }); } else if (this.g.state === NB.STATES.PAUSED) this.pause(); }
  openPanel(panel) {
    this.g.audio.unlock(); this.g.audio.play('button'); this.panel = panel;
    const close = '<button class="close" aria-label="Close">&#215;</button>';
    if (panel === 'how') this.open(close + '<div class="eyebrow">OPERATIVE FIELD MANUAL</div><h2 id="modal-title">MAKE EVERY MOVE COUNT.</h2><div class="control-list"><span>WASD / ARROWS</span><span>Move in any direction</span><span>MOUSE + LEFT CLICK</span><span>Aim + hold to fire</span><span>SPACE</span><span>Invulnerable dash / 18 energy</span><span>E</span><span>EMP pulse / 70 energy</span><span>ESC</span><span>Pause + settings</span><span>1 / 2 / 3</span><span>Select a drafted upgrade</span></div><p><strong>Survive 15 waves. Destroy the core.</strong> Drones pursue, hunters strafe and fire, tanks spread volleys, swarms surround, and phantoms fade before lunging. Warning rings mark incoming enemies. Red zones show boss attacks before they land.</p><p>Collect cyan shards for XP and energy. Medical crosses restore HP. Level-ups unlock random mod drafts at wave clear. Spend 45 energy to overclock a draft for an extra rank. Each clear restores 8 HP and 25 energy.</p><p>Chain kills within 3.8 seconds to raise your score multiplier, up to x5. Taking damage breaks the chain. Your EMP damages nearby enemies and clears all hostile bullets.</p><p class="touch-note">TOUCH: left stick moves; right stick aims and fires. Use DASH and EMP buttons. Landscape offers a wider view. Keyboard and mouse provide the most precise control.</p><p class="fine-print">WAVE 05 / ELITE BULWARK &nbsp; WAVE 10 / WARDEN &nbsp; WAVE 15 / NEXUS CORE<br>Dash can pass through enemies, bullets and active hazards.</p>');
    if (panel === 'credits') this.open(close + '<div class="eyebrow">AN ORIGINAL INDEPENDENT GAME</div><h2 id="modal-title">BUILT TO BREACH.</h2><p><strong>NEON//BREACH</strong> is an original single-player survival shooter. In 2097, NEXUS has corrupted the city defense grid. GHOST / 01 is the rogue cyber-operative sent to sever the core.</p><div class="control-list"><span>ART + ANIMATION</span><span>Original procedural Canvas art</span><span>SOUND + MUSIC</span><span>Original Web Audio synthesis</span><span>ENGINE</span><span>Vanilla JavaScript / Canvas 2D</span><span>DEPENDENCIES</span><span>None. No accounts. No backend.</span></div><p class="fine-print">Created for you with AI-assisted design and development. No third-party art, music, fonts or asset packs.<br>Best scores and settings are stored only in this browser. Private browsing or clearing site data may remove them.</p>');
    if (panel === 'settings') {
      const s = NB.settings;
      this.open(close + `<div class="eyebrow">OPERATIVE PREFERENCES</div><h2 id="modal-title">SYSTEM SETTINGS.</h2><div class="setting-row"><span>MASTER AUDIO<small>Procedural sound effects and soundtrack</small></span><button class="toggle" data-setting="audio" aria-pressed="${s.audio}">${s.audio ? 'ON' : 'OFF'}</button></div><div class="setting-row"><label for="volume">VOLUME</label><input id="volume" type="range" min="0" max="100" value="${Math.round(s.volume * 100)}" aria-label="Master volume"></div><div class="setting-row"><span>SYNTH SOUNDTRACK<small>Original generative cyberpunk pulse</small></span><button class="toggle" data-setting="music" aria-pressed="${s.music}">${s.music ? 'ON' : 'OFF'}</button></div><div class="setting-row"><span>CAMERA SHAKE<small>Impact feedback without moving the HUD</small></span><button class="toggle" data-setting="shake" aria-pressed="${s.shake}">${s.shake ? 'ON' : 'OFF'}</button></div><div class="setting-row"><span>PARTICLE DETAIL<small>Reduce effects on lower-powered devices</small></span><button class="toggle" data-setting="effects" aria-pressed="${s.effects}">${s.effects ? 'HIGH' : 'LOW'}</button></div><p class="fine-print">${NB.Store.available ? 'Settings save automatically on this device.' : 'Browser storage is unavailable. Settings work for this session only.'} Gameplay never requires an internet connection.</p>`);
      this.card.querySelectorAll('[data-setting]').forEach(button => button.onclick = () => { const key = button.dataset.setting; s[key] = !s[key]; button.textContent = key === 'effects' ? s[key] ? 'HIGH' : 'LOW' : s[key] ? 'ON' : 'OFF'; button.setAttribute('aria-pressed', s[key]); if (!s.shake) this.g.fx.shake = 0; this.g.audio.sync(); this.g.audio.play('button'); NB.Store.save(); this.syncAudio(); });
      document.getElementById('volume').oninput = e => { s.volume = Number(e.target.value) / 100; this.g.audio.sync(); NB.Store.save(); };
    }
    this.card.querySelector('.close').onclick = () => this.closePanel();
  }
  upgrades() {
    const g = this.g; this.draft = NB.Upgrades.choices(g); this.overclock = false;
    const cards = this.draft.map((u, i) => `<button class="upgrade-card" data-choice="${i}"><span class="micro"><span>${u.category}</span><span>0${i + 1}</span></span><div class="upgrade-icon" aria-hidden="true">${u.icon.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div><h3>${u.name}</h3><p>${u.description}</p><span class="install">INSTALL / RANK ${(g.ranks[u.id] || 0) + 1} ${Number.isFinite(u.max) ? 'OF ' + u.max : ''} &nbsp; &#8599;</span></button>`).join('');
    this.open(`<div class="eyebrow">SALVAGED DATA / AUGMENTATION AVAILABLE</div><h2 id="modal-title">EVOLVE YOUR ARSENAL.</h2><p>Choose one module. Make this run your own. <span class="cyan">${g.pendingUpgrades} draft${g.pendingUpgrades === 1 ? '' : 's'} available.</span></p><div class="upgrade-grid">${cards}</div><div class="overclock-row"><span>ENERGY RESERVE <b class="cyan">${Math.floor(g.player.energy)} / 100</b><br>Standard installs are free.</span><button id="overclock" class="secondary" aria-pressed="false" ${g.player.energy < 45 || this.draft.every(u => (g.ranks[u.id] || 0) + 1 >= u.max || u.id === 'repair') ? 'disabled' : ''}>OVERCLOCK +1 RANK / 45 ENERGY</button></div><p class="fine-print">Press 1, 2 or 3 to install. Overclock adds one extra rank where available. No energy is charged for a module's final rank.</p>`, true);
    this.card.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => this.chooseUpgrade(Number(b.dataset.choice)));
    document.getElementById('overclock').onclick = e => { this.overclock = !this.overclock; e.currentTarget.classList.toggle('active', this.overclock); e.currentTarget.setAttribute('aria-pressed', this.overclock); this.g.audio.play('button'); };
  }
  chooseUpgrade(index) {
    if (this.g.state !== NB.STATES.UPGRADE || !this.draft?.[index]) return;
    const upgrade = this.draft[index], ranks = NB.Upgrades.install(this.g, upgrade, this.overclock); this.draft = null;
    if (this.g.pendingUpgrades > 0) this.upgrades();
    else { this.g.state = NB.STATES.PLAYING; this.g.wave++; this.showGame(); this.g.startWave(); this.toast(upgrade.name.toUpperCase() + ' INSTALLED' + (ranks === 2 ? ' / OVERCLOCKED' : '')); }
  }
  result() {
    const g = this.g, won = g.victory, minutes = Math.floor(g.runTime / 60), seconds = Math.floor(g.runTime % 60);
    document.getElementById('announcement').hidden = true; document.getElementById('toast').hidden = true;
    this.open(`<div class="eyebrow">${won ? 'NEXUS DISCONNECTED / CITY LIBERATED' : 'OPERATIVE SIGNAL LOST'}</div><h2 id="modal-title">${won ? 'THE CITY IS OURS.' : 'CONNECTION LOST.'}</h2><p>${won ? 'The defense grid falls silent. For the first time in years, the city belongs to its people. Breach complete, operative.' : 'The network adapts. So do you. Build a new loadout and breach again.'}</p><div class="result-score">${NB.pad(g.score, 6)}</div><div class="new-record">${g.newBest ? 'NEW PERSONAL BEST' : 'FINAL SCORE / BEST ' + NB.pad(NB.settings.best, 6)}</div><div class="result-stats"><div><span>${won ? 'WAVES CLEARED' : 'WAVE REACHED'}</span><b>${NB.pad(g.wave)} / 15</b></div><div><span>HOSTILES PURGED</span><b>${g.kills}</b></div><div><span>RUN TIME</span><b>${minutes}:${NB.pad(seconds)}</b></div></div><p class="fine-print">LONGEST CHAIN ${g.maxCombo} &nbsp; / &nbsp; OPERATIVE LEVEL ${g.level}${NB.Store.available ? ' &nbsp; / &nbsp; SCORE SAVED LOCALLY' : ' / STORAGE UNAVAILABLE'}</p><div class="modal-actions"><button class="primary" id="restart">${won ? 'BREACH AGAIN' : 'RETRY BREACH'} &#8599;</button><button class="secondary" id="result-menu">MAIN MENU</button></div>`);
    document.getElementById('restart').onclick = () => g.start(); document.getElementById('result-menu').onclick = () => g.menu();
  }
  bindTouch() {
    const g = this.g;
    for (const kind of ['move', 'aim']) {
      const el = document.getElementById(kind + '-stick'), thumb = el.querySelector('span'); let pointer = null;
      const reset = () => { pointer = null; thumb.style.transform = ''; if (kind === 'move') g.input.move = { x: 0, y: 0 }; else g.input.aim.active = false; };
      this.touchReset.push(reset);
      const update = e => { const rect = el.getBoundingClientRect(), dx = e.clientX - rect.left - rect.width / 2, dy = e.clientY - rect.top - rect.height / 2, length = Math.hypot(dx, dy), scale = 39 / Math.max(39, length); thumb.style.transform = `translate(${dx * scale}px,${dy * scale}px)`; if (kind === 'move') { g.input.move.x = dx * scale / 39; g.input.move.y = dy * scale / 39; } else { if (length > 6) { g.input.aim.x = dx; g.input.aim.y = dy; } g.input.aim.active = true; } };
      el.onpointerdown = e => { if (!g.active() || pointer !== null) return; e.preventDefault(); g.audio.unlock(); pointer = e.pointerId; el.setPointerCapture(pointer); update(e); };
      el.onpointermove = e => { if (pointer === e.pointerId) { e.preventDefault(); update(e); } };
      el.onpointerup = el.onpointercancel = el.onlostpointercapture = e => { if (pointer === e.pointerId) reset(); };
    }
    for (const action of ['dash', 'pulse']) document.getElementById('touch-' + action).onpointerdown = e => { if (!g.active()) return; e.preventDefault(); g.input[action] = true; };
  }
  announce(label, title, sub = '', danger = false, duration = 2.5) { this.announceTime = duration; const el = document.getElementById('announcement'); el.hidden = false; el.classList.toggle('danger', danger); document.getElementById('announcement-label').textContent = label; document.getElementById('announcement-title').textContent = title; document.getElementById('announcement-sub').textContent = sub; }
  toast(text) { document.getElementById('toast').textContent = text; document.getElementById('toast').hidden = false; this.toastTime = 2; }
  tick(dt) {
    if (this.g.active()) { if (this.announceTime > 0 && (this.announceTime -= dt) <= 0) document.getElementById('announcement').hidden = true; if (this.toastTime > 0 && (this.toastTime -= dt) <= 0) document.getElementById('toast').hidden = true; }
    this.hudTimer += dt; if (this.hudTimer < .1 || this.g.state === NB.STATES.MENU) return; this.hudTimer = 0;
    const g = this.g, p = g.player; const text = (id, value) => { const el = document.getElementById(id); if (el.textContent !== String(value)) el.textContent = value; }; const bar = (id, value) => document.getElementById(id).style.width = `${NB.clamp(value, 0, 1) * 100}%`;
    text('hp-text', `${Math.ceil(p.hp)} / ${p.maxHp}`); bar('hp-bar', p.hp / p.maxHp); text('shield-text', Math.ceil(p.shield)); bar('shield-bar', p.maxShield ? p.shield / p.maxShield : 0);
    text('score-text', NB.pad(g.score, 6)); text('best-text', NB.pad(Math.max(NB.settings.best, g.score), 6)); text('wave-text', NB.pad(g.wave)); text('energy-text', `${Math.floor(p.energy)}%`); bar('energy-bar', p.energy / p.maxEnergy); bar('dash-bar', 1 - p.dashTimer / p.dashCooldown); text('dash-text', p.dashTimer > 0 ? `${p.dashTimer.toFixed(1)}s` : p.energy < 18 ? 'LOW ENERGY' : 'READY'); text('combo-text', g.combo > 1 ? `${g.combo} CHAIN / x${Math.min(5, 1 + Math.floor(g.combo / 5))}` : ''); bar('xp-bar', g.xp / g.xpNeed); text('xp-text', `LVL ${NB.pad(g.level)} / ${Math.floor(g.xp)} OF ${g.xpNeed} XP${g.pendingUpgrades ? ' / MOD READY' : ''}`);
    text('sector-text', g.wave <= 5 ? 'OUTER DISTRICT' : g.wave <= 10 ? 'DEFENSE GRID' : 'CORE APPROACH'); text('remaining-text', g.intermission > 0 ? 'SECTOR SECURED' : g.boss && !g.boss.dead ? 'PRIORITY TARGET' : `${Math.max(0, g.waveTotal - g.waveSpawned + g.enemies.length)} HOSTILES REMAIN`); text('weapon-level', 'MK.' + NB.pad(1 + (g.ranks.damage || 0) + (g.ranks.fire || 0))); text('objective-text', g.boss && !g.boss.dead ? 'DESTROY ' + (g.boss.type === 'warden' ? 'WARDEN' : 'NEXUS CORE') : 'PURGE THE DEFENSE NETWORK');
    document.getElementById('boss-hud').hidden = !g.boss || g.boss.dead;
    if (g.boss && !g.boss.dead) { text('boss-name', g.boss.type === 'warden' ? 'WARDEN / DEFENSE MACHINE' : 'NEXUS CORE / CENTRAL INTELLIGENCE'); text('boss-phase', 'PHASE 0' + g.boss.phase); bar('boss-bar', g.boss.hp / g.boss.maxHp); }
    if (g.touch) { document.getElementById('touch-dash').style.opacity = p.dashTimer > 0 || p.energy < 18 ? '.35' : '1'; document.getElementById('touch-pulse').style.opacity = p.energy < 70 ? '.35' : '1'; }
  }
};
NB.game = new NB.Game(document.getElementById('game'));
NB.game.ui = new NB.UI(NB.game);
