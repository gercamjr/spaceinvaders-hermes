/**
 * background.js - 4-layer parallax scrolling background
 * Stars (slow), nebula clouds (medium), planets (depth variation),
 * comets (diagonal streaks). All scroll DOWNWARD for vertical shooter.
 * Reacts to mouse position for depth feel.
 */

const Background = (() => {
  let stars = [];
  let nebulae = [];
  let planets = [];
  let comets = [];
  let mouseX = 0;
  let mouseY = 0;
  let lastCometTime = 0;

  function setMouse(x, y) {
    mouseX = x;
    mouseY = y;
  }

  function init() {
    stars = [];
    nebulae = [];
    planets = [];
    comets = [];

    // Stars - small dots, slow
    for (let i = 0; i < CONFIG.background.starCount; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.15 + Math.random() * 0.3,
        brightness: 0.3 + Math.random() * 0.7,
        depth: 0.1 + Math.random() * 0.3
      });
    }

    // Nebulae - transparent clouds
    for (let i = 0; i < CONFIG.background.nebulaCount; i++) {
      const hue = Math.random() * 360;
      nebulae.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 80 + Math.random() * 120,
        speed: 0.2 + Math.random() * 0.3,
        color: `hsla(${hue}, 70%, 50%, 0.06)`,
        depth: 0.2 + Math.random() * 0.3
      });
    }

    // Planets - mix of far (small/dim/slow) and near (large/bright/fast)
    for (let i = 0; i < CONFIG.background.planetCount; i++) {
      const isFar = Math.random() > 0.5;
      const hue = Math.random() * 360;
      planets.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: isFar ? 10 + Math.random() * 20 : 30 + Math.random() * 50,
        speed: isFar ? 0.1 + Math.random() * 0.15 : 0.4 + Math.random() * 0.5,
        opacity: isFar ? 0.2 + Math.random() * 0.25 : 0.7 + Math.random() * 0.3,
        color: `hsl(${hue}, 60%, ${isFar ? 30 : 50}%)`,
        depth: isFar ? 0.05 + Math.random() * 0.1 : 0.3 + Math.random() * 0.4,
        hasRing: Math.random() > 0.7
      });
    }
  }

  function update(dt) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const mx = (mouseX - cx) / cx;
    const my = (mouseY - cy) / cy;

    // Update stars
    for (const s of stars) {
      s.y += s.speed * (dt / 16);
      s.x += mx * s.depth * 0.5;
      if (s.y > window.innerHeight + 5) {
        s.y = -5;
        s.x = Math.random() * window.innerWidth;
      }
    }

    // Update nebulae
    for (const n of nebulae) {
      n.y += n.speed * (dt / 16);
      n.x += mx * n.depth * 0.8;
      if (n.y > window.innerHeight + n.radius) {
        n.y = -n.radius;
        n.x = Math.random() * window.innerWidth;
      }
    }

    // Update planets
    for (const p of planets) {
      p.y += p.speed * (dt / 16);
      p.x += mx * p.depth * 1.2;
      if (p.y > window.innerHeight + p.radius + 20) {
        p.y = -p.radius - 20;
        p.x = Math.random() * window.innerWidth;
      }
    }

    // Spawn comets
    const now = performance.now();
    if (now - lastCometTime > CONFIG.background.cometInterval) {
      comets.push({
        x: Math.random() * window.innerWidth,
        y: -50,
        vx: (Math.random() - 0.5) * 3,
        vy: 4 + Math.random() * 4,
        length: 60 + Math.random() * 80,
        life: 1,
        depth: 0.3 + Math.random() * 0.4
      });
      lastCometTime = now;
    }

    // Update comets
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.x += (c.vx + mx * c.depth) * (dt / 16);
      c.y += c.vy * (dt / 16);
      c.life -= 0.005 * (dt / 16);
      if (c.life <= 0 || c.y > window.innerHeight + c.length) {
        comets.splice(i, 1);
      }
    }
  }

  function draw(ctx) {
    // Background fill
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Stars
    for (const s of stars) {
      ctx.globalAlpha = s.brightness;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Nebulae
    for (const n of nebulae) {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(n.x - n.radius, n.y - n.radius, n.radius * 2, n.radius * 2);
    }

    // Planets
    for (const p of planets) {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Planet shading
      const shade = ctx.createRadialGradient(
        p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.1,
        p.x, p.y, p.radius
      );
      shade.addColorStop(0, 'rgba(255,255,255,0.15)');
      shade.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ring
      if (p.hasRing) {
        ctx.strokeStyle = `rgba(255,255,255,${p.opacity * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.radius * 1.6, p.radius * 0.3, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Comets
    for (const c of comets) {
      ctx.globalAlpha = c.life * 0.8;
      // Tail
      const tailGrad = ctx.createLinearGradient(
        c.x, c.y,
        c.x - c.vx * c.length * 0.3, c.y - c.vy * c.length * 0.3
      );
      tailGrad.addColorStop(0, 'rgba(200, 230, 255, 0.8)');
      tailGrad.addColorStop(1, 'rgba(200, 230, 255, 0)');
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(
        c.x - c.vx * c.length * 0.3,
        c.y - c.vy * c.length * 0.3
      );
      ctx.stroke();

      // Head
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return { init, setMouse, update, draw };
})();
