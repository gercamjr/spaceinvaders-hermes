/**
 * audio.js - Web Audio API procedural sound generation
 * Generates all game sounds procedurally: laser, explosions, boss music,
 * powerup chime, hit sounds, unleash drone, and ambient space hum.
 * No external audio files required.
 */

const AudioSys = (() => {
  let ctx = null;
  let masterGain = null;
  let ambientOsc = null;
  let ambientGain = null;
  let unleashDrone = null;
  let unleashGain = null;
  let initialized = false;

  // --- BGM state ---
  let bgmGain = null;
  let bgmBassOsc = null;
  let bgmBassGain = null;
  let bgmLoopTimer = null;
  let bgmVolume = 0.7;
  let bgmRunning = false;

  // --- BGM configuration ---
  const BGM_BPM = 120;
  const BGM_BEAT = 60 / BGM_BPM; // 0.5s per beat
  const BGM_LOOP_BEATS = 16; // 4 measures of 4 beats
  const BGM_LOOP_DURATION = BGM_LOOP_BEATS * BGM_BEAT; // 8s loop

  // Arpeggio pattern (frequencies in Hz, 0 = rest)
  // A minor ascent/descent across 4 measures
  const ARP_PATTERN = [
    55,      65.41,   82.41,   110,     // M1: ascending
    130.81,  164.81,  220,     164.81,  // M2: peak
    130.81,  110,     82.41,   65.41,   // M3: descending
    55,      73.42,   98,      0         // M4: turnaround (rest on last beat)
  ];

  // Percussion pattern (1 = hit, 0 = silent) - subtle hi-hat
  const PERC_PATTERN = [
    1, 0, 1, 0,
    1, 0, 1, 0,
    1, 0, 1, 0,
    1, 0, 1, 1
  ];

  function init() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);
      startAmbientHum();
      initialized = true;
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // --- Ambient space hum (very subtle background) ---
  function startAmbientHum() {
    if (!ctx) return;
    ambientOsc = ctx.createOscillator();
    ambientGain = ctx.createGain();
    // Two slightly detuned sines for a spacious hum
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    ambientOsc.type = 'sine';
    ambientOsc.frequency.value = 45;
    ambientGain.gain.value = 0.02;
    ambientOsc.connect(ambientGain);
    ambientGain.connect(masterGain);
    ambientOsc.start();

    osc2.type = 'sine';
    osc2.frequency.value = 47;
    gain2.gain.value = 0.015;
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start();

    // Keep references for potential cleanup
    ambientOsc._osc2 = osc2;
  }

  // --- Laser pew sound on shoot (short oscillator sweep) ---
  function playLaser() {
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  // --- Explosion sounds (noise burst + low rumble, varies by enemy size) ---
  function playExplosion(size = 'small') {
    if (!ctx) return;
    const duration = size === 'boss' ? 0.8 : size === 'medium' ? 0.4 : 0.2;
    const volume = size === 'boss' ? 0.3 : size === 'medium' ? 0.2 : 0.12;

    // Noise burst
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = size === 'boss' ? 400 : 800;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(ctx.currentTime);

    // Low rumble
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(size === 'boss' ? 50 : 80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + duration);
    oscGain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  // --- Hit sound (short noise burst when bullet hits enemy) ---
  function playHit() {
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(ctx.currentTime);
  }

  // --- Powerup collect chime (ascending tone) ---
  function playPowerup() {
    if (!ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.25);
    });
  }

  // --- Unleash mode bass drone ---
  function startUnleashDrone() {
    if (!ctx) return;
    stopUnleashDrone();
    unleashDrone = ctx.createOscillator();
    unleashGain = ctx.createGain();
    unleashDrone.type = 'sawtooth';
    unleashDrone.frequency.value = 60;
    unleashGain.gain.value = 0;
    unleashGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    unleashDrone.connect(filter);
    filter.connect(unleashGain);
    unleashGain.connect(masterGain);
    unleashDrone.start();
  }

  function stopUnleashDrone() {
    if (unleashDrone) {
      try { unleashDrone.stop(); } catch (_) {}
      unleashDrone = null;
    }
  }

  // --- Enemy laser hit sound (short pitch-down sweep) ---
  function playEnemyLaser() {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  }

  // --- Boss warning alarm ---
  function playBossAlarm() {
    if (!ctx) return;
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = i % 2 === 0 ? 440 : 330;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.15);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.2);
    }
  }

  // --- Upgrade celebration sound ---
  function playUpgrade() {
    if (!ctx) return;
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.3);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.35);
    });
  }

  // --- Procedural Background Music (BGM) ---

  function startBGM(vol) {
    if (!ctx || bgmRunning) return;
    if (ctx.state === 'suspended') ctx.resume();
    bgmVolume = vol !== undefined ? vol : 0.5;
    bgmRunning = true;

    // BGM master gain
    bgmGain = ctx.createGain();
    bgmGain.gain.value = bgmVolume;
    bgmGain.connect(masterGain);

    // Bass pad - continuous sine at 55Hz
    bgmBassOsc = ctx.createOscillator();
    bgmBassOsc.type = 'sine';
    bgmBassOsc.frequency.value = 55;
    bgmBassGain = ctx.createGain();
    bgmBassGain.gain.value = 0.06;
    bgmBassOsc.connect(bgmBassGain);
    bgmBassGain.connect(bgmGain);
    bgmBassOsc.start();

    // Start scheduling loop
    scheduleBgmLoop();
  }

  function stopBGM() {
    bgmRunning = false;
    if (bgmLoopTimer) {
      clearTimeout(bgmLoopTimer);
      bgmLoopTimer = null;
    }
    if (bgmBassOsc) {
      try { bgmBassOsc.stop(); } catch (_) {}
      bgmBassOsc = null;
    }
    if (bgmGain) {
      try { bgmGain.disconnect(); } catch (_) {}
      bgmGain = null;
    }
    bgmBassGain = null;
  }

  function setBGMVolume(vol) {
    bgmVolume = Math.max(0, Math.min(1, vol));
    if (bgmGain && ctx) {
      bgmGain.gain.setValueAtTime(bgmVolume, ctx.currentTime);
    }
  }

  function scheduleBgmLoop() {
    if (!bgmRunning || !ctx) return;
    const now = ctx.currentTime;

    // Schedule arpeggio notes (triangle wave, one per beat)
    ARP_PATTERN.forEach((freq, i) => {
      if (freq === 0) return;
      const t = now + i * BGM_BEAT;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + BGM_BEAT * 0.8);
      osc.connect(gain);
      gain.connect(bgmGain);
      osc.start(t);
      osc.stop(t + BGM_BEAT);
    });

    // Noise buffer for percussion (short noise burst)
    const noiseBufSize = ctx.sampleRate * 0.1;
    const noiseBuffer = ctx.createBuffer(1, noiseBufSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBufSize; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseBufSize, 3);
    }

    // Schedule percussion hits (highpass-filtered noise)
    PERC_PATTERN.forEach((hit, i) => {
      if (!hit) return;
      const t = now + i * BGM_BEAT;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.04, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6000;
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(bgmGain);
      noise.start(t);
    });

    // Schedule next loop iteration
    bgmLoopTimer = setTimeout(scheduleBgmLoop, BGM_LOOP_DURATION * 1000 - 100);
  }

  // --- Settings Persistence ---

  function getSettings() {
    return {
      bgmVolume: bgmVolume,
      sfxVolume: masterGain ? masterGain.gain.value / 0.3 : CONFIG.settings.sfxVolume,
      isMuted: masterGain ? masterGain.gain.value === 0 : CONFIG.settings.isMuted
    };
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem(CONFIG.settings.storageKey);
      if (saved) {
        const s = JSON.parse(saved);
        bgmVolume = typeof s.bgmVolume === 'number' ? Math.max(0, Math.min(1, s.bgmVolume)) : CONFIG.settings.bgmVolume;
        if (masterGain && ctx) {
          const sfxVol = typeof s.sfxVolume === 'number' ? Math.max(0, Math.min(1, s.sfxVolume) * 0.3) : CONFIG.settings.sfxVolume * 0.3;
          const muted = s.isMuted === true;
          masterGain.gain.setValueAtTime(muted ? 0 : sfxVol, ctx.currentTime);
        }
        if (bgmGain && ctx) {
          bgmGain.gain.setValueAtTime(bgmVolume, ctx.currentTime);
        }
      }
    } catch (_) {
      // fallback to defaults
    }
  }

  function saveSettings() {
    try {
      const isM = masterGain ? masterGain.gain.value === 0 : false;
      const sfxRaw = masterGain ? masterGain.gain.value / 0.3 : CONFIG.settings.sfxVolume;
      localStorage.setItem(CONFIG.settings.storageKey, JSON.stringify({
        bgmVolume: bgmVolume,
        sfxVolume: Math.max(0, Math.min(1, sfxRaw)),
        isMuted: isM
      }));
    } catch (_) {}
  }

  // --- SFX Volume ---
  function setSFXVolume(vol) {
    if (!masterGain || !ctx) return;
    const v = Math.max(0, Math.min(1, vol));
    masterGain.gain.setValueAtTime(v * 0.3, ctx.currentTime);
  }

  return {
    init,
    resume,
    playLaser,
    playExplosion,
    playHit,
    playEnemyLaser,
    playPowerup,
    startUnleashDrone,
    stopUnleashDrone,
    playBossAlarm,
    playUpgrade,
    startBGM,
    stopBGM,
    setBGMVolume,
    setSFXVolume,
    getSettings,
    loadSettings,
    saveSettings
  };
})();
