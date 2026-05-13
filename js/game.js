/**
 * game.js - Main game loop, state machine, collision detection
 * States: MENU, SETTINGS, PLAYING, PAUSED, GAMEOVER
 * Handles: wave spawning, bullet updates, collision detection,
 * damage numbers, screen shake, combo system, powerup drops.
 */

const Game = (() => {
  let canvas = null;
  let ctx = null;
  let state = 'MENU'; // MENU | SETTINGS | SHOP | PLAYING | PAUSED | GAMEOVER
  let previousState = 'MENU'; // track where to return from settings
  let lastTime = 0;
  let animFrame = null;

  // Settings
  let bgmVolume = CONFIG.settings.bgmVolume;
  let sfxVolume = CONFIG.settings.sfxVolume;
  let isMuted = CONFIG.settings.isMuted;

  // Game state
  let score = 0;
  let level = 1;
  let currentLevelScore = 0; // track score within current level
  let combo = 1;
  let comboTimer = 0;
  let enemiesKilled = 0;
  let bullets = [];
  let powerups = [];
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight - 100;
  let mouseDown = false;

  // Mobile: auto-fire after initial touch (don't require holding tap)
  let mobileAutoFiring = false;

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

  // Level-up animation
  let levelUpTimer = 0;

  // Boss warning countdown (3→2→1→spawn)
  let bossWarningActive = false;
  let bossWarningTimer = 0; // starts at 3000ms, counts down

  // Boss defeated celebration
  let bossDefeatedTimer = 0;

  // Pending ship upgrade (flash + particles)
  let pendingUpgrade = false;

    // --- Settings persistence ---
    let gameMode = 'arcade'; // 'arcade' or 'endless'
  function loadSettings() {
    AudioSys.loadSettings();
    const s = AudioSys.getSettings();
    bgmVolume = s.bgmVolume;
    sfxVolume = s.sfxVolume;
    isMuted = s.isMuted;
  }

  function persistSettings() {
    AudioSys.saveSettings();
  }

  // --- Init ---
  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    ctx.imageSmoothingEnabled = false;

    Background.init();
    Player.init();
    resetGame();

    // Load persisted settings
    loadSettings();

    // Event listeners
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('click', onClick);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', onKeyDown);

    // Touch event handlers — always register (lightweight, no-op on desktop)
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove',  onTouchMove,  { passive: false });
    window.addEventListener('touchend',   onTouchEnd,   { passive: false });
    window.addEventListener('touchcancel', onTouchEnd,  { passive: false });

    // Start loop
    lastTime = performance.now();
    loop(lastTime);
  }

  function resizeCanvas() {
    // Use visualViewport if available (handles mobile keyboard overlap),
    // otherwise fall back to window dimensions.  The CSS makes the canvas
    // fill the viewport; here we set the INTERNAL (drawing) resolution.
    const vp = window.visualViewport;
    canvas.width  = vp ? vp.width  : window.innerWidth;
    canvas.height = vp ? vp.height : window.innerHeight;
  }

  function onResize() {
    resizeCanvas();
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
    // e may be a MouseEvent or TouchEvent
    if (e.touches && e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    } else if (e.clientX !== undefined) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }
    Background.setMouse(mouseX, mouseY);
    Player.setMouse(mouseX, mouseY);

    mouseDown = true;
    mobileAutoFiring = true;
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
    if (isMobile()) { e.preventDefault(); }
    handleStart(e);
  }

  function onClick(e) {
    let cx, cy;
    if (e.clientX !== undefined) {
      cx = e.clientX;
      cy = e.clientY;
    } else {
      return;
    }

    // SHOP state: handle upgrade/continue clicks
    if (state === 'SHOP') {
      handleShopClick(cx, cy);
      return;
    }

    // SETTINGS state: handle slider/mute/back clicks
    if (state === 'SETTINGS') {
      handleSettingsClick(cx, cy);
      return;
    }

    // MENU state: check settings gear first, then start game
    if (state === 'MENU') {
      if (isSettingsGearClick(cx, cy, 'menu')) {
        previousState = 'MENU';
        state = 'SETTINGS';
        return;
      }
      handleStart(e);
      return;
    }

    // PAUSED state: check settings gear
    if (state === 'PAUSED') {
      if (isSettingsGearClick(cx, cy, 'pause')) {
        previousState = 'PAUSED';
        state = 'SETTINGS';
        return;
      }
      return;
    }

    // GAMEOVER state: restart
    if (state === 'GAMEOVER') {
      handleStart(e);
    }
  }

  // Check if click is on the settings gear button (generous hit area)
  function isSettingsGearClick(cx, cy) {
    const s = getScale();
    const gearSize = s * 14;
    const gearX = canvas.width - gearSize * 2;
    const gearY = canvas.height - gearSize * 2;
    const hitR = gearSize * 3;
    const dx = cx - gearX;
    const dy = cy - gearY;
    return dx * dx + dy * dy <= hitR * hitR;
  }

  // --- Settings click handling ---
  function handleSettingsClick(cx, cy) {
    // We need to know the exact hitbox positions, so we compute them the same way
    const s = getScale();
    const fontSize = s * 20;
    const barWidth = Math.min(s * 300, canvas.width * 0.5);
    const titleSize = s * 36;
    const gapY = s * 60;
    const startY = canvas.height / 2 - titleSize * 1.2;
    const labelPixelW = fontSize * 9;

    const sliderX = canvas.width / 2 - barWidth / 2 - s * 100 + labelPixelW + 10;
    const sliderHitH = s * 40;

    // BGM slider zone
    const bgmSliderY = startY - sliderHitH / 2;
    if (cx >= sliderX && cx <= sliderX + barWidth && cy >= bgmSliderY && cy <= bgmSliderY + sliderHitH) {
      const pct = Math.max(0, Math.min(1, (cx - sliderX) / barWidth));
      bgmVolume = pct;
      if (!isMuted) AudioSys.setBGMVolume(pct);
      persistSettings();
      return;
    }

    // SFX slider zone
    const sfxSliderY = startY + gapY - sliderHitH / 2;
    if (cx >= sliderX && cx <= sliderX + barWidth && cy >= sfxSliderY && cy <= sfxSliderY + sliderHitH) {
      const pct = Math.max(0, Math.min(1, (cx - sliderX) / barWidth));
      sfxVolume = pct;
      if (!isMuted) AudioSys.setSFXVolume(pct);
      persistSettings();
      return;
    }

    // Mute toggle
    const muteBtnW = s * 160;
    const muteBtnH = s * 40;
    const muteBtnY = startY + gapY * 2;
    const muteBtnX = canvas.width / 2 - muteBtnW / 2;
    if (cx >= muteBtnX && cx <= muteBtnX + muteBtnW && cy >= muteBtnY && cy <= muteBtnY + muteBtnH) {
      isMuted = !isMuted;
      if (isMuted) {
        AudioSys.setBGMVolume(0);
        AudioSys.setSFXVolume(0);
      } else {
        AudioSys.setBGMVolume(bgmVolume);
        AudioSys.setSFXVolume(sfxVolume);
      }
      persistSettings();
      return;
    }

    // Back button
    const backBtnW = s * 140;
    const backBtnH = s * 40;
    const backBtnY = startY + gapY * 3;
    const backBtnX = canvas.width / 2 - backBtnW / 2;
    if (cx >= backBtnX && cx <= backBtnX + backBtnW && cy >= backBtnY && cy <= backBtnY + backBtnH) {
      state = previousState;
      persistSettings();
    }
  }

  // Helper: get scale factor
  function getScale() {
    const width = canvas ? canvas.width : window.innerWidth;
    return width / 960;
  }

  // Slider drag for mobile (only x coordinate needed)
  function handleSliderDrag(cx) {
    const s = getScale();
    const barWidth = Math.min(s * 300, canvas.width * 0.5);
    const sliderX = canvas.width / 2 - barWidth / 2 - s * 100 + (s * 20 * 9) + 10;

    // Determine which slider is active by proximity (use current y position)
    // We check both sliders and update whichever is closer
    if (cx >= sliderX && cx <= sliderX + barWidth) {
      const pct = Math.max(0, Math.min(1, (cx - sliderX) / barWidth));
      // Default to whichever isn't at 0
      if (bgmVolume > 0 || sfxVolume === 0) {
        bgmVolume = pct;
        if (!isMuted) AudioSys.setBGMVolume(pct);
      } else {
        sfxVolume = pct;
        if (!isMuted) AudioSys.setSFXVolume(pct);
      }
      persistSettings();
    }
  }

  // --- Shop click handling ---
  function handleShopClick(cx, cy) {
    if (!shopBounds) return;

    // Check card clicks
    for (const card of shopBounds.cards) {
      if (cx >= card.x && cx <= card.x + card.w && cy >= card.y && cy <= card.y + card.h) {
        const item = SHOP_ITEMS.find(i => i.id === card.id);
        if (!item) return;
        if (SaveManager.get('purchasedUpgrades')[item.id]) return;
        if (score >= item.cost) {
          score -= item.cost;
          const purchased = SaveManager.get('purchasedUpgrades');
          purchased[item.id] = true;
          SaveManager.set('purchasedUpgrades', purchased);
          Player.applyUpgrades();
        }
        return;
      }
    }

    // Continue button click
    const c = shopBounds.continue;
    if (cx >= c.x && cx <= c.x + c.w && cy >= c.y && cy <= c.y + c.h) {
      shopOpen = false;
      state = 'PLAYING';
      spawnWave();
    }
  }

  function startGame() {
    state = 'PLAYING';
    AudioSys.startBGM();
    Enemies.setLevel(level);
    Player.applyUpgrades();
    if (gameMode === 'endless') {
      waveEnemiesSpawned = 0;
      waveEnemiesTotal = 0;
      bossSpawned = false;
    }
    spawnWave();
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
    levelUpTimer = 0;
    bossWarningActive = false;
    bossWarningTimer = 0;
    bossDefeatedTimer = 0;
    pendingUpgrade = false;
    mobileAutoFiring = false;
    gameOverSaved = false;
    shopOpen = false;
    shopBounds = null;
    activeAchievement = null;
    achievementTimer = 0;
    achievementQueue = [];
    Enemies.resetAll();
    Particles.clear();
    Player.reset();
    showNextAchievement();
  }

  // --- Game over handler ---
  function handleGameOver(now) {
    state = 'GAMEOVER';
    AudioSys.stopBGM();
    Particles.spawnExplosion(canvas.width / 2, canvas.height / 2, 'boss');
    AudioSys.playExplosion('boss');

    // Only save once per game over
    if (!gameOverSaved) {
      gameOverSaved = true;
      SaveManager.addScore(score, level, enemiesKilled, gameMode);
      checkAchievements();
    }

    // In endless mode, show shop before game over screen
    if (gameMode === 'endless') {
      openShop();
    }
  }

  function onMouseUp() {
    mouseDown = false;
  }

  // --- Touch handlers ---
  function onTouchStart(e) {
    e.preventDefault();
    if (state === 'PAUSED') return; // paused — ignore touch gestures

    // SETTINGS state: handle settings clicks via touch
    if (state === 'SETTINGS') {
      if (e.touches.length > 0) {
        handleSettingsClick(e.touches[0].clientX, e.touches[0].clientY);
      }
      return;
    }

    handleStart(e);
  }

  function onTouchMove(e) {
    e.preventDefault();
    // Handle slider dragging in settings when user is dragging on the screen
    if (state === 'SETTINGS') {
      if (e.touches.length > 0) {
        handleSliderDrag(e.touches[0].clientX);
      }
      return;
    }
    if (state === 'PAUSED') return;
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mouseX = touch.clientX;
      mouseY = touch.clientY;
      Background.setMouse(mouseX, mouseY);
      Player.setMouse(mouseX, mouseY);
    }
  }

  function onTouchEnd(e) {
    // On mobile, auto-fire persists after initial touch — only stop movement tracking
    mouseDown = false;
    // mobileAutoFiring stays true so the ship keeps firing without holding
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      if (state === 'PLAYING') {
        state = 'PAUSED';
      } else if (state === 'PAUSED') {
        state = 'PLAYING';
      } else if (state === 'SETTINGS') {
        state = previousState;
        persistSettings();
      }
    }
  }

  // Shop state: upgrade selection
  // Achievement definitions
  const ACHIEVEMENTS = {
    firstKill: { name: 'First Blood', condition: () => enemiesKilled >= 1 },
    hundredKills: { name: 'Centurion', condition: () => enemiesKilled >= 100 },
    fiveHundredKills: { name: 'Annihilator', condition: () => enemiesKilled >= 500 },
    levelTen: { name: 'Survivor', condition: () => level >= 10 },
    levelTwenty: { name: 'Veteran', condition: () => level >= 20 },
    bossSlayer: { name: 'Boss Slayer', condition: () => SaveManager.get('totalBossKills') >= 1 },
    score5000: { name: 'High Roller', condition: () => SaveManager.get('bestArcadeScore') >= 5000 }
  };

  let achievementQueue = [];
  let activeAchievement = null;
  let achievementTimer = 0;

  let shopOpen = false;
  let shopBounds = null;
  let gameOverSaved = false;

  function checkAchievements() {
    for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
      if (!SaveManager.getAchievement(id) && def.condition()) {
        const isNew = SaveManager.unlockAchievement(id);
        if (isNew) {
          achievementQueue.push(def.name);
        }
      }
    }
  }

  function showNextAchievement() {
    if (achievementQueue.length > 0 && !activeAchievement) {
      activeAchievement = achievementQueue.shift();
      achievementTimer = 3000;
    }
  }

  function openShop() {
    shopOpen = true;
    state = 'SHOP';
    shopBounds = null;
    checkAchievements();
  }

  let shopSelection = 0; // Currently selected upgrade card
  let pendingLevelScore = 0; // Score to display in shop

  // Shop items configuration
  const SHOP_ITEMS = [
    { id: 'doubleShot', name: 'Double Shot', desc: 'Fire two bullets simultaneously', cost: 500, icon: '••' },
    { id: 'rapidFire', name: 'Rapid Fire', desc: 'Fire 50% faster', cost: 750, icon: '»' },
    { id: 'speedBoost', name: 'Ship Speed', desc: '30% faster ship movement', cost: 400, icon: '→' },
    { id: 'healthBoost', name: 'Health Boost', desc: '+25 max HP', cost: 600, icon: '♥' }
  ];

  function spawnWave() {
    waveEnemiesSpawned = 0;
    waveSpawnTimer = 0;

    // Boss level: mini-swarm + boss
    if (level % CONFIG.boss.interval === 0) {
      miniSwarmSpawned = true;
      Enemies.spawnMiniSwarm();
      bossSpawned = true;
      Enemies.spawnBoss(level);
    } else {
      // Non-boss levels: spawn row-based formation instantly
      Enemies.spawnWave(level);
      waveEnemiesTotal = Enemies.getAlive().length;
      waveEnemiesSpawned = waveEnemiesTotal;
    }
  }

  function advanceLevel(now) {
    level++;

    // Level up animation
    levelUpTimer = 2000;

    // Ship upgrade check (every CONFIG.player.upgradeInterval levels)
    if ((level - 1) % CONFIG.player.upgradeInterval === 0) {
      pendingUpgrade = true;
    }

    // Check if this is a boss level — start boss warning countdown
    if (level % CONFIG.boss.interval === 0) {
      bossWarningActive = true;
      bossWarningTimer = 3000;
      checkAchievements();
    } else {
      // Clear enemies and open shop between levels
      waveEnemiesSpawned = 0;
      waveEnemiesTotal = 0;
      bossSpawned = false;
      openShop();
    }
  }

  function spawnBossAfterWarning(now) {
    bossWarningActive = false;
    Enemies.setLevel(level);
    bossSpawned = true;
    Enemies.spawnBoss(level);
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

    // Shooting — on mobile auto-fire after initial touch (no hold needed)
    if ((mouseDown || (isMobile() && mobileAutoFiring)) && Player.isAlive()) {
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

    // Update crab enemies
    Enemies.updateCrabs(dt);

    // Wave spawning: row formation is spawned instantly in spawnWave(),
    // so no per-frame spawning needed for non-boss levels.

    // Crab enemy spawning: spawn 1-2 per level, periodically
    if (!bossSpawned && level >= 2) {
      const crabsAlive = Enemies.getCrabEnemies().filter(c => c.alive).length;
      if (crabsAlive === 0 && Math.random() < 0.008 * level) {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        Enemies.spawnCrab(side);
      }
    }

    // --- Bullet vs Enemy collision ---
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (const e of Enemies.getAlive()) {
        const bulletR = b.width;
        const enemyR = e.size / 2;

        if (circleCollision(b.x, b.y, bulletR, e.x, e.y, enemyR)) {
          // Shielded drone: only damageable from sides/back, not from front
          if (e.type === 'shield' && e.shieldFacing) {
            // Shield faces upward (front)
            // Bullet coming from above = blocked
            if (b.vy < 0 && b.y < e.y - e.size * 0.1) {
              // Block! Show deflection sparks
              Particles.spawnSparks(b.x, b.y, 3);
              break;
            }
          }
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
            // Track medium kills for powerup eligibility (1 in 15)
            let mediumEligible = (e.type === 'medium' && Enemies.recordMediumKill());

            // Score with combo
            let points = e.score * combo;
            // During unleash: 3x score multiplier
            if (Player.isUnleashing()) {
              points *= CONFIG.player.unleashMultiplier;
            }
            score += points;
            combo++;
            combo = Math.min(combo, CONFIG.combo.maxMultiplier);
            comboTimer = CONFIG.combo.decayTime;

            // Screen shake
            const shakeCfg = CONFIG.shake[e.type];
            triggerShake(shakeCfg.intensity, shakeCfg.duration);

            // Powerup drop: boss always, medium every 15th kill
            if (drop || (mediumEligible && e.type === 'medium')) {
              powerups.push({
                x: e.x,
                y: e.y,
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

    // --- Bullet vs Crab collision ---
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      for (const c of Enemies.getCrabEnemies()) {
        const bulletR = b.width;
        const crabR = c.size / 2;

        if (circleCollision(b.x, b.y, bulletR, c.x, c.y, crabR)) {
          c.hitFlash = 3;
          c.hp -= b.damage;
          bullets.splice(bi, 1);

          Particles.spawnSparks(b.x, b.y, 3 + Math.floor(Math.random() * 3));
          Particles.spawnDamageNumber(c.x, c.y - c.size / 2, b.damage);
          AudioSys.playHit();

          if (c.hp <= 0) {
            const drop = Enemies.killCrab(c, c.x, c.y);
            enemiesKilled++;
            let points = c.score * combo;
            if (Player.isUnleashing()) {
              points *= CONFIG.player.unleashMultiplier;
            }
            score += points;
            combo++;
            combo = Math.min(combo, CONFIG.combo.maxMultiplier);
            comboTimer = CONFIG.combo.decayTime;

            const shakeCfg = CONFIG.shake.crab;
            triggerShake(shakeCfg.intensity, shakeCfg.duration);

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
          // During unleash: destroy enemy on contact, chain reaction explosion
          if (Player.isUnleashing()) {
            e.hp = 0;
            Enemies.killEnemy(e, e.x, e.y);
            enemiesKilled++;
            let points = e.score * combo * CONFIG.player.unleashMultiplier;
            score += points;
            combo++;
            combo = Math.min(combo, CONFIG.combo.maxMultiplier);
            comboTimer = CONFIG.combo.decayTime;
            Particles.spawnExplosion(e.x, e.y, e.type);
            AudioSys.playExplosion(e.type);
            continue;
          }
          Player.takeDamage(15);
          flashAlpha = 0.3;
          triggerShake(8, 200);
          combo = 1;
          comboTimer = 0;
          // Push enemy away
          e.y += 30;
          if (!Player.isAlive()) {
            state = 'GAMEOVER';
            AudioSys.stopBGM();
            Particles.spawnExplosion(pPos.x, pPos.y, 'boss');
            AudioSys.playExplosion('boss');
          }
        }
      }

      // Player vs crab enemy contact
      for (const c of Enemies.getCrabEnemies()) {
        const crabR = c.size / 2;
        if (circleCollision(pPos.x, pPos.y, pRadius, c.x, c.y, crabR)) {
          if (Player.isUnleashing()) {
            Enemies.killCrab(c, c.x, c.y);
            enemiesKilled++;
            let points = c.score * combo * CONFIG.player.unleashMultiplier;
            score += points;
            combo++;
            combo = Math.min(combo, CONFIG.combo.maxMultiplier);
            comboTimer = CONFIG.combo.decayTime;
            Particles.spawnExplosion(c.x, c.y, 'small');
            AudioSys.playExplosion('small');
            continue;
          }
          Player.takeDamage(10);
          flashAlpha = 0.3;
          triggerShake(5, 150);
          combo = 1;
          comboTimer = 0;
          // Push crab toward its direction
          c.x += c.direction * 50;
          if (!Player.isAlive()) {
            state = 'GAMEOVER';
            AudioSys.stopBGM();
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

      // Player vs enemy lasers
      const eLasers = Enemies.getEnemyLasers();
      let laserHitPlayed = false;
      for (let i = eLasers.length - 1; i >= 0; i--) {
        const laser = eLasers[i];
        if (circleCollision(pPos.x, pPos.y, Player.getRadius(), laser.x, laser.y, laser.radius)) {
          Player.takeDamage(laser.damage);
          flashAlpha = 0.2;
          triggerShake(5, 150);
          Particles.spawnLaserHitSparks(laser.x, laser.y, 6);
          Particles.spawnDamageNumber(pPos.x, pPos.y - 20, laser.damage);
          if (!laserHitPlayed) {
            AudioSys.playEnemyLaser();
            laserHitPlayed = true;
          }
          combo = 1;
          comboTimer = 0;
          eLasers.splice(i, 1);
          if (!Player.isAlive()) {
            state = 'GAMEOVER';
            AudioSys.stopBGM();
            Particles.spawnExplosion(pPos.x, pPos.y, 'boss');
            AudioSys.playExplosion('boss');
          }
        }
      }

      // Player vs dropped mines
      for (let i = Enemies.getMines().length - 1; i >= 0; i--) {
        const mine = Enemies.getMines()[i];
        if (mine.armed && circleCollision(pPos.x, pPos.y, Player.getRadius(), mine.x, mine.y, mine.radius)) {
          Player.takeDamage(mine.damage);
          flashAlpha = 0.25;
          triggerShake(6, 120);
          Particles.spawnExplosion(mine.x, mine.y, 'small');
          Enemies.getMines().splice(i, 1);
          combo = 1;
          comboTimer = 0;
          if (!Player.isAlive()) {
            state = 'GAMEOVER';
            AudioSys.stopBGM();
            Particles.spawnExplosion(pPos.x, pPos.y, 'boss');
            AudioSys.playExplosion('boss');
          }
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

    // Level-up timer decay
    if (levelUpTimer > 0) {
      levelUpTimer -= dt;
      if (levelUpTimer < 0) levelUpTimer = 0;
    }

    // Boss warning countdown
    if (bossWarningActive) {
      bossWarningTimer -= dt;
      if (bossWarningTimer <= 0) {
        // Spawn the boss
        spawnBossAfterWarning(now);
      } else if (bossWarningTimer <= 0 && bossWarningTimer > -dt) {
        // Ensure we don't double-spawn — clamp
        bossWarningTimer = 0;
      }
    }

    // Boss defeated timer decay
    if (bossDefeatedTimer > 0) {
      bossDefeatedTimer -= dt;
      if (bossDefeatedTimer < 0) bossDefeatedTimer = 0;
    }

    // Ship upgrade visual effect
    if (pendingUpgrade) {
      pendingUpgrade = false;
      Player.upgrade();
      flashAlpha = 0.6; // flash screen white
      Particles.spawnUpgradeParticles(Player.getPos().x, Player.getPos().y);
      AudioSys.playUpgrade();
    }

    // Boss defeated detection — check when boss was just killed
    if (bossSpawned && !Enemies.getAlive().some(e => e.type === 'boss') && bossDefeatedTimer === 0 && level >= CONFIG.boss.interval) {
      bossDefeatedTimer = 2000;
      flashAlpha = 0.4;
      triggerShake(12, 400);
      // Spawn celebration particles
      const bossEnemy = Enemies.getAlive().find(e => e.type === 'boss');
      const cx = canvas.width / 2;
      const cy = canvas.height / 3;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => Particles.spawnExplosion(cx + (Math.random()-0.5)*200, cy + (Math.random()-0.5)*100, 'boss'), i * 100);
      }
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

    // Update achievement toast
    if (achievementTimer > 0) {
      achievementTimer -= dt;
      if (achievementTimer <= 0) {
        activeAchievement = null;
        achievementTimer = 0;
      }
    }
    showNextAchievement();
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

    // Game over
    if (state === 'GAMEOVER') {
      UI.drawGameOverScreen(ctx, score, level, enemiesKilled);

      // Save once per game over
      if (!gameOverSaved) {
        gameOverSaved = true;
        SaveManager.addScore(score, level, enemiesKilled, 'arcade');
        checkAchievements();
      }
    }

    // Shop
    if (state === 'SHOP') {
      shopBounds = UI.drawShopScreen(ctx, score, SaveManager.get('purchasedUpgrades'));
      ctx.restore();
      return;
    }

    if (state === 'SETTINGS') {
      UI.drawSettingsScreen(ctx, bgmVolume, sfxVolume, isMuted);
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

    // Crabby Squid enemies
    Enemies.drawCrabs(ctx);

    // Dropped mines
    Enemies.drawMines(ctx);

    // Player
    Player.draw(ctx);

    // Particles
    Particles.draw(ctx);

    // Screen flash (player hit / upgrade / effects)
    if (flashAlpha > 0) {
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = CONFIG.colors.red;
      ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
      ctx.globalAlpha = 1;
    }

    // Upgrade flash: overlay white briefly
    if (pendingUpgrade) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = CONFIG.colors.white;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
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

    // Low-health vignette — dark red radial gradient from edges
    if (state === 'PLAYING' && Player.isAlive()) {
      const healthPct = Player.getHealth() / Player.getMaxHealth();
      if (healthPct < 0.3) {
        // alpha: 0 at 30%, 0.5 at 0%
        const vignetteAlpha = (0.3 - healthPct) / 0.3 * 0.5;
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
          canvas.width / 2, canvas.height / 2, canvas.width * 0.7
        );
        gradient.addColorStop(0, `rgba(139, 0, 0, 0)`);
        gradient.addColorStop(1, `rgba(139, 0, 0, ${vignetteAlpha})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Level-up animation
    if (levelUpTimer > 0) {
      UI.drawLevelUpText(ctx, levelUpTimer);
    }

    // Boss warning countdown
    if (bossWarningActive) {
      const countdown = Math.ceil(bossWarningTimer / 1000);
      UI.drawBossWarning(ctx, Math.max(1, Math.min(3, countdown)));
    }

    // Boss defeated celebration
    if (bossDefeatedTimer > 0) {
      UI.drawBossDefeated(ctx, bossDefeatedTimer);
    }

    // Boss defeated detection — check when boss was just killed
    if (bossSpawned && !Enemies.getAlive().some(e => e.type === 'boss') && bossDefeatedTimer === 0 && level >= CONFIG.boss.interval) {
      bossDefeatedTimer = 2000;
      flashAlpha = 0.4;
      triggerShake(12, 400);
      // Celebration particles
      const cx = canvas.width / 2;
      const cy = canvas.height / 3;
      for (let i = 0; i < 4; i++) {
        setTimeout(() => Particles.spawnExplosion(cx + (Math.random()-0.5)*200, cy + (Math.random()-0.5)*100, 'boss'), i * 100);
      }
    }

    // Game over
    if (state === 'PAUSED') {
      UI.drawPauseScreen(ctx);
    }

    // Achievement toast
    if (activeAchievement && achievementTimer > 0) {
      UI.drawAchievementToast(ctx, activeAchievement, achievementTimer);
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
