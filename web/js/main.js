// Entry point: wires the DOM HUD/overlays to the canvas GameScene.
// Mirrors Block Grid's main.js wiring.
import { GameScene } from './scene.js';
import { SettingsStore } from './storage.js';
import { resolveLang, applyLang, isValidLang, t } from './i18n.js';

const $ = (id) => document.getElementById(id);

const canvas = $('game');

const dom = {
  header: $('hud'),
  setHearts,
  setLevel,
  onPresentSettings: openSettings,
  onPresentGameOver: openGameOver,
  onPresentVictory: openVictory,
};

const scene = new GameScene(canvas, dom);

// ---- Captions we may need to re-translate on a live language switch ----
let lastGameOverLevel = null;
let lastVictoryLevels = null;

// ---- i18n: resolve + apply the platform language, then translate the DOM ----

function translateDom() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
  // Dynamic strings (level HUD + panel line) come from the scene's live state.
  scene.updateHud();
  // Re-apply any open overlay captions in the new language.
  if (lastGameOverLevel != null) {
    $('go-caption').textContent = t('reachedLevel', { n: lastGameOverLevel });
  }
  if (lastVictoryLevels != null) {
    $('victory-caption').textContent = t('clearedAll', { n: lastVictoryLevels });
  }
}

function setLanguage(code, persist = false) {
  applyLang(code, persist);
  translateDom();
}

// Initial language: URL ?lang= → localStorage 'lang' → navigator auto-detect.
setLanguage(resolveLang());

// Live updates from the hub (same-origin postMessage) when language changes
// while this game is open in the hub's iframe player.
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin) return;
  const data = e.data;
  if (data && data.type === 'playground:lang' && isValidLang(data.lang)) {
    setLanguage(data.lang);
  }
});

// Also honor a language change made in another same-origin tab (e.g. the hub
// standalone) via the shared localStorage 'lang' key.
window.addEventListener('storage', (e) => {
  if (e.key === 'lang' && isValidLang(e.newValue)) {
    setLanguage(e.newValue);
  }
});

// ---- HUD ----

function setHearts(current, max) {
  const el = $('hud-hearts');
  let html = '';
  for (let i = 0; i < max; i++) {
    html += `<span class="heart${i < current ? '' : ' lost'}">❤</span>`;
  }
  el.innerHTML = html;
}

function setLevel(level, total) {
  $('hud-level').textContent = t('levelHud', { n: level });
  $('settings-level').textContent = t('levelOf', { n: level, total });
}

// ---- Gear ----

$('gear').addEventListener('click', () => {
  scene.sound.unlock();
  scene.sound.play('button');
  scene.presentSettings();
});

// ---- Settings overlay ----

const settingsOverlay = $('settings-overlay');
const toggleSound = $('toggle-sound');
const toggleHaptics = $('toggle-haptics');

function syncSettingsUi() {
  toggleSound.classList.toggle('on', SettingsStore.isSoundEnabled);
  toggleHaptics.classList.toggle('on', SettingsStore.areHapticsEnabled);
}

function openSettings() {
  syncSettingsUi();
  settingsOverlay.hidden = false;
}

function closeSettings() {
  settingsOverlay.hidden = true;
  scene.dismissOverlay();
}

toggleSound.addEventListener('click', () => {
  SettingsStore.isSoundEnabled = !SettingsStore.isSoundEnabled;
  toggleSound.classList.toggle('on', SettingsStore.isSoundEnabled);
  scene.sound.play('button');
});

toggleHaptics.addEventListener('click', () => {
  SettingsStore.areHapticsEnabled = !SettingsStore.areHapticsEnabled;
  toggleHaptics.classList.toggle('on', SettingsStore.areHapticsEnabled);
  scene.haptics.pickUp();
});

$('btn-new-game').addEventListener('click', () => {
  scene.sound.play('button');
  closeSettings();
  scene.startNewGame();
});

$('btn-close').addEventListener('click', () => {
  scene.sound.play('button');
  closeSettings();
});

settingsOverlay.querySelector('[data-dismiss="settings"]').addEventListener('click', closeSettings);

// ---- Back to hub ----
const HUB_URL = (() => {
  const param = new URLSearchParams(location.search).get('hub');
  if (param) { try { return new URL(param, location.href).href; } catch { /* ignore */ } }
  return 'https://mpmisha.github.io/playground/';
})();
const backHubBtn = $('btn-back-hub');
const embeddedInHub = window.self !== window.top;
backHubBtn.href = HUB_URL;
// The shared Sound/Vibration toggles live in the hub now. When embedded, hide
// them (and the redundant in-panel Back button — the hub's player bar handles
// going back). The game still honors the shared settings automatically.
if (embeddedInHub) {
  toggleSound.closest('.row').hidden = true;
  toggleHaptics.closest('.row').hidden = true;
  backHubBtn.hidden = true;
} else {
  backHubBtn.hidden = false;
}
backHubBtn.addEventListener('click', (e) => {
  scene.sound.play('button');
  if (embeddedInHub) {
    e.preventDefault();
    try {
      window.parent.postMessage({ type: 'playground:back' }, new URL(HUB_URL).origin);
    } catch {
      window.parent.postMessage({ type: 'playground:back' }, '*');
    }
  }
});

// ---- Game over overlay ----

const gameoverOverlay = $('gameover-overlay');

function openGameOver({ level }) {
  lastGameOverLevel = level;
  $('go-caption').textContent = t('reachedLevel', { n: level });
  gameoverOverlay.hidden = false;
}

$('btn-try-again').addEventListener('click', () => {
  scene.sound.play('button');
  gameoverOverlay.hidden = true;
  scene.dismissOverlay();
  scene.retryLevel();
});

// ---- Victory overlay ----

const victoryOverlay = $('victory-overlay');

function openVictory({ levels }) {
  lastVictoryLevels = levels;
  $('victory-caption').textContent = t('clearedAll', { n: levels });
  victoryOverlay.hidden = false;
}

$('btn-play-again').addEventListener('click', () => {
  scene.sound.play('button');
  victoryOverlay.hidden = true;
  scene.dismissOverlay();
  scene.startNewGame();
});

// ---- Service worker (offline support) ----

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
  // When a new SW takes control (skipWaiting + clients.claim), reload once so
  // the fresh shell is running. Guard against reload loops.
  let reloadedForSw = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForSw) return;
    reloadedForSw = true;
    window.location.reload();
  });
}
