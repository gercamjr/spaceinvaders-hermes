/**
 * enemies.js - Pixelated octopus enemy system
 * All octopus types rendered via grid-based fillRect patterns (NOT arcs).
 * Handles wave spawning, movement patterns, boss logic, and ink attacks.
 */

const Enemies = (() => {
  let list = [];
  let inkBlobs = [];
  let enemyLasers = [];
  let frameCount = 0;
  let currentLevel = 1;
  let bossesDestroyed = 0;

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

  // Crabby Squid: 10x6 grid — wide crab body with pincers + squid tentacles
  const CRAB_GRID = [
    [0,0,0,0,1,1,1,1,0,0,0,0],
    [0,1,0,1,1,1,1,1,1,0,1,0],
    [1,1,1,3,1,1,1,3,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,2,1,1,1,1,1,1,2,1,0],
    [0,0,2,1,1,1,1,1,1,2,0,0],
  ];

  // Shielded Drone: 8x8 grid — angular shield shape with core
  const SHIELD_GRID = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,3,3,1,1,0],
    [1,1,3,1,1,3,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,0,1,1,1,1,0,1],
    [0,1,2,0,0,2,1,0],
    [0,0,1,0,0,1,0,0]
  ];

  // Mine Layer: 8x8 grid — round mine-laying ship
  const MINE_GRID = [
    [0,0,0,1,1,0,0,0],
    [0,0,1,3,3,1,0,0],
    [0,1,3,1,1,3,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,2,2,1,1,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,0,0,1,0,0]
  ];

  // Teleporter: 8x8 grid — glitchy/phased shape
  const TELEPORTER_GRID = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,3,3,1,1,0],
    [1,1,3,0,0,3,1,1],
    [1,0,0,1,1,0,0,1],
    [1,0,0,1,1,0,0,1],
    [1,1,0,0,0,0,1,1],
    [0,1,2,0,0,2,1,0],
    [0,0,1,0,0,1,0,0]
  ];

  const GRIDS = {
    small:  SMALL_GRID,
    medium: MEDIUM_GRID,
    baby:   BABY_GRID,
    crab:   CRAB_GRID,
    boss:   BOSS_GRID,
    shield: SHIELD_GRID,
    mine:   MINE_GRID,
    teleporter: TELEPORTER_GRID
  };

  // --- Crabby Squid: separate array for horizontal movers ---
  let crabEnemies = [];
  // --- Dropped mines ---
  let mines = [];

  function createEnemy(type, x, y, level) {
    const stats = CONFIG.enemyStats[type];
    const size = CONFIG.enemySizes[type];
    const lvl = Math.max(level, 1);
    const speedMult = Math.pow(CONFIG.waves.speedScale, Math.min(lvl - 1, 10));
    const hpMult = 1 + (lvl - 1) * 0.15 + bossesDestroyed * 0.15;
    return {
      type,
      x: x || Math.random() * (window.innerWidth - size * 2) + size,
      y: y || -size,
      size,
      hp: stats.hp * hpMult,
      maxHp: stats.hp * hpMult,
      speed: stats.speed * speedMult,
      color: stats.color,
      score: stats.score,
      hitFlash: 0,
      alive: true,
      // Movement
      sineOffset: Math.random() * Math.PI * 2,
      sineAmp: type === 'small' ? 80 : type === 'boss' ? 40 : 50,
      sineFreq: 0.02 + Math.random() * 0.01,
      movePattern: type === 'small' ? 'sine' : type === 'boss' ? 'boss' : type === 'crab' ? 'none' : 'straight',
      // Boss-specific
      phase: 0,
      inkTimer: 0,
      tentacleAngle: 0,
      // Ink shooting (medium)
      shootTimer: 2000 + Math.random() * 2000,
      // Enemy laser shooting
      laserTimer: type === 'small' ? (3000 + Math.random() * 2000) : type === 'medium' ? (2000 + Math.random() * 1000) : 0,
      // Boss laser turrets
      bossLaserTurretTimers: type === 'boss' ? [0, 400, 800] : null,
      // Entry animation
      entering: true,
      targetY: type === 'boss' ? 120 : 60 + Math.random() * 100,
      // Shield-specific
      shieldActive: type === 'shield',
      shieldHealth: type === 'shield' ? 1 : 0,
      // Mine-specific
      mineTimer: type === 'mine' ? (2000 + Math.random() * 2000) : 0,
      // Teleporter-specific
      teleportTimer: type === 'teleporter' ? (3000 + Math.random() * 2000) : 0,
      teleporting: false,
      teleportAlpha: 1,
      teleportPhase: 0
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

  function createEnemyLaser(x, y, vx, vy) {
    enemyLasers.push({
      x, y,
      vx: vx || 0,
      vy: vy || 4,
      radius: 4,
      color: CONFIG.colors.red,
      life: 1,
      damage: 10
    });
  }

  // Enemy formation helpers (exposed for game.js wave counting)
  function getRows(level) {
    return Math.min(3 + Math.floor(level / 2), 8);
  }

  function getCols(level) {
    return Math.min(4 + Math.floor(level / 3), 10);
  }

  // Spawn enemies in a grid-like row formation (Space Invaders style)
  // Each row has the same enemy type; different rows get different types.
  // Rows descend toward the player with sine-wave movement per enemy.
  function spawnWave(level) {
    const rows = getRows(level);
    const cols = getCols(level);
    const hSpacing = 70;
    const vSpacing = 50;
    const formationW = (cols - 1) * hSpacing;
    const formationH = (rows - 1) * vSpacing;
    const startX = window.innerWidth / 2 - formationW / 2;
    // Start formation well above the screen, centered horizontally
    const startY = -100 - formationH / 2;

    // Types per row cycle: medium, small, baby, medium, small, baby, medium, small
    // Extended with new enemy types at higher levels
    const typeCycle = [
      'medium', 'small', 'baby', 'medium', 'small', 'baby', 'medium', 'small',
      ...(level >= 3 ? ['shield'] : []),
      ...(level >= 5 ? ['mine'] : []),
      ...(level >= 7 ? ['teleporter'] : [])
    ];

    for (let row = 0; row < rows; row++) {
      const rowType = typeCycle[row % typeCycle.length];
      const rowY = startY + row * vSpacing;

      for (let col = 0; col < cols; col++) {
        const enemyX = startX + col * hSpacing;
        const enemy = createEnemy(rowType, enemyX, rowY, level);
        // Override targetY so each row enters to its proper formation Y
        enemy.targetY = startY + row * vSpacing;
        list.push(enemy);
      }
    }
  }

  function spawnOne(type, level) {
    const size = CONFIG.enemySizes[type];
    const x = Math.random() * (window.innerWidth - size * 2) + size;
    const enemy = createEnemy(type, x, -size - Math.random() * 100, level);
    list.push(enemy);
  }

  function spawnWaveRandom(level) {
    const count = CONFIG.waves.baseCount + Math.floor(level * CONFIG.waves.countPerLevel);
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      let type;
      if (level >= 7 && r < 0.03) {
        type = 'teleporter';
      } else if (level >= 5 && r < 0.08) {
        type = 'mine';
      } else if (level >= 5 && r < 0.11) {
        type = 'boss';
      } else if (level >= 3 && r < 0.25) {
        type = 'shield';
      } else if (level >= 3 && r < 0.35) {
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

  // --- Crabby Squid: horizontal mover that wraps around ---
  function createCrabEnemy(side) {
    const stats = CONFIG.enemyStats.crab;
    const size = CONFIG.enemySizes.crab;
    const lvl = Math.max(currentLevel, 1);
    const speedMult = Math.pow(CONFIG.waves.speedScale, Math.min(lvl - 1, 10));
    const crabhpmult = 1 + (lvl - 1) * 0.15 + bossesDestroyed * 0.15;
    const y = 100 + Math.random() * (window.innerHeight * 0.6 - 100);
    const direction = side === 'left' ? 1 : -1;
    const x = side === 'left' ? -size : window.innerWidth + size;
    return {
      type: 'crab',
      x,
      y,
      size,
      hp: stats.hp * crabhpmult,
      maxHp: stats.hp * crabhpmult,
      speed: stats.speed * speedMult * direction,
      color: stats.color,
      score: stats.score,
      hitFlash: 0,
      alive: true,
      direction,
      side,
      // Crab shooting (every 2-3 seconds)
      laserTimer: 2000 + Math.random() * 1000,
      // Tentacle animation
      tentWave: 0
    };
  }

  function spawnCrab(side) {
    const crab = createCrabEnemy(side);
    crabEnemies.push(crab);
  }

  function updateCrabs(dt) {
    const dtScale = dt / 16.67;

    for (let i = crabEnemies.length - 1; i >= 0; i--) {
      const c = crabEnemies[i];
      if (!c.alive) continue;

      // Hit flash decay
      if (c.hitFlash > 0) c.hitFlash--;

      // Horizontal movement
      c.x += c.speed * dtScale;

      // Crab laser firing (every 2-3 seconds)
      const levelMult = 1 + (currentLevel - 1) * 0.1;
      c.laserTimer -= dt * levelMult;
      if (c.laserTimer <= 0) {
        createEnemyLaser(c.x, c.y + c.size / 2, 0, 4);
        c.laserTimer = 2000 + Math.random() * 1000;
      }

      // Wrap around: when reaching opposite edge, respawn on starting side at new random y
      if (c.direction === 1 && c.x > window.innerWidth + c.size) {
        c.x = -c.size;
        c.y = 100 + Math.random() * (window.innerHeight * 0.6 - 100);
      } else if (c.direction === -1 && c.x < -c.size) {
        c.x = window.innerWidth + c.size;
        c.y = 100 + Math.random() * (window.innerHeight * 0.6 - 100);
      }
    }
  }

  function drawCrabs(ctx) {
    for (const c of crabEnemies) {
      if (!c.alive) continue;

      const grid = GRIDS.crab;
      const rows = grid.length;
      const cols = grid[0].length;
      const cellW = c.size / cols;
      const cellH = c.size / rows;
      const ox = c.x - c.size / 2;
      const oy = c.y - c.size / 2;

      // Tentacle/leg animation toggle
      const tentWave = Math.floor(frameCount / 8) % 2;

      for (let r = 0; r < rows; r++) {
        for (let cc = 0; cc < cols; cc++) {
          const val = grid[r][cc];
          if (val === 0) continue;

          // Animate tentacle/leg cells (val === 2)
          if (val === 2) {
            const isBottomRows = r >= rows - 3;
            if (tentWave === 1 && isBottomRows && (r + cc) % 2 === 0) continue;
          }

          let color = c.color;
          if (val === 3) color = CONFIG.colors.white; // eyes

          // Hit flash: render white
          if (c.hitFlash > 0) color = CONFIG.colors.white;

          ctx.fillStyle = color;
          ctx.fillRect(
            ox + cc * cellW,
            oy + r * cellH,
            cellW + 0.5,
            cellH + 0.5
          );
        }
      }

      // Crab health bar (always visible)
      const barW = c.size;
      const barH = 4;
      const barX = c.x - barW / 2;
      const barY = oy - 8;
      const hpRatio = c.hp / c.maxHp;

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

  function killCrab(c, x, y) {
    c.alive = false;
    const idx = crabEnemies.indexOf(c);
    if (idx >= 0) crabEnemies.splice(idx, 1);

    // Ink splatter + explosion
    Particles.spawnInkSplatter(x, y, c.color, c.type);
    Particles.spawnExplosion(x, y, c.type);
    AudioSys.playExplosion(c.type);

    // 20% chance to drop powerup
    if (Math.random() < 0.2) {
      return { x, y };
    }
    return null;
  }

  function getCrabEnemies() {
    return crabEnemies.filter(c => c.alive);
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

      // Enemy laser firing with level-scaled difficulty
      const levelMult = 1 + (currentLevel - 1) * 0.1;

      // Small octopus: straight-down laser
      if (e.type === 'small' && !e.entering) {
        e.laserTimer -= dt * levelMult;
        if (e.laserTimer <= 0) {
          createEnemyLaser(e.x, e.y + e.size / 2, 0, 4);
          e.laserTimer = (3000 + Math.random() * 2000) / levelMult;
        }
      }

      // Medium octopus: aimed shot at player position
      if (e.type === 'medium' && !e.entering) {
        e.laserTimer -= dt * levelMult;
        if (e.laserTimer <= 0) {
          const pPos = Player.getPos();
          const tx = pPos ? pPos.x : e.x;
          const ty = pPos ? pPos.y : window.innerHeight - 100;
          const dx = tx - e.x;
          const dy = ty - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const speed = 4.5;
          if (dist > 0) {
            createEnemyLaser(e.x, e.y + e.size / 2, (dx / dist) * speed, (dy / dist) * speed);
          }
          e.laserTimer = (2000 + Math.random() * 1000) / levelMult;
        }
      }

      // Boss: rapid-fire multi-laser turrets
      if (e.type === 'boss' && e.bossLaserTurretTimers && !e.entering) {
        for (let t = 0; t < e.bossLaserTurretTimers.length; t++) {
          e.bossLaserTurretTimers[t] -= dt * levelMult;
          if (e.bossLaserTurretTimers[t] <= 0) {
            // Offset laser x positions across boss width
            const offsets = [-0.3, 0, 0.3];
            const lx = e.x + offsets[t] * e.size;
            const pPos2 = Player.getPos();
            const tx2 = pPos2 ? pPos2.x : e.x;
            const ty2 = pPos2 ? pPos2.y : window.innerHeight - 100;
            const dx2 = tx2 - lx;
            const dy2 = ty2 - e.y;
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            const bSpeed = 5;
            if (dist2 > 0) {
              createEnemyLaser(lx, e.y + e.size / 2, (dx2 / dist2) * bSpeed, (dy2 / dist2) * bSpeed);
            }
            e.bossLaserTurretTimers[t] = (800 + Math.random() * 400) / levelMult;
          }
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

    // Update enemy lasers
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
      const l = enemyLasers[i];
      l.x += l.vx * dtScale;
      l.y += l.vy * dtScale;
      l.life -= (dt / 1000) * 0.15;

      // Spawn particle trail behind each laser
      Particles.spawnEnemyLaserTrail(l.x, l.y);

      if (l.life <= 0 || l.y > window.innerHeight + 20 || l.y < -20 ||
          l.x < -20 || l.x > window.innerWidth + 20) {
        enemyLasers.splice(i, 1);
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

      // Boss health bar + tentacles reaching toward player
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

        // Tentacles reach toward player
        ctx.strokeStyle = CONFIG.colors.purple;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        const playerPos = Player.getPos();
        const tentacleCount = CONFIG.boss.tentacles;
        for (let t = 0; t < tentacleCount; t++) {
          const angle = (t / tentacleCount) * Math.PI * 2 + performance.now() * 0.0005;
          const startX = e.x + Math.cos(angle) * e.size * 0.3;
          const startY = e.y + Math.sin(angle) * e.size * 0.3;
          const endX = startX + Math.cos(angle) * e.size * 0.7;
          const endY = startY + Math.sin(angle) * e.size * 0.7;
          // Reach toward player
          const reachFactor = 0.3;
          const reachX = endX * (1 - reachFactor) + (playerPos ? playerPos.x : endX) * reachFactor;
          const reachY = endY * (1 - reachFactor) + (playerPos ? playerPos.y : endY) * reachFactor;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          // Sinusoidal wave for tentacle feel
          const midX = (startX + reachX) / 2 + Math.sin(performance.now() * 0.003 + t) * 10;
          const midY = (startY + reachY) / 2 + Math.cos(performance.now() * 0.003 + t) * 10;
          ctx.quadraticCurveTo(midX, midY, reachX, reachY);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
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

    // Draw enemy lasers (red glow with trail)
    for (const l of enemyLasers) {
      ctx.save();
      ctx.globalAlpha = l.life;
      // Glow
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = l.color;
      ctx.fillRect(l.x - l.radius, l.y - l.radius, l.radius * 2, l.radius * 2);
      // Trail
      ctx.shadowBlur = 0;
      ctx.globalAlpha = l.life * 0.3;
      ctx.fillRect(l.x - l.radius * 0.6, l.y - l.radius * 0.6, l.radius * 1.2, l.radius * 3);
      // Bright core
      ctx.globalAlpha = l.life * 0.9;
      ctx.fillStyle = CONFIG.colors.orange;
      ctx.fillRect(l.x - 1, l.y - 1, 2, 2);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  function killEnemy(e, x, y) {
    e.alive = false;
    const idx = list.indexOf(e);
    if (idx >= 0) list.splice(idx, 1);

    // Track boss kills to scale enemy health
    if (e.type === 'boss') {
      bossesDestroyed++;
    }

    // Ink splatter
    Particles.spawnInkSplatter(x, y, e.color, e.type);

    // Explosion
    Particles.spawnExplosion(x, y, e.type);

    // Sound
    AudioSys.playExplosion(e.type);

    // Medium splits into 2 babies
    if (e.type === 'medium') {
      for (let i = 0; i < 2; i++) {
        const baby = createEnemy('baby', x + (i === 0 ? -20 : 20), y, 0);
        baby.entering = false;
        baby.targetY = y;
        baby.speed *= 1.5;
        list.push(baby);
      }
    }

    // Boss/medium drops powerup
    if (e.type === 'boss') {
      return { x, y };
    }
    return null;
  }

  // Track medium kills for powerup drop (1 in 15 before level 10, 1 in 25 after)
  let mediumKillsSinceDrop = 0;
  function recordMediumKill() {
    mediumKillsSinceDrop++;
    const threshold = currentLevel > 10 ? 25 : 15;
    if (mediumKillsSinceDrop >= threshold) {
      mediumKillsSinceDrop = 0;
      return true;
    }
    return false;
  }

  function getAlive() { return list.filter(e => e.alive); }
  function getInkBlobs() { return inkBlobs; }
  function getEnemyLasers() { return enemyLasers; }
  function setLevel(lvl) { currentLevel = lvl; }
  function resetAll() { list = []; inkBlobs = []; enemyLasers = []; crabEnemies = []; mediumKillsSinceDrop = 0; bossesDestroyed = 0; currentLevel = 1; }
  function clear() { list = []; inkBlobs = []; enemyLasers = []; crabEnemies = []; }
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
    spawnWaveRandom,
    spawnBoss,
    spawnMiniSwarm,
    createCrabEnemy,
    spawnCrab,
    recordMediumKill,
    updateCrabs,
    drawCrabs,
    killCrab,
    getCrabEnemies,
    getRows,
    getCols,
    update,
    draw,
    killEnemy,
    getAlive,
    getInkBlobs,
    getEnemyLasers,
    setLevel,
    resetAll,
    clear,
    isEmpty,
    drawPreview
  };
})();
