/*
  Asteroids Arcade (Vanilla JS, ohne Build-Tool)
  Struktur:
  - Konfiguration & Hilfsfunktionen
  - Initialisierung / Reset
  - Input Handling
  - Update-Logik
  - Rendering
  - Game Loop
*/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const pauseButton = document.getElementById("pauseButton");

const CONFIG = {
  ship: {
    radius: 16,
    rotationSpeed: 3.3,
    thrustPower: 260,
    friction: 0.992,
    maxSpeed: 390,
    invulnerableTime: 1.8,
  },
  bullet: {
    speed: 520,
    lifeTime: 0.9,
    radius: 2,
    cooldown: 0.17,
  },
  asteroid: {
    baseSpeed: 50,
    speedVariance: 65,
    spawnCount: 5,
    size: {
      large: 58,
      medium: 34,
      small: 20,
    },
  },
  game: {
    startLives: 3,
  },
};

const KEYS = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  Space: false,
};

const state = {
  ship: null,
  bullets: [],
  asteroids: [],
  particles: [],
  score: 0,
  lives: CONFIG.game.startLives,
  wave: 1,
  gameOver: false,
  paused: false,
  shootCooldown: 0,
  flashTimer: 0,
  muzzleTimer: 0,
};

let lastTime = 0;

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function wrapPosition(entity) {
  if (entity.x < 0) entity.x += canvas.width;
  if (entity.x > canvas.width) entity.x -= canvas.width;
  if (entity.y < 0) entity.y += canvas.height;
  if (entity.y > canvas.height) entity.y -= canvas.height;
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function createShip() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: CONFIG.ship.radius,
    invulnerable: CONFIG.ship.invulnerableTime,
  };
}

function createAsteroid(sizeKey, x, y) {
  const radius = CONFIG.asteroid.size[sizeKey];
  const angle = randomRange(0, Math.PI * 2);
  const speed = CONFIG.asteroid.baseSpeed + randomRange(0, CONFIG.asteroid.speedVariance);

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius,
    sizeKey,
    // Für organische Form wird pro Asteroid eine "zerklüftete" Kontur erzeugt.
    jag: Array.from({ length: 10 }, () => randomRange(0.75, 1.25)),
    spin: randomRange(-0.9, 0.9),
    angle: randomRange(0, Math.PI * 2),
  };
}

function spawnWave(count) {
  for (let i = 0; i < count; i += 1) {
    let x;
    let y;
    do {
      x = randomRange(0, canvas.width);
      y = randomRange(0, canvas.height);
    } while (distanceSquared({ x, y }, state.ship) < 180 * 180);

    state.asteroids.push(createAsteroid("large", x, y));
  }
}

function createExplosion(x, y, color = "#ffd37a", amount = 20) {
  for (let i = 0; i < amount; i += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(50, 260);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomRange(0.2, 0.7),
      maxLife: 0,
      color,
    });
    state.particles[state.particles.length - 1].maxLife = state.particles[state.particles.length - 1].life;
  }
}

function resetGame() {
  state.ship = createShip();
  state.bullets = [];
  state.asteroids = [];
  state.particles = [];
  state.score = 0;
  state.lives = CONFIG.game.startLives;
  state.wave = 1;
  state.gameOver = false;
  state.paused = false;
  state.shootCooldown = 0;
  state.flashTimer = 0;
  state.muzzleTimer = 0;
  syncPauseButton();
  spawnWave(CONFIG.asteroid.spawnCount);
}

function syncPauseButton() {
  pauseButton.textContent = state.paused ? "Fortsetzen" : "Pause";
  pauseButton.setAttribute("aria-pressed", String(state.paused));
}

function togglePause() {
  if (state.gameOver) return;
  state.paused = !state.paused;
  syncPauseButton();
}

function onKey(event, isDown) {
  if (event.code in KEYS) {
    KEYS[event.code] = isDown;
    event.preventDefault();
  }

  if (event.code === "KeyR" && isDown && state.gameOver) {
    resetGame();
  }
}

window.addEventListener("keydown", (e) => onKey(e, true));
window.addEventListener("keyup", (e) => onKey(e, false));
pauseButton.addEventListener("click", togglePause);

function shootBullet() {
  const { ship } = state;
  const tipX = ship.x + Math.cos(ship.angle) * ship.radius;
  const tipY = ship.y + Math.sin(ship.angle) * ship.radius;

  state.bullets.push({
    x: tipX,
    y: tipY,
    vx: ship.vx + Math.cos(ship.angle) * CONFIG.bullet.speed,
    vy: ship.vy + Math.sin(ship.angle) * CONFIG.bullet.speed,
    life: CONFIG.bullet.lifeTime,
    radius: CONFIG.bullet.radius,
  });

  state.shootCooldown = CONFIG.bullet.cooldown;
  state.muzzleTimer = 0.05;
}

function splitAsteroid(asteroid) {
  if (asteroid.sizeKey === "small") return;

  const nextSize = asteroid.sizeKey === "large" ? "medium" : "small";
  state.asteroids.push(createAsteroid(nextSize, asteroid.x, asteroid.y));
  state.asteroids.push(createAsteroid(nextSize, asteroid.x, asteroid.y));
}

function asteroidPoints(sizeKey) {
  if (sizeKey === "large") return 20;
  if (sizeKey === "medium") return 50;
  return 100;
}

function updateShip(dt) {
  const ship = state.ship;
  if (!ship) return;

  if (KEYS.ArrowLeft) ship.angle -= CONFIG.ship.rotationSpeed * dt;
  if (KEYS.ArrowRight) ship.angle += CONFIG.ship.rotationSpeed * dt;

  if (KEYS.ArrowUp) {
    ship.vx += Math.cos(ship.angle) * CONFIG.ship.thrustPower * dt;
    ship.vy += Math.sin(ship.angle) * CONFIG.ship.thrustPower * dt;

    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > CONFIG.ship.maxSpeed) {
      ship.vx = (ship.vx / speed) * CONFIG.ship.maxSpeed;
      ship.vy = (ship.vy / speed) * CONFIG.ship.maxSpeed;
    }
  }

  ship.vx *= CONFIG.ship.friction;
  ship.vy *= CONFIG.ship.friction;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  wrapPosition(ship);
  ship.invulnerable = Math.max(0, ship.invulnerable - dt);

  if (KEYS.Space && state.shootCooldown <= 0) {
    shootBullet();
  }
}

function updateBullets(dt) {
  state.bullets = state.bullets.filter((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    wrapPosition(bullet);
    return bullet.life > 0;
  });
}

function updateAsteroids(dt) {
  state.asteroids.forEach((asteroid) => {
    asteroid.x += asteroid.vx * dt;
    asteroid.y += asteroid.vy * dt;
    asteroid.angle += asteroid.spin * dt;
    wrapPosition(asteroid);
  });

  if (!state.asteroids.length) {
    state.wave += 1;
    spawnWave(CONFIG.asteroid.spawnCount + state.wave);
  }
}

function updateParticles(dt) {
  state.particles = state.particles.filter((p) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
    return p.life > 0;
  });
}

function handleCollisions() {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    let bulletHit = false;

    for (let j = state.asteroids.length - 1; j >= 0; j -= 1) {
      const asteroid = state.asteroids[j];
      const minDist = bullet.radius + asteroid.radius;

      if (distanceSquared(bullet, asteroid) <= minDist * minDist) {
        state.bullets.splice(i, 1);
        state.asteroids.splice(j, 1);
        splitAsteroid(asteroid);
        state.score += asteroidPoints(asteroid.sizeKey);
        state.flashTimer = 0.08;
        createExplosion(asteroid.x, asteroid.y, "#9ed9ff", asteroid.sizeKey === "small" ? 8 : 14);
        bulletHit = true;
        break;
      }
    }

    if (bulletHit) continue;
  }

  const ship = state.ship;
  if (!ship || ship.invulnerable > 0) return;

  for (let i = 0; i < state.asteroids.length; i += 1) {
    const asteroid = state.asteroids[i];
    const minDist = ship.radius + asteroid.radius * 0.9;
    if (distanceSquared(ship, asteroid) <= minDist * minDist) {
      state.lives -= 1;
      createExplosion(ship.x, ship.y, "#ff8f8f", 24);

      if (state.lives <= 0) {
        state.gameOver = true;
        state.ship = null;
      } else {
        state.ship = createShip();
      }
      return;
    }
  }
}

function update(dt) {
  if (state.gameOver || state.paused) {
    updateParticles(dt);
    return;
  }

  state.shootCooldown = Math.max(0, state.shootCooldown - dt);
  state.flashTimer = Math.max(0, state.flashTimer - dt);
  state.muzzleTimer = Math.max(0, state.muzzleTimer - dt);

  updateShip(dt);
  updateBullets(dt);
  updateAsteroids(dt);
  updateParticles(dt);
  handleCollisions();
}

function drawShip(ship) {
  const blinkOn = ship.invulnerable <= 0 || Math.floor(ship.invulnerable * 10) % 2 === 0;
  if (!blinkOn) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  ctx.strokeStyle = "#f0f6ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ship.radius, 0);
  ctx.lineTo(-ship.radius * 0.8, ship.radius * 0.7);
  ctx.lineTo(-ship.radius * 0.45, 0);
  ctx.lineTo(-ship.radius * 0.8, -ship.radius * 0.7);
  ctx.closePath();
  ctx.stroke();

  if (KEYS.ArrowUp && !state.gameOver) {
    ctx.strokeStyle = "#ffb347";
    ctx.beginPath();
    ctx.moveTo(-ship.radius * 0.75, 0);
    ctx.lineTo(-ship.radius * 1.25, randomRange(-4, 4));
    ctx.stroke();
  }

  if (state.muzzleTimer > 0) {
    ctx.strokeStyle = "#ffe28a";
    ctx.beginPath();
    ctx.moveTo(ship.radius + 1, 0);
    ctx.lineTo(ship.radius + 7, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAsteroid(asteroid) {
  ctx.save();
  ctx.translate(asteroid.x, asteroid.y);
  ctx.rotate(asteroid.angle);

  ctx.strokeStyle = "#9fd7ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  asteroid.jag.forEach((jag, i) => {
    const theta = (Math.PI * 2 * i) / asteroid.jag.length;
    const r = asteroid.radius * jag;
    const px = Math.cos(theta) * r;
    const py = Math.sin(theta) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

function drawBullet(bullet) {
  ctx.fillStyle = "#ffe589";
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles() {
  // Damit Farben mit Alpha sauber funktionieren, wird jede Partikel einzeln gezeichnet.
  state.particles.forEach((p) => {
    const alpha = p.life / p.maxLife;
    const size = 1.5 + (1 - alpha) * 1.5;

    let color = p.color;
    if (p.color.startsWith("#")) {
      // Hex zu rgba für Fade.
      const hex = p.color.slice(1);
      const parts = hex.length === 3
        ? hex.split("").map((v) => parseInt(v + v, 16))
        : [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16),
          ];
      color = `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${Math.max(0, alpha)})`;
    }

    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, size, size);
  });
}

function drawHUD() {
  ctx.save();
  ctx.fillStyle = "#e8f3ff";
  ctx.font = '20px "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${state.score}`, 16, 30);
  ctx.fillText(`Leben: ${state.lives}`, 16, 58);
  ctx.fillText(`Welle: ${state.wave}`, 16, 86);
  if (state.paused) ctx.fillText("Status: Pause", 16, 114);

  ctx.textAlign = "right";
  ctx.fillStyle = "#9ec8ff";
  ctx.fillText("Links/Rechts drehen · Hoch Schub · Space Feuer", canvas.width - 16, 30);
  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ff8f8f";
  ctx.textAlign = "center";
  ctx.font = '56px "Courier New", monospace';
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);

  ctx.fillStyle = "#e8f3ff";
  ctx.font = '26px "Courier New", monospace';
  ctx.fillText(`Final Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 20);
  ctx.font = '22px "Courier New", monospace';
  ctx.fillText("Drücke R zum Neustarten", canvas.width / 2, canvas.height / 2 + 65);
  ctx.restore();
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e8f3ff";
  ctx.textAlign = "center";
  ctx.font = '44px "Courier New", monospace';
  ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2);
  ctx.font = '20px "Courier New", monospace';
  ctx.fillText("Klicke auf den Button, um fortzusetzen", canvas.width / 2, canvas.height / 2 + 38);
  ctx.restore();
}

function render() {
  ctx.fillStyle = state.flashTimer > 0 ? "#182238" : "#060b14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawParticles();
  state.asteroids.forEach(drawAsteroid);
  state.bullets.forEach(drawBullet);
  if (state.ship) drawShip(state.ship);
  drawHUD();

  if (state.gameOver) drawGameOver();
  if (state.paused && !state.gameOver) drawPauseOverlay();
}

function gameLoop(timestamp) {
  const now = timestamp / 1000;
  const dt = Math.min(0.033, now - lastTime || 0);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

resetGame();
requestAnimationFrame(gameLoop);
