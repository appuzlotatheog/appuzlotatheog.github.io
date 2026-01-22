class MiniGame {
  constructor() {
    this.canvas = document.getElementById("mario-game");
    this.ctx = null;
    this.gameRunning = false;
    this.score = 0;
    this.frame = 0;
    this.cameraX = 0;
    this.player = null;
    this.blocks = [];
    this.enemies = [];
    this.items = [];
    this.particles = [];
    this.coins = [];
    this.fireballs = [];
    this.flagpole = null;
    this.currentLevel = 1;
    this.totalLevels = 4;

    this.keys = {
      right: false,
      left: false,
      up: false,
      down: false,
      run: false,
      shoot: false,
    };

    this.gameConstants = {
      TILE_SIZE: 32,
      GRAVITY: 0.4,
      FRICTION: 0.9,
      JUMP_FORCE: -14,
      ACCEL: 0.55,
      MAX_SPEED: 5.5,
      MAX_RUN_SPEED: 8.5,
      COYOTE_TIME: 10,
      JUMP_BUFFER: 10,
      BOUNCE_DAMPING: 0.6,
      ENEMY_KNOCKBACK: -6,
    };

    this.audioCtx = null;
    this.initAudio();

    // Performance optimization: Object pools
    this.particlePool = [];
    this.fireballPool = [];
    this.coinPool = [];
    this.enemyPool = [];
    this.itemPool = [];

    // Performance optimization: Spatial hash for collision
    this.spatialGrid = {};
    this.spatialGridSize = 64;

    // Performance optimization: Cached values
    this.cachedSkyGradient = null;
    this.cachedCloudGradient = null;
    this.lastCanvasWidth = 0;
    this.lastCanvasHeight = 0;
    this.viewLeft = 0;
    this.viewRight = 0;
  }

  initAudio() {
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Audio not supported");
    }
  }

  init() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.setupEventListeners();
    this.drawStartScreen();
  }

  setupEventListeners() {
    const startBtn = document.getElementById("startGameBtn");
    const restartBtn = document.getElementById("restartBtn");

    if (startBtn) startBtn.addEventListener("click", () => this.startGame());
    if (restartBtn)
      restartBtn.addEventListener("click", () => this.startGame());

    window.addEventListener("keydown", (e) => {
      this.handleKeyDown(e);
      if (this.gameRunning && this.shouldPreventDefault(e)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Mobile touch controls
    this.setupTouchControls();
  }

  drawStartScreen() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#5c94fc");
    gradient.addColorStop(1, "#87ceeb");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(0, h - 64, w, 64);
    ctx.fillStyle = "#228b22";
    ctx.fillRect(0, h - 64, w, 16);

    // Decorative clouds
    this.drawCloud(ctx, 100, 80, 1);
    this.drawCloud(ctx, 350, 50, 0.8);
    this.drawCloud(ctx, 600, 100, 1.2);

    // Title
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 4;
    ctx.font = "bold 36px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.strokeText("SUPER APPUZLOTA", w / 2, h / 2 - 40);
    ctx.fillText("SUPER APPUZLOTA", w / 2, h / 2 - 40);

    ctx.font = "16px monospace";
    ctx.fillStyle = "#333";
    ctx.fillText("Press START to play", w / 2, h / 2 + 20);

    // Draw a preview Mario
    this.drawPreviewMario(ctx, w / 2 - 16, h - 100);
  }

  drawCloud(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (!this.cachedCloudGradient) {
      this.cachedCloudGradient = ctx.createRadialGradient(
        30,
        20,
        0,
        30,
        20,
        50,
      );
      this.cachedCloudGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      this.cachedCloudGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.7)");
      this.cachedCloudGradient.addColorStop(1, "rgba(255, 255, 255, 0.5)");
    }

    ctx.fillStyle = this.cachedCloudGradient;
    ctx.beginPath();
    ctx.ellipse(30, 20, 35, 18, 0, 0, Math.PI * 2, false);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(10, 15, 20, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(50, 15, 22, 0, Math.PI * 2, false);
    ctx.fill();

    ctx.restore();
  }

  drawPreviewMario(ctx, x, y) {
    const size = 32;
    // Hat
    ctx.fillStyle = "#e52521";
    ctx.fillRect(x + 4, y, size - 8, 8);
    ctx.fillRect(x, y + 8, size, 4);
    // Face
    ctx.fillStyle = "#ffc0a0";
    ctx.fillRect(x + 4, y + 12, size - 8, 10);
    // Eyes
    ctx.fillStyle = "#000";
    ctx.fillRect(x + 8, y + 14, 4, 4);
    ctx.fillRect(x + 20, y + 14, 4, 4);
    // Body
    ctx.fillStyle = "#e52521";
    ctx.fillRect(x + 4, y + 22, size - 8, 10);
    // Overalls
    ctx.fillStyle = "#0066cc";
    ctx.fillRect(x + 4, y + 32, size - 8, 12);
    // Feet
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(x + 2, y + 44, 10, 6);
    ctx.fillRect(x + 20, y + 44, 10, 6);
  }

  setupEventListeners() {
    const startBtn = document.getElementById("startGameBtn");
    const restartBtn = document.getElementById("restartBtn");

    if (startBtn) startBtn.addEventListener("click", () => this.startGame());
    if (restartBtn)
      restartBtn.addEventListener("click", () => this.startGame());

    window.addEventListener("keydown", (e) => {
      this.handleKeyDown(e);
      if (this.gameRunning && this.shouldPreventDefault(e)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Mobile touch controls
    this.setupTouchControls();
  }

  setupTouchControls() {
    const touchLeft = document.getElementById("touchLeft");
    const touchRight = document.getElementById("touchRight");
    const touchUp = document.getElementById("touchUp");
    const touchDown = document.getElementById("touchDown");
    const touchRun = document.getElementById("touchRun");
    const touchShoot = document.getElementById("touchShoot");

    if (touchLeft) {
      touchLeft.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.keys.left = true;
          touchLeft.classList.add("active");
        },
        { passive: false },
      );
      touchLeft.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          this.keys.left = false;
          touchLeft.classList.remove("active");
        },
        { passive: false },
      );
    }

    if (touchRight) {
      touchRight.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.keys.right = true;
          touchRight.classList.add("active");
        },
        { passive: false },
      );
      touchRight.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          this.keys.right = false;
          touchRight.classList.remove("active");
        },
        { passive: false },
      );
    }

    if (touchUp) {
      touchUp.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          if (this.gameRunning && this.player) {
            this.player.tryJump(this);
          }
          this.keys.up = true;
          touchUp.classList.add("active");
        },
        { passive: false },
      );
      touchUp.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          this.keys.up = false;
          touchUp.classList.remove("active");
        },
        { passive: false },
      );
    }

    if (touchDown) {
      touchDown.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.keys.down = true;
          touchDown.classList.add("active");
        },
        { passive: false },
      );
      touchDown.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          this.keys.down = false;
          touchDown.classList.remove("active");
        },
        { passive: false },
      );
    }

    if (touchRun) {
      touchRun.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          this.keys.run = true;
          touchRun.classList.add("active");
        },
        { passive: false },
      );
      touchRun.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          this.keys.run = false;
          touchRun.classList.remove("active");
        },
        { passive: false },
      );
    }

    if (touchShoot) {
      touchShoot.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          if (this.gameRunning && this.player) {
            this.player.shootFireball();
          }
          touchShoot.classList.add("active");
        },
        { passive: false },
      );
      touchShoot.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          touchShoot.classList.remove("active");
        },
        { passive: false },
      );
    }
  }

  // Performance optimization: Object pooling methods
  getParticle(x, y, color) {
    if (this.particlePool.length > 0) {
      const p = this.particlePool.pop();
      p.x = x;
      p.y = y;
      p.color = color;
      p.vx = (Math.random() - 0.5) * 8;
      p.vy = -Math.random() * 6 - 2;
      p.size = Math.random() * 6 + 4;
      p.life = 30;
      p.dead = false;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (Math.random() - 0.5) * 0.3;
      return p;
    }
    return new Particle(x, y, color);
  }

  returnParticle(p) {
    if (this.particlePool.length < 100) {
      this.particlePool.push(p);
    }
  }

  getFireball(x, y, facingRight) {
    if (this.fireballPool.length > 0) {
      const fb = this.fireballPool.pop();
      fb.reset(x, y, facingRight);
      return fb;
    }
    return new Fireball(x, y, facingRight);
  }

  returnFireball(fb) {
    if (this.fireballPool.length < 50) {
      this.fireballPool.push(fb);
    }
  }

  getCoin(x, y) {
    if (this.coinPool.length > 0) {
      const c = this.coinPool.pop();
      c.reset(x, y);
      return c;
    }
    return new Coin(x, y);
  }

  returnCoin(c) {
    if (this.coinPool.length < 100) {
      this.coinPool.push(c);
    }
  }

  // Performance optimization: Spatial hash for collision
  getSpatialKey(x, y) {
    const gx = Math.floor(x / this.spatialGridSize);
    const gy = Math.floor(y / this.spatialGridSize);
    return `${gx},${gy}`;
  }

  updateSpatialGrid() {
    this.spatialGrid = {};

    // Add blocks to spatial grid
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      if (b.broken) continue;

      const startX = Math.floor(b.x / this.spatialGridSize);
      const endX = Math.floor((b.x + b.w) / this.spatialGridSize);
      const startY = Math.floor(b.y / this.spatialGridSize);
      const endY = Math.floor((b.y + b.h) / this.spatialGridSize);

      for (let gx = startX; gx <= endX; gx++) {
        for (let gy = startY; gy <= endY; gy++) {
          const key = `${gx},${gy}`;
          if (!this.spatialGrid[key]) this.spatialGrid[key] = [];
          this.spatialGrid[key].push({ type: "block", index: i });
        }
      }
    }
  }

  getNearbyBlocks(entity) {
    const keys = [];
    const startX = Math.floor(entity.x / this.spatialGridSize);
    const endX = Math.floor((entity.x + entity.w) / this.spatialGridSize);
    const startY = Math.floor(entity.y / this.spatialGridSize);
    const endY = Math.floor((entity.y + entity.h) / this.spatialGridSize);

    for (let gx = startX - 1; gx <= endX + 1; gx++) {
      for (let gy = startY - 1; gy <= endY + 1; gy++) {
        const key = `${gx},${gy}`;
        if (this.spatialGrid[key]) {
          keys.push(...this.spatialGrid[key]);
        }
      }
    }

    // Return unique blocks
    const blocks = [];
    const seen = new Set();
    for (const item of keys) {
      if (!seen.has(item.index)) {
        seen.add(item.index);
        blocks.push(this.blocks[item.index]);
      }
    }
    return blocks;
  }

  // Performance optimization: View culling
  updateViewBounds() {
    const padding = 100;
    this.viewLeft = this.cameraX - padding;
    this.viewRight = this.cameraX + this.canvas.width + padding;
  }

  isInView(x, y, w, h) {
    return (
      x + w > this.viewLeft &&
      x < this.viewRight &&
      y + h > -50 &&
      y < this.canvas.height + 50
    );
  }

  // Performance optimization: Cached sky gradient
  getSkyGradient() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (
      !this.cachedSkyGradient ||
      this.lastCanvasWidth !== w ||
      this.lastCanvasHeight !== h
    ) {
      this.cachedSkyGradient = this.ctx.createLinearGradient(0, 0, 0, h);
      this.cachedSkyGradient.addColorStop(0, "#5c94fc");
      this.cachedSkyGradient.addColorStop(1, "#87ceeb");
      this.lastCanvasWidth = w;
      this.lastCanvasHeight = h;
    }

    return this.cachedSkyGradient;
  }

  shouldPreventDefault(e) {
    return [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space",
    ].includes(e.code);
  }

  handleKeyDown(e) {
    switch (e.code) {
      case "ArrowRight":
      case "KeyD":
        this.keys.right = true;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.keys.left = true;
        break;
      case "ArrowUp":
      case "KeyW":
      case "Space":
        if (!this.keys.up && this.gameRunning && this.player) {
          this.player.tryJump(this);
        }
        this.keys.up = true;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.keys.run = true;
        break;
      case "KeyX":
      case "KeyZ":
        this.keys.shoot = true;
        if (this.player && this.player.canShoot) {
          this.player.shoot(this);
        }
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case "ArrowRight":
      case "KeyD":
        this.keys.right = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.keys.left = false;
        break;
      case "ArrowUp":
      case "KeyW":
      case "Space":
        this.keys.up = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        this.keys.run = false;
        break;
      case "KeyX":
      case "KeyZ":
        this.keys.shoot = false;
        break;
    }
  }

  startGame() {
    this.score = 0;
    this.cameraX = 0;
    this.frame = 0;

    const scoreDisplay = document.getElementById("scoreDisplay");
    const startBtn = document.getElementById("startGameBtn");
    const gameOverScreen = document.getElementById("gameOverScreen");

    if (scoreDisplay) scoreDisplay.innerText = "000000";
    if (startBtn) startBtn.style.display = "none";
    if (gameOverScreen) gameOverScreen.classList.remove("active");

    this.blocks = [];
    this.enemies = [];
    this.items = [];
    this.particles = [];
    this.coins = [];
    this.flagpole = null;

    this.loadLevel();
    this.spawnPlayer();

    this.gameRunning = true;

    this.canvas.focus();
    this.gameLoop();
  }

  loadLevel() {
    // Clear existing level data
    this.blocks = [];
    this.enemies = [];
    this.items = [];
    this.particles = [];
    this.coins = [];
    this.fireballs = [];
    this.flagpole = null;

    // Define all 4 levels with increasing difficulty
    const levels = this.getLevelMaps();
    const levelData = levels[(this.currentLevel - 1) % levels.length];
    const levelMap = levelData.map;

    // Level-specific configurations
    const levelConfig = {
      1: { spawnX: 80, enemySpeed: -1.5, name: "WORLD 1-1", gravity: 0.45 },
      2: { spawnX: 60, enemySpeed: -2.0, name: "WORLD 1-2", gravity: 0.5 },
      3: { spawnX: 60, enemySpeed: -2.5, name: "WORLD 1-3", gravity: 0.55 },
      4: { spawnX: 40, enemySpeed: -3.0, name: "WORLD 1-4", gravity: 0.6 },
    };

    const config = levelConfig[this.currentLevel] || levelConfig[1];
    this.currentLevelConfig = config;

    // Update UI
    this.updateLevelUI();

    // Parse level map
    levelMap.forEach((row, r) => {
      [...row].forEach((char, c) => {
        const x = c * this.gameConstants.TILE_SIZE;
        const y =
          r * this.gameConstants.TILE_SIZE +
          (this.canvas.height - levelMap.length * this.gameConstants.TILE_SIZE);

        switch (char) {
          case "#":
            this.blocks.push({
              x,
              y,
              w: this.gameConstants.TILE_SIZE,
              h: this.gameConstants.TILE_SIZE,
              type: "ground",
            });
            break;
          case "B":
            this.blocks.push({
              x,
              y,
              w: this.gameConstants.TILE_SIZE,
              h: this.gameConstants.TILE_SIZE,
              type: "brick",
              broken: false,
            });
            break;
          case "?":
            this.blocks.push({
              x,
              y,
              w: this.gameConstants.TILE_SIZE,
              h: this.gameConstants.TILE_SIZE,
              type: "question",
              content: Math.random() > 0.5 ? "mushroom" : "coin",
              active: true,
              bounceOffset: 0,
            });
            break;
          case "!":
            // Hard brick - cannot break even when big
            this.blocks.push({
              x,
              y,
              w: this.gameConstants.TILE_SIZE,
              h: this.gameConstants.TILE_SIZE,
              type: "brick",
              broken: false,
              unbreakable: true,
            });
            break;
          case "P":
            this.blocks.push({
              x,
              y,
              w: this.gameConstants.TILE_SIZE,
              h: this.gameConstants.TILE_SIZE,
              type: "pipe",
            });
            break;
          case "T":
            // Tall pipe (2 tiles high)
            this.blocks.push({
              x,
              y,
              w: this.gameConstants.TILE_SIZE,
              h: this.gameConstants.TILE_SIZE * 2,
              type: "pipe",
            });
            break;
          case "C":
            this.coins.push(new Coin(x + 8, y + 8));
            break;
          case "G":
            this.enemies.push(new Goomba(x, y, config.enemySpeed));
            break;
          case "K":
            // Koopa enemy (harder than Goomba)
            this.enemies.push(new Koopa(x, y, config.enemySpeed));
            break;
          case "F":
            this.flagpole = {
              x,
              y: this.canvas.height - 13 * this.gameConstants.TILE_SIZE,
              h: 12 * this.gameConstants.TILE_SIZE,
            };
            break;
        }
      });
    });
  }

  getLevelMaps() {
    // Return array of 4 level maps with increasing difficulty
    return [
      {
        // LEVEL 1 - Tutorial level, simple
        map: [
          "................................................................",
          "................................................................",
          "................................................................",
          "...............................C.C.C.............................",
          ".............?B?B?...............................................",
          "................................................................",
          ".............................PPPP................................",
          "...............C.C...........P..P......?..?.?.....................",
          "................C............P..P................................",
          "..........PPP...............P..P.....G.......G......PPP..........",
          ".........P...P..........G...P..P.............G.....P...P.........",
          "..C.C....P...P..............P..P...................P...P.........",
          "...C..C..P...P..C.C.C.......P..P...C.C.C............P...P......F.",
          "########################################################.#######",
          "########################################################.#######",
        ],
        coins: 8,
        enemies: 3,
      },
      {
        // LEVEL 2 - More gaps and platforms
        map: [
          "................................................................",
          "................................................................",
          "............................C.C........................C.C............",
          ".......................?B?B...................................?B?B.......",
          "................................................................",
          "...................PPP...PPP...PPP...PPP...PPP...PPP............",
          ".............C.C.C...P..P......?..?.?...P..P......C.C.C.........",
          "............P..P................P..P................G........G......",
          ".......PPP......P..P.....G.......G...........PPP...P..P....K.K....",
          ".........P...P.......G...P..P..........G.....P...P.......P...P......",
          ".C.C....P...P...........P..P...................P...P.......?B?B?....F.",
          "..C..C...P...P..C.C.C.......P..P...C.C.C..........P..P...C.C.C........",
          "#######################################.#######.##########################",
          "#######################################.#######.##########################",
        ],
        coins: 12,
        enemies: 5,
      },
      {
        // LEVEL 3 - More complex, includes Kojas and unbreakable blocks
        map: [
          "................................................................",
          "................................................................",
          "................C.C.C...................C.C.C................C.C.C",
          "............!B!B!B!B!........?B?B?......................!B!B!B!B!B!",
          "................................................................",
          "..........PPP...PPP.......P..P...PPP.......P..P...T...T.........",
          "......C.C.C................P..P..............?B?B?...P..P..P..K.K",
          "..............P..P...................P..P.....................G...G......",
          ".....PPP......P..P.....G.......G.......T...T.....PPP.....K.K..G..G...",
          "........P...P.......G...P..P.............P...P.......!B!B!B!B!B!......F.",
          "C.C...P...P..............P..P...................P...P..C.C.C........",
          "#######################################################.#######",
          "#######################################################.#######",
        ],
        coins: 15,
        enemies: 7,
      },
      {
        // LEVEL 4 - Hardest, complex layout
        map: [
          "................................................................",
          "................................................................",
          "..................C.C.C..C.C.C..C.C.C....................C.C.C....",
          "...........!B!B!B!B!B!..?B?B?...!B!B!B!B!B!..?B?B?......!B!B!B!B!B!",
          "................................................................",
          ".......T..T...T..T.....P..P...T..T...T..T....T..T..............",
          ".......C.C.C......P..P..P..P..........?B?B?..........P..P..K.K..K.K",
          "..........P..P......G..G..G...G..G................G..G..G............",
          ".....T..T......P..P..G..G..G...T..T.....T..T.....K.K..G..G..G..G...",
          "........P...P.......G...P..P.......!B!B!B!B!B!..!B!B!B!B!B!......!B!B!F.",
          "C.C...P...P..............P..P...................P...P..C.C.C.......K.K....",
          "########################################################",
          "########################################################",
        ],
        coins: 20,
        enemies: 10,
      },
    ];
  }

  updateLevelUI() {
    // Update level display
    const levelDisplay = document.getElementById("levelDisplay");
    if (levelDisplay) {
      const config = this.currentLevelConfig;
      levelDisplay.textContent = `${config.name}`;
    }
  }

  spawnPlayer() {
    const config = this.currentLevelConfig;
    const groundY = this.canvas.height - 2 * this.gameConstants.TILE_SIZE - 48;
    this.player = new Mario(config.spawnX, groundY);
    // Apply level-specific gravity if configured
    if (config.gravity) {
      this.gameConstants.GRAVITY = config.gravity;
    }
  }

  startGame() {
    this.score = 0;
    this.cameraX = 0;
    this.frame = 0;
    this.lives = 3;

    const scoreDisplay = document.getElementById("scoreDisplay");
    const startOverlay = document.getElementById("startOverlay");
    const gameOverScreen = document.getElementById("gameOverScreen");
    const levelDisplay = document.getElementById("levelDisplay");
    const livesDisplay = document.getElementById("livesDisplay");
    const powerDisplay = document.getElementById("powerDisplay");

    if (scoreDisplay) scoreDisplay.innerText = "000000";
    if (startOverlay) startOverlay.classList.add("hidden");
    if (gameOverScreen) gameOverScreen.classList.remove("active");
    if (levelDisplay) levelDisplay.innerText = `${this.currentLevel}-1`;
    if (livesDisplay) livesDisplay.innerText = this.lives;
    if (powerDisplay) powerDisplay.innerText = "SMALL";

    this.loadLevel();
    this.spawnPlayer();

    this.gameRunning = true;

    this.canvas.focus();
    this.gameLoop();
  }

  nextLevel() {
    if (this.currentLevel < this.totalLevels) {
      this.currentLevel++;
      this.score += 5000; // Level bonus
      this.startGame();
    } else {
      this.gameOver(true); // Beat all levels!
    }
  }

  restartLevel() {
    this.score = 0;
    this.cameraX = 0;
    this.loadLevel();
    this.spawnPlayer();

    this.gameRunning = true;

    this.canvas.focus();
    this.gameLoop();
  }

  playSound(type) {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === "suspended") this.audioCtx.resume();

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    const now = this.audioCtx.currentTime;

    switch (type) {
      case "jump":
        osc.type = "square";
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.12);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      case "coin":
        osc.type = "sine";
        osc.frequency.setValueAtTime(988, now);
        osc.frequency.setValueAtTime(1319, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      case "stomp":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case "die":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case "powerup":
        osc.type = "sine";
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(784, now + 0.2);
        osc.frequency.setValueAtTime(1047, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case "fireball":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case "bump":
        osc.type = "square";
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.setValueAtTime(80, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      case "break":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case "kick":
        osc.type = "square";
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
    }
  }

  spawnParticles(x, y, color, count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.getParticle(x, y, color));
    }
  }

  gameLoop() {
    if (!this.gameRunning) return;

    this.update();
    this.render();

    this.frame++;
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    // Update view bounds for culling
    this.updateViewBounds();

    // Update spatial grid for collision optimization
    this.updateSpatialGrid();

    // Camera follows player smoothly
    const targetCameraX = this.player.x - this.canvas.width * 0.35;
    if (targetCameraX > this.cameraX) {
      this.cameraX += (targetCameraX - this.cameraX) * 0.08;
    }
    if (this.cameraX < 0) this.cameraX = 0;

    // Get nearby blocks using spatial grid for player
    const nearbyBlocks = this.getNearbyBlocks(this.player);

    // Update player with spatial optimization
    this.player.update(this.keys, nearbyBlocks, this);

    // Update enemies with view culling
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (this.isInView(enemy.x, enemy.y, enemy.w, enemy.h)) {
        const enemyBlocks = this.getNearbyBlocks(enemy);
        enemy.update(enemyBlocks, this.player, this);
      }
      if (enemy.dead) {
        this.enemies.splice(i, 1);
      }
    }

    // Update items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const itemBlocks = this.getNearbyBlocks(item);
      item.update(itemBlocks, this.player, this);
      if (item.dead) {
        this.items.splice(i, 1);
      }
    }

    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.update(this.player, this);
      if (coin.collected) {
        this.returnCoin(coin);
        this.coins.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.dead) {
        this.returnParticle(p);
        this.particles.splice(i, 1);
      }
    }

    // Update fireballs
    if (this.player.fireballs) {
      for (let i = this.player.fireballs.length - 1; i >= 0; i--) {
        const fb = this.player.fireballs[i];
        fb.update(this.blocks, this.enemies, this);
        if (fb.dead) {
          this.returnFireball(fb);
          this.player.fireballs.splice(i, 1);
        }
      }
    }

    // Check game over
    if (this.player.dead) {
      this.gameOver(false);
    }

    // Check flagpole
    if (this.flagpole && this.player.x > this.flagpole.x) {
      this.gameOver(true);
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Use cached sky gradient
    ctx.fillStyle = this.getSkyGradient();
    ctx.fillRect(0, 0, w, h);

    // Parallax clouds
    const cloudOffset = this.cameraX * 0.3;
    this.drawCloud(ctx, 100 - (cloudOffset % 400), 60, 1);
    this.drawCloud(ctx, 300 - (cloudOffset % 500), 40, 0.7);
    this.drawCloud(ctx, 550 - (cloudOffset % 600), 80, 1.2);
    this.drawCloud(ctx, 700 - (cloudOffset % 450), 50, 0.9);

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    this.drawBlocks();
    this.drawFlagpole();
    this.drawCoins();
    this.drawItems();
    this.drawEnemies();
    this.drawPlayer();
    this.drawParticles();
    this.drawFireballs();

    ctx.restore();
  }

  drawBlocks() {
    const ctx = this.ctx;
    this.blocks.forEach((b) => {
      if (b.broken) return;

      const isOnScreen =
        b.x + b.w > this.cameraX && b.x < this.cameraX + this.canvas.width;
      if (!isOnScreen) return;

      const bounceY = b.bounceOffset || 0;
      const drawY = b.y + bounceY;

      switch (b.type) {
        case "ground":
          // Grass with gradient
          const grassGrad = ctx.createLinearGradient(
            b.x,
            drawY,
            b.x,
            drawY + 8,
          );
          grassGrad.addColorStop(0, "#32CD32");
          grassGrad.addColorStop(0.3, "#228B22");
          grassGrad.addColorStop(1, "#1B5E20");
          ctx.fillStyle = grassGrad;
          ctx.fillRect(b.x, drawY, b.w, 8);

          // Grass texture
          ctx.fillStyle = "#228B22";
          for (let i = 0; i < b.w; i += 8) {
            ctx.fillRect(b.x + i, drawY, 4, 3);
          }

          // Dirt body with gradient
          const dirtGrad = ctx.createLinearGradient(
            b.x,
            drawY + 8,
            b.x,
            drawY + b.h,
          );
          dirtGrad.addColorStop(0, "#8B4513");
          dirtGrad.addColorStop(0.5, "#A0522D");
          dirtGrad.addColorStop(1, "#654321");
          ctx.fillStyle = dirtGrad;
          ctx.fillRect(b.x, drawY + 8, b.w, b.h - 8);

          // Dirt texture dots
          ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
          for (let i = 0; i < (b.w * (b.h - 8)) / 64; i++) {
            const dotX = b.x + ((i * 17) % b.w);
            const dotY = drawY + 12 + ((i * 23) % (b.h - 20));
            ctx.fillRect(dotX, dotY, 2, 2);
          }
          break;
        case "brick":
          // Brick with gradient
          const brickGrad = ctx.createLinearGradient(
            b.x,
            drawY,
            b.x + b.w,
            drawY,
          );
          brickGrad.addColorStop(0, "#CD853F");
          brickGrad.addColorStop(0.2, "#D2691E");
          brickGrad.addColorStop(0.8, "#D2691E");
          brickGrad.addColorStop(1, "#8B4513");
          ctx.fillStyle = brickGrad;
          ctx.fillRect(b.x, drawY, b.w, b.h);

          // Brick pattern lines
          ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(b.x, drawY + b.h / 2);
          ctx.lineTo(b.x + b.w, drawY + b.h / 2);
          ctx.stroke();

          // Brick highlights
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.fillRect(b.x, drawY, b.w, 2);
          ctx.fillRect(b.x, drawY, 2, b.h);

          // Brick shadows
          ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
          ctx.fillRect(b.x + b.w - 2, drawY, 2, b.h);
          ctx.fillRect(b.x, drawY + b.h - 2, b.w, 2);
          break;
        case "question":
          // Glowing question block
          const glowIntensity = b.active ? 1 : 0.3;
          ctx.fillStyle = b.active ? "#ffd700" : "#c7a008";
          ctx.fillRect(b.x, drawY, b.w, b.h);
          // Inner square
          ctx.fillStyle = b.active ? "#ffeb3b" : "#8b6914";
          ctx.fillRect(b.x + 3, drawY + 3, b.w - 6, b.h - 6);
          // Question mark
          if (b.active) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 18px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("?", b.x + b.w / 2, drawY + b.h / 2 + 1);
          }
          // Glow effect
          ctx.shadowColor = b.active ? "#ffd700" : "transparent";
          ctx.shadowBlur = b.active ? 15 : 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          break;
        case "pipe":
          // Pipe with gradient
          const pipeGrad = ctx.createLinearGradient(
            b.x,
            drawY,
            b.x + b.w,
            drawY,
          );
          pipeGrad.addColorStop(0, "#00a800");
          pipeGrad.addColorStop(0.3, "#00c800");
          pipeGrad.addColorStop(1, "#006400");
          ctx.fillStyle = pipeGrad;
          ctx.fillRect(b.x, drawY, b.w, b.h);
          // Highlight
          ctx.fillStyle = "#50d050";
          ctx.fillRect(b.x + 4, drawY + 4, b.w - 8, b.h - 8);
          // Rim
          ctx.fillStyle = "#228b22";
          ctx.fillRect(b.x + 2, drawY - 4, b.w - 4, 8);
          break;
        case "!":
          // Unbreakable brick (metal)
          ctx.fillStyle = "#7f8c8d";
          ctx.fillRect(b.x, drawY, b.w, b.h);
          // Border
          ctx.fillStyle = "#575344";
          ctx.fillRect(b.x, drawY, b.w, 2);
          ctx.fillRect(b.x, drawY, b.w, 2);
          ctx.fillRect(b.x, drawY, b.w - 2, b.h, 2);
          ctx.fillRect(b.x, drawY + b.h - 2, b.w, 2);
          // Detail lines
          ctx.fillStyle = "#999";
          ctx.fillRect(b.x + 6, drawY + 6, b.w - 12, 2);
          break;
      }

      // Update bounce animation
      if (b.bounceOffset) {
        b.bounceOffset += 0.6;
        if (b.bounceOffset > 0) b.bounceOffset = 0;
      }
    });
  }
  drawFlagpole() {
    if (!this.flagpole) return;
    const ctx = this.ctx;

    // Pole with gradient
    const poleGrad = ctx.createLinearGradient(
      this.flagpole.x + 14,
      this.flagpole.y,
      this.flagpole.x + 20,
      this.flagpole.y,
    );
    poleGrad.addColorStop(0, "#228B22");
    poleGrad.addColorStop(0.3, "#32CD32");
    poleGrad.addColorStop(0.6, "#228B22");
    poleGrad.addColorStop(1, "#006400");
    ctx.fillStyle = poleGrad;
    ctx.fillRect(this.flagpole.x + 14, this.flagpole.y, 6, this.flagpole.h);

    // Pole highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(this.flagpole.x + 14, this.flagpole.y, 2, this.flagpole.h);

    // Ball on top with gradient
    const ballGrad = ctx.createRadialGradient(
      this.flagpole.x + 17,
      this.flagpole.y,
      0,
      this.flagpole.x + 17,
      this.flagpole.y,
      8,
    );
    ballGrad.addColorStop(0, "#FFFF00");
    ballGrad.addColorStop(0.5, "#FFD700");
    ballGrad.addColorStop(1, "#DAA520");
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(this.flagpole.x + 17, this.flagpole.y, 8, 0, Math.PI * 2, false);
    ctx.fill();

    // Ball highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.arc(
      this.flagpole.x + 14,
      this.flagpole.y - 3,
      3,
      0,
      Math.PI * 2,
      false,
    );
    ctx.fill();

    // Flag
    ctx.fillStyle = "#00a800";
    ctx.beginPath();
    ctx.moveTo(this.flagpole.x + 20, this.flagpole.y + 10);
    ctx.lineTo(this.flagpole.x + 55, this.flagpole.y + 25);
    ctx.lineTo(this.flagpole.x + 20, this.flagpole.y + 40);
    ctx.closePath();
    ctx.fill();

    // Star on flag
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(
      this.flagpole.x + 35,
      this.flagpole.y + 25,
      5,
      0,
      Math.PI * 2,
      false,
    );
    ctx.fill();
  }

  drawCoins() {
    this.coins.forEach((coin) => {
      if (!coin.collected && this.isInView(coin.x, coin.y, coin.w, coin.h)) {
        coin.draw(this.ctx, this.frame);
      }
    });
  }

  drawItems() {
    this.items.forEach((item) => {
      if (this.isInView(item.x, item.y, item.w, item.h)) {
        item.draw(this.ctx, this.frame);
      }
    });
  }

  drawEnemies() {
    this.enemies.forEach((enemy) => {
      if (this.isInView(enemy.x, enemy.y, enemy.w, enemy.h)) {
        enemy.draw(this.ctx, this.frame);
      }
    });
  }

  drawPlayer() {
    this.player.draw(this.ctx, this);
  }

  drawParticles() {
    this.particles.forEach((p) => {
      if (this.isInView(p.x - 10, p.y - 10, 20, 20)) {
        p.draw(this.ctx);
      }
    });
  }

  drawFireballs() {
    if (this.player.fireballs) {
      this.player.fireballs.forEach((fb) => {
        if (this.isInView(fb.x, fb.y, fb.w, fb.h)) {
          fb.draw(this.ctx);
        }
      });
    }
  }

  gameOver(win) {
    this.gameRunning = false;
    const gameOverScreen = document.getElementById("gameOverScreen");
    const gameOverTitle = document.getElementById("gameOverTitle");
    const finalScoreEl = document.getElementById("finalScore");
    const overlayIcon = document.getElementById("overlayIcon");

    gameOverScreen.classList.remove("win", "lose");

    if (gameOverTitle) {
      if (win) {
        gameOverScreen.classList.add("win");
        if (this.currentLevel < this.totalLevels) {
          gameOverTitle.innerText = "LEVEL CLEAR!";
          if (overlayIcon) overlayIcon.className = "ph ph-check-circle";
        } else {
          gameOverTitle.innerText = "YOU WIN!";
          if (overlayIcon) overlayIcon.className = "ph ph-trophy";
        }
      } else {
        gameOverScreen.classList.add("lose");
        gameOverTitle.innerText = "GAME OVER";
        if (overlayIcon) overlayIcon.className = "ph ph-skull";
      }
    }

    if (finalScoreEl) finalScoreEl.innerText = this.score.toLocaleString();
    if (gameOverScreen) {
      gameOverScreen.classList.add("active");

      // Update button text based on game state
      const restartBtn = document.getElementById("restartBtn");
      if (restartBtn) {
        if (win && this.currentLevel < this.totalLevels) {
          restartBtn.innerHTML = "<i class='ph ph-arrow-right'></i> NEXT LEVEL";
          restartBtn.onclick = () => this.nextLevel();
        } else {
          restartBtn.innerHTML =
            "<i class='ph ph-arrow-clockwise'></i> PLAY AGAIN";
          restartBtn.onclick = () => this.restartLevel();
        }
      }
    }
  }

  updateScore(points) {
    this.score += points;
    const scoreDisplay = document.getElementById("scoreDisplay");
    const mobileScore = document.getElementById("mobileScore");
    if (scoreDisplay) {
      let s = this.score.toString();
      while (s.length < 6) s = "0" + s;
      scoreDisplay.innerText = s;
    }
    if (mobileScore) mobileScore.innerText = this.score;
  }

  hitBlock(block) {
    if (block.type === "question" && block.active) {
      block.active = false;
      block.bounceOffset = -10;
      if (block.content === "mushroom") {
        this.items.push(new Mushroom(block.x, block.y - 32));
        this.playSound("powerup");
      } else {
        this.updateScore(200);
        this.spawnParticles(block.x + 16, block.y - 16, "#ffd700", 6);
        this.playSound("coin");
      }
    } else if (block.type === "brick") {
      if (block.unbreakable) {
        block.bounceOffset = -6;
        this.playSound("bump");
      } else if (this.player.isBig) {
        block.broken = true;
        this.spawnParticles(block.x + 16, block.y + 16, "#c84c0c", 8);
        this.playSound("break");
        this.updateScore(50);
      } else {
        block.bounceOffset = -8;
        this.playSound("bump");
      }
    }
  }
}

// Particle class for visual effects
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = -Math.random() * 6 - 2;
    this.size = Math.random() * 6 + 4;
    this.life = 30;
    this.dead = false;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.4;
    this.rotation += this.rotationSpeed;
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life / 30;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// Coin class
class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.collected = false;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.collected = false;
  }

  update(player, game) {
    if (this.collected) return;
    if (
      player.x < this.x + this.w &&
      player.x + player.w > this.x &&
      player.y < this.y + this.h &&
      player.y + player.h > this.y
    ) {
      this.collected = true;
      game.updateScore(100);
      game.playSound("coin");
      game.spawnParticles(this.x + 8, this.y + 8, "#ffd700", 4);
    }
  }

  draw(ctx, frame) {
    const stretch = Math.abs(Math.sin(frame * 0.1));
    const w = 12 * stretch + 4;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    ctx.beginPath();
    ctx.ellipse(
      this.x + 8,
      this.y + 15,
      w / 2 + 1,
      4,
      0,
      0,
      Math.PI * 2,
      false,
    );
    ctx.fill();

    // Coin with 3D effect
    const coinGrad = ctx.createRadialGradient(
      this.x + 6,
      this.y + 6,
      0,
      this.x + 8,
      this.y + 8,
      12,
    );
    coinGrad.addColorStop(0, "#FFFF8A");
    coinGrad.addColorStop(0.3, "#FFD700");
    coinGrad.addColorStop(0.7, "#DAA520");
    coinGrad.addColorStop(1, "#B8860B");

    ctx.fillStyle = coinGrad;
    ctx.beginPath();
    ctx.ellipse(
      this.x + 8,
      this.y + 8,
      w / 2 + 2,
      10,
      0,
      0,
      Math.PI * 2,
      false,
    );
    ctx.fill();

    // Coin edge (darker)
    ctx.strokeStyle = "#B8860B";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(
      this.x + 8,
      this.y + 8,
      w / 2 + 2,
      10,
      0,
      0,
      Math.PI * 2,
      false,
    );
    ctx.stroke();

    // Inner shine
    const innerGrad = ctx.createRadialGradient(
      this.x + 7,
      this.y + 6,
      0,
      this.x + 7,
      this.y + 6,
      6,
    );
    innerGrad.addColorStop(0, "#FFFFE0");
    innerGrad.addColorStop(1, "#FFFACD");
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(this.x + 7, this.y + 7, w / 3 - 1, 4, 0, 0, Math.PI * 2, false);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(this.x + 5, this.y + 4, 2, 3, -0.5, 0, Math.PI * 2, false);
    ctx.fill();

    // Star symbol on coin
    ctx.fillStyle = "#B8860B";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", this.x + 8, this.y + 8);
  }
}

// Base Entity class
class Entity {
  constructor(x, y, w, h, color) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.dead = false;
  }

  collide(other) {
    return (
      this.x < other.x + other.w &&
      this.x + this.w > other.x &&
      this.y < other.y + other.h &&
      this.y + this.h > other.y
    );
  }
}

// Mario player class
class Mario extends Entity {
  constructor(x, y) {
    super(x, y, 24, 32, "red");
    this.isBig = false;
    this.hasFire = false;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.facingRight = true;
    this.grounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.walkFrame = 0;
    this.fireballs = [];
    this.canShoot = true;
    this.shootCooldown = 0;
  }

  update(keys, blocks, game) {
    const gc = game.gameConstants;

    // Horizontal movement with smooth acceleration
    if (keys.right) {
      this.vx += gc.ACCEL;
      this.facingRight = true;
    }
    if (keys.left) {
      this.vx -= gc.ACCEL;
      this.facingRight = false;
    }

    // Apply friction
    if (!keys.left && !keys.right) {
      this.vx *= gc.FRICTION;
    }

    // Speed cap
    const maxSpeed = keys.run ? gc.MAX_RUN_SPEED : gc.MAX_SPEED;
    this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

    // Minimum velocity threshold
    if (Math.abs(this.vx) < 0.1) this.vx = 0;

    // Horizontal collision
    this.x += this.vx;
    this.checkCollision(blocks, true, game);

    // Prevent going off left edge
    if (this.x < 0) this.x = 0;

    // Gravity
    this.vy += gc.GRAVITY;

    // Variable jump height - cut jump short if button released
    if (!keys.up && this.vy < -4) {
      this.vy += 0.5;
    }

    // Terminal velocity
    if (this.vy > 12) this.vy = 12;

    // Vertical movement
    this.y += this.vy;

    // Track if was grounded for coyote time
    const wasGrounded = this.grounded;
    this.grounded = false;
    this.checkCollision(blocks, false, game);

    // Coyote time - allow jumping shortly after leaving platform
    if (this.grounded) {
      this.coyoteTimer = gc.COYOTE_TIME;
    } else if (wasGrounded && this.vy > 0) {
      this.coyoteTimer--;
    }

    // Jump buffer - remember jump input
    if (keys.up && !this.jumpBufferTimer) {
      this.jumpBufferTimer = gc.JUMP_BUFFER;
    }
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer--;

    // Execute buffered jump
    if (this.jumpBufferTimer > 0 && (this.grounded || this.coyoteTimer > 0)) {
      this.executeJump(game);
      this.jumpBufferTimer = 0;
    }

    // Fall death
    if (this.y > game.canvas.height + 50) {
      this.die(game);
    }

    // Invincibility timer
    if (this.invincible) {
      this.invincibleTimer--;
      if (this.invincibleTimer <= 0) this.invincible = false;
    }

    // Walk animation
    if (Math.abs(this.vx) > 0.5) {
      this.walkFrame += Math.abs(this.vx) * 0.15;
    }

    // Fireball cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown--;
    } else {
      this.canShoot = true;
    }
  }

  tryJump(game) {
    if (this.grounded || this.coyoteTimer > 0) {
      this.executeJump(game);
    } else {
      this.jumpBufferTimer = game.gameConstants.JUMP_BUFFER;
    }
  }

  executeJump(game) {
    this.vy = game.gameConstants.JUMP_FORCE;
    this.grounded = false;
    this.coyoteTimer = 0;
    game.playSound("jump");
  }

  shoot(game) {
    if (!this.hasFire || !this.canShoot || this.fireballs.length >= 2) return;

    const dir = this.facingRight ? 1 : -1;
    this.fireballs.push(
      game.getFireball(
        this.x + (this.facingRight ? this.w : -8),
        this.y + this.h / 2,
        dir,
      ),
    );
    this.canShoot = false;
    this.shootCooldown = 15;
    game.playSound("fireball");
  }

  grow(game) {
    const powerDisplay = document.getElementById("powerDisplay");
    if (!this.isBig) {
      this.isBig = true;
      this.y -= 16;
      this.h = 48;
      if (powerDisplay) powerDisplay.innerText = "BIG";
    } else if (!this.hasFire) {
      this.hasFire = true;
      if (powerDisplay) powerDisplay.innerText = "FIRE";
    }
    game.playSound("powerup");
    game.updateScore(1000);
  }

  takeDamage(game) {
    if (this.invincible) return;
    const powerDisplay = document.getElementById("powerDisplay");

    if (this.hasFire) {
      this.hasFire = false;
      this.invincible = true;
      this.invincibleTimer = 90;
      if (powerDisplay) powerDisplay.innerText = "BIG";
      game.playSound("die");
    } else if (this.isBig) {
      this.isBig = false;
      this.h = 32;
      this.y += 16;
      this.invincible = true;
      this.invincibleTimer = 90;
      if (powerDisplay) powerDisplay.innerText = "SMALL";
      game.playSound("die");
    } else {
      this.die(game);
    }
  }

  die(game) {
    this.dead = true;
    game.playSound("die");
  }

  checkCollision(blocks, isX, game) {
    blocks.forEach((b) => {
      if (b.broken) return;
      if (this.collide(b)) {
        if (isX) {
          if (this.vx > 0) this.x = b.x - this.w;
          else if (this.vx < 0) this.x = b.x + b.w;
          this.vx = 0;
        } else {
          if (this.vy > 0) {
            this.y = b.y - this.h;
            this.vy = 0;
            this.grounded = true;
          } else if (this.vy < 0) {
            this.y = b.y + b.h;
            this.vy = 1;
            game.hitBlock(b);
          }
        }
      }
    });
  }

  draw(ctx, game) {
    // Invincibility flashing
    if (this.invincible && Math.floor(game.frame / 4) % 2 === 0) return;

    ctx.save();

    const scaleX = this.facingRight ? 1 : -1;
    const drawX = this.facingRight ? this.x : this.x + this.w;
    ctx.translate(drawX, this.y);
    ctx.scale(scaleX, 1);

    const w = this.w;
    const h = this.h;
    const isWalking = Math.abs(this.vx) > 0.5;
    const walkCycle = Math.floor(this.walkFrame) % 4;
    const isJumping = !this.grounded;

    // Colors
    const hatColor = this.hasFire ? "#fff" : "#e52521";
    const shirtColor = this.hasFire ? "#e52521" : "#e52521";
    const overallColor = this.hasFire ? "#e52521" : "#0066cc";
    const skinColor = "#ffc0a0";
    const shoeColor = "#8b4513";

    if (this.isBig) {
      // Big Mario
      // Shadow under feet
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(this.x + w / 2, this.y + h, 14, 4, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Hat shadow
      ctx.fillStyle = this.hasFire ? "#ccc" : "#c41e3a";
      ctx.fillRect(4, 1, w - 8, 6);
      ctx.fillRect(0, 9, w, 4);

      // Hat
      ctx.fillStyle = hatColor;
      ctx.fillRect(4, 0, w - 8, 8);
      ctx.fillRect(0, 8, w, 6);

      // Hat highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(5, 1, w - 10, 3);

      // Hair
      ctx.fillStyle = "#8b4513";
      ctx.beginPath();
      ctx.arc(w - 3, 11, 4, 0, Math.PI * 2, false);
      ctx.fill();

      // Face shadow
      ctx.fillStyle = "rgba(255, 194, 144, 0.8)";
      ctx.fillRect(4, 14, w - 8, 12);

      // Face
      ctx.fillStyle = skinColor;
      ctx.fillRect(4, 14, w - 8, 12);

      // Ear
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(w - 2, 18, 3, 0, Math.PI * 2, false);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = "#fff";
      ctx.fillRect(9, 19, 2, 2);
      ctx.fillRect(8, 18, 1, 1);

      // Eyes
      ctx.fillStyle = "#000";
      ctx.fillRect(8, 18, 4, 4);

      // Blush
      ctx.fillStyle = "rgba(255, 182, 193, 0.4)";
      ctx.fillRect(3, 22, 3, 2);

      // Nose
      ctx.fillStyle = "#e5a88a";
      ctx.fillRect(10, 22, 4, 3);

      // Mustache shadow
      ctx.fillStyle = "#5D3A1A";
      ctx.fillRect(4, 26, w - 8, 1);

      // Mustache
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(4, 22, w - 8, 4);

      // Mustache detail
      ctx.fillStyle = "#654321";
      ctx.fillRect(4, 25, w - 8, 1);

      // Mouth
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(8, 24, 6, 2);

      // Shirt shadow
      ctx.fillStyle = "rgba(229, 37, 33, 0.8)";
      ctx.fillRect(2, 26, w - 4, 10);

      // Shirt
      ctx.fillStyle = shirtColor;
      ctx.fillRect(2, 26, w - 4, 10);

      // Shirt highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(3, 27, w - 6, 3);

      // Overall straps
      ctx.fillStyle = overallColor;
      ctx.fillRect(3, 28, 5, 4);
      ctx.fillRect(w - 8, 28, 5, 4);

      // Overalls
      ctx.fillStyle = overallColor;
      ctx.fillRect(0, 32, w, 10);
      ctx.fillRect(4, 28, 6, 8);
      ctx.fillRect(w - 10, 28, 6, 8);

      // Overall texture
      ctx.fillStyle = "rgba(0, 0, 100, 0.1)";
      ctx.fillRect(2, 34, w - 4, 7);

      // Buttons shadow
      ctx.fillStyle = "#ccac00";
      ctx.fillRect(7, 35, 3, 3);
      ctx.fillRect(w - 9, 35, 3, 3);

      // Buttons
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(6, 34, 4, 4);
      ctx.fillRect(w - 10, 34, 4, 4);

      // Button highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(7, 35, 2, 2);
      ctx.fillRect(w - 9, 35, 2, 2);

      // Legs animation
      const legOffset = isJumping
        ? 4
        : isWalking
          ? Math.sin(this.walkFrame * 0.8) * 3
          : 0;
      ctx.fillStyle = overallColor;
      ctx.fillRect(2, 42, 8, 6 + legOffset);
      ctx.fillRect(w - 10, 42, 8, 6 - legOffset);

      // Leg highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(3, 42, 3, 4);
      ctx.fillRect(w - 9, 42, 3, 4);

      // Shoes shadow
      ctx.fillStyle = "#5D3A1A";
      ctx.fillRect(0, h - 4, 10, 2);
      ctx.fillRect(w - 10, h - 4, 10, 2);

      // Shoes
      ctx.fillStyle = shoeColor;
      ctx.fillRect(0, h - 6, 10, 6);
      ctx.fillRect(w - 10, h - 6, 10, 6);

      // Shoe details
      ctx.fillStyle = "#654321";
      ctx.fillRect(1, h - 4, 4, 2);
      ctx.fillRect(w - 5, h - 4, 4, 2);

      // Shoe highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(1, h - 5, 3, 1);
      ctx.fillRect(w - 9, h - 5, 3, 1);
    } else {
      // Small Mario
      // Hat
      ctx.fillStyle = hatColor;
      ctx.fillRect(4, 0, w - 8, 6);
      ctx.fillRect(0, 6, w, 4);

      // Face
      ctx.fillStyle = skinColor;
      ctx.fillRect(4, 10, w - 8, 8);

      // Eye
      ctx.fillStyle = "#000";
      ctx.fillRect(8, 12, 3, 3);

      // Mustache
      ctx.fillStyle = "#8b4513";
      ctx.fillRect(4, 16, w - 8, 2);

      // Body
      ctx.fillStyle = shirtColor;
      ctx.fillRect(2, 18, w - 4, 6);

      // Overalls
      ctx.fillStyle = overallColor;
      ctx.fillRect(2, 22, w - 4, 6);

      // Legs
      const legOffset = isJumping
        ? 2
        : isWalking
          ? Math.sin(this.walkFrame * 0.8) * 2
          : 0;
      ctx.fillRect(2, 28, 8, 4 + legOffset);
      ctx.fillRect(w - 10, 28, 8, 4 - legOffset);

      // Shoes
      ctx.fillStyle = shoeColor;
      ctx.fillRect(0, h - 4, 10, 4);
      ctx.fillRect(w - 10, h - 4, 10, 4);
    }

    ctx.restore();
  }
}

// Fireball class
class Fireball extends Entity {
  constructor(x, y, dir) {
    super(x, y, 12, 12, "#ff6600");
    this.vx = dir * 8;
    this.vy = 0;
    this.bounces = 0;
  }

  reset(x, y, dir) {
    this.x = x;
    this.y = y;
    this.vx = dir * 8;
    this.vy = 0;
    this.bounces = 0;
    this.dead = false;
  }

  update(blocks, enemies, game) {
    this.vy += 0.4;
    this.x += this.vx;
    this.y += this.vy;

    // Check block collisions
    blocks.forEach((b) => {
      if (b.broken) return;
      if (this.collide(b)) {
        if (this.vy > 0) {
          this.y = b.y - this.h;
          this.vy = -6;
          this.bounces++;
        } else {
          this.dead = true;
        }
      }
    });

    // Check enemy collisions
    enemies.forEach((e) => {
      if (!e.dead && !e.squished && this.collide(e)) {
        e.dead = true;
        this.dead = true;
        game.updateScore(100);
        game.spawnParticles(e.x + 8, e.y + 8, "#ff6600", 6);
        game.playSound("stomp");
      }
    });

    // Remove if off screen or too many bounces
    if (this.y > game.canvas.height || this.bounces > 3) {
      this.dead = true;
    }
  }

  draw(ctx) {
    // Fireball glow
    const glowGrad = ctx.createRadialGradient(
      this.x + 6,
      this.y + 6,
      0,
      this.x + 6,
      this.y + 6,
      10,
    );
    glowGrad.addColorStop(0, "rgba(255, 200, 0, 0.8)");
    glowGrad.addColorStop(0.5, "rgba(255, 100, 0, 0.4)");
    glowGrad.addColorStop(1, "rgba(255, 50, 0, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(this.x + 6, this.y + 6, 10, 0, Math.PI * 2, false);
    ctx.fill();

    // Fireball body
    const bodyGrad = ctx.createRadialGradient(
      this.x + 4,
      this.y + 4,
      0,
      this.x + 6,
      this.y + 6,
      6,
    );
    bodyGrad.addColorStop(0, "#FFFF00");
    bodyGrad.addColorStop(0.5, "#FF8C00");
    bodyGrad.addColorStop(1, "#FF4500");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(this.x + 6, this.y + 6, 6, 0, Math.PI * 2, false);
    ctx.fill();

    // Inner core
    ctx.fillStyle = "#FFFFE0";
    ctx.beginPath();
    ctx.arc(this.x + 5, this.y + 5, 3, 0, Math.PI * 2, false);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(this.x + 4, this.y + 4, 2, 0, Math.PI * 2, false);
    ctx.fill();

    // Flame trail particles
    for (let i = 0; i < 3; i++) {
      const trailX = this.x + 6 - (this.vx > 0 ? -i * 3 : i * 3);
      const trailY = this.y + 6 + Math.sin(Date.now() / 50 + i) * 2;
      const trailSize = 4 - i;
      const trailAlpha = 0.6 - i * 0.2;
      ctx.fillStyle = `rgba(255, ${150 - i * 30}, 0, ${trailAlpha})`;
      ctx.beginPath();
      ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2, false);
      ctx.fill();
    }
  }
}

// Goomba enemy class
class Goomba extends Entity {
  constructor(x, y) {
    super(x, y, 28, 28, "#ac7c00");
    this.vx = -1.5;
    this.deadTimer = 0;
    this.squished = false;
    this.walkFrame = 0;
  }

  update(blocks, player, game) {
    if (this.dead) return;

    if (this.squished) {
      this.deadTimer--;
      if (this.deadTimer <= 0) this.dead = true;
      return;
    }

    this.walkFrame += 0.15;
    this.x += this.vx;

    let onGround = false;
    blocks.forEach((b) => {
      if (b.broken) return;
      if (this.collide(b)) {
        if (this.y + this.h - 5 <= b.y) {
          this.y = b.y - this.h;
          onGround = true;
        } else {
          this.vx *= -1;
          this.x += this.vx * 2;
        }
      }
    });

    if (!onGround) this.y += 4;

    // Player collision
    if (player.collide(this) && !player.dead) {
      if (player.vy > 0 && player.y + player.h - player.vy <= this.y + 8) {
        this.squished = true;
        this.deadTimer = 25;
        player.vy = -9;
        game.updateScore(100);
        game.playSound("stomp");
      } else if (!player.invincible) {
        player.takeDamage(game);
      }
    }
  }

  draw(ctx, frame) {
    if (this.dead) return;

    if (this.squished) {
      // Squished goomba - flat pancake look
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.ellipse(this.x + 14, this.y + 24, 16, 6, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Body texture squish marks
      ctx.fillStyle = "#654321";
      ctx.beginPath();
      ctx.ellipse(this.x + 10, this.y + 24, 6, 3, 0.3, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(this.x + 18, this.y + 24, 5, 2, -0.3, 0, Math.PI * 2, false);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(this.x + 8, this.y + 24, 4, 3, 0, 0, Math.PI * 2, false);
      ctx.ellipse(this.x + 20, this.y + 24, 4, 3, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Dead eyes
      ctx.fillStyle = "#000";
      ctx.fillRect(this.x + 6, this.y + 23, 2, 2);
      ctx.fillRect(this.x + 22, this.y + 23, 2, 2);

      // X marks
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x + 4, this.y + 22);
      ctx.lineTo(this.x + 8, this.y + 26);
      ctx.moveTo(this.x + 8, this.y + 22);
      ctx.lineTo(this.x + 4, this.y + 26);
      ctx.stroke();
    } else {
      const walkOffset = Math.sin(this.walkFrame) * 2;

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(this.x + 14, this.y + 28, 12, 4, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Body with gradient effect
      const bodyGrad = ctx.createRadialGradient(
        this.x + 14,
        this.y + 10,
        0,
        this.x + 14,
        this.y + 10,
        14,
      );
      bodyGrad.addColorStop(0, "#D2691E");
      bodyGrad.addColorStop(0.7, "#A0522D");
      bodyGrad.addColorStop(1, "#8B4513");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(this.x + 14, this.y + 10, 14, 12, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Body texture spots
      ctx.fillStyle = "rgba(139, 69, 19, 0.5)";
      for (let i = 0; i < 5; i++) {
        const spotX = this.x + 6 + (i % 3) * 8;
        const spotY = this.y + 8 + Math.floor(i / 3) * 8;
        ctx.beginPath();
        ctx.arc(spotX, spotY, 1.5, 0, Math.PI * 2, false);
        ctx.fill();
      }

      // Belly
      ctx.fillStyle = "#DEB887";
      ctx.beginPath();
      ctx.ellipse(this.x + 14, this.y + 14, 8, 6, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Belly highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.ellipse(this.x + 12, this.y + 12, 3, 2, -0.5, 0, Math.PI * 2, false);
      ctx.fill();

      // Eyes - big white circles with angry eyebrows
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(this.x + 8, this.y + 10, 5, 0, Math.PI * 2, false);
      ctx.arc(this.x + 20, this.y + 10, 5, 0, Math.PI * 2, false);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = "#fff";
      ctx.fillRect(this.x + 6, this.y + 8, 2, 2);
      ctx.fillRect(this.x + 19, this.y + 8, 2, 2);

      // Pupils
      ctx.fillStyle = "#000";
      ctx.fillRect(this.x + 6, this.y + 10, 3, 4);
      ctx.fillRect(this.x + 19, this.y + 10, 3, 4);

      // Angry eyebrows
      ctx.fillStyle = "#4a0080";
      ctx.beginPath();
      ctx.moveTo(this.x + 3, this.y + 5);
      ctx.lineTo(this.x + 11, this.y + 7);
      ctx.lineTo(this.x + 11, this.y + 5);
      ctx.lineTo(this.x + 3, this.y + 5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(this.x + 21, this.y + 5);
      ctx.lineTo(this.x + 25, this.y + 7);
      ctx.lineTo(this.x + 25, this.y + 5);
      ctx.lineTo(this.x + 21, this.y + 5);
      ctx.fill();

      // Nose
      ctx.fillStyle = "#D2691E";
      ctx.beginPath();
      ctx.arc(this.x + 14, this.y + 17, 3, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(this.x + 12, this.y + 16, 4, 2);

      // Mouth - grumpy expression
      ctx.fillStyle = "#4a0080";
      ctx.beginPath();
      ctx.arc(this.x + 14, this.y + 21, 4, 0.2, Math.PI - 0.2, false);
      ctx.stroke();

      // Feet with walking animation
      ctx.fillStyle = "#2F1810";
      ctx.fillRect(this.x + 2 - walkOffset, this.y + 20, 10, 6);
      ctx.fillRect(this.x + 16 + walkOffset, this.y + 20, 10, 6);

      // Feet highlights
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(this.x + 2 - walkOffset, this.y + 20, 10, 2);
      ctx.fillRect(this.x + 16 + walkOffset, this.y + 20, 10, 2);

      // Toes
      ctx.fillStyle = "#5D3A1A";
      ctx.fillRect(this.x + 2 - walkOffset, this.y + 24, 3, 2);
      ctx.fillRect(this.x + 8 - walkOffset, this.y + 24, 3, 2);
      ctx.fillRect(this.x + 16 + walkOffset, this.y + 24, 3, 2);
      ctx.fillRect(this.x + 22 + walkOffset, this.y + 24, 3, 2);
    }
  }
}

// Koopa enemy class - harder than Goomba
class Koopa extends Entity {
  constructor(x, y, speed = -2.0) {
    super(x, y, 32, 44, "#00a800");
    this.vx = speed;
    this.deadTimer = 0;
    this.squished = false;
    this.shellSpeed = 0;
    this.isShell = false;
    this.inShell = false;
    this.walkFrame = 0;
  }

  update(blocks, player, game) {
    if (this.dead) return;

    if (this.squished) {
      this.deadTimer--;
      if (this.deadTimer <= 0) this.dead = true;
      return;
    }

    this.walkFrame += 0.12;
    this.x += this.vx;

    let onGround = false;
    blocks.forEach((b) => {
      if (b.broken) return;
      if (this.collide(b)) {
        if (this.y + this.h - 5 <= b.y) {
          this.y = b.y - this.h;
          onGround = true;
        } else {
          this.vx *= -1;
          this.x += this.vx * 2;
        }
      }
    });

    if (!onGround) this.y += 5;

    // Player collision
    if (player.collide(this) && !player.dead) {
      if (player.vy > 0 && player.y + player.h - player.vy <= this.y + 12) {
        // Stomp from above
        this.squished = true;
        this.deadTimer = 30;
        this.isShell = true;
        player.vy = -6;
        game.updateScore(100);
        game.playSound("stomp");
      } else if (!player.invincible && !this.isShell) {
        // Player gets hit
        player.takeDamage(game);
        this.vx = game.gameConstants.ENEMY_KNOCKBACK;
        this.inShell = true;
      } else if (this.isShell && Math.abs(this.vx) > 1) {
        // Moving shell hits player
        player.takeDamage(game);
      }
    }
  }

  draw(ctx, frame) {
    if (this.dead) return;

    if (this.squished) {
      // Squished koopa - flat shell
      ctx.fillStyle = "#228B22";
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 36, 18, 8, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Shell pattern
      ctx.fillStyle = "#006400";
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 36, 12, 5, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Belly showing
      ctx.fillStyle = "#FFE4B5";
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 38, 8, 4, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Head peeking out
      ctx.fillStyle = "#90EE90";
      ctx.beginPath();
      ctx.arc(this.x + 16, this.y + 28, 8, 0, Math.PI * 2, false);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(this.x + 12, this.y + 27, 3, 0, Math.PI * 2, false);
      ctx.arc(this.x + 20, this.y + 27, 3, 0, Math.PI * 2, false);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.fillRect(this.x + 11, this.y + 27, 2, 2);
      ctx.fillRect(this.x + 19, this.y + 27, 2, 2);
    } else if (this.isShell) {
      // Shell only - oval shape
      const shellGrad = ctx.createRadialGradient(
        this.x + 16,
        this.y + 36,
        0,
        this.x + 16,
        this.y + 36,
        16,
      );
      shellGrad.addColorStop(0, "#32CD32");
      shellGrad.addColorStop(1, "#006400");

      ctx.fillStyle = shellGrad;
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 36, 16, 11, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Shell pattern stripes
      ctx.fillStyle = "#228B22";
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 36, 10, 7, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Shell rim
      ctx.strokeStyle = "#004d00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 36, 16, 11, 0, 0, Math.PI * 2, false);
      ctx.stroke();

      // Belly
      ctx.fillStyle = "#FFE4B5";
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 38, 10, 5, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Belly texture lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(this.x + 7, this.y + 36 + i * 2);
        ctx.lineTo(this.x + 25, this.y + 36 + i * 2);
        ctx.stroke();
      }

      // Shell highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.ellipse(this.x + 12, this.y + 30, 4, 3, -0.5, 0, Math.PI * 2, false);
      ctx.fill();
    } else {
      const walkOffset = Math.sin(this.walkFrame) * 3;

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 42, 14, 5, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Feet shadow
      const footY = this.y + 36 + walkOffset;
      ctx.beginPath();
      ctx.ellipse(this.x + 8, this.y + 42, 6, 3, 0, 0, Math.PI * 2, false);
      ctx.ellipse(this.x + 24, this.y + 42, 6, 3, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Body - oval shape with gradient
      const bodyGrad = ctx.createRadialGradient(
        this.x + 16,
        this.y + 16,
        0,
        this.x + 16,
        this.y + 16,
        20,
      );
      bodyGrad.addColorStop(0, "#90EE90");
      bodyGrad.addColorStop(0.6, "#32CD32");
      bodyGrad.addColorStop(1, "#228B22");

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 16, 15, 20, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Body texture lines
      ctx.strokeStyle = "rgba(0, 100, 0, 0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(this.x + 16, this.y + 16, 5 + i * 4, 0, Math.PI * 2, false);
        ctx.stroke();
      }

      // Shell on back with pattern
      const shellGrad = ctx.createRadialGradient(
        this.x + 16,
        this.y + 28,
        0,
        this.x + 16,
        this.y + 28,
        12,
      );
      shellGrad.addColorStop(0, "#32CD32");
      shellGrad.addColorStop(1, "#006400");

      ctx.fillStyle = shellGrad;
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 28, 12, 8, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Shell pattern stripes
      ctx.fillStyle = "#228B22";
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 28, 8, 5, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Shell rim
      ctx.strokeStyle = "#004d00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(this.x + 16, this.y + 28, 12, 8, 0, 0, Math.PI * 2, false);
      ctx.stroke();

      // Shell highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.beginPath();
      ctx.ellipse(this.x + 12, this.y + 24, 5, 3, -0.3, 0, Math.PI * 2, false);
      ctx.fill();

      // Head
      ctx.fillStyle = "#90EE90";
      ctx.beginPath();
      ctx.arc(this.x + 16, this.y + 6, 10, 0, Math.PI * 2, false);
      ctx.fill();

      // Head texture
      ctx.fillStyle = "rgba(0, 100, 0, 0.1)";
      ctx.beginPath();
      ctx.arc(this.x + 16, this.y + 8, 7, 0, Math.PI * 2, false);
      ctx.fill();

      // Head highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(this.x + 13, this.y + 3, 4, 0, Math.PI * 2, false);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(this.x + 11, this.y + 5, 5, 0, Math.PI * 2, false);
      ctx.arc(this.x + 21, this.y + 5, 5, 0, Math.PI * 2, false);
      ctx.fill();

      // Eye ring
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(this.x + 11, this.y + 5, 5, 0, Math.PI * 2, false);
      ctx.arc(this.x + 21, this.y + 5, 5, 0, Math.PI * 2, false);
      ctx.stroke();

      // Pupils
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(this.x + 12, this.y + 5, 2.5, 0, Math.PI * 2, false);
      ctx.arc(this.x + 22, this.y + 5, 2.5, 0, Math.PI * 2, false);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = "#fff";
      ctx.fillRect(this.x + 11, this.y + 4, 1.5, 1.5);
      ctx.fillRect(this.x + 21, this.y + 4, 1.5, 1.5);

      // Blush
      ctx.fillStyle = "rgba(255, 182, 193, 0.5)";
      ctx.beginPath();
      ctx.ellipse(this.x + 6, this.y + 8, 3, 2, 0, 0, Math.PI * 2, false);
      ctx.ellipse(this.x + 26, this.y + 8, 3, 2, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Feet with animation
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.ellipse(this.x + 8, footY, 7, 4, 0, 0, Math.PI * 2, false);
      ctx.ellipse(this.x + 24, footY, 7, 4, 0, 0, Math.PI * 2, false);
      ctx.fill();

      // Feet highlights
      ctx.fillStyle = "#A0522D";
      ctx.beginPath();
      ctx.ellipse(this.x + 8, footY - 1, 5, 2, 0, 0, Math.PI * 2, false);
      ctx.ellipse(this.x + 24, footY - 1, 5, 2, 0, 0, Math.PI * 2, false);
      ctx.fill();
    }
  }
}

// Mushroom power-up class
class Mushroom extends Entity {
  constructor(x, y) {
    super(x, y, 28, 28, "#e52521");
    this.vx = 2;
    this.vy = -2;
    this.spawning = true;
    this.spawnY = y;
  }

  update(blocks, player, game) {
    if (this.spawning) {
      this.y -= 1;
      if (this.y <= this.spawnY - 32) {
        this.spawning = false;
      }
      return;
    }

    // Use game's gravity (varies per level)
    const gravity = game.gameConstants.GRAVITY || 0.4;
    this.vy += gravity;
    this.x += this.vx;
    this.y += this.vy;

    blocks.forEach((b) => {
      if (b.broken) return;
      if (this.collide(b)) {
        if (this.vy > 0) {
          this.y = b.y - this.h;
          this.vy = 0;
        } else if (this.vx > 0) {
          this.vx = -2;
          this.x += this.vx * 2;
        } else {
          this.vx = 2;
          this.x += this.vx * 2;
        }
      }
    });

    // Fall off screen
    if (this.y > game.canvas.height + 50) {
      this.dead = true;
    }

    // Check player collision
    if (player.collide(this)) {
      player.grow(game);
      this.dead = true;
    }
  }

  draw(ctx, frame) {
    // Mushroom cap with gradient
    const capGrad = ctx.createRadialGradient(
      this.x + 14,
      this.y + 10,
      0,
      this.x + 14,
      this.y + 10,
      14,
    );
    capGrad.addColorStop(0, "#FF4500");
    capGrad.addColorStop(0.5, "#DC143C");
    capGrad.addColorStop(1, "#8B0000");

    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.ellipse(
      this.x + 14,
      this.y + 10,
      14,
      12,
      0,
      Math.PI,
      Math.PI * 2,
      false,
    );
    ctx.fill();

    // Cap underside
    ctx.fillStyle = "#FFE4C4";
    ctx.beginPath();
    ctx.ellipse(this.x + 14, this.y + 10, 10, 5, 0, 0, Math.PI * 2, false);
    ctx.fill();

    // White spots on cap
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x + 8, this.y + 6, 4, 0, Math.PI * 2, false);
    ctx.arc(this.x + 20, this.y + 6, 4, 0, Math.PI * 2, false);
    ctx.arc(this.x + 14, this.y + 3, 3, 0, Math.PI * 2, false);
    ctx.fill();

    // Spot shadows
    ctx.fillStyle = "rgba(200, 200, 200, 0.5)";
    ctx.beginPath();
    ctx.arc(this.x + 9, this.y + 7, 2, 0, Math.PI * 2, false);
    ctx.arc(this.x + 21, this.y + 7, 2, 0, Math.PI * 2, false);
    ctx.arc(this.x + 15, this.y + 4, 1.5, 0, Math.PI * 2, false);
    ctx.fill();

    // Stem
    const stemGrad = ctx.createLinearGradient(
      this.x + 6,
      this.y + 10,
      this.x + 22,
      this.y + 26,
    );
    stemGrad.addColorStop(0, "#FFF8DC");
    stemGrad.addColorStop(0.5, "#FFE4C4");
    stemGrad.addColorStop(1, "#DEB887");

    ctx.fillStyle = stemGrad;
    ctx.fillRect(this.x + 6, this.y + 10, 16, 16);

    // Stem highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(this.x + 8, this.y + 12, 4, 12);

    // Face
    ctx.fillStyle = "#000";
    // Left eye
    ctx.beginPath();
    ctx.arc(this.x + 10, this.y + 18, 3, 0, Math.PI * 2, false);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(this.x + 18, this.y + 18, 3, 0, Math.PI * 2, false);
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = "#fff";
    ctx.fillRect(this.x + 10, this.y + 17, 1, 1);
    ctx.fillRect(this.x + 18, this.y + 17, 1, 1);

    // Blush
    ctx.fillStyle = "rgba(255, 182, 193, 0.6)";
    ctx.beginPath();
    ctx.ellipse(this.x + 7, this.y + 22, 3, 2, 0, 0, Math.PI * 2, false);
    ctx.ellipse(this.x + 21, this.y + 22, 3, 2, 0, 0, Math.PI * 2, false);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x + 14, this.y + 22, 4, 0.2, Math.PI - 0.2, false);
    ctx.stroke();
  }
}

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.game = new MiniGame();
  window.game.init();
});

export default MiniGame;
