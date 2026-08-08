// Pre-designed brick layouts. Each level is a list of equal-length rows.
// A digit 1-8 places a brick of that colour (colour index = digit - 1, matching
// the active skin's block palette). A '.' (or space) is empty.
//
// All rows in every level are COLS characters wide.

const COLS = 9;

const LEVELS = [
  // 1 — gentle warm-up: three solid rows.
  [
    '111111111',
    '222222222',
    '333333333',
  ],
  // 2 — polka dots.
  [
    '1.1.1.1.1',
    '.2.2.2.2.',
    '3.3.3.3.3',
    '.4.4.4.4.',
  ],
  // 3 — pyramid.
  [
    '....1....',
    '...222...',
    '..33333..',
    '.4444444.',
    '555555555',
  ],
  // 4 — rainbow columns.
  [
    '1.2.3.4.5',
    '1.2.3.4.5',
    '1.2.3.4.5',
    '1.2.3.4.5',
    '1.2.3.4.5',
  ],
  // 5 — framed treasure.
  [
    '666666666',
    '6.......6',
    '6..777..6',
    '6..777..6',
    '6.......6',
    '666666666',
  ],
  // 6 — checkerboard.
  [
    '1.3.5.7.1',
    '.2.4.6.8.',
    '5.7.1.3.5',
    '.6.8.2.4.',
    '1.3.5.7.1',
  ],
  // 7 — diamond ring.
  [
    '....8....',
    '...7.7...',
    '..6...6..',
    '.5.....5.',
    '..6...6..',
    '...7.7...',
    '....8....',
  ],
  // 8 — heart.
  [
    '.88...88.',
    '888888888',
    '888888888',
    '.8888888.',
    '..88888..',
    '...888...',
    '....8....',
  ],
  // 9 — twin towers.
  [
    '22.....22',
    '22.....22',
    '22.....22',
    '22.....22',
    '333333333',
  ],
  // 10 — smiley.
  [
    '.1111111.',
    '1.......1',
    '1.2...2.1',
    '1.......1',
    '1.3...3.1',
    '1..333..1',
    '.1111111.',
  ],
  // 11 — colour blocks.
  [
    '111222333',
    '222333444',
    '333444555',
    '444555666',
  ],
  // 12 — the big wall.
  [
    '888888888',
    '777777777',
    '666666666',
    '555555555',
    '444444444',
    '333333333',
  ],
];

// Turn a level's rows into a flat list of logical bricks.
function parseLevel(rows) {
  const bricks = [];
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const digit = Number(ch);
      if (!Number.isFinite(digit) || digit < 1) continue;
      bricks.push({ row: r, col: c, colorIndex: digit - 1, alive: true });
    }
  });
  return { cols: COLS, rows: rows.length, bricks };
}

export { LEVELS, COLS, parseLevel };
