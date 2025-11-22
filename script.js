const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");

const CELL = 20;
const COLS = 10;
const ROWS = 20;

const COLORS = {
  I: "#06b6d4",
  O: "#facc15",
  T: "#c084fc",
  S: "#22c55e",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#f97316",
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let current = null;
let nextPiece = null;
let dropCounter = 0;
let dropInterval = 700;
let lastTime = 0;
let score = 0;
let lines = 0;

function drawCell(x, y, color, targetCtx = ctx) {
  targetCtx.fillStyle = color;
  targetCtx.strokeStyle = "rgba(255,255,255,0.08)";
  targetCtx.lineWidth = 1;
  targetCtx.fillRect(x * CELL, y * CELL, CELL, CELL);
  targetCtx.strokeRect(x * CELL, y * CELL, CELL, CELL);
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0b1221";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        drawCell(x, y, board[y][x]);
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }
  if (current) drawPiece(current);
}

function createPiece(type) {
  return {
    matrix: SHAPES[type].map((row) => [...row]),
    pos: { x: Math.floor(COLS / 2) - 1, y: -1 },
    color: COLORS[type],
    type,
  };
}

function collide(piece) {
  const { matrix, pos } = piece;
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const boardY = y + pos.y;
      const boardX = x + pos.x;
      if (boardY >= ROWS || boardX < 0 || boardX >= COLS || (boardY >= 0 && board[boardY][boardX])) {
        return true;
      }
    }
  }
  return false;
}

function merge(piece) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value && piece.pos.y + y >= 0) {
        board[piece.pos.y + y][piece.pos.x + x] = piece.color;
      }
    });
  });
}

function rotate(matrix) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      rotated[x][size - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function rotatePiece() {
  const clone = {
    ...current,
    matrix: rotate(current.matrix),
  };
  if (!collide(clone)) {
    current.matrix = clone.matrix;
  }
}

function drop() {
  current.pos.y++;
  if (collide(current)) {
    current.pos.y--;
    merge(current);
    sweep();
    spawnPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(current)) {
    current.pos.y++;
  }
  current.pos.y--;
  merge(current);
  sweep();
  spawnPiece();
  dropCounter = 0;
}

function move(dir) {
  current.pos.x += dir;
  if (collide(current)) {
    current.pos.x -= dir;
  }
}

function sweep() {
  let rowsRemoved = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(Boolean)) {
      rowsRemoved++;
      for (let moveY = y; moveY > 0; moveY--) {
        board[moveY] = [...board[moveY - 1]];
      }
      board[0] = Array(COLS).fill(null);
      y++;
    }
  }
  if (rowsRemoved) {
    const points = [0, 100, 300, 500, 800];
    score += points[rowsRemoved] || rowsRemoved * 200;
    lines += rowsRemoved;
    dropInterval = Math.max(200, 700 - lines * 10);
    updateScore();
  }
}

function drawPiece(piece, offset = piece.pos, targetCtx = ctx) {
  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const drawX = x + offset.x;
      const drawY = y + offset.y;
      drawCell(drawX, drawY, piece.color, targetCtx);
    });
  });
}

function spawnPiece() {
  current = nextPiece || createRandomPiece();
  nextPiece = createRandomPiece();
  current.pos = { x: Math.floor(COLS / 2) - Math.ceil(current.matrix.length / 2), y: -1 };
  drawNext();
  if (collide(current)) {
    resetGame();
  }
}

function createRandomPiece() {
  const types = Object.keys(SHAPES);
  const type = types[Math.floor(Math.random() * types.length)];
  return createPiece(type);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  nextCtx.fillStyle = "#0f172a";
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;
  const offset = {
    x: Math.floor((4 - nextPiece.matrix.length) / 2),
    y: Math.floor((4 - nextPiece.matrix.length) / 2),
  };
  drawPiece(nextPiece, offset, nextCtx);
}

function updateScore() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines.toLocaleString();
}

function resetGame() {
  board.forEach((row) => row.fill(null));
  score = 0;
  lines = 0;
  dropInterval = 700;
  updateScore();
  spawnPiece();
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter > dropInterval) {
    drop();
  }
  drawBoard();
  requestAnimationFrame(update);
}

function handleKey(e) {
  switch (e.code) {
    case "ArrowLeft":
      move(-1);
      break;
    case "ArrowRight":
      move(1);
      break;
    case "ArrowDown":
      drop();
      break;
    case "ArrowUp":
      rotatePiece();
      break;
    case "Space":
      hardDrop();
      break;
  }
}

document.addEventListener("keydown", handleKey);

document.getElementById("left").addEventListener("click", () => move(-1));
document.getElementById("right").addEventListener("click", () => move(1));
document.getElementById("rotate").addEventListener("click", rotatePiece);
document.getElementById("drop").addEventListener("click", drop);
document.getElementById("hard-drop").addEventListener("click", hardDrop);

resetGame();
update();
