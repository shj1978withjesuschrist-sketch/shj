const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const COLORS = ['#7ae0ff', '#f9c74f', '#ff8aa1', '#b388ff', '#75ffa9'];

class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.shooting = false;
    this.handlers();
  }

  handlers() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.left = true;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) this.right = true;
      if (e.code === 'Space') this.shooting = true;
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.left = false;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) this.right = false;
      if (e.code === 'Space') this.shooting = false;
    });
  }
}

class Game {
  constructor() {
    this.input = new Input();
    this.particles = [];
    this.bindUI();
    this.reset();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindUI() {
    document.getElementById('restart').addEventListener('click', () => this.reset());
  }

  reset() {
    this.player = { x: WIDTH / 2 - 30, y: HEIGHT - 32, w: 60, h: 14, speed: 260 };
    this.projectiles = [];
    this.bubbles = [];
    this.score = 0;
    this.lives = 3;
    this.round = 1;
    this.spawnInterval = 1200;
    this.spawnTimer = 0;
    this.shootCooldown = 0;
    this.lastTime = 0;
    this.gameOver = false;
    this.updateHUD();
  }

  loop(timestamp) {
    const delta = this.lastTime ? (timestamp - this.lastTime) / 1000 : 0;
    this.lastTime = timestamp;

    this.update(delta);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(delta) {
    if (!delta) return;

    if (!this.gameOver) {
      this.handleInput(delta);
      this.spawnTimer += delta * 1000;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnBubble();
        this.spawnTimer = 0;
      }
    }

    this.updateProjectiles(delta);
    this.updateBubbles(delta);
    this.updateParticles(delta);
  }

  handleInput(delta) {
    const move = (dir) => {
      this.player.x += dir * this.player.speed * delta;
      this.player.x = Math.max(0, Math.min(WIDTH - this.player.w, this.player.x));
    };

    if (this.input.left) move(-1);
    if (this.input.right) move(1);

    if (this.input.shooting && this.shootCooldown <= 0) {
      this.fire();
      this.shootCooldown = 0.38;
    }

    if (this.shootCooldown > 0) this.shootCooldown -= delta;
  }

  fire() {
    this.projectiles.push({
      x: this.player.x + this.player.w / 2,
      y: this.player.y,
      r: 7,
      speed: 520,
      color: '#b5f5ff',
    });
  }

  spawnBubble() {
    const radius = 14 + Math.random() * 18;
    const speed = 55 + this.round * 10 + Math.random() * 25;
    const vx = (Math.random() * 60 - 30) * (Math.random() > 0.5 ? 1 : -1);
    const x = radius + Math.random() * (WIDTH - radius * 2);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.bubbles.push({ x, y: -radius, r: radius, vx, vy: speed, color });
  }

  updateProjectiles(delta) {
    this.projectiles.forEach((p) => (p.y -= p.speed * delta));
    this.projectiles = this.projectiles.filter((p) => p.y + p.r > 0);
  }

  updateBubbles(delta) {
    const removeIndices = new Set();

    this.bubbles.forEach((b, i) => {
      b.x += b.vx * delta;
      b.y += b.vy * delta;

      if (b.x - b.r <= 0 || b.x + b.r >= WIDTH) {
        b.vx *= -1;
        b.x = Math.max(b.r, Math.min(WIDTH - b.r, b.x));
      }

      // Bottom collision => lose life
      if (b.y + b.r >= HEIGHT) {
        removeIndices.add(i);
        this.loseLife(b.x, HEIGHT - 12);
      }
    });

    // Collisions with projectiles
    this.bubbles.forEach((b, i) => {
      this.projectiles.forEach((p, j) => {
        if (removeIndices.has(i)) return;
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < b.r + p.r) {
          removeIndices.add(i);
          this.projectiles.splice(j, 1);
          this.popBubble(b);
        }
      });
    });

    this.bubbles = this.bubbles.filter((_, idx) => !removeIndices.has(idx));
  }

  updateParticles(delta) {
    this.particles.forEach((p) => {
      p.life -= delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.vy += 15 * delta;
    });
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  popBubble(bubble) {
    this.score += 10;
    const newRound = Math.floor(this.score / 120) + 1;
    if (newRound > this.round) {
      this.round = newRound;
      this.spawnInterval = Math.max(500, 1200 - (this.round - 1) * 110);
    }
    this.updateHUD();
    this.addParticles(bubble.x, bubble.y, bubble.color, 10);
  }

  loseLife(x, y) {
    if (this.gameOver) return;
    this.lives -= 1;
    this.addParticles(x, y, '#ff8aa1', 22);
    if (this.lives <= 0) {
      this.gameOver = true;
    }
    this.updateHUD();
  }

  addParticles(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 40;
      this.particles.push({
        x,
        y,
        r: 2 + Math.random() * 3,
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.6,
      });
    }
  }

  updateHUD() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('lives').textContent = this.lives;
    document.getElementById('round').textContent = this.round;
  }

  draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.drawGrid();
    this.drawPlayer();
    this.drawProjectiles();
    this.drawBubbles();
    this.drawParticles();
    if (this.gameOver) this.drawGameOver();
  }

  drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y < HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    for (let x = 0; x < WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPlayer() {
    ctx.save();
    const { x, y, w, h } = this.player;
    const radius = 8;
    ctx.fillStyle = '#8fe1ff';
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fill();

    // cannon
    ctx.fillStyle = '#c5f0ff';
    ctx.fillRect(x + w / 2 - 6, y - 12, 12, 12);
    ctx.restore();
  }

  drawProjectiles() {
    ctx.save();
    this.projectiles.forEach((p) => {
      const gradient = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, p.r);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(1, p.color);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawBubbles() {
    ctx.save();
    this.bubbles.forEach((b) => {
      const gradient = ctx.createRadialGradient(b.x - b.r / 3, b.y - b.r / 3, 4, b.x, b.y, b.r);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(0.25, 'rgba(255,255,255,0.7)');
      gradient.addColorStop(1, b.color);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawParticles() {
    ctx.save();
    this.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawGameOver() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = '#f8fbff';
    ctx.font = '28px "Do Hyeon", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', WIDTH / 2, HEIGHT / 2 - 10);
    ctx.font = '20px "Do Hyeon", sans-serif';
    ctx.fillText('다시 시작 버튼을 눌러 재도전!', WIDTH / 2, HEIGHT / 2 + 24);
    ctx.restore();
  }
}

new Game();
