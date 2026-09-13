# NEON//BREACH

An original, dependency-free cyberpunk survival shooter. A complete 15-wave arcade campaign built with HTML5 Canvas, CSS, vanilla JavaScript and procedural Web Audio.

## Play

Open `index.html` in a modern browser. No installation, build step, account, network connection or server is required. The separately supplied `neon-breach.html` bundles this entire project into one portable file.

Live version: https://neon-breach.games.bu.app/

## Controls

| Action | Desktop |
| --- | --- |
| Move | WASD or arrow keys |
| Aim | Mouse |
| Fire | Hold left mouse button |
| Phase dash | Space; costs 18 energy |
| EMP pulse | E; costs 70 energy |
| Pause/settings | Escape |
| Select upgrade | 1, 2 or 3, or click a card |

Touch devices have separate movement and aim/fire sticks, plus dash and EMP buttons. Landscape provides a wider combat view. Keyboard and mouse provide the most precise control.

## The Campaign

- Waves 1-4 introduce drones, ranged hunters, swarms and armored tanks.
- Wave 5 adds the elite BULWARK.
- Wave 6 introduces partially cloaked, lunging phantoms.
- Wave 10: WARDEN, a moving defense machine with three phases, aimed volleys, radial fire and telegraphed charges.
- Wave 15: NEXUS CORE, a three-phase finale with radial fire, spirals, marked blast zones, beams and reinforcements.

Collect cyan shards for XP and energy. Green medical cells restore health. Each cleared wave automatically collects remaining salvage and restores 8 HP and 25 energy.

XP level-ups unlock mod drafts between waves. Tactical caches add drafts after waves 2, 5, 8, 11 and 14. Select one of three randomized modules. Standard installs are free; enabling Overclock spends 45 energy for an extra rank if the module has room for two ranks.

Chain kills within 3.8 seconds to build a score multiplier, up to x5. Taking damage breaks the chain. Dash grants temporary invulnerability. EMP clears hostile bullets, damages nearby enemies and briefly stuns regular enemies.

## Source Map

| File | Responsibility |
| --- | --- |
| `index.html` | Accessible menu, HUD and modal structure |
| `style.css` | Responsive interface, touch controls and visual presentation |
| `js/core.js` | Shared utilities, bounded pools, collision math and local storage |
| `js/player.js` | Movement, aiming, blaster, dash, EMP and player rendering |
| `js/enemies.js` | Five distinct enemy types and elite variant |
| `js/bosses.js` | WARDEN and NEXUS phase logic, attacks and artwork |
| `js/upgrades.js` | Upgrade definitions, randomized drafts and installation |
| `js/audio.js` | Procedural effects, generative soundtrack and master mixing |
| `js/effects.js` | Pooled particles, trails, rings, score popups and impact effects |
| `js/game.js` | State machine, fixed-step loop, waves, combat and arena rendering |
| `js/ui.js` | Menus, HUD updates, settings, results and touch input |
| `tests/regression.js` | Optional browser regression suite; not loaded during play |

Classic scripts are used intentionally so the project also works through `file://`. Everything shares the `NB` namespace. Only one requestAnimationFrame loop is created. The simulation runs at 60 fixed updates per second, independently of display refresh rate, and automatically pauses on focus loss.

## Performance And Saving

Active entities are capped at 32 enemies, 140 friendly bullets, 220 hostile bullets, 160 pickups, 30 hazards and 360 particles. Objects are pooled where useful, collision checks use bounded squared-distance broad phases and swept projectile tests, and the DOM HUD updates at 10 Hz rather than every frame. Static arena artwork and the vignette are cached. Canvas pixel density is capped at 1.5x.

The settings menu includes master audio, volume, synth soundtrack, camera shake and reduced particle detail. Reduced-motion preferences disable camera shake by default.

High scores and settings use the `neon-breach-v1` localStorage key. They are local to each browser and origin. Offline files and the hosted game may have separate records. Clearing browser data removes them; storage-restricted browsers still allow gameplay but may not retain records. A run itself is not saved across closing or reloading the page.

## Original Assets

All operative artwork, enemies, bosses, effects and environments are drawn procedurally. All sounds and music are synthesized locally. No external fonts, images, music, asset packs, libraries, APIs, authentication or databases are needed by the game.

The optional hosted version is static hosting and may include hosting-provider analytics. The downloadable game has no analytics or external requests.

## Regression Tests

In a development browser, evaluate `tests/regression.js`, then call `await runNeonRegression()`. The tests replace the current run, exercise all waves and boss phases, and simulate 12 minutes of sustained combat. They restore the saved settings and score afterward. Do not run them during a run you want to keep.

See the accompanying test report for the checks performed on this release.
