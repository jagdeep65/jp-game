# NEON//BREACH Release Checks

## Result

40 automated regression checks passed, with zero uncaught runtime errors observed on the final published build.

## Verified

- Movement speed and normalized diagonal input.
- Mouse aiming, held-fire shooting and swept projectile collisions.
- Dash cooldown, energy cost, low-energy rejection and invulnerability.
- EMP energy cost, damage, enemy stun and hostile-projectile clearing.
- Distinct movement and attack logic for all five enemy types.
- Enemy death, score popups, XP pickups, leveling and combo reset on damage.
- Random upgrade drafts, rank limits, shield absorption and overclock costs.
- Pause/resume, game over, restart and clean run-state reset.
- All 15 waves, intermissions, upgrade selections and final victory transition.
- Both bosses entering phases 1, 2 and 3 and transitioning correctly on defeat.
- NEXUS blast-zone and beam warnings.
- High score and settings persisting after a real page reload.
- Bounded pools, finite entity coordinates and stable sustained update costs.

Desktop movement, shooting, aiming, dash and pause were also driven through real browser input events. Touch input was tested with simultaneous movement and aim/fire gestures, release cleanup and dash activation.

## Responsive Layout

Visually inspected desktop, 390 x 844 portrait and 844 x 390 landscape layouts, with an additional 320 x 568 small-screen fit check. Fixed an overflowing mobile upgrade dialog and compacted short portrait and landscape menus. All primary controls remain available. Touch detection also activates from an actual touch gesture when browser capability reporting is inaccurate.

## Performance

A 12-minute accelerated combat simulation remained within all configured limits. Enemy count stayed at or below 32; all seven object pools preserved their original total capacities. No progressive increase in simulation cost was observed. In the final run, an early simulated minute took about 36 ms of update processing and a late minute about 26 ms.

The static arena and vignette are cached. In the recorded cloud browser's 1440 x 900 stress scene, observed frame pacing was approximately 46-50 FPS. After caching, median JavaScript render submission cost was 0.3 ms and the 95th percentile was 2.4 ms. These are measurements of this cloud test environment, not a promise of a particular frame rate on every device. The game targets 60 Hz simulation and offers reduced particle detail.

## Boss Pacing

Automated aiming and movement with a legal upgraded loadout defeated WARDEN in approximately 18 seconds and NEXUS CORE in approximately 49 seconds. These checks used normal player damage rather than forced boss deaths. WARDEN displayed all three attack patterns; NEXUS displayed all four patterns across its three phases. Boss durability was increased during balancing to prevent strong builds from skipping the finale's attack sequence.

## Offline And Assets

The standalone HTML was loaded and played with networking disabled. Movement, shooting and Web Audio worked without game asset requests. All source script and stylesheet paths are resolved locally and included in the ZIP. The bundle contains the same code and styling inline; its favicon is embedded.

The cloud browser blocks direct `file://` navigation by policy, so direct-file opening was not exercised there. The project deliberately uses classic scripts and no imports, fetches or server-only features, allowing ordinary browsers to open `index.html` or the single-file version locally.

## Scope

Testing used Chromium and Chrome touch emulation, not a matrix of physical phones or every browser. Automated progression and stress tests accelerate simulation and are separate from real-input interaction checks. Test-generated scores and settings were restored afterward. No manual code edits or console cheats are necessary to play the game.
