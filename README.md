# Octopus Invaders

A space shooter game built with vanilla JavaScript and Canvas. No libraries, no frameworks.

## Description

Defend space from waves of pixelated octopus aliens in this vertical scrolling shooter.
Your stealth fighter follows your mouse cursor as you blast through waves of increasingly
dangerous octopus enemies — from tiny babies to massive bosses with tentacle attacks.

## How to Run

```bash
cd space-shooter
python3 -m http.server 3001
```

Then open http://localhost:3001 in your browser.

## Controls

- **Mouse** — Move ship (smooth tracking with lerp)
- **Left Click (hold)** — Fire weapons (continuous rapid fire)
- **ESC** — Pause / Resume

## Gameplay

- Top-down vertical infinite scrolling shooter
- Enemies spawn from the top in wave patterns
- Levels increase enemy count, speed, and bullet patterns
- Boss octopus appears every 5 levels with health bar and tentacle attacks
- Score counter with combo multiplier for consecutive kills
- Ship upgrades every 3 levels (4 tiers total)

## Enemy Types

- **Small Octopus** (neon pink) — Basic grunt, moves in sine wave patterns
- **Medium Octopus** (electric blue) — Shoots ink blobs, splits into 2 babies on death
- **Baby Octopus** (cyan) — Fast but fragile, spawns from medium deaths
- **Boss Octopus** (purple) — Every 5 levels, tentacle reach + ink barrage attack

## Ship Upgrades (every 3 levels)

- **Tier 1** — Single cannon, cyan glow
- **Tier 2** — Dual cannons, green glow
- **Tier 3** — Triple spread shot, gold glow
- **Tier 4** — Homing missiles + spread, white glow with rainbow shimmer

## Power-Up System

- Killing medium or boss octopi drops a glowing orb
- Collecting the orb activates **UNLEASH MODE** for 5 seconds:
  - Massive spread beam bullets
  - Ship glows white-hot
  - Chain reaction explosions
  - 3x score multiplier
  - Chromatic aberration screen effect

## Project Structure

```
space-shooter/
  index.html          -- Entry point, canvas setup, script imports
  README.md           -- This file
  css/
    styles.css        -- Fullscreen canvas, cursor hidden, no-select
  js/
    config.js         -- Color palette, speeds, enemy stats, all tuning constants
    audio.js          -- Web Audio API procedural sounds (laser, explosions, etc.)
    particles.js      -- Explosion, ink splatter, engine trails, bullet trails, sparks
    background.js     -- 4-layer parallax (stars, nebula, planets, comets)
    enemies.js        -- Pixelated octopus enemies, wave spawning, boss logic
    player.js         -- Ship rendering, mouse tracking, weapons, upgrade tiers
    ui.js             -- HUD, start/gameover screens, score, health bar, combo
    game.js           -- Main game loop, state machine, collision detection
```

## Features

- All pixel art rendered via grid-based fillRect (no smooth arcs)
- 4-layer parallax background with mouse-reactive depth
- Full particle system (explosions, ink splatter, engine trails, bullet trails)
- Screen shake on hits and explosions
- White flash on enemy hits (3-frame hitFlash)
- Floating damage numbers
- Procedural audio via Web Audio API (no external files)
- Smooth 60fps with requestAnimationFrame
