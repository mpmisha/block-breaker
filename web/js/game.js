// Game rules and state for Block Breaker — everything except pixel geometry and
// rendering (which live in scene.js). Mirrors the "engine holds the rules"
// split used by Block Grid's GameEngine.
import { LEVELS, COLS, parseLevel } from './levels.js';
import { ProgressStore } from './storage.js';

const MAX_HEARTS = 3;

// Phases the scene reacts to.
const Phase = {
  ready: 'ready',       // ball docked on the paddle, waiting to launch
  playing: 'playing',   // ball in motion
  levelClear: 'levelClear',
  gameOver: 'gameOver',
  victory: 'victory',
};

class BreakerGame {
  constructor() {
    this.levelCount = LEVELS.length;
    this.cols = COLS;
    this.reset(ProgressStore.level);
  }

  reset(levelIndex = 0) {
    this.hearts = MAX_HEARTS;
    this.loadLevel(this.clampLevel(levelIndex));
  }

  clampLevel(index) {
    if (!Number.isFinite(index) || index < 0) return 0;
    return index % this.levelCount;
  }

  loadLevel(index) {
    this.levelIndex = this.clampLevel(index);
    const parsed = parseLevel(LEVELS[this.levelIndex]);
    this.rows = parsed.rows;
    this.bricks = parsed.bricks;
    this.phase = Phase.ready;
    ProgressStore.level = this.levelIndex;
  }

  get levelNumber() {
    return this.levelIndex + 1;
  }

  get aliveBricks() {
    return this.bricks.filter((b) => b.alive);
  }

  get isCleared() {
    return this.bricks.every((b) => !b.alive);
  }

  // Called by the scene when the ball leaves the bottom of the screen.
  loseHeart() {
    if (this.hearts > 0) this.hearts -= 1;
    if (this.hearts <= 0) {
      this.phase = Phase.gameOver;
      return true; // game over
    }
    this.phase = Phase.ready;
    return false;
  }

  // Advance after a level is cleared; returns true when the whole game is won.
  advanceLevel() {
    if (this.levelIndex + 1 >= this.levelCount) {
      this.phase = Phase.victory;
      // Loop back to the start for the next play-through.
      ProgressStore.level = 0;
      return true;
    }
    this.loadLevel(this.levelIndex + 1);
    return false;
  }

  restartFromStart() {
    ProgressStore.level = 0;
    this.reset(0);
  }
}

export { BreakerGame, Phase, MAX_HEARTS };
