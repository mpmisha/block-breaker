// Brick / paddle / ball textures + the gradient background, in the same visual
// language as Block Grid (glossy raised faces, top highlight, soft body shadow).
// Reuses the shared colour math and skin palettes.
import { css, adjustBrightness, lightened } from './color.js';
import { SkinCatalog } from './skins.js';

const DPR = Math.min(window.devicePixelRatio || 1, 3);

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * DPR));
  c.height = Math.max(1, Math.round(h * DPR));
  const ctx = c.getContext('2d');
  ctx.scale(DPR, DPR);
  return { canvas: c, ctx };
}

// Cache of rendered brick tiles keyed by colour index + size, flushed when the
// skin or brick size changes.
class BrickTextureCache {
  constructor() {
    this.tiles = new Map();
    this.w = 0;
    this.h = 0;
    this.skinRevision = -1;
  }

  prepare(w, h) {
    const rw = Math.round(w * 2) / 2;
    const rh = Math.round(h * 2) / 2;
    if (rw !== this.w || rh !== this.h) {
      this.w = rw;
      this.h = rh;
      this.tiles.clear();
    }
    if (this.skinRevision !== SkinCatalog.revision) {
      this.tiles.clear();
      this.skinRevision = SkinCatalog.revision;
    }
  }

  tile(colorIndex) {
    if (this.tiles.has(colorIndex)) return this.tiles.get(colorIndex);
    const colors = SkinCatalog.blockPalette.colors;
    const color = colors[((colorIndex % colors.length) + colors.length) % colors.length];
    const tex = this.makeBrick(color, Math.max(2, this.w), Math.max(2, this.h));
    this.tiles.set(colorIndex, tex);
    return tex;
  }

  makeBrick(color, w, h) {
    const { canvas, ctx } = makeCanvas(w, h);
    const radius = Math.min(w, h) * 0.26;

    // Body (bevel / shadow).
    const bodyInset = Math.max(0.5, h * 0.04);
    ctx.fillStyle = css(adjustBrightness(color, 0.60));
    roundRect(ctx, bodyInset, bodyInset, w - bodyInset * 2, h - bodyInset * 2, radius);
    ctx.fill();

    // Raised face, nudged up so the bottom edge reads as a shadow.
    const fx = w * 0.06;
    const fy = h * 0.08;
    const fw = w - fx * 2;
    const fh = h - h * 0.24;
    ctx.fillStyle = css(color);
    roundRect(ctx, fx, fy, fw, fh, radius * 0.7);
    ctx.fill();

    ctx.save();
    roundRect(ctx, fx, fy, fw, fh, radius * 0.7);
    ctx.clip();
    // Glossy top band.
    ctx.fillStyle = 'rgba(255,255,255,0.24)';
    ctx.fillRect(fx, fy, fw, fh * 0.44);
    // Small corner shine.
    const hs = Math.min(fw, fh) * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    roundRect(ctx, fx + fw * 0.06, fy + fh * 0.12, hs, hs * 0.42, hs * 0.3);
    ctx.fill();
    ctx.restore();

    return canvas;
  }
}

// Draw the paddle as a glossy rounded bar (drawn each frame; cheap).
function drawPaddle(ctx, x, y, w, h, color) {
  const radius = h / 2;
  ctx.save();
  ctx.fillStyle = css(adjustBrightness(color, 0.6));
  roundRect(ctx, x, y + h * 0.14, w, h, radius);
  ctx.fill();

  ctx.fillStyle = css(color);
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();

  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  roundRect(ctx, x + w * 0.02, y + h * 0.12, w * 0.96, h * 0.4, radius);
  ctx.fill();
  ctx.restore();
}

// Draw the ball as a glossy sphere.
function drawBall(ctx, cx, cy, r, color) {
  ctx.save();
  const grad = ctx.createRadialGradient(
    cx - r * 0.35, cy - r * 0.4, r * 0.15,
    cx, cy, r,
  );
  grad.addColorStop(0, css(lightened(color, 0.6)));
  grad.addColorStop(0.5, css(color));
  grad.addColorStop(1, css(adjustBrightness(color, 0.7)));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.32, cy - r * 0.36, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The gradient backdrop plus the skin's pattern (ported from Block Grid).
function makeBackgroundCanvas(width, height) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(width * DPR));
  c.height = Math.max(2, Math.round(height * DPR));
  const ctx = c.getContext('2d');
  ctx.scale(DPR, DPR);

  const surface = SkinCatalog.surfacePalette;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, css(surface.backgroundTop));
  grad.addColorStop(1, css(surface.backgroundBottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return c;
}

export { BrickTextureCache, drawPaddle, drawBall, makeBackgroundCanvas, roundRect };
