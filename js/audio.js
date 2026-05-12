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

  return {
    init,
    resume,
    playLaser,
    playExplosion,
    playHit,
    playPowerup,
    startUnleashDrone,
    stopUnleashDrone,
    playBossAlarm
  };
})();
