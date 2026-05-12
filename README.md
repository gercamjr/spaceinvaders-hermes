# Octopus Invaders

A vanilla JavaScript space shooter built with Canvas. No libraries, no frameworks.

## Description

Defend space from waves of pixelated octopus aliens in this vertical scrolling shooter. Your stealth fighter follows your mouse cursor as you blast through waves of increasingly dangerous enemies — from tiny babies to massive bosses with tentacle attacks.

## How to Run

```bash
cd space-shooter
python3 -m http.server 3001
```

Then open <http://localhost:3001> in your browser.

## Controls

| Input | Action |
|-------|--------|
| Mouse | Move ship (smooth tracking with lerp 0.35) |
| Left Click (hold) | Fire weapons (continuous rapid fire) |
| ESC | Pause / Resume |

## Gameplay

- Top-down vertical infinite scrolling shooter
- Enemies spawn from the top in wave patterns
- Levels increase enemy count, speed, and bullet patterns
- Boss octopus appears every 5 levels with health bar and tentacle attacks
- Score counter with combo multiplier for consecutive kills
- Ship upgrades every 3 levels (4 tiers total)
- Collect power-up orbs to activate **UNLEASH MODE** (5 seconds of 3x score, massive spread, chain-reaction explosions)

## Enemy Types

| Enemy | Description |
|-------|-------------|
| Small (pink) | Basic grunt, moves in sine wave patterns |
| Medium (blue) | Shoots ink blobs, splits into 2 babies on death |
| Baby (cyan) | Fast but fragile, spawns from medium octopus death |
| Boss (purple) | Every 5 levels, 8 tentacles reach toward player, ink barrage |

## Ship Upgrades (every 3 levels)

1. **Tier 1** — Single cannon, cyan glow
2. **Tier 2** — Dual cannons, green glow
3. **Tier 3** — Triple spread shot, gold glow
4. **Tier 4** — Homing missiles + spread, white glow with rainbow shimmer

## Power-Up System

- Killing medium or boss octopi drops a glowing orb
- Collecting the orb activates **UNLEASH MODE** for 5 seconds:
  - Massive 7-bullet spread beam
  - Ship glows white-hot
  - Chain reaction explosions on contact with enemies (instant kills)
  - 3x score multiplier
  - Chromatic aberration screen effect
  - Green countdown ring around ship
  - Bass drone audio

## Project Structure

```
space-shooter/
  index.html          -- Entry point, canvas setup, script imports in dependency order
  README.md           -- This file
  css/
    styles.css        -- Fullscreen canvas, cursor hidden during gameplay, no-select
  js/
    config.js         -- Color palette, speeds, enemy stats, all tuning constants
    audio.js          -- Web Audio API procedural sounds (laser, explosions, etc.)
    particles.js      -- Explosion, ink splatter, engine/bullet trails, sparks, damage numbers
    background.js     -- 4-layer parallax (stars, nebula, planets, comets) scrolling downward
    enemies.js        -- Pixelated octopus enemies, wave spawning, boss tentacles
    player.js         -- Ship rendering, mouse tracking, weapons, upgrade tiers
    ui.js             -- HUD, start/gameover screens, score, health bar, combo
    game.js           -- Main game loop, state machine, collision detection
```

## Features

- All pixel art rendered via grid-based fillRect (no smooth arcs)
- Authentic neon cyberpunk visuals on dark space background (#0D1117)
- 4-layer parallax background with mouse-reactive depth
- Full particle system (explosions, ink splatter, trails, sparks, damage numbers)
- Screen shake on explosions (scales with enemy size)
- White flash on enemy hits (3-frame hitFlash)
- Floating damage numbers
- Procedural audio via Web Audio API (no external files)
- Smooth 60fps target with requestAnimationFrame

## Config Tuning

All game constants live in `js/config.js`. Key sections:

- `colors` — full neon palette
- `player` — radius (18), lerp (0.35), fire rate (120ms), health (100), contact buffer (30px), upgrade interval (3 levels)
- `bulletSpeeds` — [8, 10, 12, 14] per tier
- `enemySizes` — small 36, medium 48, baby 20, boss 150
- `enemyStats` — HP, speed, score, color per type
- `boss` — every 5 levels, 8 tentacles, 12-ink barrage
- `waves` — base 5 enemies, +2 per level, spawn interval 1500ms, speed scale 1.15x
