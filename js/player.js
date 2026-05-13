/**
 * player.js - Player ship rendering, mouse tracking, weapons, upgrade tiers
 * Pixel art stealth fighter (F-117 style) with 4 upgrade tiers.
 * Handles mouse lerp tracking, engine trail spawning, and weapon firing.
 */

const Player = (() => {
  let ship = null;

  // Ship pixel grid - angular stealth fighter (10x10)
  // 0=empty, 1=body, 2=thruster, 3=edge glow
  const TIER1_GRID = [
    [0,0,0,0,3,3,0,0,0,0],
    [0,0,0,3,1,1,3,0,0,0],
    [0,0,3,1,1,1,1,3,0,0],
    [0,3,1,1,1,1,1,1,3,0],
    [3,1,1,1,1,1,1,1,1,3],
    [3,1,1,1,1,1,1,1,1,3],
    [0,3,1,1,1,1,1,1,3,0],
    [0,0,3,1,1,1,1,3,0,0],
    [0,0,0,3,2,2,3,0,0,0],
    [0,0,0,0,2,2,0,0,0,0]
  ];

  const TIER2_GRID = [
    [0,0,0,0,3,3,0,0,0,0],
    [0,0,0,3,1,1,3,0,0,0],
    [0,0,3,1,1,1,1,3,0,0],
    [0,3,1,1,1,1,1,1,3,0],
    [3,1,1,1,1,1,1,1,1,3],
    [3,1,1,1,1,1,1,1,1,3],
    [0,3,1,1,1,1,1,1,3,0],
    [0,0,3,1,0,0,1,3,0,0],
    [0,0,0,3,2,2,3,0,0,0],
    [0,0,0,0,2,2,0,0,0,0]
  ];

  const TIER3_GRID = [
    [0,0,0,0,3,3,0,0,0,0],
    [0,0,0,3,1,1,3,0,0,0],
    [0,0,3,1,1,1,1,3,0,0],
    [0,3,1,1,1,1,1,1,3,0],
    [3,1,1,1,1,1,1,1,1,3],
    [3,1,1,1,1,1,1,1,1,3],
    [0,3,1,1,1,1,1,1,3,0],
    [0,0,3,1,0,0,1,3,0,0],
    [0,0,0,3,2,2,3,0,0,0],
    [0,0,0,0,2,2,0,0,0,0]
  ];

  const TIER4_GRID = [
    [0,0,0,0,3,3,0,0,0,0],
    [0,0,0,3,1,1,3,0,0,0],
    [0,0,3,1,1,1,1,3,0,0],
    [0,3,1,1,1,1,1,1,3,0],
    [3,1,1,1,1,1,1,1,1,3],
    [3,1,1,1,1,1,1,1,1,3],
    [0,3,1,1,1,1,1,1,3,0],
    [0,0,3,1,0,0,1,3,0,0],
    [0,0,0,3,3,3,3,0,0,0],
    [0,0,0,0,3,3,0,0,0,0]
  ];

  const TIER_GRIDS = [TIER1_GRID, TIER2_GRID, TIER3_GRID, TIER4_GRID];

  const TIER_COLORS = [
    CONFIG.colors.cyan,    // tier 1: cyan glow
    CONFIG.colors.green,   // tier 2: green glow
    CONFIG.colors.gold,    // tier 3: gold glow
    CONFIG.colors.white    // tier 4: white glow
  ];

  const TIER_SIZES = [36, 42, 48, 54]; // ship grows with upgrades

  // Ship skins: configurable glow colors
  const SKIN_COLORS = {
    default:    CONFIG.colors.cyan,     // cyan glow
    neon_green: CONFIG.colors.green,    // green glow
    gold:       CONFIG.colors.gold,     // gold glow
    rainbow:    null                    // special rainbow shimmer
  };

  // Upgrade defaults
  let upgrades = {
    doubleShot: false,
    rapidFire: false,
    speedBoost: false,
    healthBoost: false
  };

  function init() {
    ship = {
      x: window.innerWidth / 2,
      y: window.innerHeight - 100,
      radius: CONFIG.player.radius,
      tier: 1,
      health: CONFIG.player.maxHealth,
      maxHealth: CONFIG.player.maxHealth,
      lastShot: 0,
      mouseX: window.innerWidth / 2,
      mouseY: window.innerHeight - 100,
      tilt: 0,
      unleashActive: false,
      unleashEnd: 0,
      alive: true,
      invulnTimer: 0
    };
    applyUpgrades();
  }

  function applyUpgrades() {
    if (!ship) return;
    const purchased = SaveManager.get('purchasedUpgrades');
    upgrades.doubleShot = !!purchased['doubleShot'];
    upgrades.rapidFire = !!purchased['rapidFire'];
    upgrades.speedBoost = !!purchased['speedBoost'];
    upgrades.healthBoost = !!purchased['healthBoost'];

    // Apply health boost
    if (upgrades.healthBoost) {
      ship.maxHealth += 25;
      if (ship.health === CONFIG.player.maxHealth) {
        ship.health = ship.maxHealth;
      } else {
        ship.health = Math.min(ship.health + 25, ship.maxHealth);
      }
    }
    // Apply speed boost
    if (upgrades.speedBoost) {
      ship.lerpFactor = 0.55;
    } else {
      ship.lerpFactor = CONFIG.player.lerpFactor;
    }
  }

  function getSkinColor() {
    const skin = SaveManager.get('selectedSkin') || 'default';
    if (skin === 'default') return CONFIG.colors.cyan;
    if (skin === 'neon_green') return CONFIG.colors.green;
    if (skin === 'gold') return CONFIG.colors.gold;
    return CONFIG.colors.cyan;
  }

  function isRainbowSkin() {
    return SaveManager.get('selectedSkin') === 'rainbow';
  }
  function setMouse(x, y) {
    if (ship) {
      ship.mouseX = x;
      ship.mouseY = y;
    }
  }

  function update(dt, now) {
    if (!ship || !ship.alive) return;

    const dtScale = dt / 16.67;

    if (ship.invulnTimer > 0) {
      ship.invulnTimer -= dt;
    }

    // Lerp mouse tracking
    const prevX = ship.x;
    ship.x += (ship.mouseX - ship.x) * CONFIG.player.lerpFactor;
    ship.y += (ship.mouseY - ship.y) * CONFIG.player.lerpFactor;

    // Tilt based on horizontal movement
    const dx = ship.x - prevX;
    ship.tilt += (Math.max(-8, Math.min(8, dx * 0.5)) - ship.tilt) * 0.3;

    // Clamp to screen
    const halfSize = TIER_SIZES[ship.tier - 1] / 2;
    ship.x = Math.max(halfSize, Math.min(window.innerWidth - halfSize, ship.x));
    ship.y = Math.max(halfSize, Math.min(window.innerHeight - halfSize, ship.y));

    // Engine trails
    const gridSize = 10;
    const cellSize = TIER_SIZES[ship.tier - 1] / gridSize;
    // Spawn trails from thruster positions (bottom center)
    const thrusterX1 = ship.x - cellSize * 0.5;
    const thrusterX2 = ship.x + cellSize * 0.5;
    const thrusterY = ship.y + TIER_SIZES[ship.tier - 1] / 2;
    Particles.spawnEngineTrail(thrusterX1, thrusterY);
    Particles.spawnEngineTrail(thrusterX2, thrusterY);

    // Unleash timer
    if (ship.unleashActive && now > ship.unleashEnd) {
      ship.unleashActive = false;
      AudioSys.stopUnleashDrone();
    }
  }

  function canShoot(now) {
    if (!ship || !ship.alive) return false;
    const rate = ship.unleashActive ? CONFIG.player.fireRate * 0.4 : CONFIG.player.fireRate;
    return now - ship.lastShot >= rate;
  }

  function shoot(now) {
    if (!ship || !ship.alive || !canShoot(now)) return [];
    ship.lastShot = now;
    AudioSys.playLaser();

    const bullets = [];
    const speed = CONFIG.bulletSpeeds[ship.tier - 1];
    const tier = ship.tier;
    const color = TIER_COLORS[tier - 1];

    if (ship.unleashActive) {
      // Massive spread during unleash
      for (let i = -3; i <= 3; i++) {
        bullets.push({
          x: ship.x,
          y: ship.y - TIER_SIZES[tier - 1] / 2,
          vx: i * 1.5,
          vy: -speed * 1.3,
          width: 4,
          height: 12,
          color: CONFIG.colors.white,
          damage: 20,
          tier: 'unleash'
        });
      }
    } else if (tier === 1) {
      bullets.push({
        x: ship.x,
        y: ship.y - TIER_SIZES[0] / 2,
        vx: 0,
        vy: -speed,
        width: 3,
        height: 10,
        color: color,
        damage: 10,
        tier: tier
      });
    } else if (tier === 2) {
      for (let i = -1; i <= 1; i += 2) {
        bullets.push({
          x: ship.x + i * 8,
          y: ship.y - TIER_SIZES[1] / 2,
          vx: i * 0.5,
          vy: -speed,
          width: 3,
          height: 10,
          color: color,
          damage: 10,
          tier: tier
        });
      }
    } else if (tier === 3) {
      for (let i = -1; i <= 1; i++) {
        bullets.push({
          x: ship.x + i * 10,
          y: ship.y - TIER_SIZES[2] / 2,
          vx: i * 1,
          vy: -speed,
          width: 3,
          height: 12,
          color: color,
          damage: 12,
          tier: tier
        });
      }
    } else {
      // Tier 4: homing + spread
      for (let i = -1; i <= 1; i++) {
        bullets.push({
          x: ship.x + i * 12,
          y: ship.y - TIER_SIZES[3] / 2,
          vx: i * 1.5,
          vy: -speed,
          width: 4,
          height: 14,
          color: color,
          damage: 15,
          tier: tier,
          homing: true
        });
      }
    }

    return bullets;
  }

  function activateUnleash(now) {
    if (!ship) return;
    ship.unleashActive = true;
    ship.unleashEnd = now + CONFIG.player.unleashDuration;
    AudioSys.startUnleashDrone();
    Particles.spawnPowerupSparkle(ship.x, ship.y);
  }

  function takeDamage(amount) {
    if (!ship || !ship.alive || ship.invulnTimer > 0) return;
    ship.health -= amount;
    ship.invulnTimer = 500; 
    if (ship.health <= 0) {
      ship.health = 0;
      ship.alive = false;
    }
  }

  function upgrade() {
    if (!ship || ship.tier >= 4) return;
    ship.tier++;
    ship.maxHealth += 25;
    ship.health = Math.min(ship.health + 25, ship.maxHealth);
  }

  function draw(ctx) {
    if (!ship || !ship.alive) return;

    // Blinking effect during invulnerability
    if (ship.invulnTimer > 0) {
      ctx.globalAlpha = Math.floor(ship.invulnTimer / 50) % 2 === 0 ? 0.4 : 1;
    }

    const tier = ship.tier;
    const grid = TIER_GRIDS[tier - 1];
    const size = TIER_SIZES[tier - 1];
    const rows = grid.length;
    const cols = grid[0].length;
    const cellW = size / cols;
    const cellH = size / rows;
    const ox = ship.x - size / 2;
    const oy = ship.y - size / 2;

    const glowColor = TIER_COLORS[tier - 1];

    // Tilt transform
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.tilt * Math.PI / 180);
    ctx.translate(-ship.x, -ship.y);

    // Unleash glow
    if (ship.unleashActive) {
      ctx.shadowColor = CONFIG.colors.white;
      ctx.shadowBlur = 20;
    } else {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val === 0) continue;

        let color;
        if (val === 1) {
          color = CONFIG.colors.gunmetal;
        } else if (val === 2) {
          color = Math.random() > 0.5 ? CONFIG.colors.orange : CONFIG.colors.yellow;
        } else {
          color = ship.unleashActive ? CONFIG.colors.white : glowColor;
        }

        // Tier 4 rainbow shimmer on edges
        if (val === 3 && tier === 4) {
          const hue = (performance.now() * 0.1 + c * 30) % 360;
          color = `hsl(${hue}, 100%, 70%)`;
        }

        ctx.fillStyle = color;
        ctx.fillRect(
          ox + c * cellW,
          oy + r * cellH,
          cellW + 0.5,
          cellH + 0.5
        );
      }
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();

    // Unleash countdown ring
    if (ship.unleashActive) {
      const remaining = (ship.unleashEnd - performance.now()) / CONFIG.player.unleashDuration;
      ctx.strokeStyle = CONFIG.colors.green;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, size / 2 + 8, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
      ctx.stroke();
    }
  }

  function getPos() { return ship ? { x: ship.x, y: ship.y } : null; }
  function getHealth() { return ship ? ship.health : 0; }
  function getMaxHealth() { return ship ? ship.maxHealth : 0; }
  function isAlive() { return ship && ship.alive; }
  function isUnleashing() { return ship && ship.unleashActive; }
  function getTier() { return ship ? ship.tier : 1; }
  function getRadius() { return ship ? ship.radius : 0; }
  function getInvulnTimer() { return ship ? ship.invulnTimer : 0; }
  function reset() { init(); }

  return {
    init,
    setMouse,
    update,
    shoot,
    activateUnleash,
    takeDamage,
    upgrade,
    draw,
    getPos,
    getHealth,
    getMaxHealth,
    isAlive,
    isUnleashing,
    getTier,
    getRadius,
    getInvulnTimer,
    reset
  };
})();
