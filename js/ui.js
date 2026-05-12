/**
 * ui.js - HUD, start screen, game over screen, score display
 * Handles all UI rendering: health bar, score, level, combo counter,
 * start/gameover screens, and pause overlay.
 * Fonts scale dynamically based on canvas width for mobile.
 */

const UI = (() => {

  // Helper: compute a font size proportional to canvas width
  function scaledFontSize(base) {
    const canvas = document.getElementById('gameCanvas');
    const width = canvas ? canvas.width : window.innerWidth;
    // Ratio: 20px at 960px reference width
    return Math.max(10, Math.floor(base * (width / 960)));
  }

  function drawHUD(ctx, score, level, combo, health, maxHealth, unleashActive, unleashEnd, now) {
    const baseFont = CONFIG.hud.fontSize;
    ctx.font = `${scaledFontSize(baseFont)}px monospace`;
    ctx.textBaseline = 'top';

    const pad = Math.max(10, scaledFontSize(CONFIG.hud.padding * 0.6));
    const y = scaledFontSize(CONFIG.hud.y);

    // Score - top left
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.colors.cyan;
    ctx.fillText(`SCORE: ${score}`, pad, y);

    // Level - top center
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.gold;
    ctx.fillText(`LEVEL ${level}`, ctx.canvas.width / 2, y);

    // Combo - top right
    if (combo > 1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = CONFIG.colors.pink;
      ctx.fillText(`COMBO x${combo}`, ctx.canvas.width - pad, y);
    }

    // Health bar - bottom center
    const barW = Math.min(scaledFontSize(CONFIG.hud.healthBarWidth), ctx.canvas.width - pad * 2);
    const barH = scaledFontSize(CONFIG.hud.healthBarHeight);
    const barX = ctx.canvas.width / 2 - barW / 2;
    const barY = ctx.canvas.height - scaledFontSize(40);
    const hpRatio = health / maxHealth;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    // Health fill
    ctx.fillStyle = hpRatio > 0.5 ? CONFIG.colors.green :
                    hpRatio > 0.25 ? CONFIG.colors.gold : CONFIG.colors.red;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    // Border
    ctx.strokeStyle = CONFIG.colors.white;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Health text
    ctx.font = `${scaledFontSize(14)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText(`${Math.ceil(health)} / ${maxHealth}`, ctx.canvas.width / 2, barY - scaledFontSize(16));

    // Unleash indicator
    if (unleashActive) {
      const remaining = Math.max(0, (unleashEnd - now) / 1000);
      ctx.font = `${scaledFontSize(16)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = CONFIG.colors.white;
      ctx.fillText(`UNLEASH: ${remaining.toFixed(1)}s`, ctx.canvas.width / 2, barY + barH + scaledFontSize(8));
    }
  }

  function drawStartScreen(ctx) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;
    const w = ctx.canvas.width;

    // Scale title and subtitle
    const titleSize = scaledFontSize(48);
    const subSize = scaledFontSize(16);
    const controlsSize = scaledFontSize(14);
    const startSize = scaledFontSize(24);
    const previewSize = scaledFontSize(50);

    // Title with pulsing glow
    const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.5;
    ctx.save();
    ctx.shadowColor = CONFIG.colors.cyan;
    ctx.shadowBlur = 20 + pulse * 20;

    ctx.font = `${titleSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.cyan;

    // Adjust vertical positions based on screen height
    const titleCy = Math.min(cy - 180, cy * 0.35);
    ctx.fillText('OCTOPUS INVADERS', cx, titleCy);

    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = `${subSize}px monospace`;
    ctx.fillStyle = CONFIG.colors.pink;
    ctx.fillText('A Space Shooter', cx, titleCy + titleSize);

    // Octopus previews
    const types = ['small', 'medium', 'baby', 'crab', 'boss'];
    const labels = ['Small', 'Medium', 'Baby', 'Crabby', 'BOSS'];
    const totalPreviewWidth = types.length * (previewSize + scaledFontSize(20));
    const startX = Math.max(scaledFontSize(10), cx - totalPreviewWidth / 2);

    for (let i = 0; i < types.length; i++) {
      const px = startX + i * (previewSize + scaledFontSize(20)) + previewSize / 2;
      const py = titleCy + titleSize * 2 + previewSize;
      // Only draw previews if there's room (avoid offscreen on very small devices)
      if (py + previewSize < ctx.canvas.height - scaledFontSize(60)) {
        Enemies.drawPreview(ctx, types[i], px, py, previewSize);

        ctx.font = `${scaledFontSize(12)}px monospace`;
        ctx.fillStyle = CONFIG.enemyStats[types[i]].color;
        ctx.fillText(labels[i], px, py + previewSize / 2 + scaledFontSize(14));
      }
    }

    // Controls text — different message on mobile
    ctx.font = `${controlsSize}px monospace`;
    ctx.fillStyle = CONFIG.colors.white;
    const controlsText = isMobile()
      ? 'Touch & drag to move | Auto-fire'
      : 'Mouse to move | Click to shoot | ESC to pause';
    ctx.fillText(controlsText, cx, ctx.canvas.height - scaledFontSize(80));

    // Click to start
    const blink = Math.sin(performance.now() * 0.005) > 0;
    if (blink) {
      ctx.font = `${startSize}px monospace`;
      ctx.fillStyle = CONFIG.colors.gold;
      const tapText = isMobile() ? 'TAP TO START' : 'CLICK TO START';
      ctx.fillText(tapText, cx, ctx.canvas.height - scaledFontSize(36));
    }

    ctx.restore();
  }

  function drawGameOverScreen(ctx, score, level, enemiesKilled) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    const titleSize = scaledFontSize(48);
    const statSize = scaledFontSize(22);
    const restartSize = scaledFontSize(24);

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Game over title
    ctx.save();
    ctx.shadowColor = CONFIG.colors.red;
    ctx.shadowBlur = 20;

    ctx.font = `${titleSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.red;
    ctx.fillText('GAME OVER', cx, cy - titleSize * 2);

    ctx.shadowBlur = 0;

    // Stats
    ctx.font = `${statSize}px monospace`;
    ctx.fillStyle = CONFIG.colors.white;
    const lineH = statSize * 1.5;
    ctx.fillText(`Final Score: ${score}`, cx, cy - titleSize * 0.5);
    ctx.fillText(`Level Reached: ${level}`, cx, cy - titleSize * 0.5 + lineH);
    ctx.fillText(`Enemies Killed: ${enemiesKilled}`, cx, cy - titleSize * 0.5 + lineH * 2);

    // Restart
    const blink = Math.sin(performance.now() * 0.005) > 0;
    if (blink) {
      ctx.font = `${restartSize}px monospace`;
      ctx.fillStyle = CONFIG.colors.gold;
      const restartText = isMobile() ? 'TAP TO RESTART' : 'CLICK TO RESTART';
      ctx.fillText(restartText, cx, cy - titleSize * 0.5 + lineH * 3.5);
    }

    ctx.restore();
  }

  function drawPauseScreen(ctx) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.font = `${scaledFontSize(36)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.cyan;
    ctx.fillText('PAUSED', cx, cy - scaledFontSize(18));

    ctx.font = `${scaledFontSize(18)}px monospace`;
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText('Press ESC to resume', cx, cy + scaledFontSize(22));
  }

  return {
    drawHUD,
    drawStartScreen,
    drawGameOverScreen,
    drawPauseScreen
  };
})();
