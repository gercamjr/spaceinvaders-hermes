/**
 * saves.js - Persistent save/load system with localStorage
 * Handles: high scores, total kills, cumulative score, unlocked ships,
 * purchased upgrades, achievements, ship skins, game modes.
 */

const SaveManager = (() => {
  const STORAGE_KEY = 'octopusInvadersSave';

  const DEFAULTS = {
    highScores: [],         // [{score, level, kills, mode, date}]
    totalKills: 0,
    gamesPlayed: 0,
    totalScore: 0,          // cumulative across all sessions
    purchasedUpgrades: {},  // {doubleShot: true, rapidFire: true, ...}
    unlockedSkins: ['default'], // ['default', 'green', 'gold']
    selectedSkin: 'default',
    achievements: {},       // {firstKill: true, level10: false, ...}
    bestArcadeScore: 0,
    bestEndlessScore: 0
  };

  let data = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        data = JSON.parse(raw);
        // Fill in any missing keys from defaults (for old save files)
        for (const key in DEFAULTS) {
          if (!(key in data)) {
            data[key] = JSON.parse(JSON.stringify(DEFAULTS[key]));
          }
        }
      } else {
        data = JSON.parse(JSON.stringify(DEFAULTS));
      }
    } catch (e) {
      console.warn('Failed to load save data, using defaults:', e);
      data = JSON.parse(JSON.stringify(DEFAULTS));
    }
    return data;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save data:', e);
    }
  }

  function get(key) {
    if (!data) load();
    return data[key];
  }

  function set(key, value) {
    if (!data) load();
    data[key] = value;
    save();
  }

  function addScore(score, level, kills, mode) {
    if (!data) load();
    const date = new Date().toISOString().split('T')[0];
    data.highScores.push({ score, level, kills, mode: mode || 'arcade', date });
    data.highScores.sort((a, b) => b.score - a.score);
    data.highScores = data.highScores.slice(0, 10); // keep top 10
    data.totalScore += score;
    data.totalKills += kills;
    data.gamesPlayed++;

    if (mode === 'endless') {
      data.bestEndlessScore = Math.max(data.bestEndlessScore, score);
    } else {
      data.bestArcadeScore = Math.max(data.bestArcadeScore, score);
    }

    // Unlock skins based on total score
    if (data.totalScore >= 50000 && !data.unlockedSkins.includes('rainbow')) {
      data.unlockedSkins.push('rainbow');
    } else if (data.totalScore >= 15000 && !data.unlockedSkins.includes('gold')) {
      data.unlockedSkins.push('gold');
    } else if (data.totalScore >= 5000 && !data.unlockedSkins.includes('green')) {
      data.unlockedSkins.push('green');
    }

    save();
  }

  function purchaseUpgrade(id, cost) {
    if (!data) load();
    if (data.purchasedUpgrades[id]) return false; // already owned
    if (data.totalScore < cost) return false; // can't afford
    data.purchasedUpgrades[id] = true;
    save();
    return true;
  }

  function unlockAchievement(id) {
    if (!data) load();
    if (data.achievements[id]) return false; // already unlocked
    data.achievements[id] = true;
    save();
    return true; // newly unlocked
  }

  function getAchievement(id) {
    if (!data) load();
    return !!data.achievements[id];
  }

  function getAll() {
    if (!data) load();
    return data;
  }

  // Public API
  return {
    load,
    save,
    get,
    set,
    addScore,
    purchaseUpgrade,
    unlockAchievement,
    getAchievement,
    getAll,
    DEFAULTS
  };
})();
