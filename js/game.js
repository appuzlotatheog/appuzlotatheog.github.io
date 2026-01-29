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
    this.totalLevels = 5;
    this.lives = 3;

    // Screen shake effect
    this.screenShake = { x: 0, y: 0, intensity: 0, decay: 0.9 };

    // Background layers for parallax
    this.backgroundLayers = [];
    this.decorations = [];

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

    // Mobile detection
    this.isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this.supportsVibration = "vibrate" in navigator;

    this.isMuted = localStorage.getItem("gameMuted") === "true";
    this.highScore = parseInt(localStorage.getItem("gameHighScore") || "0");
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
    this.updateMuteButton();
    this.generateBackgroundLayers();
    this.showMobileControls();
    this.drawStartScreen();
  }

  // Haptic feedback for mobile
  vibrate(pattern = 10) {
    if (this.supportsVibration && !this.isMuted) {
      navigator.vibrate(pattern);
    }
  }

  // Screen shake effect
  triggerScreenShake(intensity = 5) {
    this.screenShake.intensity = intensity;
  }

  updateScreenShake() {
    if (this.screenShake.intensity > 0.5) {
      this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
      this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
      this.screenShake.intensity *= this.screenShake.decay;
    } else {
      this.screenShake.x = 0;
      this.screenShake.y = 0;
      this.screenShake.intensity = 0;
    }
  }

  // Generate background layers for parallax effect
  generateBackgroundLayers() {
    this.backgroundLayers = {
      mountains: [],
      hills: [],
      clouds: [],
      bushes: [],
    };

    // Generate mountains
    for (let i = 0; i < 10; i++) {
      this.backgroundLayers.mountains.push({
        x: i * 400 + Math.random() * 100,
        height: 80 + Math.random() * 60,
        width: 150 + Math.random() * 100,
      });
    }

    // Generate hills
    for (let i = 0; i < 15; i++) {
      this.backgroundLayers.hills.push({
        x: i * 250 + Math.random() * 50,
        height: 40 + Math.random() * 30,
        width: 100 + Math.random() * 50,
      });
    }

    // Generate clouds
    for (let i = 0; i < 12; i++) {
      this.backgroundLayers.clouds.push({
        x: i * 200 + Math.random() * 100,
        y: 30 + Math.random() * 80,
        scale: 0.6 + Math.random() * 0.8,
      });
    }

    // Generate bushes
    for (let i = 0; i < 20; i++) {
      this.backgroundLayers.bushes.push({
        x: i * 150 + Math.random() * 50,
        scale: 0.5 + Math.random() * 0.5,
      });
    }
  }

  showMobileControls() {
    const mobileControls = document.getElementById("mobileControls");
    if (mobileControls && this.isMobile) {
      mobileControls.style.display = "block";
    }
  }

  setupEventListeners() {
    const startBtn = document.getElementById("startGameBtn");
    const restartBtn = document.getElementById("restartBtn");
    const muteBtn = document.getElementById("muteBtn");

    if (startBtn) startBtn.addEventListener("click", () => this.startGame());
    if (restartBtn)
      restartBtn.addEventListener("click", () => this.startGame());
    if (muteBtn) muteBtn.addEventListener("click", () => this.toggleMute());

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

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem("gameMuted", this.isMuted);
    this.updateMuteButton();
  }

  updateMuteButton() {
    const muteBtn = document.getElementById("muteBtn");
    if (!muteBtn) return;

    if (this.isMuted) {
      muteBtn.innerHTML = `
        <svg class="icon-svg-inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    } else {
      muteBtn.innerHTML = `
        <svg class="icon-svg-inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M19.07 4.93C20.98 6.84 21.96 9.42 21.96 12C21.96 14.58 20.98 17.16 19.07 19.07M15.54 8.46C16.47 9.39 17 10.7 17 12C17 13.3 16.47 14.61 15.54 15.54" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    }
  }

  updateScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("gameHighScore", this.highScore);
    }

    // Update score display in HUD with animation effect
    const scoreDisplay = document.getElementById("scoreDisplay");
    if (scoreDisplay) {
      scoreDisplay.textContent = this.score.toString().padStart(6, "0");
      scoreDisplay.style.transform = "scale(1.2)";
      scoreDisplay.style.color = "#FFD700";
      setTimeout(() => {
        scoreDisplay.style.transform = "scale(1)";
        scoreDisplay.style.color = "#fff";
      }, 150);
    }

    const mobileScore = document.getElementById("mobileScore");
    if (mobileScore) mobileScore.textContent = this.score;
  }

  updateLivesDisplay() {
    const livesDisplay = document.getElementById("livesDisplay");
    if (livesDisplay) {
      livesDisplay.textContent = this.lives;
      livesDisplay.style.transform = "scale(1.3)";
      livesDisplay.style.color = "#ef4444";
      setTimeout(() => {
        livesDisplay.style.transform = "scale(1)";
        livesDisplay.style.color = "#fff";
      }, 200);
    }
  }

  updatePowerDisplay(power) {
    const powerDisplay = document.getElementById("powerDisplay");
    if (powerDisplay) {
      powerDisplay.textContent = power;
      powerDisplay.style.transform = "scale(1.2)";
      setTimeout(() => {
        powerDisplay.style.transform = "scale(1)";
      }, 150);
    }
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

    // Soft cloud gradient
    const cloudGrad = ctx.createRadialGradient(30, 15, 0, 30, 20, 50);
    cloudGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    cloudGrad.addColorStop(0.4, "rgba(255, 255, 255, 0.8)");
    cloudGrad.addColorStop(0.7, "rgba(240, 248, 255, 0.6)");
    cloudGrad.addColorStop(1, "rgba(230, 240, 250, 0.3)");

    ctx.fillStyle = cloudGrad;

    // Main cloud body
    ctx.beginPath();
    ctx.ellipse(30, 18, 38, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cloud puffs
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(8, 18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(52, 18, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(30, 8, 15, 0, Math.PI * 2);
    ctx.fill();

    // Cloud highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.beginPath();
    ctx.ellipse(25, 10, 12, 6, -0.3, 0, Math.PI * 2);
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

    // Helper for haptic feedback
    const addTouchWithFeedback = (
      element,
      onStart,
      onEnd,
      vibrationPattern = 10,
    ) => {
      if (!element) return;

      element.addEventListener(
        "touchstart",
        (e) => {
          if (e.cancelable) e.preventDefault();
          this.vibrate(vibrationPattern);
          onStart();
          element.classList.add("active");
        },
        { passive: false },
      );

      element.addEventListener(
        "touchend",
        (e) => {
          if (e.cancelable) e.preventDefault();
          onEnd();
          element.classList.remove("active");
        },
        { passive: false },
      );

      element.addEventListener(
        "touchcancel",
        (e) => {
          if (e.cancelable) e.preventDefault();
          onEnd();
          element.classList.remove("active");
        },
        { passive: false },
      );
    };

    addTouchWithFeedback(
      touchLeft,
      () => {
        this.keys.left = true;
      },
      () => {
        this.keys.left = false;
      },
    );

    addTouchWithFeedback(
      touchRight,
      () => {
        this.keys.right = true;
      },
      () => {
        this.keys.right = false;
      },
    );

    addTouchWithFeedback(
      touchUp,
      () => {
        if (this.gameRunning && this.player) {
          this.player.tryJump(this);
        }
        this.keys.up = true;
      },
      () => {
        this.keys.up = false;
      },
      [10, 5, 10], // Double tap pattern for jump
    );

    addTouchWithFeedback(
      touchDown,
      () => {
        this.keys.down = true;
      },
      () => {
        this.keys.down = false;
      },
    );

    addTouchWithFeedback(
      touchRun,
      () => {
        this.keys.run = true;
      },
      () => {
        this.keys.run = false;
      },
    );

    addTouchWithFeedback(
      touchShoot,
      () => {
        if (this.gameRunning && this.player) {
          this.player.shoot(this);
        }
      },
      () => {},
      [15, 10, 15], // Stronger feedback for shooting
    );
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
      {
        // LEVEL 5 - The Ultimate Challenge: Verticality and Precision
        map: [
          "..................................................................................",
          "........................................C.C.C......................................",
          ".......................................!B!B!B!.....................................",
          "..........................C.C.......................C.C............................",
          ".........................?B?B?.....................!B!B!...........................",
          "...................................................................................",
          ".................T...........................................T.....................",
          ".................P..P.....................................P..P.....................",
          ".................P..P.......PPP.........PPP.........PPP...P..P.........F...........",
          ".......PPP.......P..P......P...P.......P...P.......P...P..P..P.....................",
          "......P...P......P..P......P...P...G...P...P...K...P...P..P..P...G.................",
          "......P...P......P..P......P...P.......P...P.......P...P..P..P.....................",
          "..C...P...P..C...P..P..C...P...P.......P...P.......P...P..P..P.....................",
          "####################################################################################",
          "####################################################################################",
        ],
        coins: 25,
        enemies: 15,
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
    if (this.isMuted || !this.audioCtx) return;

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

  spawnParticles(x, y, color, count = 4, options = {}) {
    const {
      velocityMultiplier = 1,
      sizeMultiplier = 1,
      gravity = true,
      glow = false,
    } = options;

    for (let i = 0; i < count; i++) {
      const p = this.getParticle(x, y, color);
      p.vx *= velocityMultiplier;
      p.vy *= velocityMultiplier;
      p.size *= sizeMultiplier;
      p.hasGravity = gravity;
      p.glow = glow;
      this.particles.push(p);
    }
  }

  // Enhanced particle burst for special effects
  spawnBurstParticles(x, y, colors, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = this.getParticle(x, y, color);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 4 + Math.random() * 4;
      p.life = 40;
      p.glow = true;
      this.particles.push(p);
    }
  }

  // Star particles for coin collection
  spawnStarParticles(x, y, count = 6) {
    const colors = ["#FFD700", "#FFA500", "#FFFF00", "#FFE4B5"];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = this.getParticle(x, y, color);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 2;
      p.size = 3 + Math.random() * 3;
      p.life = 35;
      p.glow = true;
      p.isStar = true;
      this.particles.push(p);
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
      // Victory celebration particles
      this.spawnFlagpoleCelebration();
      this.gameOver(true);
    }
  }

  // Spawn celebration particles when reaching flagpole
  spawnFlagpoleCelebration() {
    const celebrationColors = [
      "#FFD700",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
    ];

    // Burst of particles from flagpole
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      const color =
        celebrationColors[Math.floor(Math.random() * celebrationColors.length)];
      const p = this.getParticle(
        this.flagpole.x + 17,
        this.flagpole.y + 20 + Math.random() * 40,
        color,
      );
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 3;
      p.size = 4 + Math.random() * 6;
      p.life = 50 + Math.random() * 30;
      p.maxLife = p.life;
      p.glow = true;
      p.isStar = Math.random() > 0.5;
      this.particles.push(p);
    }

    // Screen shake for victory
    this.triggerScreenShake(8);
    this.vibrate([50, 30, 50, 30, 100]);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Update screen shake
    this.updateScreenShake();

    // Apply screen shake
    ctx.save();
    ctx.translate(this.screenShake.x, this.screenShake.y);

    // Use cached sky gradient with enhanced colors
    ctx.fillStyle = this.getSkyGradient();
    ctx.fillRect(0, 0, w, h);

    // Draw enhanced parallax background layers
    this.drawParallaxBackground(ctx, w, h);

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
    ctx.restore();
  }

  drawParallaxBackground(ctx, w, h) {
    // Draw distant mountains (slowest parallax)
    const mountainOffset = this.cameraX * 0.1;
    ctx.fillStyle = "rgba(100, 130, 180, 0.4)";
    this.backgroundLayers.mountains.forEach((m) => {
      const x = m.x - (mountainOffset % 4000);
      if (x > -m.width && x < w + m.width) {
        ctx.beginPath();
        ctx.moveTo(x, h - 64);
        ctx.lineTo(x + m.width / 2, h - 64 - m.height);
        ctx.lineTo(x + m.width, h - 64);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw hills (medium parallax)
    const hillOffset = this.cameraX * 0.2;
    ctx.fillStyle = "rgba(50, 120, 80, 0.5)";
    this.backgroundLayers.hills.forEach((hill) => {
      const x = hill.x - (hillOffset % 3750);
      if (x > -hill.width && x < w + hill.width) {
        ctx.beginPath();
        ctx.ellipse(
          x + hill.width / 2,
          h - 64,
          hill.width / 2,
          hill.height,
          0,
          Math.PI,
          0,
        );
        ctx.fill();
      }
    });

    // Draw clouds (slow parallax with gentle movement)
    const cloudOffset = this.cameraX * 0.3;
    this.backgroundLayers.clouds.forEach((cloud, i) => {
      const x =
        cloud.x - (cloudOffset % 2400) + Math.sin(this.frame * 0.01 + i) * 5;
      if (x > -100 && x < w + 100) {
        this.drawCloud(ctx, x, cloud.y, cloud.scale);
      }
    });

    // Draw bushes (faster parallax, near ground)
    const bushOffset = this.cameraX * 0.5;
    ctx.fillStyle = "#228B22";
    this.backgroundLayers.bushes.forEach((bush) => {
      const x = bush.x - (bushOffset % 3000);
      if (x > -50 && x < w + 50) {
        const bushY = h - 64;
        const bushSize = 20 * bush.scale;
        ctx.beginPath();
        ctx.arc(x, bushY, bushSize, Math.PI, 0);
        ctx.arc(x + bushSize * 0.8, bushY, bushSize * 0.8, Math.PI, 0);
        ctx.arc(x - bushSize * 0.8, bushY, bushSize * 0.7, Math.PI, 0);
        ctx.fill();
      }
    });
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

    // Haptic feedback
    if (win) {
      this.vibrate([50, 30, 50, 30, 100]); // Victory pattern
    } else {
      this.vibrate([100, 50, 200]); // Defeat pattern
    }

    const gameOverScreen = document.getElementById("gameOverScreen");
    const gameOverTitle = document.getElementById("gameOverTitle");
    const finalScoreEl = document.getElementById("finalScore");
    const overlayIcon = document.querySelector(".overlay-icon");

    if (gameOverScreen) {
      gameOverScreen.classList.remove("win", "lose");
    }

    if (gameOverTitle) {
      if (win) {
        if (gameOverScreen) gameOverScreen.classList.add("win");
        if (this.currentLevel < this.totalLevels) {
          gameOverTitle.innerText = "LEVEL CLEAR!";
          if (overlayIcon)
            overlayIcon.innerHTML = `
            <svg class="icon-svg-inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;
        } else {
          gameOverTitle.innerText = "YOU WIN!";
          if (overlayIcon)
            overlayIcon.innerHTML = `
            <svg class="icon-svg-inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            </svg>`;
        }
      } else {
        if (gameOverScreen) gameOverScreen.classList.add("lose");
        gameOverTitle.innerText = "GAME OVER";
        if (overlayIcon)
          overlayIcon.innerHTML = `
          <svg class="icon-svg-inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>`;
      }
    }

    if (finalScoreEl) {
      // Animate score counting up
      let displayScore = 0;
      const targetScore = this.score;
      const increment = Math.ceil(targetScore / 30);
      const countUp = () => {
        displayScore = Math.min(displayScore + increment, targetScore);
        finalScoreEl.innerText = displayScore.toLocaleString();
        if (displayScore < targetScore) {
          requestAnimationFrame(countUp);
        }
      };
      countUp();
    }

    if (gameOverScreen) {
      gameOverScreen.classList.add("active");

      // Update button text based on game state
      const restartBtn = document.getElementById("restartBtn");
      if (restartBtn) {
        if (win && this.currentLevel < this.totalLevels) {
          restartBtn.innerHTML = `
            <svg class="icon-svg-inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            NEXT LEVEL`;
          restartBtn.onclick = () => this.nextLevel();
        } else {
          restartBtn.innerHTML = `
            <svg class="icon-svg-inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12C3 7.5 6.5 4 11 4C14 4 16.5 5.5 18 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M21 12C21 16.5 17.5 20 13 20C10 20 7.5 18.5 6 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M3 8L6 5L9 8M21 16L18 19L15 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            PLAY AGAIN`;
          restartBtn.onclick = () => {
            this.currentLevel = 1;
            this.startGame();
          };
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
      block.bounceOffset = -12;
      this.triggerScreenShake(3);
      this.vibrate(15);

      if (block.content === "mushroom") {
        this.items.push(new Mushroom(block.x, block.y - 32));
        this.playSound("powerup");
        this.spawnBurstParticles(
          block.x + 16,
          block.y,
          ["#FFD700", "#FFA500", "#FF6347"],
          8,
        );
      } else {
        this.updateScore(200);
        this.spawnStarParticles(block.x + 16, block.y - 16);
        this.playSound("coin");
      }
    } else if (block.type === "brick") {
      if (block.unbreakable) {
        block.bounceOffset = -6;
        this.playSound("bump");
        this.vibrate(10);
      } else if (this.player.isBig) {
        block.broken = true;
        this.triggerScreenShake(5);
        this.vibrate([10, 5, 15]);
        this.spawnBurstParticles(
          block.x + 16,
          block.y + 16,
          ["#c84c0c", "#8B4513", "#A0522D", "#D2691E"],
          12,
        );
        this.playSound("break");
        this.updateScore(50);
      } else {
        block.bounceOffset = -8;
        this.playSound("bump");
        this.vibrate(8);
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
    this.maxLife = 30;
    this.dead = false;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.3;
    this.hasGravity = true;
    this.glow = false;
    this.isStar = false;
    this.isSpeedLine = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (this.hasGravity) {
      this.vy += 0.4;
    }
    this.rotation += this.rotationSpeed;
    this.vx *= 0.98; // Air resistance
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const alpha = this.life / this.maxLife;
    const scale = 0.5 + (this.life / this.maxLife) * 0.5;

    // Glow effect
    if (this.glow) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (this.isStar) {
      // Draw star shape
      this.drawStar(ctx, 0, 0, 5, this.size * scale, this.size * scale * 0.5);
    } else if (this.isSpeedLine) {
      // Draw speed line (elongated horizontal line)
      const lineLength = 8 + (1 - alpha) * 12;
      ctx.fillRect(-lineLength / 2, -1, lineLength, 2);
    } else {
      // Draw square particle
      const sz = this.size * scale;
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
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
    this.collectAnimation = 0;
    this.floatOffset = Math.random() * Math.PI * 2;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.collected = false;
    this.collectAnimation = 0;
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
      game.vibrate(8);
      game.spawnStarParticles(this.x + 8, this.y + 8);
    }
  }

  draw(ctx, frame) {
    const stretch = Math.abs(Math.sin(frame * 0.1));
    const w = 12 * stretch + 4;
    const floatY = Math.sin(frame * 0.08 + this.floatOffset) * 3;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(this.x + 8, this.y + 18, w / 2 + 1, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Coin glow
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 8;

    // Coin with 3D effect
    const coinGrad = ctx.createRadialGradient(
      this.x + 6,
      this.y + 4 + floatY,
      0,
      this.x + 8,
      this.y + 8 + floatY,
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
      this.y + 8 + floatY,
      w / 2 + 2,
      10,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.shadowBlur = 0;

    // Coin edge
    ctx.strokeStyle = "#B8860B";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(
      this.x + 8,
      this.y + 8 + floatY,
      w / 2 + 2,
      10,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    // Inner shine
    const innerGrad = ctx.createRadialGradient(
      this.x + 7,
      this.y + 5 + floatY,
      0,
      this.x + 7,
      this.y + 6 + floatY,
      6,
    );
    innerGrad.addColorStop(0, "#FFFFE0");
    innerGrad.addColorStop(1, "#FFFACD");
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(
      this.x + 7,
      this.y + 7 + floatY,
      w / 3 - 1,
      4,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    // Sparkle highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.ellipse(this.x + 5, this.y + 4 + floatY, 2, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Star symbol on coin
    ctx.fillStyle = "#B8860B";
    ctx.font = "bold 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", this.x + 8, this.y + 8 + floatY);
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
    // Landing dust effect
    this.wasInAir = false;
    this.landingDustTimer = 0;
    // Speed lines effect
    this.speedLineTimer = 0;
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

      // Landing dust effect - spawn dust when landing from air
      if (this.wasInAir && this.vy >= 0) {
        this.spawnLandingDust(game);
        this.landingDustTimer = 10;
        game.vibrate(5); // Subtle landing feedback
      }
      this.wasInAir = false;
    } else if (wasGrounded && this.vy > 0) {
      this.coyoteTimer--;
    }

    // Track if in air
    if (!this.grounded && Math.abs(this.vy) > 2) {
      this.wasInAir = true;
    }

    // Decrease landing dust timer
    if (this.landingDustTimer > 0) {
      this.landingDustTimer--;
    }

    // Speed lines effect when running fast
    if (Math.abs(this.vx) > gc.MAX_SPEED && this.grounded) {
      this.speedLineTimer++;
      if (this.speedLineTimer % 3 === 0) {
        this.spawnSpeedLine(game);
      }
    } else {
      this.speedLineTimer = 0;
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

    // Spawn jump dust particles
    this.spawnJumpDust(game);
  }

  // Spawn jump dust particles (smaller burst when jumping)
  spawnJumpDust(game) {
    const dustColors = ["#E8DCC8", "#D4C4A8", "#C0B090"];
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 2 + Math.random() * 1.5;
      const color = dustColors[Math.floor(Math.random() * dustColors.length)];
      const p = game.getParticle(
        this.x + this.w / 2 + (Math.random() - 0.5) * 12,
        this.y + this.h,
        color,
      );
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed * 0.5;
      p.size = 2 + Math.random() * 3;
      p.life = 12 + Math.random() * 6;
      p.maxLife = p.life;
      p.hasGravity = true;
      p.glow = false;
      game.particles.push(p);
    }
  }

  // Spawn landing dust particles
  spawnLandingDust(game) {
    const dustColors = ["#E8DCC8", "#D4C4A8", "#C0B090", "#A89070"];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.random() - 0.5) * Math.PI;
      const speed = 1.5 + Math.random() * 2;
      const color = dustColors[Math.floor(Math.random() * dustColors.length)];
      const p = game.getParticle(
        this.x + this.w / 2 + (Math.random() - 0.5) * 16,
        this.y + this.h - 4,
        color,
      );
      p.vx = Math.cos(angle) * speed * (this.facingRight ? 1 : -1);
      p.vy = -Math.random() * 1.5 - 0.5;
      p.size = 3 + Math.random() * 4;
      p.life = 15 + Math.random() * 10;
      p.maxLife = p.life;
      p.hasGravity = false;
      p.glow = false;
      game.particles.push(p);
    }
  }

  // Spawn speed line particles when running fast
  spawnSpeedLine(game) {
    const lineColors = [
      "rgba(255, 255, 255, 0.6)",
      "rgba(200, 220, 255, 0.5)",
      "rgba(180, 200, 255, 0.4)",
    ];
    const color = lineColors[Math.floor(Math.random() * lineColors.length)];
    const p = game.getParticle(
      this.x + (this.facingRight ? -8 : this.w + 8),
      this.y + this.h / 2 + (Math.random() - 0.5) * this.h * 0.8,
      color,
    );
    p.vx = this.facingRight ? -4 : 4;
    p.vy = 0;
    p.size = 2;
    p.life = 8;
    p.maxLife = 8;
    p.hasGravity = false;
    p.isSpeedLine = true;
    game.particles.push(p);
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
