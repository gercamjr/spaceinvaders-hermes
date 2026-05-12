/**
 * ui.js - HUD, start screen, game over screen, score display
 * Handles all UI rendering: health bar, score, level, combo counter,
 * start/gameover screens, and pause overlay.
 */

const UI = (() => {
  function drawHUD(ctx, score, level, combo, health, maxHealth, unleashActive, unleashEnd, now) {
    const font = CONFIG.hud.font;
    ctx.font = font;
    ctx.textBaseline = 'top';

    // Score - top left
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.colors.cyan;
    ctx.fillText(`SCORE: ${score}`, CONFIG.hud.padding, CONFIG.hud.y);

    // Level - top center
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.gold;
    ctx.fillText(`LEVEL ${level}`, ctx.canvas.width / 2, CONFIG.hud.y);

    // Combo - top right
    if (combo > 1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = CONFIG.colors.pink;
      ctx.fillText(`COMBO x${combo}`, ctx.canvas.width - CONFIG.hud.padding, CONFIG.hud.y);
    }

    // Health bar - bottom center
    const barW = CONFIG.hud.healthBarWidth;
    const barH = CONFIG.hud.healthBarHeight;
    const barX = ctx.canvas.width / 2 - barW / 2;
    const barY = ctx.canvas.height - 40;
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
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText(`${Math.ceil(health)} / ${maxHealth}`, ctx.canvas.width / 2, barY - 16);

    // Unleash indicator
    if (unleashActive) {
      const remaining = Math.max(0, (unleashEnd - now) / 1000);
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = CONFIG.colors.white;
      ctx.fillText(`UNLEASH: ${remaining.toFixed(1)}s`, ctx.canvas.width / 2, barY + barH + 8);
    }
  }

  function drawStartScreen(ctx) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    // Title with pulsing glow
    const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.5;
    ctx.save();
    ctx.shadowColor = CONFIG.colors.cyan;
    ctx.shadowBlur = 20 + pulse * 20;

    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.cyan;
    ctx.fillText('OCTOPUS INVADERS', cx, cy - 180);

    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = '16px monospace';
    ctx.fillStyle = CONFIG.colors.pink;
    ctx.fillText('A Space Shooter', cx, cy - 140);

    // Octopus previews
    const previewSize = 50;
    const types = ['small', 'medium', 'baby', 'boss'];
    const labels = ['Small', 'Medium', 'Baby', 'BOSS'];
    const startX = cx - (types.length * (previewSize + 20)) / 2;

    for (let i = 0; i < types.length; i++) {
      const px = startX + i * (previewSize + 20) + previewSize / 2;
      const py = cy - 40;
      Enemies.drawPreview(ctx, types[i], px, py, previewSize);

      ctx.font = '12px monospace';
      ctx.fillStyle = CONFIG.enemyStats[types[i]].color;
      ctx.fillText(labels[i], px, py + previewSize / 2 + 14);
    }

    // Controls
    ctx.font = '14px monospace';
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText('Mouse to move | Click to shoot | ESC to pause', cx, cy + 60);

    // Click to start
    const blink = Math.sin(performance.now() * 0.005) > 0;
    if (blink) {
      ctx.font = '24px monospace';
      ctx.fillStyle = CONFIG.colors.gold;
      ctx.fillText('CLICK TO START', cx, cy + 130);
    }

    ctx.restore();
  }

  function drawGameOverScreen(ctx, score, level, enemiesKilled) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Game over title
    ctx.save();
    ctx.shadowColor = CONFIG.colors.red;
    ctx.shadowBlur = 20;

    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.red;
    ctx.fillText('GAME OVER', cx, cy - 100);

    ctx.shadowBlur = 0;

    // Stats
    ctx.font = '22px monospace';
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText(`Final Score: ${score}`, cx, cy - 30);
    ctx.fillText(`Level Reached: ${level}`, cx, cy + 5);
    ctx.fillText(`Enemies Killed: ${enemiesKilled}`, cx, cy + 40);

    // Restart
    const blink = Math.sin(performance.now() * 0.005) > 0;
    if (blink) {
      ctx.font = '24px monospace';
      ctx.fillStyle = CONFIG.colors.gold;
      ctx.fillText('CLICK TO RESTART', cx, cy + 100);
    }

    ctx.restore();
  }

  function drawPauseScreen(ctx) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.font = '36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.cyan;
    ctx.fillText('PAUSED', cx, cy);

    ctx.font = '18px monospace';
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText('Press ESC to resume', cx, cy + 40);
  }

  return {
    drawHUD,
    drawStartScreen,
    drawGameOverScreen,
    drawPauseScreen
  };
})();
