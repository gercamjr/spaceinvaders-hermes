/**
 * enemies.js - Pixelated octopus enemy system
 * All octopus types rendered via grid-based fillRect patterns (NOT arcs).
 * Handles wave spawning, movement patterns, boss logic, and ink attacks.
 */

const Enemies = (() => {
  let list = [];
  let inkBlobs = [];
  let frameCount = 0;

  // --- Pixel art grids for each octopus type ---
  // 0 = empty, 1 = body, 2 = tentacle (animated), 3 = eye

  // Small octopus: 8x8 grid, 2 tentacles
  const SMALL_GRID = [
    [0,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,1,1,3,1,1,1,0],
    [0,1,3,1,1,1,1,0],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,1,0,0,1,0,0],
    [0,1,2,0,0,2,1,0]
  ];

  // Medium octopus: 10x10 grid, 4 tentacles
  const MEDIUM_GRID = [
    [0,0,0,0,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,1,1,3,1,1,3,1,1,0],
    [0,1,3,1,1,1,1,3,1,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,1,0,1,1,0,1,0,0],
    [0,1,2,0,1,1,0,2,1,0],
    [1,2,0,0,1,1,0,0,2,1]
  ];

  // Baby octopus: 6x6 grid, tiny
  const BABY_GRID = [
    [0,0,1,1,0,0],
    [0,1,1,1,1,0],
    [1,3,1,1,3,1],
    [1,1,1,1,1,1],
    [0,1,1,1,1,0],
    [0,2,0,0,2,0]
  ];

  // Boss octopus: 16x16 grid, 8 tentacles
  const BOSS_GRID = [
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,1,1,3,1,1,1,1,1,1,1,1,3,1,1,0],
    [0,1,3,1,1,1,1,1,1,1,1,1,1,3,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,1,0,1,1,1,1,1,1,1,1,0,1,0,0],
    [0,1,0,0,1,0,1,1,1,1,0,1,0,0,1,0],
    [0,1,0,1,2,0,1,1,1,1,0,2,1,0,1,0],
    [1,2,0,2,0,0,1,1,1,1,0,0,2,0,2,1],
    [2,0,0,0,0,0,1,1,1,1,0,0,0,0,0,2],
    [0,2,0,0,0,0,0,1,1,0,0,0,0,0,2,0]
  ];

  const GRIDS = {
    small:  SMALL_GRID,
    medium: MEDIUM_GRID,
    baby:   BABY_GRID,
    boss:   BOSS_GRID
  };

  function createEnemy(type, x, y, level) {
    const stats = CONFIG.enemyStats[type];
    const size = CONFIG.enemySizes[type];
    const speedMult = Math.pow(CONFIG.waves.speedScale, Math.min(level - 1, 10));
    return {
      type,
      x: x || Math.random() * (window.innerWidth - size * 2) + size,
      y: y || -size,
      size,
      hp: stats.hp * (1 + (level - 1) * 0.15),
      maxHp: stats.hp * (1 + (level - 1) * 0.15),
      speed: stats.speed * speedMult,
      color: stats.color,
      score: stats.score,
      hitFlash: 0,
      alive: true,
      // Movement
      sineOffset: Math.random() * Math.PI * 2,
      sineAmp: type === 'small' ? 80 : type === 'boss' ? 40 : 50,
      sineFreq: 0.02 + Math.random() * 0.01,
      movePattern: type === 'small' ? 'sine' : type === 'boss' ? 'boss' : 'straight',
      // Boss-specific
      phase: 0,
      inkTimer: 0,
      tentacleAngle: 0,
      // Ink shooting (medium)
      shootTimer: 2000 + Math.random() * 2000,
      // Entry animation
      entering: true,
      targetY: type === 'boss' ? 120 : 60 + Math.random() * 100
    };
  }

  function createInkBlob(x, y, targetX, targetY) {
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 3;
    inkBlobs.push({
      x, y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      radius: 6,
      color: CONFIG.colors.purple,
      life: 1,
      damage: 5
    });
  }

  function spawnOne(type, level) {
    const size = CONFIG.enemySizes[type];
    const x = Math.random() * (window.innerWidth - size * 2) + size;
    const enemy = createEnemy(type, x, -size - Math.random() * 100, level);
    list.push(enemy);
  }

  function spawnWave(level) {
    const count = CONFIG.waves.baseCount + Math.floor(level * CONFIG.waves.countPerLevel);
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let type;
      if (level >= 5 && r < 0.05) {
        type = 'boss';
      } else if (level >= 3 && r < 0.25) {
        type = 'medium';
      } else if (r < 0.6) {
        type = 'small';
      } else {
        type = 'baby';
      }
      spawnOne(type, level);
    }
  }

  function spawnBoss(level) {
    const size = CONFIG.enemySizes.boss;
    const boss = createEnemy('boss', window.innerWidth / 2 - size / 2, -size, level);
    list.push(boss);
    AudioSys.playBossAlarm();
  }

  function spawnMiniSwarm() {
    for (let i = 0; i < 10; i++) {
      const enemy = createEnemy('small', Math.random() * window.innerWidth, -50 - Math.random() * 300, 1);
      enemy.speed *= 1.5;
      list.push(enemy);
    }
  }

  function update(dt) {
    frameCount++;
    const dtScale = dt / 16.67;

    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e.alive) continue;

      // Hit flash decay
      if (e.hitFlash > 0) e.hitFlash--;

      // Entry: move toward target Y
      if (e.entering) {
        e.y += e.speed * 2 * dtScale;
        if (e.y >= e.targetY) {
          e.entering = false;
          e.y = e.targetY;
        }
        continue;
      }

      // Movement patterns
      if (e.movePattern === 'sine') {
        e.x += Math.sin(frameCount * e.sineFreq + e.sineOffset) * e.sineAmp * 0.02 * dtScale;
        e.y += e.speed * 0.3 * dtScale;
      } else if (e.movePattern === 'boss') {
        // Boss hovers and drifts
        e.x += Math.sin(frameCount * 0.01) * 1.5 * dtScale;
        e.y += e.speed * 0.2 * dtScale;
        // Clamp boss position
        e.x = Math.max(e.size / 2, Math.min(window.innerWidth - e.size / 2, e.x));
        e.y = Math.max(40, Math.min(window.innerHeight * 0.4, e.y));

        // Boss ink barrage
        e.inkTimer -= dt;
        if (e.inkTimer <= 0) {
          for (let j = 0; j < CONFIG.boss.inkBarrageCount; j++) {
            const angle = (j / CONFIG.boss.inkBarrageCount) * Math.PI;
            createInkBlob(e.x, e.y + e.size / 2,
              e.x + Math.cos(angle) * 200,
              e.y + Math.sin(angle) * 300 + 200);
          }
          e.inkTimer = 3000;
        }
      } else {
        e.y += e.speed * dtScale;
      }

      // Medium octopus shoots ink
      if (e.type === 'medium') {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          const playerX = window.innerWidth / 2;
          const playerY = window.innerHeight - 100;
          createInkBlob(e.x, e.y + e.size / 2, playerX, playerY);
          e.shootTimer = 2000 + Math.random() * 2000;
        }
      }

      // Remove if off screen bottom
      if (e.y > window.innerHeight + e.size) {
        e.alive = false;
        list.splice(i, 1);
      }
    }

    // Update ink blobs
    for (let i = inkBlobs.length - 1; i >= 0; i--) {
      const b = inkBlobs[i];
      b.x += b.vx * dtScale;
      b.y += b.vy * dtScale;
      b.life -= (dt / 1000) * 0.4;
      if (b.life <= 0 || b.y > window.innerHeight + 20) {
        inkBlobs.splice(i, 1);
      }
    }
  }

  function draw(ctx) {
    // Draw enemies
    for (const e of list) {
      if (!e.alive) continue;

      const grid = GRIDS[e.type];
      const rows = grid.length;
      const cols = grid[0].length;
      const cellW = e.size / cols;
      const cellH = e.size / rows;
      const ox = e.x - e.size / 2;
      const oy = e.y - e.size / 2;

      // Tentacle animation: toggle bottom tentacle cells by row
      const tentWave = Math.floor(frameCount / 8) % 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = grid[r][c];
          if (val === 0) continue;

          // Skip animated tentacles on alternating frames only in bottom rows
          if (val === 2) {
            // Tentacle cells: animate by toggling on alternate waves
            const isBottomRows = r >= rows - 3;
            if (tentWave === 1 && isBottomRows && (r + c) % 2 === 0) continue;
          }

          let color = e.color;
          if (val === 3) color = CONFIG.colors.white; // eyes

          // Hit flash: render white
          if (e.hitFlash > 0) color = CONFIG.colors.white;

          ctx.fillStyle = color;
          ctx.fillRect(
            ox + c * cellW,
            oy + r * cellH,
            cellW + 0.5,
            cellH + 0.5
          );
        }
      }

      // Boss health bar
      if (e.type === 'boss') {
        const barW = e.size * 1.2;
        const barH = 8;
        const barX = e.x - barW / 2;
        const barY = oy - 15;
        const hpRatio = e.hp / e.maxHp;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        ctx.fillStyle = hpRatio > 0.5 ? CONFIG.colors.green :
                        hpRatio > 0.25 ? CONFIG.colors.gold : CONFIG.colors.red;
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        ctx.strokeStyle = CONFIG.colors.white;
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);
      }
    }

    // Draw ink blobs
    for (const b of inkBlobs) {
      ctx.globalAlpha = b.life;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function killEnemy(e, x, y) {
    e.alive = false;
    const idx = list.indexOf(e);
    if (idx >= 0) list.splice(idx, 1);

    // Ink splatter
    Particles.spawnInkSplatter(x, y, e.color, e.type);

    // Explosion
    Particles.spawnExplosion(x, y, e.type);

    // Sound
    AudioSys.playExplosion(e.type);

    // Medium splits into 2 babies
    if (e.type === 'medium') {
      for (let i = 0; i < 2; i++) {
        const baby = createEnemy('baby', x + (i === 0 ? -20 : 20), y, 1);
        baby.entering = false;
        baby.targetY = y;
        list.push(baby);
      }
    }

    // Boss/small drops powerup
    if (e.type === 'boss' || e.type === 'medium') {
      return { x, y }; // powerup drop position
    }
    return null;
  }

  function getAlive() { return list.filter(e => e.alive); }
  function getInkBlobs() { return inkBlobs; }
  function clear() { list = []; inkBlobs = []; }
  function isEmpty() { return list.filter(e => e.alive).length === 0; }

  // For start screen preview
  function drawPreview(ctx, type, x, y, size) {
    const grid = GRIDS[type];
    const rows = grid.length;
    const cols = grid[0].length;
    const cellW = size / cols;
    const cellH = size / rows;
    const ox = x - size / 2;
    const oy = y - size / 2;
    const color = CONFIG.enemyStats[type].color;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val === 0) continue;
        let c2 = color;
        if (val === 3) c2 = CONFIG.colors.white;
        ctx.fillStyle = c2;
        ctx.fillRect(ox + c * cellW, oy + r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }

  return {
    createEnemy,
    spawnOne,
    spawnWave,
    spawnBoss,
    spawnMiniSwarm,
    update,
    draw,
    killEnemy,
    getAlive,
    getInkBlobs,
    clear,
    isEmpty,
    drawPreview
  };
})();
