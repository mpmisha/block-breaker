// Entry point: wires the DOM HUD/overlays to the canvas GameScene.
// Mirrors Block Grid's main.js wiring.
import { GameScene } from './scene.js';
import { SettingsStore } from './storage.js';

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
  $('hud-level').textContent = `Level ${level}`;
  $('settings-level').textContent = `Level ${level} of ${total}`;
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
  $('go-caption').textContent = `You reached Level ${level}`;
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
  $('victory-caption').textContent = `You cleared all ${levels} levels!`;
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
}
