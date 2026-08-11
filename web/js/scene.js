// The single scene that renders and drives Block Breaker.
// Same structure as Block Grid's GameScene: layout from safe-area insets, a
// requestAnimationFrame loop, canvas rendering, pointer input, and DOM overlay
// delegation — but the game is a paddle/ball/brick breaker.
import { BreakerGame, Phase, MAX_HEARTS } from './game.js';
import { COLS } from './levels.js';
import { SkinCatalog } from './skins.js';
import { css } from './color.js';
import { BrickTextureCache, drawPaddle, drawBall, makeBackgroundCanvas, roundRect } from './textures.js';
import { SoundPlayer, Haptics } from './audio.js';
import { SettingsStore } from './storage.js';
import { t } from './i18n.js';

const HUD_HEIGHT = 64;
const GAP_TOP = 12;
const H_PADDING = 14;

const PADDLE_COLOR = { r: 0.99, g: 0.80, b: 0.33 };
const BALL_COLOR = { r: 0.99, g: 0.87, b: 0.45 };

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export class GameScene {
  constructor(canvas, dom) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dom = dom;

    this.settings = SettingsStore;
    this.sound = new SoundPlayer(this.settings);
    this.haptics = new Haptics(this.settings);
    this.bricks = new BrickTextureCache();

    this.game = new BreakerGame();

    // The breaker uses a calm fixed skin (Twilight + Candy) to match Block Grid.
    SkinCatalog.reset();

    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.width = 0;
    this.height = 0;
    this.insets = { top: 24, bottom: 14 };

    this.backgroundCanvas = null;
    this.effects = [];
    this.overlayOpen = false;
    this.lastTime = null;
    this.phaseTime = 0;

    // Geometry (filled in performLayout).
    this.playLeft = 0;
    this.playRight = 0;
    this.brickW = 0;
    this.brickH = 0;
    this.bricksTop = 0;
    this.topWall = 0;
    this.paddle = { x: 0, y: 0, w: 0, h: 0 };
    this.ball = { x: 0, y: 0, r: 0, vx: 0, vy: 0 };
    this.speed = 0;
    this.keys = { left: false, right: false };

    this.bindEvents();
    this.resize();
    this.dockBall();
    this.updateHud();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // MARK: - Insets / layout

  measureInsets() {
    const probe = document.getElementById('safe-probe');
    if (!probe) return;
    const s = getComputedStyle(probe);
    const top = parseFloat(s.paddingTop) || 0;
    const bottom = parseFloat(s.paddingBottom) || 0;
    this.insets = { top: Math.max(top, 24), bottom: Math.max(bottom, 14) };
  }

  resize() {
    this.measureInsets();
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.performLayout();
    this.backgroundCanvas = makeBackgroundCanvas(w, h);
    this.positionHud();
  }

  performLayout() {
    this.playLeft = H_PADDING;
    this.playRight = this.width - H_PADDING;
    const playWidth = this.playRight - this.playLeft;

    this.brickW = playWidth / COLS;
    this.brickH = clamp(this.brickW * 0.52, 16, 34);
    this.bricks.prepare(this.brickW, this.brickH);

    this.bricksTop = this.insets.top + HUD_HEIGHT + GAP_TOP;
    this.topWall = this.insets.top + HUD_HEIGHT + 2;

    const paddleW = clamp(playWidth * 0.24, 74, 140);
    const paddleH = clamp(this.brickH * 0.6, 13, 18);
    const paddleY = this.height - this.insets.bottom - paddleH - 26;
    const keepX = this.paddle.w ? this.paddle.x / (this.playRight - this.playLeft) : 0.5;
    this.paddle = { x: 0, y: paddleY, w: paddleW, h: paddleH };
    this.paddle.x = clamp(
      this.playLeft + paddleW / 2 + keepX * (playWidth - paddleW),
      this.playLeft + paddleW / 2,
      this.playRight - paddleW / 2,
    );

    this.ball.r = clamp(this.brickH * 0.42, 7, 12);
    this.speed = this.launchSpeed();

    if (this.game.phase === Phase.ready) this.dockBall();
  }

  launchSpeed() {
    const base = clamp(this.height * 0.62, 320, 720);
    return base * (1 + 0.045 * this.game.levelIndex);
  }

  positionHud() {
    const header = this.dom.header;
    header.style.top = `${this.insets.top}px`;
    header.style.height = `${HUD_HEIGHT}px`;
  }

  brickRect(brick) {
    return {
      x: this.playLeft + brick.col * this.brickW,
      y: this.bricksTop + brick.row * this.brickH,
      w: this.brickW,
      h: this.brickH,
    };
  }

  // MARK: - Ball state

  dockBall() {
    this.ball.x = this.paddle.x;
    this.ball.y = this.paddle.y - this.ball.r - 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }

  launchBall() {
    if (this.game.phase !== Phase.ready) return;
    this.game.phase = Phase.playing;
    this.phaseTime = performance.now() / 1000;
    const offset = clamp((this.ball.x - this.paddle.x) / (this.paddle.w / 2), -0.6, 0.6);
    const angle = offset * (Math.PI / 4); // up, slightly toward the tap side
    this.speed = this.launchSpeed();
    this.ball.vx = Math.sin(angle) * this.speed;
    this.ball.vy = -Math.cos(angle) * this.speed;
    this.sound.play('pickUp');
  }

  // MARK: - Input

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));

    const pointerMove = (clientX) => {
      if (this.overlayOpen) return;
      const half = this.paddle.w / 2;
      this.paddle.x = clamp(clientX, this.playLeft + half, this.playRight - half);
      if (this.game.phase === Phase.ready) this.dockBall();
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.overlayOpen) return;
      this.sound.unlock();
      this.canvas.setPointerCapture?.(e.pointerId);
      pointerMove(e.clientX);
      if (this.game.phase === Phase.ready) this.launchBall();
    });
    // On touch, pointermove only fires while pressed; on desktop, hover also
    // moves the paddle, which feels natural for mouse play.
    this.canvas.addEventListener('pointermove', (e) => {
      pointerMove(e.clientX);
    });

    // Keyboard for desktop.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = true;
      else if (e.key === 'ArrowRight') this.keys.right = true;
      else if (e.key === ' ' || e.key === 'ArrowUp') {
        if (this.game.phase === Phase.ready) this.launchBall();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') this.keys.left = false;
      else if (e.key === 'ArrowRight') this.keys.right = false;
    });
  }

  // MARK: - Simulation

  step(dt) {
    if (this.overlayOpen) return;

    // Keyboard paddle movement.
    if (this.keys.left || this.keys.right) {
      const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
      const half = this.paddle.w / 2;
      this.paddle.x = clamp(this.paddle.x + dir * this.width * 1.2 * dt,
        this.playLeft + half, this.playRight - half);
      if (this.game.phase === Phase.ready) this.dockBall();
    }

    if (this.game.phase === Phase.levelClear) {
      if (performance.now() / 1000 - this.phaseTime > 0.95) this.finishLevelClear();
      return;
    }
    if (this.game.phase !== Phase.playing) return;

    // Sub-step so a fast ball can't tunnel through bricks.
    const dist = Math.hypot(this.ball.vx, this.ball.vy) * dt;
    const steps = clamp(Math.ceil(dist / (this.ball.r * 0.8)), 1, 8);
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      this.ball.x += this.ball.vx * h;
      this.ball.y += this.ball.vy * h;
      if (this.resolveWalls()) break;
      this.resolvePaddle();
      this.resolveBricks();
      if (this.game.phase !== Phase.playing) break;
    }
  }

  resolveWalls() {
    const b = this.ball;
    if (b.x - b.r < this.playLeft) { b.x = this.playLeft + b.r; b.vx = Math.abs(b.vx); this.sound.play('button'); }
    else if (b.x + b.r > this.playRight) { b.x = this.playRight - b.r; b.vx = -Math.abs(b.vx); this.sound.play('button'); }
    if (b.y - b.r < this.topWall) { b.y = this.topWall + b.r; b.vy = Math.abs(b.vy); this.sound.play('button'); }

    // Missed the paddle — fell off the bottom.
    if (b.y - b.r > this.height) {
      const over = this.game.loseHeart();
      this.updateHud();
      if (over) {
        this.sound.play('gameOver');
        this.haptics.gameOver();
        this.presentGameOver();
      } else {
        this.sound.play('invalid');
        this.haptics.invalid();
        this.dockBall();
      }
      return true;
    }
    return false;
  }

  resolvePaddle() {
    const b = this.ball;
    const p = this.paddle;
    if (b.vy <= 0) return;
    const left = p.x - p.w / 2;
    const right = p.x + p.w / 2;
    if (b.y + b.r >= p.y && b.y - b.r <= p.y + p.h && b.x >= left - b.r && b.x <= right + b.r) {
      b.y = p.y - b.r;
      const offset = clamp((b.x - p.x) / (p.w / 2), -1, 1);
      const angle = offset * (Math.PI / 3); // up to 60°
      this.speed = Math.min(this.speed * 1.012, this.launchSpeed() * 1.5);
      b.vx = Math.sin(angle) * this.speed;
      b.vy = -Math.cos(angle) * this.speed;
      this.sound.play('pickUp');
      this.haptics.pickUp();
    }
  }

  resolveBricks() {
    const b = this.ball;
    for (const brick of this.game.bricks) {
      if (!brick.alive) continue;
      const r = this.brickRect(brick);
      const nearestX = clamp(b.x, r.x, r.x + r.w);
      const nearestY = clamp(b.y, r.y, r.y + r.h);
      const dx = b.x - nearestX;
      const dy = b.y - nearestY;
      if (dx * dx + dy * dy > b.r * b.r) continue;

      // Reflect along the least-penetrated axis.
      const overlapX = b.r - Math.abs(dx);
      const overlapY = b.r - Math.abs(dy);
      if (Math.abs(dx) > Math.abs(dy) || (dy === 0 && dx !== 0)) {
        b.vx = dx >= 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
        b.x += (dx >= 0 ? 1 : -1) * Math.max(0.5, overlapX);
      } else {
        b.vy = dy >= 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
        b.y += (dy >= 0 ? 1 : -1) * Math.max(0.5, overlapY);
      }

      brick.alive = false;
      this.spawnBrickBurst(r, brick.colorIndex);
      this.sound.play('place');
      this.haptics.place();

      if (this.game.isCleared) this.beginLevelClear();
      break; // one brick per sub-step
    }
  }

  // MARK: - Level flow

  beginLevelClear() {
    this.game.phase = Phase.levelClear;
    this.phaseTime = performance.now() / 1000;
    this.sound.play('levelUp');
    this.haptics.clearLines();
  }

  finishLevelClear() {
    const won = this.game.advanceLevel();
    if (won) {
      this.presentVictory();
    } else {
      this.performLayout();
      this.dockBall();
      this.updateHud();
    }
  }

  startNewGame() {
    this.effects = [];
    this.game.restartFromStart();
    this.performLayout();
    this.dockBall();
    this.updateHud();
  }

  retryLevel() {
    this.effects = [];
    this.game.reset(this.game.levelIndex);
    this.performLayout();
    this.dockBall();
    this.updateHud();
  }

  // MARK: - Effects

  spawnBrickBurst(rect, colorIndex) {
    const colors = SkinCatalog.blockPalette.colors;
    const color = colors[colorIndex % colors.length];
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const start = performance.now() / 1000;
    const bits = [];
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.5;
      const sp = 60 + Math.random() * 90;
      bits.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, s: 3 + Math.random() * 3 });
    }
    const fill = css(color);
    this.effects.push((ctx, now) => {
      const t = now - start;
      if (t > 0.5) return false;
      const alpha = 1 - t / 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      for (const p of bits) {
        const px = p.x + p.vx * t;
        const py = p.y + p.vy * t + 140 * t * t;
        ctx.fillRect(px - p.s / 2, py - p.s / 2, p.s, p.s);
      }
      ctx.restore();
      return true;
    });
  }

  drawEffects(ctx, now) {
    if (this.effects.length === 0) return;
    this.effects = this.effects.filter((fx) => fx(ctx, now));
  }

  // MARK: - Overlays (delegated to DOM via main.js)

  presentSettings() {
    this.overlayOpen = true;
    this.dom.onPresentSettings?.();
  }
  presentGameOver() {
    this.overlayOpen = true;
    this.dom.onPresentGameOver?.({ level: this.game.levelNumber });
  }
  presentVictory() {
    this.overlayOpen = true;
    this.dom.onPresentVictory?.({ levels: this.game.levelCount });
  }
  dismissOverlay() {
    this.overlayOpen = false;
    this.lastTime = null; // avoid a dt spike after a pause
  }

  // MARK: - HUD

  updateHud() {
    this.dom.setHearts?.(this.game.hearts, MAX_HEARTS);
    this.dom.setLevel?.(this.game.levelNumber, this.game.levelCount);
  }

  // MARK: - Render loop

  loop(ts) {
    const now = ts / 1000;
    if (this.lastTime === null) this.lastTime = now;
    const dt = clamp(now - this.lastTime, 0, 0.033);
    this.lastTime = now;

    this.step(dt);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.backgroundCanvas) ctx.drawImage(this.backgroundCanvas, 0, 0, this.width, this.height);

    this.drawBricks(ctx);
    this.drawPaddleAndBall(ctx);
    this.drawEffects(ctx, now);
    this.drawBanner(ctx, now);

    requestAnimationFrame(this.loop);
  }

  drawBricks(ctx) {
    for (const brick of this.game.bricks) {
      if (!brick.alive) continue;
      const r = this.brickRect(brick);
      const tex = this.bricks.tile(brick.colorIndex);
      ctx.drawImage(tex, r.x, r.y, r.w, r.h);
    }
  }

  drawPaddleAndBall(ctx) {
    const p = this.paddle;
    drawPaddle(ctx, p.x - p.w / 2, p.y, p.w, p.h, PADDLE_COLOR);
    drawBall(ctx, this.ball.x, this.ball.y, this.ball.r, BALL_COLOR);
  }

  drawBanner(ctx, now) {
    let text = null;
    if (this.game.phase === Phase.ready && !this.overlayOpen) text = t('tapToLaunch');
    else if (this.game.phase === Phase.levelClear) text = t('levelCleared');
    if (!text) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
    const big = this.game.phase === Phase.levelClear;
    const family = document.documentElement.dir === 'rtl'
      ? '"Fredoka", "Baloo 2", system-ui, sans-serif'
      : '"Baloo 2", system-ui, sans-serif';
    ctx.font = `${big ? 800 : 700} ${big ? 34 : 20}px ${family}`;
    const y = big ? this.height * 0.42 : this.paddle.y - 46;
    let alpha = 0.9;
    if (this.game.phase === Phase.ready) {
      alpha = 0.55 + 0.35 * Math.sin(now * 3); // gentle pulse
    }
    ctx.globalAlpha = clamp01(alpha);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, this.width / 2, y);
    ctx.restore();
  }
}
