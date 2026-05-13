/**
 * ui.js - HUD, start screen, game over screen, pause screen, settings menu
 * Handles all UI rendering: health bar, score, level, combo counter,
 * start/gameover screens, pause overlay, and settings with volume sliders.
 * Fonts scale dynamically based on canvas width for mobile.
 */

const UI = (() => {

  // Helper: compute a font size proportional to canvas width
  function scaledFontSize(base) {
    const canvas = document.getElementById('gameCanvas');
    const width = canvas ? canvas.width : window.innerWidth;
    return Math.max(10, Math.floor(base * (width / 960)));
  }

  // --- Slider drawing helper ---
  // Returns the bounding box {x, y, w, h} of the slider for hit-testing
  function drawSlider(ctx, label, value, x, y, barWidth, fontSize) {
    const barHeight = fontSize * 0.6;
    const thumbRadius = barHeight * 0.9;
    const pct = Math.max(0, Math.min(1, value));
    const labelW = ctx.measureText(label).width;

    // Label
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText(label, x, y - barHeight);

    // Percentage text
    const pctText = `${Math.round(pct * 100)}%`;
    ctx.textAlign = 'right';
    ctx.fillText(pctText, x + barWidth + fontSize * 0.5, y);

    // Slider track background
    const trackY = y - barHeight / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, x + labelW + 10, trackY, barWidth, barHeight, barHeight / 2);

    // Slider track fill
    const fillW = barWidth * pct;
    ctx.fillStyle = CONFIG.colors.cyan;
    roundRect(ctx, x + labelW + 10, trackY, fillW, barHeight, barHeight / 2);

    // Thumb
    const thumbX = x + labelW + 10 + fillW;
    const thumbY = y;
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, thumbRadius, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.colors.gold;
    ctx.fill();

    return {
      x: x + labelW + 10,
      y: trackY - thumbRadius,
      w: barWidth,
      h: barHeight + thumbRadius * 2
    };
  }

  // --- Rounded rectangle helper ---
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // --- Draw gear icon for settings ---
  function drawGearIcon(ctx, cx, cy, size, color) {
    const teeth = 8;
    const outerR = size;
    const innerR = size * 0.65;
    const holeR = size * 0.25;

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const angle = (Math.PI * 2 * i) / (teeth * 2) - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill('evenodd');

    // Center hole
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, holeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
      if (py + previewSize < ctx.canvas.height - scaledFontSize(60)) {
        Enemies.drawPreview(ctx, types[i], px, py, previewSize);

        ctx.font = `${scaledFontSize(12)}px monospace`;
        ctx.fillStyle = CONFIG.enemyStats[types[i]].color;
        ctx.fillText(labels[i], px, py + previewSize / 2 + scaledFontSize(14));
      }
    }

    // Controls text
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

    // --- Settings gear button (bottom-right corner) ---
    const gearSize = scaledFontSize(14);
    const gearX = ctx.canvas.width - gearSize * 2;
    const gearY = ctx.canvas.height - gearSize * 2;
    drawGearIcon(ctx, gearX, gearY, gearSize, '#aaa');
    ctx.font = `${scaledFontSize(10)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaa';
    ctx.fillText('SETTINGS', gearX, gearY + gearSize * 1.8);
  }

  function drawSettingsScreen(ctx, bgmVolume, sfxVolume, isMuted) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    const titleSize = scaledFontSize(36);
    const fontSize = scaledFontSize(20);
    const barWidth = Math.min(scaledFontSize(300), ctx.canvas.width * 0.5);
    const btnSize = scaledFontSize(18);

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Title
    ctx.save();
    ctx.shadowColor = CONFIG.colors.cyan;
    ctx.shadowBlur = 15;
    ctx.font = `${titleSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.cyan;
    ctx.fillText('SETTINGS', cx, cy - titleSize * 2.5);
    ctx.shadowBlur = 0;

    // Divider line
    const divW = barWidth + scaledFontSize(100);
    ctx.strokeStyle = CONFIG.colors.cyan;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - divW / 2, cy - titleSize * 1.8);
    ctx.lineTo(cx + divW / 2, cy - titleSize * 1.8);
    ctx.stroke();

    const startY = cy - titleSize * 1.2;
    const gapY = scaledFontSize(60);

    // BGM Volume slider
    drawSlider(ctx, 'BGM Volume', bgmVolume, cx - barWidth / 2 - scaledFontSize(100), startY, barWidth, fontSize);

    // SFX Volume slider
    drawSlider(ctx, 'SFX Volume', sfxVolume, cx - barWidth / 2 - scaledFontSize(100), startY + gapY, barWidth, fontSize);

    // Mute toggle button
    const muteBtnY = startY + gapY * 2;
    const muteBtnW = scaledFontSize(160);
    const muteBtnH = scaledFontSize(40);
    const muteBtnX = cx - muteBtnW / 2;

    ctx.fillStyle = isMuted ? CONFIG.colors.red : CONFIG.colors.green;
    roundRect(ctx, muteBtnX, muteBtnY, muteBtnW, muteBtnH, scaledFontSize(8));
    ctx.font = `${btnSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText(isMuted ? 'MUTED  [click to unmute]' : 'NOT MUTED  [click to mute]', cx, muteBtnY + muteBtnH / 2);

    // Back button
    const backBtnY = startY + gapY * 3;
    const backBtnW = scaledFontSize(140);
    const backBtnH = scaledFontSize(40);
    const backBtnX = cx - backBtnW / 2;

    ctx.fillStyle = CONFIG.colors.gold;
    roundRect(ctx, backBtnX, backBtnY, backBtnW, backBtnH, scaledFontSize(8));
    ctx.font = `${btnSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillText('BACK', cx, backBtnY + backBtnH / 2);

    ctx.restore();

    // Return bounding boxes for hit testing
    return {
      bgmSlider: {
        x: cx - barWidth / 2 - scaledFontSize(100) + fontSize * 9 + 10,
        y: startY - scaledFontSize(20),
        w: barWidth,
        h: scaledFontSize(30)
      },
      sfxSlider: {
        x: cx - barWidth / 2 - scaledFontSize(100) + fontSize * 9 + 10,
        y: startY + gapY - scaledFontSize(20),
        w: barWidth,
        h: scaledFontSize(30)
      },
      muteBtn: {
        x: muteBtnX,
        y: muteBtnY,
        w: muteBtnW,
        h: muteBtnH
      },
      backBtn: {
        x: backBtnX,
        y: backBtnY,
        w: backBtnW,
        h: backBtnH
      }
    };
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

  // Animated level-up text that scales up and fades over the timer duration
  function drawLevelUpText(ctx, timer) {
    const totalDuration = 2000;
    const elapsed = totalDuration - timer;
    const progress = elapsed / totalDuration; // 0 → 1

    // Scale: grow quickly then shrink slightly
    let scale;
    if (progress < 0.25) {
      scale = progress / 0.25; // 0→1
    } else if (progress < 0.4) {
      scale = 1.0 + (progress - 0.25) / 0.15 * 0.3; // 1→1.3
    } else {
      scale = 1.3; // hold
    }

    // Alpha fades in first 20%, fades out last 60%
    let alpha;
    if (progress < 0.2) {
      alpha = progress / 0.2;
    } else if (progress > 0.6) {
      alpha = 1.0 - (progress - 0.6) / 0.4;
    } else {
      alpha = 1.0;
    }

    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2 - 40;
    const baseSize = scaledFontSize(48) * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = CONFIG.colors.gold;
    ctx.shadowBlur = 15 + scale * 10;
    ctx.font = `bold ${baseSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.gold;
    ctx.fillText('LEVEL UP!', cx, cy);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.5;
    ctx.font = `${scaledFontSize(20) * scale}px monospace`;
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText('Next wave incoming', cx, cy + baseSize);
    ctx.restore();
  }

  // Red pulsing boss warning with countdown number
  function drawBossWarning(ctx, countdown) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2 - 20;

    // Pulsing effect — faster pulse as countdown gets lower
    const pulseSpeed = 8 - countdown; // 5 → 3 → 2
    const pulse = 0.5 + Math.sin(performance.now() * 0.006 * pulseSpeed) * 0.5;

    // Red flash background
    const bgAlpha = 0.1 + pulse * 0.15;
    ctx.save();
    ctx.globalAlpha = bgAlpha;
    ctx.fillStyle = CONFIG.colors.red;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Warning text
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    ctx.shadowColor = CONFIG.colors.red;
    ctx.shadowBlur = 20 + pulse * 20;
    ctx.font = `bold ${scaledFontSize(36)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.red;
    ctx.fillText('BOSS INCOMING!', cx, cy);

    // Countdown number
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    const numScale = 1 + pulse * 0.5;
    ctx.font = `bold ${scaledFontSize(72) * numScale}px monospace`;
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText(countdown.toString(), cx, cy + scaledFontSize(52));
    ctx.restore();
  }

  // Boss defeated celebration text with screen flash
  function drawBossDefeated(ctx, timer) {
    const totalDuration = 2000;
    const elapsed = totalDuration - timer;
    const progress = elapsed / totalDuration; // 0 → 1

    // Screen flash in first 100ms
    if (elapsed < 100) {
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - elapsed / 100);
      ctx.fillStyle = CONFIG.colors.gold;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }

    // Scale animation: pop in
    let scale;
    if (progress < 0.15) {
      scale = progress / 0.15;
    } else if (progress < 0.3) {
      scale = 1.0 + (progress - 0.15) / 0.15 * 0.5;
    } else {
      scale = 1.5;
    }

    let alpha;
    if (progress < 0.15) {
      alpha = progress / 0.15;
    } else if (progress > 0.6) {
      alpha = 1.0 - (progress - 0.6) / 0.4;
    } else {
      alpha = 1.0;
    }

    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2 - 30;
    const baseSize = scaledFontSize(42) * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = CONFIG.colors.gold;
    ctx.shadowBlur = 25 + scale * 15;
    ctx.font = `bold ${baseSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.gold;
    ctx.fillText('BOSS DEFEATED!', cx, cy);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.7;
    ctx.font = `${scaledFontSize(20) * scale}px monospace`;
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText('+500 points', cx, cy + baseSize);
    ctx.restore();
  }

  // Upgrade shop between levels
  function drawShopScreen(ctx, score, upgrades, ups) {
    const cx = ctx.canvas.width / 2;
    const cy = ctx.canvas.height / 2;

    const titleSize = scaledFontSize(36);
    const cardW = Math.min(scaledFontSize(200), ctx.canvas.width * 0.22);
    const cardH = scaledFontSize(130);
    const cardGap = scaledFontSize(16);
    const fontSize = scaledFontSize(16);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Title
    ctx.save();
    ctx.shadowColor = CONFIG.colors.gold;
    ctx.shadowBlur = 15;
    ctx.font = `bold ${titleSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.gold;
    ctx.fillText('UPGRADE SHOP', cx, cy - titleSize * 2.2);
    ctx.shadowBlur = 0;

    // Points available
    ctx.font = `${scaledFontSize(20)}px monospace`;
    ctx.fillStyle = CONFIG.colors.white;
    ctx.fillText(`Score: ${score}`, cx, cy - titleSize * 1.4);

    // Divider
    const divW = cardW * 4 + cardGap * 3;
    ctx.strokeStyle = CONFIG.colors.gold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - divW / 2, cy - titleSize * 1);
    ctx.lineTo(cx + divW / 2, cy - titleSize * 1);
    ctx.stroke();

    // Upgrade cards
    const startY = cy - titleSize * 0.5;
    const totalCardsW = ups.length * (cardW + cardGap) - cardGap;
    const startX = cx - totalCardsW / 2;

    for (let i = 0; i < ups.length; i++) {
      const u = ups[i];
      const owned = upgrades[u.id];
      const canAfford = score >= u.cost;
      const x = startX + i * (cardW + cardGap);
      const y = startY;

      // Card background
      ctx.fillStyle = owned ? 'rgba(50, 200, 50, 0.2)' : 'rgba(50, 50, 50, 0.6)';
      roundRect(ctx, x, y, cardW, cardH, scaledFontSize(8));

      // Border
      ctx.strokeStyle = owned ? CONFIG.colors.green : (canAfford ? CONFIG.colors.cyan : '#444');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + scaledFontSize(8), y);
      ctx.lineTo(x + cardW - scaledFontSize(8), y);
      ctx.arcTo(x + cardW, y, x + cardW, y + scaledFontSize(8), scaledFontSize(8));
      ctx.lineTo(x + cardW, y + cardH - scaledFontSize(8));
      ctx.arcTo(x + cardW, y + cardH, x + cardW - scaledFontSize(8), y + cardH, scaledFontSize(8));
      ctx.lineTo(x + scaledFontSize(8), y + cardH);
      ctx.arcTo(x, y + cardH, x, y + cardH - scaledFontSize(8), scaledFontSize(8));
      ctx.lineTo(x, y + scaledFontSize(8));
      ctx.arcTo(x, y, x + scaledFontSize(8), y, scaledFontSize(8));
      ctx.closePath();
      ctx.stroke();

      // Icon
      ctx.font = `bold ${scaledFontSize(28)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = owned ? CONFIG.colors.green : CONFIG.colors.white;
      ctx.fillText(u.icon, x + cardW / 2, y + scaledFontSize(32));

      // Name
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = CONFIG.colors.white;
      ctx.fillText(u.name, x + cardW / 2, y + scaledFontSize(55));

      // Description
      ctx.font = `${scaledFontSize(11)}px monospace`;
      ctx.fillStyle = '#aaa';
      ctx.fillText(u.desc, x + cardW / 2, y + scaledFontSize(72));

      // Owned text or cost
      if (owned) {
        ctx.font = `bold ${scaledFontSize(14)}px monospace`;
        ctx.fillStyle = CONFIG.colors.green;
        ctx.fillText('[OWNED]', x + cardW / 2, y + cardH - scaledFontSize(18));
      } else {
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillStyle = canAfford ? CONFIG.colors.gold : '#666';
        ctx.fillText(`${u.cost} pts`, x + cardW / 2, y + cardH - scaledFontSize(18));
      }
    }

    // Continue button
    const contBtnW = scaledFontSize(200);
    const contBtnH = scaledFontSize(40);
    const contY = startY + cardH + scaledFontSize(30);
    const contX = cx - contBtnW / 2;

    ctx.fillStyle = CONFIG.colors.cyan;
    roundRect(ctx, contX, contY, contBtnW, contBtnH, scaledFontSize(8));
    ctx.font = `bold ${scaledFontSize(18)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillText('CONTINUE', cx, contY + contBtnH / 2);

    ctx.restore();

    // Return bounding boxes for click detection
    return {
      cards: ups.map((u, i) => ({
        x: startX + i * (cardW + cardGap),
        y: startY,
        w: cardW,
        h: cardH,
        id: u.id
      })),
      continue: {
        x: contX,
        y: contY,
        w: contBtnW,
        h: contBtnH
      }
    };
  }

  // Achievement toast notification
  function drawAchievementToast(ctx, name, timer) {
    const toastH = scaledFontSize(40);
    const toastW = Math.min(scaledFontSize(350), ctx.canvas.width * 0.4);
    const toastX = ctx.canvas.width / 2 - toastW / 2;
    const toastY = scaledFontSize(10);

    // Fade in/out
    let alpha = 1;
    if (timer > 2500) alpha = (3000 - timer) / 500; // fade out
    if (timer < 200) alpha = timer / 200; // fade in
    alpha = Math.max(0, Math.min(1, alpha));

    ctx.save();
    ctx.globalAlpha = alpha;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    roundRect(ctx, toastX, toastY, toastW, toastH, scaledFontSize(8));
    ctx.strokeStyle = CONFIG.colors.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toastX + scaledFontSize(8), toastY);
    ctx.lineTo(toastX + toastW - scaledFontSize(8), toastY);
    ctx.arcTo(toastX + toastW, toastY, toastX + toastW, toastY + scaledFontSize(8), scaledFontSize(8));
    ctx.lineTo(toastX + toastW, toastY + toastH - scaledFontSize(8));
    ctx.arcTo(toastX + toastW, toastY + toastH, toastX + toastW - scaledFontSize(8), toastY + toastH, scaledFontSize(8));
    ctx.lineTo(toastX + scaledFontSize(8), toastY + toastH);
    ctx.arcTo(toastX, toastY + toastH, toastX, toastY + toastH - scaledFontSize(8), scaledFontSize(8));
    ctx.lineTo(toastX, toastY + scaledFontSize(8));
    ctx.arcTo(toastX, toastY, toastX + scaledFontSize(8), toastY, scaledFontSize(8));
    ctx.closePath();
    ctx.stroke();

    // Text
    ctx.font = `bold ${scaledFontSize(14)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.colors.gold;
    ctx.fillText('🏆 ACHIEVEMENT UNLOCKED!', ctx.canvas.width / 2, toastY + toastH / 2);

    ctx.restore();
  }

  return {
    drawHUD,
    drawStartScreen,
    drawGameOverScreen,
    drawPauseScreen,
    drawLevelUpText,
    drawBossWarning,
    drawBossDefeated,
    drawSettingsScreen,
    drawShopScreen,
    drawAchievementToast
  };
})();
