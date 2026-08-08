# Block Breaker 🧱

A calm, ad-free brick-breaker game for kids — part of the [Playground](https://mpmisha.github.io/playground/) hub.

**Play:** https://mpmisha.github.io/block-breaker/

Bounce the ball off the paddle to break every brick. Clear all 12 hand-designed
levels to win. You get 3 hearts — lose one each time the ball drops past the
paddle. No ads, no accounts, no internet required after the first load.

## How to play

- **Move the paddle:** slide your finger (or move the mouse) left and right.
- **Launch the ball:** tap anywhere to release the ball from the paddle.
- **Goal:** break all the bricks in a level to advance to the next.
- **Hearts:** you start with 3. Miss the ball and you lose one. Lose all three
  and it's game over — but you can try the level again.
- **Win:** clear all levels for a victory screen, then play again.

## Tech

Pure vanilla JavaScript (ES modules), an HTML canvas, and the Web Audio API — no
frameworks, no build step. It's a PWA: installable to the home screen and fully
playable offline via a service worker.

It shares the same visual and code language as its sibling game
[Block Grid](https://mpmisha.github.io/block-grid-kids/): the glossy candy block
palette, the twilight background, rounded panels, and gentle sound cues.

## Structure

```
web/
  index.html              # app shell + HUD + overlays
  styles.css              # HUD, panels, toggles, overlays
  manifest.webmanifest    # PWA manifest
  service-worker.js       # offline cache
  icons/                  # app icons (generated with PIL)
  js/
    main.js               # DOM wiring (HUD, overlays, back-to-hub)
    scene.js              # canvas renderer, physics, input, game loop
    game.js               # rules & state (hearts, levels, victory)
    levels.js             # 12 brick layouts
    textures.js           # glossy brick / paddle / ball rendering
    skins.js              # shared candy color palette
    color.js              # color helpers
    audio.js              # Web Audio sound + haptics
    storage.js            # settings + level progress (localStorage)
```

## Adding to the hub

This game follows the Playground game contract: relative asset paths, accepts a
`?hub=<url>` param, and posts `{ type: 'playground:back' }` to its parent window
when embedded so the "Back to Games" control returns to the hub without leaving
the PWA. See the hub's `shared/ADDING_A_GAME.md`.

## Local development

```
cd web
python3 -m http.server 8000
# open http://localhost:8000
```
