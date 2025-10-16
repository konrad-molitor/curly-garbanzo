const GRID_SIZE = 4;
const WIN_TILE = 2048;
const STORAGE_KEY = "bestScore";

class Game2048 {
  constructor() {
    this.boardElement = document.getElementById("board");
    this.scoreElement = document.querySelector("#score .value");
    this.bestElement = document.querySelector("#best .value");
    this.messageElement = document.getElementById("message");
    this.messageText = document.getElementById("message-text");
    this.keepGoingButton = document.getElementById("keep-going");
    this.tryAgainButton = document.getElementById("try-again");
    this.newGameButton = document.getElementById("new-game");

    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.bestScore = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    this.won = false;
    this.keepPlaying = false;
    this.newTilePositions = [];

    this.createBoard();
    this.bindEvents();
    this.start();
  }

  createEmptyGrid() {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  }

  createBoard() {
    this.boardElement.innerHTML = "";
    this.cellElements = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = row;
        cell.dataset.col = col;
        this.boardElement.appendChild(cell);
        this.cellElements.push(cell);
      }
    }
  }

  bindEvents() {
    window.addEventListener("keydown", (event) => {
      const direction = this.mapKeyToDirection(event.key);
      if (!direction) return;
      event.preventDefault();
      this.move(direction);
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;

    const touchThreshold = 30;

    this.boardElement.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchMoved = false;
    });

    this.boardElement.addEventListener("touchmove", (event) => {
      if (event.touches.length !== 1) return;
      touchMoved = true;
    });

    this.boardElement.addEventListener("touchend", (event) => {
      if (!touchMoved) return;
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < touchThreshold) return;

      const direction = Math.abs(deltaX) > Math.abs(deltaY)
        ? (deltaX > 0 ? "right" : "left")
        : (deltaY > 0 ? "down" : "up");

      this.move(direction);
    });

    this.keepGoingButton.addEventListener("click", () => {
      this.keepPlaying = true;
      this.hideMessage();
    });

    const resetHandler = () => this.start();

    this.tryAgainButton.addEventListener("click", resetHandler);
    this.newGameButton.addEventListener("click", resetHandler);
  }

  start() {
    this.grid = this.createEmptyGrid();
    this.score = 0;
    this.won = false;
    this.keepPlaying = false;
    this.newTilePositions = [];
    this.addRandomTile();
    this.addRandomTile();
    this.updateScore(0);
    this.draw();
    this.hideMessage();
  }

  mapKeyToDirection(key) {
    switch (key) {
      case "ArrowUp":
      case "w":
      case "W":
        return "up";
      case "ArrowDown":
      case "s":
      case "S":
        return "down";
      case "ArrowLeft":
      case "a":
      case "A":
        return "left";
      case "ArrowRight":
      case "d":
      case "D":
        return "right";
      default:
        return null;
    }
  }

  addRandomTile() {
    const emptyCells = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (this.grid[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) return;

    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    this.grid[row][col] = value;
    this.newTilePositions.push(`${row}-${col}`);
  }

  move(direction) {
    if (this.isGameTerminated()) return;

    let moved = false;

    switch (direction) {
      case "left":
        for (let row = 0; row < GRID_SIZE; row += 1) {
          const { mergedRow, movedRow } = this.mergeRow(this.grid[row]);
          if (movedRow) moved = true;
          this.grid[row] = mergedRow;
        }
        break;
      case "right":
        for (let row = 0; row < GRID_SIZE; row += 1) {
          const reversed = [...this.grid[row]].reverse();
          const { mergedRow, movedRow } = this.mergeRow(reversed);
          if (movedRow) moved = true;
          this.grid[row] = mergedRow.reverse();
        }
        break;
      case "up":
        for (let col = 0; col < GRID_SIZE; col += 1) {
          const column = this.grid.map((row) => row[col]);
          const { mergedRow, movedRow } = this.mergeRow(column);
          if (movedRow) moved = true;
          for (let row = 0; row < GRID_SIZE; row += 1) {
            this.grid[row][col] = mergedRow[row];
          }
        }
        break;
      case "down":
        for (let col = 0; col < GRID_SIZE; col += 1) {
          const column = this.grid.map((row) => row[col]).reverse();
          const { mergedRow, movedRow } = this.mergeRow(column);
          if (movedRow) moved = true;
          const reversed = mergedRow.reverse();
          for (let row = 0; row < GRID_SIZE; row += 1) {
            this.grid[row][col] = reversed[row];
          }
        }
        break;
      default:
        break;
    }

    if (!moved) return;

    this.addRandomTile();
    this.draw();

    if (!this.won && this.hasWon()) {
      this.won = true;
      this.showMessage("You win!", true);
    } else if (!this.canMove()) {
      this.showMessage("Game over!");
    }
  }

  mergeRow(row) {
    const compacted = row.filter((value) => value !== 0);

    for (let i = 0; i < compacted.length - 1; i += 1) {
      if (compacted[i] === compacted[i + 1]) {
        compacted[i] *= 2;
        this.updateScore(this.score + compacted[i]);
        compacted.splice(i + 1, 1);
      }
    }

    while (compacted.length < GRID_SIZE) {
      compacted.push(0);
    }

    const mergedRow = compacted;
    const movedRow = mergedRow.some((value, index) => value !== row[index]);

    return { mergedRow, movedRow };
  }

  draw() {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const value = this.grid[row][col];
        const index = row * GRID_SIZE + col;
        const cell = this.cellElements[index];

        cell.textContent = value > 0 ? value : "";
        cell.className = value > 0 ? `cell tile tile-${value}` : "cell";

        if (value > 0 && this.newTilePositions.includes(`${row}-${col}`)) {
          cell.classList.add("new");
        }
      }
    }

    this.newTilePositions = [];
  }

  updateScore(newScore) {
    this.score = newScore;
    this.scoreElement.textContent = this.score;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(STORAGE_KEY, String(this.bestScore));
    }
    this.bestElement.textContent = this.bestScore;
  }

  hasWon() {
    return this.grid.some((row) => row.some((value) => value >= WIN_TILE));
  }

  canMove() {
    if (this.grid.some((row) => row.includes(0))) return true;

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const value = this.grid[row][col];
        const right = this.grid[row][col + 1];
        const down = this.grid[row + 1]?.[col];
        if (value === right || value === down) {
          return true;
        }
      }
    }

    return false;
  }

  isGameTerminated() {
    if (this.keepPlaying) return false;
    if (this.won) return true;
    return false;
  }

  showMessage(text, showKeepGoing = false) {
    this.messageText.textContent = text;
    this.keepGoingButton.hidden = !showKeepGoing;
    this.messageElement.hidden = false;
  }

  hideMessage() {
    this.messageElement.hidden = true;
  }
}

const game = new Game2048();
