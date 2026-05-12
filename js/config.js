/**
 * config.js - All tuning constants for Octopus Invaders
 * Color palette, speeds, enemy stats, sizes, upgrade tiers, etc.
 */

// Mobile detection helper — callable before CONFIG is referenced elsewhere
function isMobile() {
  return 'ontouchstart' in window ||
         navigator.maxTouchPoints > 0 ||
         /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const CONFIG = {
  // --- Colors ---
  colors: {
    bg: '#0D1117',
    cyan: '#4ECDC4',
    green: '#44D7A0',
    gold: '#FFD700',
    white: '#FFFFFF',
    pink: '#FF6B9D',
    blue: '#4DA6FF',
    cyanLight: '#00FFFF',
    purple: '#C77DFF',
    orange: '#FF8C00',
    yellow: '#FFE600',
    gunmetal: '#3A3F47',
    red: '#FF4444',
    rainbow: ['#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#0088FF', '#8800FF']
  },

  // --- Player ---
  player: {
    radius: 18,
    contactBuffer: 30,
    lerpFactor: 0.35,
    maxHealth: 100,
    fireRate: 120,       // ms between shots
    unleashDuration: 5000, // ms
    unleashMultiplier: 3,
    upgradeInterval: 3   // levels per tier
  },

  // --- Bullet speeds per tier ---
  bulletSpeeds: [8, 10, 12, 14],

  // --- Enemy sizes (must be large enough for collision) ---
  enemySizes: {
    small: 36,
    medium: 48,
    baby: 20,
    crab: 30,
    boss: 150
  },

  // --- Enemy stats ---
  enemyStats: {
    small:  { hp: 10, speed: 1.5, score: 10, color: '#FF6B9D' },
    medium: { hp: 25, speed: 1.0, score: 25, color: '#4DA6FF' },
    baby:   { hp: 5,  speed: 2.5, score: 5,  color: '#00FFFF' },
    crab:   { hp: 15, speed: 2.0, score: 15, color: '#FF8800' },
    boss:   { hp: 500, speed: 0.5, score: 500, color: '#C77DFF' }
  },

  // --- Boss ---
  boss: {
    interval: 5,          // boss every N levels
    tentacles: 8,
    inkBarrageCount: 12
  },

  // --- Waves ---
  waves: {
    baseCount: 12,
    countPerLevel: 4,
    spawnInterval: 1500,  // ms between spawns
    speedScale: 1.15       // speed multiplier per level
  },

  // --- Combo ---
  combo: {
    decayTime: 3000,       // ms before combo resets
    maxMultiplier: 10
  },

  // --- Screen shake ---
  shake: {
    small:  { intensity: 3,  duration: 100 },
    medium: { intensity: 5,  duration: 150 },
    baby:   { intensity: 2,  duration: 80  },
    crab:   { intensity: 3,  duration: 100 },
    boss:   { intensity: 12, duration: 400 }
  },

  // --- Background ---
  background: {
    starCount: 200,
    nebulaCount: 6,
    planetCount: 8,
    cometInterval: 8000    // ms between comet spawns
  },

  // --- Powerup ---
  powerup: {
    radius: 12,
    fallSpeed: 1.5,
    glowPulse: 0.03
  },

  // --- HUD ---
  hud: {
    fontSize: 20,
    font: '20px monospace',
    y: 40,
    padding: 20,
    healthBarWidth: 200,
    healthBarHeight: 14
  }
};
