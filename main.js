const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const livesEl = document.getElementById("lives");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");

const ASSETS = {
  hero: "images/august.png",
  invader: "images/fredrik.png",
};

const state = {
  running: false,
  paused: false,
  score: 0,
  wave: 1,
  lives: 3,
  lastTime: 0,
  fireCooldown: 0,
  invaderShotTimer: 0,
  invaderSpeed: 22,
  invaderStepDown: 16,
  powerups: {
    rapid: 0,
    big: 0,
    triple: 0,
    fast: 0,
    pierce: 0,
  },
};

const keys = {
  left: false,
  right: false,
};

const hero = {
  x: canvas.width / 2,
  y: canvas.height - 70,
  width: 64,
  height: 64,
  speed: 320,
};

const bullets = [];
const enemyBullets = [];
const invaders = [];
const particles = [];
const powerups = [];
const stars = createStars(120);

const heroImg = new Image();
const invaderImg = new Image();
heroImg.src = ASSETS.hero;
invaderImg.src = ASSETS.invader;

let layoutScale = 1;

function createStars(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 0.5 + Math.random() * 1.6,
    speed: 10 + Math.random() * 25,
    alpha: 0.4 + Math.random() * 0.6,
  }));
}

function spawnWave() {
  invaders.length = 0;
  const rows = 3 + Math.min(Math.floor((state.wave - 1) / 2), 3);
  const cols = 8;
  const desiredSpacingX = 80 * layoutScale;
  const minSpacingX = 48 * layoutScale;
  const maxSpacingX = (canvas.width - 80 * layoutScale) / (cols - 1);
  const spacingX = Math.max(minSpacingX, Math.min(desiredSpacingX, maxSpacingX));
  const spacingY = 54 * layoutScale;
  const offsetX = Math.max(20 * layoutScale, (canvas.width - (cols - 1) * spacingX) / 2);
  const offsetY = 40 * layoutScale;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      invaders.push({
        x: offsetX + col * spacingX,
        y: offsetY + row * spacingY,
        width: 42 * layoutScale,
        height: 42 * layoutScale,
        alive: true,
      });
    }
  }
}

function resetGame() {
  state.score = 0;
  state.wave = 1;
  state.lives = 3;
  state.invaderSpeed = 22;
  state.invaderShotTimer = 0;
  state.powerups.rapid = 0;
  state.powerups.big = 0;
  state.powerups.triple = 0;
  state.powerups.fast = 0;
  state.powerups.pierce = 0;
  hero.x = canvas.width / 2;
  hero.y = canvas.height - 70 * layoutScale;
  bullets.length = 0;
  enemyBullets.length = 0;
  particles.length = 0;
  powerups.length = 0;
  spawnWave();
  updateHud();
}

function resizeCanvas() {
  const maxWidth = 960;
  const maxHeight = 600;
  const hud = document.querySelector(".hud");
  const footer = document.querySelector(".footer");
  const verticalPadding = window.innerWidth <= 520 ? 28 : 48;
  const availableHeight =
    window.innerHeight -
    (hud ? hud.offsetHeight : 0) -
    (footer ? footer.offsetHeight : 0) -
    verticalPadding;

  const availableWidth = Math.min(maxWidth, Math.floor(window.innerWidth * 0.96));
  const targetHeight = Math.max(360, Math.min(maxHeight, Math.floor(availableHeight)));
  const targetWidth = Math.min(availableWidth, Math.floor(targetHeight * 1.6));

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.style.width = `${targetWidth}px`;
  canvas.style.height = `${targetHeight}px`;
  layoutScale = Math.min(canvas.width / 960, canvas.height / 600);
  layoutScale = Math.max(0.4, layoutScale);

  hero.width = 64 * layoutScale;
  hero.height = 64 * layoutScale;
  hero.speed = 320 * layoutScale;
  hero.x = Math.min(hero.x, canvas.width - hero.width / 2 - 16);
  hero.y = canvas.height - 70 * layoutScale;
  stars.length = 0;
  stars.push(...createStars(120));
}

function updateHud() {
  scoreEl.textContent = state.score;
  waveEl.textContent = state.wave;
  livesEl.textContent = state.lives;
}

function fireBullet() {
  const sizeScale = state.powerups.big > 0 ? 1.8 : 1;
  const baseSpeed = state.powerups.fast > 0 ? 560 : 420;
  const pierce = state.powerups.pierce > 0 ? 2 : 0;
  const spread = 16 * layoutScale;
  const shots = state.powerups.triple > 0 ? [-spread, 0, spread] : [0];

  shots.forEach((offset) => {
    bullets.push({
      x: hero.x + offset,
      y: hero.y - hero.height / 2,
      width: 6 * sizeScale * layoutScale,
      height: 16 * sizeScale * layoutScale,
      speed: baseSpeed,
      pierce,
    });
  });
}

function addExplosion(x, y, color) {
  for (let i = 0; i < 16; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 140,
      vy: (Math.random() - 0.5) * 140,
      life: 0.6 + Math.random() * 0.4,
      color,
    });
  }
}

function updateStars(dt) {
  stars.forEach((star) => {
    star.y += star.speed * dt;
    if (star.y > canvas.height) {
      star.y = -4;
      star.x = Math.random() * canvas.width;
    }
  });
}

function updateHero(dt) {
  if (keys.left) {
    hero.x -= hero.speed * dt;
  }
  if (keys.right) {
    hero.x += hero.speed * dt;
  }
  const half = hero.width / 2;
  hero.x = Math.max(half + 16, Math.min(canvas.width - half - 16, hero.x));

  state.fireCooldown -= dt;
  if (state.fireCooldown <= 0) {
    fireBullet();
    state.fireCooldown = state.powerups.rapid > 0 ? 0.18 : 0.35;
  }
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.y -= bullet.speed * dt;
    if (bullet.y < -20) {
      bullets.splice(i, 1);
    }
  }
}

function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    bullet.y += bullet.speed * dt;
    if (bullet.y > canvas.height + 20) {
      enemyBullets.splice(i, 1);
    }
  }
}

function updatePowerups(dt) {
  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    const p = powerups[i];
    p.y += p.speed * dt;
    if (p.y > canvas.height + 40) {
      powerups.splice(i, 1);
    }
  }
}

function tickPowerups(dt) {
  state.powerups.rapid = Math.max(0, state.powerups.rapid - dt);
  state.powerups.big = Math.max(0, state.powerups.big - dt);
  state.powerups.triple = Math.max(0, state.powerups.triple - dt);
  state.powerups.fast = Math.max(0, state.powerups.fast - dt);
  state.powerups.pierce = Math.max(0, state.powerups.pierce - dt);
}

let invaderDir = 1;
function updateInvaders(dt) {
  let hitEdge = false;
  const speed = state.invaderSpeed + state.wave * 3;
  invaders.forEach((invader) => {
    if (!invader.alive) return;
    invader.x += invaderDir * speed * dt;
    const margin = Math.max(24 * layoutScale, invader.width / 2);
    if (invader.x > canvas.width - margin || invader.x < margin) {
      hitEdge = true;
    }
  });
  if (hitEdge) {
    invaderDir *= -1;
    invaders.forEach((invader) => {
      invader.y += state.invaderStepDown * layoutScale;
    });
  }
}

function maybeFireInvader(dt) {
  state.invaderShotTimer -= dt;
  if (state.invaderShotTimer > 0) return;
  state.invaderShotTimer = 0.7 + Math.random() * 1.4;
  const aliveInvaders = invaders.filter((inv) => inv.alive);
  if (aliveInvaders.length === 0) return;
  const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
  enemyBullets.push({
    x: shooter.x,
    y: shooter.y + shooter.height / 2,
    width: 6 * layoutScale,
    height: 16 * layoutScale,
    speed: (220 + state.wave * 10) * layoutScale,
  });
}

function maybeDropPowerup(invader) {
  if (Math.random() > 0.08) return;
  const types = ["rapid", "big", "triple", "fast", "pierce"];
  const kind = types[Math.floor(Math.random() * types.length)];
  powerups.push({
    x: invader.x,
    y: invader.y,
    size: 22 * layoutScale,
    speed: 90 * layoutScale,
    kind,
  });
}

function checkCollisions() {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    for (let j = 0; j < invaders.length; j += 1) {
      const invader = invaders[j];
      if (!invader.alive) continue;
      if (
        bullet.x > invader.x - invader.width / 2 &&
        bullet.x < invader.x + invader.width / 2 &&
        bullet.y > invader.y - invader.height / 2 &&
        bullet.y < invader.y + invader.height / 2
      ) {
        invader.alive = false;
        if (bullet.pierce > 0) {
          bullet.pierce -= 1;
        } else {
          bullets.splice(i, 1);
        }
        state.score += 120;
        addExplosion(invader.x, invader.y, "rgba(0, 240, 255, 0.9)");
        maybeDropPowerup(invader);
        return;
      }
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i -= 1) {
    const bullet = enemyBullets[i];
    if (
      bullet.x > hero.x - hero.width / 2 &&
      bullet.x < hero.x + hero.width / 2 &&
      bullet.y > hero.y - hero.height / 2 &&
      bullet.y < hero.y + hero.height / 2
    ) {
      enemyBullets.splice(i, 1);
      state.lives -= 1;
      addExplosion(hero.x, hero.y, "rgba(255, 46, 159, 0.9)");
      if (state.lives <= 0) {
        state.running = false;
      }
      updateHud();
      return;
    }
  }

  for (let i = powerups.length - 1; i >= 0; i -= 1) {
    const p = powerups[i];
    if (
      p.x > hero.x - hero.width / 2 &&
      p.x < hero.x + hero.width / 2 &&
      p.y > hero.y - hero.height / 2 &&
      p.y < hero.y + hero.height / 2
    ) {
      powerups.splice(i, 1);
      state.powerups[p.kind] = 10;
      return;
    }
  }

  const lowest = invaders.filter((inv) => inv.alive).reduce((max, inv) => Math.max(max, inv.y), 0);
  if (lowest > hero.y - 20 * layoutScale) {
    state.lives = 0;
    state.running = false;
    updateHud();
  }
}

function advanceWaveIfNeeded() {
  const alive = invaders.some((inv) => inv.alive);
  if (!alive) {
    state.wave += 1;
    state.invaderSpeed += 3;
    spawnWave();
    updateHud();
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#05060d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach((star) => {
    ctx.beginPath();
    ctx.fillStyle = `rgba(190, 220, 255, ${star.alpha})`;
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHero() {
  const glow = ctx.createRadialGradient(hero.x, hero.y, 10, hero.x, hero.y, 70);
  glow.addColorStop(0, "rgba(125, 255, 106, 0.35)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(hero.x, hero.y, 70, 0, Math.PI * 2);
  ctx.fill();

  drawAvatar(heroImg, hero.x, hero.y, hero.width, hero.height);

  ctx.strokeStyle = "rgba(125, 255, 106, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hero.x, hero.y, hero.width / 2 + 6, 0, Math.PI * 2);
  ctx.stroke();
}

function drawInvaders() {
  invaders.forEach((invader) => {
    if (!invader.alive) return;
    drawAvatar(invaderImg, invader.x, invader.y, invader.width, invader.height);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(invader.x, invader.y, invader.width / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawBullets() {
  bullets.forEach((bullet) => {
    ctx.fillStyle = "rgba(255, 46, 159, 0.9)";
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height, bullet.width, bullet.height);
  });
}

function drawEnemyBullets() {
  enemyBullets.forEach((bullet) => {
    ctx.fillStyle = "rgba(255, 160, 60, 0.9)";
    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
  });
}

function drawPowerups() {
  powerups.forEach((p) => {
    const palette = {
      rapid: "rgba(125, 255, 106, 0.95)",
      big: "rgba(0, 240, 255, 0.95)",
      triple: "rgba(255, 46, 159, 0.95)",
      fast: "rgba(255, 160, 60, 0.95)",
      pierce: "rgba(190, 220, 255, 0.95)",
    };
    const glyph = {
      rapid: "R",
      big: "B",
      triple: "3",
      fast: "F",
      pierce: "P",
    };
    ctx.fillStyle = palette[p.kind] || "rgba(125, 255, 106, 0.9)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#071018";
    ctx.font = "700 12px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(glyph[p.kind] || "?", p.x, p.y + 0.5);
  });
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  });
}

function drawAvatar(image, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, w / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function drawOverlay() {
  if (!state.running) {
    ctx.fillStyle = "rgba(5, 6, 13, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e6f1ff";
    ctx.font = "700 32px Space Grotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Press Start", canvas.width / 2, canvas.height / 2);
  }
}

function update(time) {
  if (!state.running || state.paused) {
    state.lastTime = time;
    drawBackground();
    drawInvaders();
    drawHero();
    drawBullets();
    drawEnemyBullets();
    drawPowerups();
    drawParticles();
    drawOverlay();
    requestAnimationFrame(update);
    return;
  }

  const dt = Math.min((time - state.lastTime) / 1000, 0.033);
  state.lastTime = time;

  updateStars(dt);
  tickPowerups(dt);
  updateHero(dt);
  updateBullets(dt);
  updateEnemyBullets(dt);
  updatePowerups(dt);
  updateInvaders(dt);
  maybeFireInvader(dt);
  updateParticles(dt);
  checkCollisions();
  advanceWaveIfNeeded();

  drawBackground();
  drawInvaders();
  drawHero();
  drawBullets();
  drawEnemyBullets();
  drawPowerups();
  drawParticles();
  updateHud();

  requestAnimationFrame(update);
}

function startGame() {
  if (!state.running) {
    if (state.lives <= 0) {
      resetGame();
    }
    state.running = true;
    state.paused = false;
    if (invaders.length === 0) {
      spawnWave();
    }
  }
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
}

let initialized = false;
function init() {
  if (initialized) return;
  initialized = true;
  resizeCanvas();
  resetGame();
  requestAnimationFrame((time) => {
    state.lastTime = time;
    update(time);
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    keys.left = true;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    keys.right = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    keys.left = false;
  }
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    keys.right = false;
  }
});

canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  if (!state.running) startGame();
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const mid = rect.width / 2;
  keys.left = x < mid;
  keys.right = x >= mid;
}, { passive: false });

canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const mid = rect.width / 2;
  keys.left = x < mid;
  keys.right = x >= mid;
}, { passive: false });

canvas.addEventListener("touchend", () => {
  keys.left = false;
  keys.right = false;
});

const touchButtons = document.querySelectorAll(".touch-btn");
touchButtons.forEach((btn) => {
  const dir = btn.dataset.dir;
  const setDir = (value) => {
    if (dir === "left") keys.left = value;
    if (dir === "right") keys.right = value;
  };

  btn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!state.running) startGame();
    setDir(true);
  });
  btn.addEventListener("pointerup", () => setDir(false));
  btn.addEventListener("pointercancel", () => setDir(false));
  btn.addEventListener("pointerleave", () => setDir(false));
});

window.addEventListener("resize", () => {
  resizeCanvas();
});

startBtn.addEventListener("click", () => startGame());
pauseBtn.addEventListener("click", () => togglePause());
resetBtn.addEventListener("click", () => {
  state.running = false;
  state.paused = false;
  resetGame();
});

heroImg.onload = () => {
  invaderImg.onload = () => init();
};

heroImg.onerror = () => init();
invaderImg.onerror = () => init();
