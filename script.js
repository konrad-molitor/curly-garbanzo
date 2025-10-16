const GRID_SIZE = 4;
const WIN_TILE = 2048;
const STORAGE_KEY = "bestScore";
const GAME_STATE_KEY = "gameState";
const INSTALL_DISMISSED_KEY = "pwaInstallDismissedAt";
const INSTALL_STATUS_KEY = "pwaInstalled";
const INSTALL_COOLDOWN_DAYS = 7;
const INSTALL_COOLDOWN_MS = INSTALL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

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
    this.bestScore = this.loadBestScore();
    this.won = false;
    this.keepPlaying = false;
    this.newTilePositions = [];

    this.createBoard();
    this.bindEvents();
    this.bestElement.textContent = this.bestScore;
    this.start(true);
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
      this.saveState();
    });

    const resetHandler = () => this.start();

    this.tryAgainButton.addEventListener("click", resetHandler);
    this.newGameButton.addEventListener("click", resetHandler);
  }

  start(loadSaved = false) {
    if (loadSaved) {
      const savedState = this.loadState();
      if (savedState) {
        this.grid = savedState.grid;
        this.won = savedState.won;
        this.keepPlaying = savedState.keepPlaying;
        this.newTilePositions = [];
        this.updateScore(savedState.score);
        this.draw();
        if (this.won && !this.keepPlaying) {
          this.showMessage("You win!", true);
        } else if (!this.canMove()) {
          this.showMessage("Game over!");
        } else {
          this.hideMessage();
        }
        this.saveState();
        return;
      }
    }

    this.grid = this.createEmptyGrid();
    this.won = false;
    this.keepPlaying = false;
    this.newTilePositions = [];
    this.addRandomTile();
    this.addRandomTile();
    this.updateScore(0);
    this.draw();
    this.hideMessage();
    this.saveState();
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

    this.saveState();
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
      this.saveBestScore(this.bestScore);
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

  saveState() {
    const state = {
      grid: this.grid,
      score: this.score,
      won: this.won,
      keepPlaying: this.keepPlaying,
    };

    try {
      localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save game state", error);
    }
  }

  loadState() {
    let saved = null;

    try {
      saved = localStorage.getItem(GAME_STATE_KEY);
    } catch (error) {
      console.error("Failed to read saved game state", error);
      return null;
    }

    if (!saved) return null;

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed?.grid) || parsed.grid.length !== GRID_SIZE) {
        return null;
      }

      const grid = parsed.grid.map((row) => {
        if (!Array.isArray(row) || row.length !== GRID_SIZE) {
          throw new Error("Invalid grid row");
        }
        return row.map((value) => {
          const numeric = Number(value);
          return Number.isFinite(numeric) ? numeric : 0;
        });
      });

      return {
        grid,
        score: Number(parsed.score) || 0,
        won: Boolean(parsed.won),
        keepPlaying: Boolean(parsed.keepPlaying),
      };
    } catch (error) {
      console.error("Failed to load game state", error);
      return null;
    }
  }

  loadBestScore() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return 0;
      }

      const numeric = Number(stored);
      return Number.isFinite(numeric) ? numeric : 0;
    } catch (error) {
      console.error("Failed to read best score", error);
      return 0;
    }
  }

  saveBestScore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch (error) {
      console.error("Failed to save best score", error);
    }
  }
}

const game = new Game2048();
setupServiceWorker();
setupInstallPrompt();

function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch((error) => console.error("Service worker registration failed", error));
  });
}

function setupInstallPrompt() {
  const installButton = document.getElementById("install-app");
  if (!installButton) return;

  let deferredPrompt = null;

  const hideButton = () => {
    installButton.hidden = true;
    installButton.disabled = false;
  };

  const showButton = () => {
    installButton.hidden = false;
    installButton.disabled = false;
  };

  hideButton();

  const alreadyInstalled = () => {
    try {
      if (localStorage.getItem(INSTALL_STATUS_KEY) === "true") {
        return true;
      }
    } catch (error) {
      console.error("Failed to read install status", error);
    }

    if (isStandaloneDisplay()) {
      try {
        localStorage.setItem(INSTALL_STATUS_KEY, "true");
      } catch (error) {
        console.error("Failed to persist install status", error);
      }
      return true;
    }

    return false;
  };

  if (alreadyInstalled()) {
    hideButton();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    if (alreadyInstalled()) return;

    event.preventDefault();
    deferredPrompt = event;

    if (hasRecentInstallDismissal()) {
      hideButton();
      return;
    }

    showButton();
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) {
      hideButton();
      return;
    }

    installButton.disabled = true;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      try {
        localStorage.setItem(INSTALL_STATUS_KEY, "true");
        localStorage.removeItem(INSTALL_DISMISSED_KEY);
      } catch (error) {
        console.error("Failed to persist install status", error);
      }
      hideButton();
    } else {
      markInstallDismissed();
      hideButton();
    }

    deferredPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    try {
      localStorage.setItem(INSTALL_STATUS_KEY, "true");
      localStorage.removeItem(INSTALL_DISMISSED_KEY);
    } catch (error) {
      console.error("Failed to persist install status", error);
    }
    hideButton();
  });
}

function hasRecentInstallDismissal() {
  try {
    const stored = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (!stored) return false;

    const timestamp = Number(stored);
    if (!Number.isFinite(timestamp)) return false;

    return Date.now() - timestamp < INSTALL_COOLDOWN_MS;
  } catch (error) {
    console.error("Failed to read install dismissal", error);
    return false;
  }
}

function markInstallDismissed() {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  } catch (error) {
    console.error("Failed to persist install dismissal", error);
  }
}

function isStandaloneDisplay() {
  const standaloneMatch =
    typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return standaloneMatch || window.navigator.standalone === true;
}
