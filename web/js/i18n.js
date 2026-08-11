// Playground i18n (v1) for Block Breaker. Shared contract across the hub and
// every game. Canonical store: localStorage 'lang' ∈ {'en','he'}. Hub and all
// games are the SAME origin, so this key is shared. English is LTR + fallback;
// Hebrew is RTL. Numbers stay numeric; only text + chrome localize.

export const LANGS = ['en', 'he'];

const STRINGS = {
  en: {
    // Settings panel
    settings: 'Settings',
    sound: 'Sound',
    vibration: 'Vibration',
    restartFromLevel1: 'Restart from Level 1',
    backToGames: 'Back to Games',
    close: 'Close',
    // HUD + status
    livesAria: 'Lives',
    settingsAria: 'Settings',
    levelHud: 'Level {n}',
    levelOf: 'Level {n} of {total}',
    // Canvas banners
    tapToLaunch: 'Tap to launch',
    levelCleared: 'Level Cleared!',
    // Game over
    outOfHeartsAria: 'Out of hearts',
    outOfHearts: 'Out of Hearts',
    reachedLevel: 'You reached Level {n}',
    tryAgain: 'Try Again',
    // Victory
    youWinAria: 'You win',
    youWin: 'You Win!',
    clearedAll: 'You cleared all {n} levels!',
    playAgain: 'Play Again',
  },
  he: {
    settings: 'הגדרות',
    sound: 'צליל',
    vibration: 'רטט',
    restartFromLevel1: 'מתחילים מרמה 1',
    backToGames: 'חזרה למשחקים',
    close: 'סגירה',
    livesAria: 'חיים',
    settingsAria: 'הגדרות',
    levelHud: 'רמה {n}',
    levelOf: 'רמה {n} מתוך {total}',
    tapToLaunch: 'הקישו כדי לשגר',
    levelCleared: 'הרמה הושלמה!',
    outOfHeartsAria: 'נגמרו הלבבות',
    outOfHearts: 'נגמרו הלבבות',
    reachedLevel: 'הגעתם לרמה {n}',
    tryAgain: 'נסו שוב',
    youWinAria: 'ניצחתם',
    youWin: 'ניצחתם!',
    clearedAll: 'סיימתם את כל {n} הרמות!',
    playAgain: 'שחקו שוב',
  },
};

export function isValidLang(code) {
  return LANGS.includes(code);
}

function detectFromNavigator() {
  const list = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ''];
  for (const raw of list) {
    const code = String(raw).toLowerCase();
    if (code.startsWith('he') || code.startsWith('iw')) return 'he';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

// Resolution order: (1) URL ?lang= if valid → also persist; (2) stored 'lang';
// (3) auto-detect. Never let auto-detect overwrite an explicit stored choice.
export function resolveLang() {
  try {
    const param = new URLSearchParams(location.search).get('lang');
    if (param && isValidLang(param)) {
      try { localStorage.setItem('lang', param); } catch { /* ignore */ }
      return param;
    }
  } catch { /* ignore */ }

  try {
    const stored = localStorage.getItem('lang');
    if (stored && isValidLang(stored)) return stored;
  } catch { /* ignore */ }

  return detectFromNavigator();
}

let currentLang = 'en';

export function getLang() { return currentLang; }
export function isRtl() { return currentLang === 'he'; }

export function t(key, params) {
  const dict = STRINGS[currentLang] || STRINGS.en;
  let str = dict[key] != null ? dict[key] : (STRINGS.en[key] != null ? STRINGS.en[key] : key);
  if (params) {
    for (const p of Object.keys(params)) {
      str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), String(params[p]));
    }
  }
  return str;
}

// Apply the locale to the document chrome. `persist` writes an explicit choice.
export function applyLang(code, persist = false) {
  const lang = isValidLang(code) ? code : 'en';
  currentLang = lang;
  if (persist) {
    try { localStorage.setItem('lang', lang); } catch { /* ignore */ }
  }
  const el = document.documentElement;
  el.lang = lang;
  el.dir = lang === 'he' ? 'rtl' : 'ltr';
  return lang;
}
