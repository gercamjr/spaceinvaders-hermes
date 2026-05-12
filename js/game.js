/**
 * game.js - Main game loop, state machine, collision detection
 * States: MENU, PLAYING, PAUSED, GAMEOVER
 * Handles: wave spawning, bullet updates, collision detection,
 * damage numbers, screen shake, combo system, powerup drops.
 */

const Game = (() => {
  let canvas = null;
  let ctx = null;
  let state = 'MENU'; // MENU | PLAYING | PAUSED | GAMEOVER
  let lastTime = 0;
  let animFrame = null;

  // Game state
  let score = 0;
  let level = 1;
  let combo = 1;
  let comboTimer = 0;
  let enemiesKilled = 0;
  let bullets = [];
  let powerups = [];
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight - 100;
  let mouseDown = false;

  // Wave management
  let waveSpawnTimer = 0;
  let waveEnemiesSpawned = 0;
  let waveEnemiesTotal = 0;
  let bossSpawned = false;
  let miniSwarmSpawned = false;

  // Screen shake
  let shakeX = 0;
  let shakeY = 0;
  let shakeIntensity = 0;
  let shakeDuration = 0;
  let shakeTimer = 0;

  // Screen flash
  let flashAlpha = 0;

  // --- Init ---
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;

    Background.init();
    Player.init();
    resetGame();

    // Event listeners
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('click', onClick);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', onKeyDown);

    // Start loop
    lastTime = performance.now();
    loop(lastTime);
  }

  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Re-initialize background for new dimensions
    Background.init();
  }

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    Background.setMouse(mouseX, mouseY);
    Player.setMouse(mouseX, mouseY);
    AudioSys.resume();
  }

  function handleStart(e) {
    e.preventDefault();
    mouseDown = true;
    AudioSys.init();
    AudioSys.resume();

    if (state === 'MENU') {
      startGame();
    } else if (state === 'GAMEOVER') {
      resetGame();
      startGame();
    }
  }

  function onMouseDown(e) {
    handleStart(e);
  }

  function onClick(e) {
    if (state === 'MENU' || state === 'GAMEOVER') {
      handleStart(e);
    }
  }

  function onMouseUp() {
    mouseDown = false;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (state === 'PLAYING') {
        state = 'PAUSED';
      } else if (state === 'PAUSED') {
        state = 'PLAYING';
      }
    }
  }

  function resetGame() {
    score = 0;
    level = 1;
    combo = 1;
    comboTimer = 0;
    enemiesKilled = 0;
    bullets = [];
    powerups = [];
    waveSpawnTimer = 0;
    waveEnemiesSpawned = 0;
    bossSpawned = false;
    miniSwarmSpawned = false;
    shakeIntensity = 0;
    shakeDuration = 0;
    flashAlpha = 0;
    Enemies.clear();
    Particles.clear();
    Player.reset();
  }

  function startGame() {
    state = 'PLAYING';
    spawnWave();
  }

  function spawnWave() {
    const count = CONFIG.waves.baseCount + Math.floor(level * CONFIG.waves.countPerLevel);
    waveEnemiesTotal = count;
    waveEnemiesSpawned = 0;
    waveSpawnTimer = 0;

    // Boss level warning
    if (level % CONFIG.boss.interval === 0) {
      miniSwarmSpawned = true;
      Enemies.spawnMiniSwarm();
    }

    // Spawn boss directly on boss levels
    if (level % CONFIG.boss.interval === 0) {
      bossSpawned = true;
      Enemies.spawnBoss(level);
    }
  }

  function advanceLevel(now) {
    level++;
    if (level % CONFIG.boss.interval === 0) {
      bossSpawned = true;
      Enemies.spawnBoss(level);
    } else {
      if ((level - 1) % CONFIG.player.upgradeInterval === 0) {
        Player.upgrade();
      }
      spawnWave();
    }
  }

  // --- Collision detection (circle-to-circle) ---
  function circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
  }

  // --- Screen shake ---
  function triggerShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeDuration = duration;
    shakeTimer = 0;
  }

  function updateShake(dt) {
    if (shakeDuration > 0) {
      shakeTimer += dt;
      if (shakeTimer < shakeDuration) {
        const decay = 1 - shakeTimer / shakeDuration;
        shakeX = (Math.random() - 0.5) * shakeIntensity * decay * 2;
        shakeY = (Math.random() - 0.5) * shakeIntensity * decay * 2;
      } else {
        shakeX = 0;
        shakeY = 0;
        shakeDuration = 0;
      }
    }
  }

  // --- Main loop ---
  function loop(now) {
    const dt = Math.min(now - lastTime, 50); // cap delta
    lastTime = now;

    update(dt, now);
    draw(now);

    animFrame = requestAnimationFrame(loop);
  }

  function update(dt, now) {
    if (state !== 'PLAYING') return;

    const dtScale = dt / 16.67;

    // Update background
    Background.update(dt);

    // Update player
    Player.update(dt, now);

    // Shooting
    if (mouseDown && Player.isAlive()) {
      const newBullets = Player.shoot(now);
      bullets.push(...newBullets);
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dtScale;
      b.y += b.vy * dtScale;

      // Homing (tier 4)
      if (b.homing) {
        const aliveEnemies = Enemies.getAlive();
        if (aliveEnemies.length > 0) {
          let nearest = null;
          let nearDist = Infinity;
          for (const e of aliveEnemies) {
            const d = Math.sqrt((e.x - b.x) ** 2 + (e.y - b.y) ** 2);
            if (d < nearDist) { nearDist = d; nearest = e; }
          }
          if (nearest) {
            const currentSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            b.vx += ((nearest.x - b.x) / nearDist) * 0.3 * dtScale;
            b.vy += ((nearest.y - b.y) / nearDist) * 0.3 * dtScale;
            const newSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (newSpeed > 0) {
              b.vx = (b.vx / newSpeed) * currentSpeed;
              b.vy = (b.vy / newSpeed) * currentSpeed;
            }
          }
        }
      }

      // Bullet trail particles
      if (Math.random() < 0.5) {
        Particles.spawnBulletTrail(b.x, b.y, b.color);
      }

      // Remove off-screen bullets
      if (b.y < -20 || b.y > window.innerHeight + 20 ||
          b.x < -20 || b.x > window.innerWidth + 20) {
        bullets.splice(i, 1);
      }
    }

    // Update enemies
    Enemies.update(dt);

    // Wave spawning - spawn enemies one at a time over time
    if (!bossSpawned) {
      waveSpawnTimer += dt;
      if (waveSpawnTimer >= CONFIG.waves.spawnInterval && waveEnemiesSpawned < waveEnemiesTotal) {
        const r = Math.random();
        let type;
        if (level >= 3 && r < 0.25) {
          type = 'medium';
        } else if (r < 0.6) {
          type = 'small';
        } else {
          type = 'baby';
        }
        Enemies.spawnOne(type, level);
        waveEnemiesSpawned++;
        waveSpawnTimer = 0;
      }
    }

    // --- Bullet vs Enemy collision ---
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (const e of Enemies.getAlive()) {
        const bulletR = b.width;
        const enemyR = e.size / 2;

        if (circleCollision(b.x, b.y, bulletR, e.x, e.y, enemyR)) {
          // Hit!
          e.hitFlash = 3;
          e.hp -= b.damage;
          bullets.splice(bi, 1);

          // Hit feedback
          Particles.spawnSparks(b.x, b.y, 3 + Math.floor(Math.random() * 3));
          Particles.spawnDamageNumber(e.x, e.y - e.size / 2, b.damage);
          AudioSys.playHit();

          // Enemy died
          if (e.hp <= 0) {
            const drop = Enemies.killEnemy(e, e.x, e.y);
            enemiesKilled++;

            // Score with combo
            const points = e.score * combo;
            score += points;
            combo++;
            combo = Math.min(combo, CONFIG.combo.maxMultiplier);
            comboTimer = CONFIG.combo.decayTime;

            // Screen shake
            const shakeCfg = CONFIG.shake[e.type];
            triggerShake(shakeCfg.intensity, shakeCfg.duration);

            // Powerup drop
            if (drop) {
              powerups.push({
                x: drop.x,
                y: drop.y,
                radius: CONFIG.powerup.radius,
                vy: CONFIG.powerup.fallSpeed,
                pulse: 0
              });
            }
          }
          break;
        }
      }
    }

    // --- Player vs Enemy contact ---
    if (Player.isAlive() && Player.getInvulnTimer() <= 0) {
      const pPos = Player.getPos();
      const pRadius = Player.getRadius() + CONFIG.player.contactBuffer;
      for (const e of Enemies.getAlive()) {
        const eRadius = e.size / 2;
        if (circleCollision(pPos.x, pPos.y, pRadius, e.x, e.y, eRadius)) {
          Player.takeDamage(15);
          flashAlpha = 0.3;
          triggerShake(8, 200);
          combo = 1;
          comboTimer = 0;
          // Push enemy away
          e.y += 30;
          if (!Player.isAlive()) {
            state = 'GAMEOVER';
            Particles.spawnExplosion(pPos.x, pPos.y, 'boss');
            AudioSys.playExplosion('boss');
          }
        }
      }

      // Player vs ink blobs
      for (let i = Enemies.getInkBlobs().length - 1; i >= 0; i--) {
        const blob = Enemies.getInkBlobs()[i];
        if (circleCollision(pPos.x, pPos.y, Player.getRadius(), blob.x, blob.y, blob.radius)) {
          Player.takeDamage(blob.damage);
          flashAlpha = 0.2;
          Enemies.getInkBlobs().splice(i, 1);
          combo = 1;
          comboTimer = 0;
        }
      }
    }

    // --- Powerup collection ---
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += p.vy * dtScale;
      p.pulse += CONFIG.powerup.glowPulse * dtScale;

      const pPos = Player.getPos();
      if (circleCollision(pPos.x, pPos.y, Player.getRadius() + 10, p.x, p.y, p.radius)) {
        Player.activateUnleash(now);
        AudioSys.playPowerup();
        Particles.spawnPowerupSparkle(p.x, p.y);
        powerups.splice(i, 1);
        continue;
      }

      if (p.y > window.innerHeight + 20) {
        powerups.splice(i, 1);
      }
    }

    // Combo decay
    if (combo > 1) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 1;
      }
    }

    // Screen flash decay
    if (flashAlpha > 0) {
      flashAlpha -= 0.02 * dtScale;
      if (flashAlpha < 0) flashAlpha = 0;
    }

    // --- Level progression (two paths to avoid double-advancing) ---
    // Non-boss levels: advance when wave is fully spawned and all enemies cleared
    if (Enemies.isEmpty() && waveEnemiesSpawned >= waveEnemiesTotal && !bossSpawned) {
      advanceLevel(now);
    }
    // Boss levels: advance when boss (and all mini-swarm) is cleared
    if (bossSpawned && Enemies.isEmpty()) {
      bossSpawned = false;
      advanceLevel(now);
    }

    // Update particles
    Particles.update(dt);

    // Update shake
    updateShake(dt);
  }

  function draw(now) {
    ctx.save();

    // Screen shake offset
    ctx.translate(shakeX, shakeY);

    // Background
    Background.draw(ctx);

    if (state === 'MENU') {
      UI.drawStartScreen(ctx);
      ctx.restore();
      return;
    }

    // Powerups
    for (const p of powerups) {
      const glow = 0.5 + Math.sin(p.pulse) * 0.5;
      ctx.save();
      ctx.shadowColor = CONFIG.colors.gold;
      ctx.shadowBlur = 10 + glow * 10;
      ctx.fillStyle = CONFIG.colors.gold;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + glow * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = CONFIG.colors.white;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Bullets
    for (const b of bullets) {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Enemies
    Enemies.draw(ctx);

    // Player
    Player.draw(ctx);

    // Particles
    Particles.draw(ctx);

    // Screen flash (player hit)
    if (flashAlpha > 0) {
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = CONFIG.colors.red;
      ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
      ctx.globalAlpha = 1;
    }

    // Chromatic aberration during unleash
    if (Player.isUnleashing()) {
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = CONFIG.colors.red;
      ctx.fillRect(2, 0, canvas.width, canvas.height);
      ctx.fillStyle = CONFIG.colors.blue;
      ctx.fillRect(-2, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    // HUD
    if (state === 'PLAYING' || state === 'PAUSED') {
      UI.drawHUD(ctx, score, level, combo, Player.getHealth(), Player.getMaxHealth(),
        Player.isUnleashing(), Player.isUnleashing() ? performance.now() + 5000 : 0, now);
    }

    // Game over
    if (state === 'GAMEOVER') {
      UI.drawGameOverScreen(ctx, score, level, enemiesKilled);
    }

    // Pause
    if (state === 'PAUSED') {
      UI.drawPauseScreen(ctx);
    }

    ctx.restore();
  }

  return { init };
})();

// Auto-start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Game.init());
} else {
  Game.init();
}
