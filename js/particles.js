/**
 * particles.js - Particle system for all visual effects
 * Handles: explosions, ink splatter, engine trails, bullet trails,
 * spark impacts, powerup sparkles, and floating damage numbers.
 */

const Particles = (() => {
  let pool = [];

  function create(x, y, opts = {}) {
    pool.push({
      x, y,
      vx: opts.vx || (Math.random() - 0.5) * 4,
      vy: opts.vy || (Math.random() - 0.5) * 4,
      life: opts.life || 1,
      maxLife: opts.life || 1,
      size: opts.size || 3,
      color: opts.color || CONFIG.colors.white,
      gravity: opts.gravity || 0,
      friction: opts.friction || 0.98,
      type: opts.type || 'normal',
      text: opts.text || '',
      fontSize: opts.fontSize || 16,
      ...opts
    });
  }

  function update(dt) {
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.life -= dt / 1000;
      if (p.life <= 0) {
        pool.splice(i, 1);
        continue;
      }
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'damage') {
        p.vy = -1.5; // float upward
        p.friction = 0.99;
      }
    }
  }

  function draw(ctx) {
    for (const p of pool) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.type === 'damage') {
        ctx.font = `${p.fontSize}px monospace`;
        ctx.fillStyle = p.color;
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.type === 'trail') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * alpha + 1, p.size * alpha + 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- Preset spawners ---

  function spawnExplosion(x, y, size = 'small') {
    const count = size === 'boss' ? 60 : size === 'medium' ? 30 : 15;
    const spread = size === 'boss' ? 8 : size === 'medium' ? 5 : 3;

    // Green core burst
    for (let i = 0; i < count * 0.4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * spread;
      create(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        size: 2 + Math.random() * 3,
        color: CONFIG.colors.green,
        friction: 0.95
      });
    }

    // Rainbow scattered particles
    for (let i = 0; i < count * 0.6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * spread * 1.2;
      const color = CONFIG.colors.rainbow[Math.floor(Math.random() * CONFIG.colors.rainbow.length)];
      create(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.6,
        size: 1 + Math.random() * 2,
        color,
        friction: 0.96
      });
    }
  }

  function spawnInkSplatter(x, y, color, size = 'small') {
    const count = size === 'boss' ? 40 : size === 'medium' ? 20 : 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (size === 'boss' ? 6 : 3);
      create(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.8,
        size: 2 + Math.random() * 4,
        color,
        gravity: 0.05,
        friction: 0.94
      });
    }
  }

  function spawnEngineTrail(x, y) {
    create(x, y, {
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1 + Math.random() * 2,
      life: 0.2 + Math.random() * 0.2,
      size: 1 + Math.random() * 2,
      color: Math.random() > 0.5 ? CONFIG.colors.orange : CONFIG.colors.yellow,
      friction: 0.95,
      type: 'trail'
    });
  }

  function spawnBulletTrail(x, y, color) {
    create(x, y, {
      vx: (Math.random() - 0.5) * 0.3,
      vy: Math.random() * 0.5,
      life: 0.15,
      size: 1.5,
      color,
      friction: 0.9,
      type: 'trail'
    });
  }

  function spawnSparks(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      create(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.2,
        size: 1 + Math.random() * 1.5,
        color: Math.random() > 0.5 ? CONFIG.colors.white : CONFIG.colors.yellow,
        friction: 0.92
      });
    }
  }

  function spawnDamageNumber(x, y, amount) {
    create(x, y, {
      vx: 0,
      vy: 0,
      life: 1,
      maxLife: 1,
      size: 0,
      color: CONFIG.colors.yellow,
      type: 'damage',
      text: `-${amount}`,
      fontSize: 16
    });
  }

  function spawnPowerupSparkle(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      create(x, y, {
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 0.5,
        size: 2,
        color: CONFIG.colors.gold,
        friction: 0.95
      });
    }
  }

  function clear() {
    pool = [];
  }

  return {
    create,
    update,
    draw,
    spawnExplosion,
    spawnInkSplatter,
    spawnEngineTrail,
    spawnBulletTrail,
    spawnSparks,
    spawnDamageNumber,
    spawnPowerupSparkle,
    clear
  };
})();
