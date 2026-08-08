// Player settings + level progress via localStorage. Mirrors Block Grid's
// SettingsStore pattern so the two games behave the same.

const KEYS = {
  sound: 'soundEnabled',
  haptics: 'hapticsEnabled',
  level: 'breakerLevel',
};

function readBool(key, fallback) {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === 'true';
}

const SettingsStore = {
  get isSoundEnabled() {
    return readBool(KEYS.sound, true);
  },
  set isSoundEnabled(value) {
    localStorage.setItem(KEYS.sound, value ? 'true' : 'false');
  },
  get areHapticsEnabled() {
    return readBool(KEYS.haptics, true);
  },
  set areHapticsEnabled(value) {
    localStorage.setItem(KEYS.haptics, value ? 'true' : 'false');
  },
};

const ProgressStore = {
  get level() {
    const stored = parseInt(localStorage.getItem(KEYS.level) || '', 10);
    return Number.isFinite(stored) && stored >= 0 ? stored : 0;
  },
  set level(value) {
    try {
      localStorage.setItem(KEYS.level, String(value));
    } catch (_) {
      // Storage may be unavailable; the game still plays fine.
    }
  },
};

export { SettingsStore, ProgressStore };
