// Galaga Clone - Main Game Logic

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const CONFIG = {
    canvasWidth: 1200,
    canvasHeight: 800,
    gridCols: 15,
    gridRows: 12,
    shipSpeed: 6,
    bulletSpeed: 10,
    enemyBulletSpeed: 4,
    fireRate: 15, // frames between shots
    waveDuration: 300, // frames per wave
    bossHealthMultiplier: 1000,
    powerupDuration: 500, // frames
};

// ============================================
// GAME STATE
// ============================================

const Game = {
    canvas: null,
    ctx: null,
    width: CONFIG.canvasWidth,
    height: CONFIG.canvasHeight,

    state: 'menu', // menu, playing, paused, gameover, victory
    frameCount: 0,
    score: 0,
    lives: 3,
    wave: 1,
    waveTimer: 0,
    enemiesKilled: 0,
    totalEnemies: 0,

    player: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    stars: [],
    powerups: [],
    boss: null,

    keys: {},
    mouse: { x: 0, y: 0, down: false },

    // Wave management
    currentWavePattern: null,
    wavePhase: 'approach', // approach, attack, retreat

    // Boss state
    bossActive: false,
    bossPhase: 0,
    bossTimer: 0,

    // Powerups
    activePowerups: {
        shield: false,
        magnet: false,
        dash: false,
        dashActive: false
    },
    powerupTimer: 0,

    // Camera
    camera: { x: 0, y: 0 }
};

// ============================================
// INPUT HANDLING
// ============================================

document.addEventListener('keydown', (e) => {
    Game.keys[e.key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    Game.keys[e.key.toLowerCase()] = false;
});

document.addEventListener('mousemove', (e) => {
    const rect = Game.canvas.getBoundingClientRect();
    Game.mouse.x = (e.clientX - rect.left) * (Game.width / rect.width);
    Game.mouse.y = (e.clientY - rect.top) * (Game.height / rect.height);
});

document.addEventListener('mousedown', () => {
    Game.mouse.down = true;
});

document.addEventListener('mouseup', () => {
    Game.mouse.down = false;
});

// ============================================
// UTILITIES
// ============================================

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function checkCollision(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < circle1.radius + circle2.radius;
}

// ============================================
// STARFIELD BACKGROUND
// ============================================

class Star {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = random(0, Game.width);
        this.y = random(0, Game.height);
        this.z = random(500, 1000);
        this.size = random(0.5, 2);
        this.brightness = random(0.5, 1);
    }

    update() {
        this.z -= 0.5;
        if (this.z <= 0) {
            this.reset();
        }
    }

    draw(ctx) {
        const scale = 800 / this.z;
        const sx = Game.width / 2 + (this.x - Game.width / 2) * scale;
        const sy = Game.height / 2 + (this.y - Game.height / 2) * scale;
        const s = this.size * scale;

        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.1, s), 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// PARTICLES
// ============================================

class Particle {
    constructor(x, y, color, speed = 3, life = 30) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = random(0, Math.PI * 2);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = random(1, 3);
        this.life = life;
        this.maxLife = life;
        this.hue = color ? parseInt(color.slice(4)) : random(0, 360);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.radius *= 0.95;

        if (Game.activePowerups.dash) {
            this.vx *= 1.1;
            this.vy *= 1.1;
        }
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// PLAYER SHIP
// ============================================

class PlayerShip {
    constructor() {
        this.x = Game.width / 2;
        this.y = Game.height - 100;
        this.radius = 20;
        this.speed = CONFIG.shipSpeed;
        this.fireRate = CONFIG.fireRate;
        this.lastShot = 0;
        this.angle = 0;

        // Dash mechanics
        this.dashCooldown = 0;
        this.dashDuration = 0;

        // Shield mechanics
        this.shieldActive = false;
        this.shieldTimer = 0;
    }

    update() {
        // Movement
        let dx = 0;
        let dy = 0;

        if (Game.keys['w'] || Game.keys['arrowup']) dy -= 1;
        if (Game.keys['s'] || Game.keys['arrowdown']) dy += 1;
        if (Game.keys['a'] || Game.keys['arrowleft']) dx -= 1;
        if (Game.keys['d'] || Game.keys['arrowright']) dx += 1;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // Boundaries
        this.x = Math.max(this.radius, Math.min(Game.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(Game.height - this.radius, this.y));

        // Calculate angle towards mouse
        const targetX = Game.mouse.x;
        const targetY = Game.mouse.y;
        this.angle = Math.atan2(targetY - this.y, targetX - this.x);

        // Dash mechanics
        if (Game.activePowerups.dash) {
            this.dashDuration--;
            if (this.dashDuration <= 0) {
                this.dashActive = false;
            }
        }

        if (this.dashCooldown > 0) {
            this.dashCooldown--;
        }

        // Shield mechanics
        if (Game.activePowerups.shield) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
            }
        }
    }

    shoot() {
        const now = Game.frameCount;
        if (now - this.lastShot >= this.fireRate) {
            this.lastShot = now;

            // Main bullet
            Game.bullets.push(new Bullet(
                this.x, this.y, this.angle, true,
                15, 20, 0, 0
            ));

            // Spread bullets if magnet active
            if (Game.activePowerups.magnet) {
                Game.bullets.push(new Bullet(
                    this.x, this.y, this.angle + 0.3, true,
                    10, 15, 5, 3
                ));
                Game.bullets.push(new Bullet(
                    this.x, this.y, this.angle - 0.3, true,
                    10, 15, -5, 3
                ));
            }
        }
    }

    takeDamage(amount) {
        if (this.shieldActive) {
            amount = Math.max(0, amount - 2);
        }

        this.health -= amount;
        if (this.health <= 0) {
            Game.lives--;
            createExplosion(this.x, this.y, '#4a9eff', 50);

            if (Game.lives <= 0) {
                endGame();
            } else {
                // Respawn
                this.health = 100;
                this.x = Game.width / 2;
                this.y = Game.height - 100;
                this.dashCooldown = 60;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Shield effect
        if (this.shieldActive) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius + 15);
            gradient.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Dash trail
        if (this.dashActive) {
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-30, 0);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(0, -8, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 8, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
        }

        // Ship body
        ctx.fillStyle = '#4a9eff';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius - 5, 0);
        ctx.lineTo(this.radius, this.radius);
        ctx.lineTo(0, this.radius - 5);
        ctx.lineTo(-this.radius, this.radius);
        ctx.lineTo(-this.radius + 5, 0);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, -2, 6, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Engine glow
        const gradient = ctx.createLinearGradient(0, -this.radius, 0, this.radius);
        gradient.addColorStop(0, '#ff6600');
        gradient.addColorStop(1, 'rgba(255, 102, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(-3, this.radius - 3);
        ctx.lineTo(3, this.radius - 3);
        ctx.lineTo(0, this.radius + 8 + Math.random() * 5);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================
// BULLET
// ============================================

class Bullet {
    constructor(x, y, angle, isPlayer, damage = 1, radius = 4, vx = 0, vy = 0) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * CONFIG.bulletSpeed + vx;
        this.vy = Math.sin(angle) * CONFIG.bulletSpeed + vy;
        this.radius = radius;
        this.isPlayer = isPlayer;
        this.damage = damage;
        this.life = 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw(ctx) {
        ctx.fillStyle = this.isPlayer ? '#ffff00' : '#ff4444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.shadowColor = this.isPlayer ? '#ffff00' : '#ff4444';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================
// ENEMY SHIP
// ============================================

class EnemyShip {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 0: basic, 1: fighter, 2: bomber
        this.radius = 18;
        this.health = type === 2 ? 3 : (type === 1 ? 2 : 1);
        this.scoreValue = type === 2 ? 500 : (type === 1 ? 300 : 100);

        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.fireRate = 60; // Don't fire initially
        this.lastShot = 0;

        this.state = 'approaching'; // approaching, attacking, retreating
        this.attackTimer = 0;
        this.targetX = x;
        this.targetY = y;
    }

    update() {
        if (this.state === 'approaching') {
            const dx = Game.width / 2 - this.x;
            const dy = Game.height / 2 - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 50) {
                const speed = 1.5 + (Game.wave * 0.1);
                this.vx = (dx / dist) * speed;
                this.vy = (dy / dist) * speed;
            } else {
                this.state = 'attacking';
                this.attackTimer = 60;
            }
        }

        if (this.state === 'attacking') {
            this.attackTimer--;

            if (this.attackTimer <= 0) {
                this.fire();
                this.attackTimer = 30;
            }

            // Move towards target
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                this.vx = (dx / dist) * 2;
                this.vy = (dy / dist) * 2;
            } else {
                this.state = 'retreating';
            }
        }

        if (this.state === 'retreating') {
            const dx = Game.width / 2 + random(-100, 100) - this.x;
            const dy = Game.height / 2 + random(-100, 100) - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 50) {
                const speed = 1.2;
                this.vx = (dx / dist) * speed;
                this.vy = (dy / dist) * speed;
            } else {
                this.state = 'approaching';
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        // Keep in bounds
        this.x = Math.max(this.radius, Math.min(Game.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(Game.height - this.radius, this.y));

        // Calculate angle towards player
        this.angle = Math.atan2(Game.player.y - this.y, Game.player.x - this.x);
    }

    fire() {
        const now = Game.frameCount;
        if (now - this.lastShot >= this.fireRate) {
            this.lastShot = now;

            // Main bullet
            Game.enemyBullets.push(new Bullet(
                this.x, this.y, this.angle, false,
                1, 5, 0, 0
            ));

            // Spread shot for fighters and bombers
            if (this.type >= 1) {
                Game.enemyBullets.push(new Bullet(
                    this.x, this.y, this.angle + 0.2, false,
                    1, 4, 2, 2
                ));
                Game.enemyBullets.push(new Bullet(
                    this.x, this.y, this.angle - 0.2, false,
                    1, 4, -2, 2
                ));
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            createExplosion(this.x, this.y, '#ff4444', 15);
            Game.score += this.scoreValue;
            Game.enemiesKilled++;
            return true; // Dead
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Health bar for tougher enemies
        if (this.type >= 1 && this.health < this.maxHealth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-15, -this.radius - 8, 30, 4);
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(-15, -this.radius - 8, 30 * (this.health / this.maxHealth), 4);
        }

        // Ship body based on type
        ctx.fillStyle = this.type === 2 ? '#aa00ff' : (this.type === 1 ? '#ff6600' : '#ffcc00');

        if (this.type === 0) {
            // Basic enemy
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius, this.radius);
            ctx.lineTo(0, this.radius - 5);
            ctx.lineTo(-this.radius, this.radius);
            ctx.closePath();
            ctx.fill();

            // Wing detail
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 1) {
            // Fighter
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius - 5, 0);
            ctx.lineTo(this.radius, this.radius);
            ctx.lineTo(0, this.radius - 8);
            ctx.lineTo(-this.radius, this.radius);
            ctx.lineTo(-this.radius + 5, 0);
            ctx.closePath();
            ctx.fill();

            // Wings
            ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.beginPath();
            ctx.moveTo(-this.radius + 3, 0);
            ctx.lineTo(-this.radius - 8, -this.radius + 5);
            ctx.lineTo(-this.radius + 3, -this.radius + 3);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.radius - 3, 0);
            ctx.lineTo(this.radius + 8, -this.radius + 5);
            ctx.lineTo(this.radius - 3, -this.radius + 3);
            ctx.fill();
        } else {
            // Bomber
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius, 0);
            ctx.lineTo(this.radius, this.radius);
            ctx.lineTo(0, this.radius - 5);
            ctx.lineTo(-this.radius, this.radius);
            ctx.lineTo(-this.radius, 0);
            ctx.closePath();
            ctx.fill();

            // Bombs
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.arc(this.radius + 8, this.radius * 0.3, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.radius + 8, -this.radius * 0.3, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Cockpit
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, -5, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================
// BOSS SHIP
// ============================================

class BossShip {
    constructor() {
        this.x = Game.width / 2;
        this.y = -200;
        this.radius = 60;
        this.maxHealth = CONFIG.bossHealthMultiplier * Game.wave;
        this.health = this.maxHealth;
        this.phase = 0; // 0: enter, 1: fight
        this.timer = 0;
        this.pattern = '';
    }

    update() {
        if (this.phase === 0) {
            // Enter battlefield
            const dx = Game.width / 2 - this.x;
            const dy = 300 - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 50) {
                this.x += (dx / dist) * 4;
                this.y += (dy / dist) * 4;
            } else {
                this.phase = 1;
                this.timer = 0;
            }
        }

        if (this.phase === 1) {
            this.timer++;

            // Phase transitions
            if (this.timer >= 600) this.pattern = 'A';
            else if (this.timer >= 900) this.pattern = 'B';
            else if (this.timer >= 1200) this.pattern = 'C';

            // Attack patterns based on phase
            switch(this.pattern) {
                case 'A':
                    // Spread shot
                    if (this.timer % 45 === 0) {
                        for (let i = -2; i <= 2; i++) {
                            Game.enemyBullets.push(new Bullet(
                                this.x, this.y + 30,
                                Math.PI / 2 + i * 0.2,
                                false, 1, 8, 0, 0
                            ));
                        }
                    }
                    break;

                case 'B':
                    // Railgun
                    if (this.timer % 90 === 0) {
                        Game.enemyBullets.push(new Bullet(
                            this.x, this.y,
                            Math.atan2(Game.player.y - this.y, Game.player.x - this.x),
                            false, 5, 10, 0, 0
                        ));
                    }
                    break;

                case 'C':
                    // Spiral barrage
                    const spiralAngle = (this.timer / 60) % (Math.PI * 2);
                    const spiralRadius = 100 + Math.sin(spiralAngle) * 50;
                    if (this.timer % 30 === 0) {
                        const angle = spiralAngle + Math.PI / 2;
                        Game.enemyBullets.push(new Bullet(
                            this.x, this.y,
                            angle,
                            false, 1, 6, 0, 0
                        ));
                    }
                    break;
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        createExplosion(this.x, this.y, '#aa00ff', 3);

        if (this.health <= 0) {
            createExplosion(this.x, this.y, '#aa00ff', 100);
            Game.bossActive = false;
            Game.score += 5000 * Game.wave;
            setTimeout(() => startNextWave(), 2000);
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Boss health bar
        const barWidth = 200;
        const barHeight = 20;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-barWidth / 2, -this.radius - 30, barWidth, barHeight);
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(-barWidth / 2, -this.radius - 30, Math.max(0, barWidth * (this.health / this.maxHealth)), barHeight);

        // Boss body
        ctx.fillStyle = '#aa00ff';
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, -this.radius + 15);
        ctx.lineTo(this.radius, this.radius);
        ctx.lineTo(0, this.radius - 10);
        ctx.lineTo(-this.radius, this.radius);
        ctx.lineTo(-this.radius, -this.radius + 15);
        ctx.closePath();
        ctx.fill();

        // Core
        const pulse = Math.sin(Game.frameCount * 0.1) * 5;
        const coreRadius = 20 + pulse;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#aa00ff');
        gradient.addColorStop(1, 'rgba(170, 0, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = 'rgba(170, 0, 255, 0.5)';
        ctx.beginPath();
        ctx.moveTo(-this.radius + 5, -this.radius + 10);
        ctx.lineTo(-this.radius - 20, -this.radius + 30);
        ctx.lineTo(-this.radius + 5, -this.radius + 15);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(this.radius - 5, -this.radius + 10);
        ctx.lineTo(this.radius + 20, -this.radius + 30);
        ctx.lineTo(this.radius - 5, -this.radius + 15);
        ctx.fill();

        // Engine glow
        const engineGlow = ctx.createRadialGradient(0, 0, coreRadius, 0, 0, coreRadius * 1.5);
        engineGlow.addColorStop(0, 'rgba(255, 100, 255, 0.8)');
        engineGlow.addColorStop(1, 'rgba(255, 100, 255, 0)');
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.arc(0, 0, coreRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================
// POWERUP
// ============================================

class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'S' for shield, 'M' for magnet, 'D' for dash
        this.radius = 15;
        this.life = 300;
        this.bobOffset = random(0, Math.PI * 2);
    }

    update() {
        this.life--;
        this.y += Math.sin(Game.frameCount * 0.1 + this.bobOffset) * 0.5;
    }

    draw(ctx) {
        const bobY = this.y + Math.sin(Game.frameCount * 0.1 + this.bobOffset) * 5;

        // Glow effect
        ctx.shadowColor = this.type === 'S' ? '#00ff88' : (this.type === 'M' ? '#ffff00' : '#ff4444');
        ctx.shadowBlur = 20;

        // Outer ring
        ctx.strokeStyle = `hsla(${this.type === 'S' ? 140 : (this.type === 'M' ? 60 : 0)}, 100%, 50%, 0.8)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, bobY, this.radius + 5, 0, Math.PI * 2);
        ctx.stroke();

        // Inner symbol
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type, this.x, bobY);

        ctx.shadowBlur = 0;
    }
}

// ============================================
// EXPLOSIONS
// ============================================

function createExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        Game.particles.push(new Particle(x, y, color));
    }
}

// ============================================
// WAVE MANAGEMENT
// ============================================

function startWave() {
    Game.wave++;
    document.getElementById('wave').textContent = Game.wave;

    // Determine wave pattern
    const numEnemies = Math.min(8 + Game.wave * 2, 24);
    Game.totalEnemies = numEnemies;

    // Create enemy formation
    const startX = Game.width / 2 - (numEnemies * 50) / 2;

    for (let i = 0; i < numEnemies; i++) {
        const type = i % 3;
        const x = startX + i * 50;
        const y = random(100, 200);
        Game.enemies.push(new EnemyShip(x, y, type));
    }

    Game.waveTimer = CONFIG.waveDuration;
}

function startNextWave() {
    if (!Game.bossActive) {
        setTimeout(startWave, 1000);
    }
}

// ============================================
// BOSS BATTLE
// ============================================

function startBossBattle() {
    Game.boss = new BossShip();
    Game.bossActive = true;
    document.getElementById('boss-hud').classList.remove('hidden');
    document.getElementById('boss-name').textContent = `BOSS WAVE ${Game.wave}`;

    setTimeout(() => {
        Game.boss.phase = 1;
    }, 2000);
}

// ============================================
// GAME LOOP
// ============================================

function init() {
    Game.canvas = document.getElementById('game-canvas');
    Game.ctx = Game.canvas.getContext('2d');

    // Set canvas size
    Game.canvas.width = CONFIG.canvasWidth;
    Game.canvas.height = CONFIG.canvasHeight;

    // Create stars
    for (let i = 0; i < 200; i++) {
        Game.stars.push(new Star());
    }

    // Start loop
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (Game.state === 'playing') {
        update();
        draw();
    }

    requestAnimationFrame(gameLoop);
}

function update() {
    Game.frameCount++;

    // Update powerup timer
    if (Game.powerupTimer > 0) {
        Game.powerupTimer--;
        if (Game.powerupTimer <= 0) {
            deactivatePowerups();
        }
    }

    // Update wave timer
    if (Game.waveTimer > 0) {
        Game.waveTimer--;
        if (Game.waveTimer <= 0 && !Game.bossActive && Game.enemies.length === 0) {
            startNextWave();
        }
    }

    // Update stars
    Game.stars.forEach(star => star.update());

    // Update player
    if (Game.player) {
        Game.player.update();

        // Auto-fire when mouse is held
        if (Game.mouse.down) {
            Game.player.shoot();
        }
    }

    // Update boss
    if (Game.boss) {
        Game.boss.update();
    }

    // Update enemies
    for (let i = Game.enemies.length - 1; i >= 0; i--) {
        const enemy = Game.enemies[i];
        enemy.update();

        // Check collision with player
        if (checkCollision({x: enemy.x, y: enemy.y, radius: enemy.radius}, Game.player)) {
            Game.player.takeDamage(20);
            createExplosion(enemy.x, enemy.y, '#ff4444', 20);
            Game.enemies.splice(i, 1);
            continue;
        }

        // Remove off-screen enemies
        if (enemy.y < -100) {
            Game.enemies.splice(i, 1);
        }
    }

    // Update bullets
    for (let i = Game.bullets.length - 1; i >= 0; i--) {
        const bullet = Game.bullets[i];
        bullet.update();

        // Check collisions
        if (bullet.isPlayer) {
            // Check boss collision first
            if (Game.boss && checkCollision(bullet, {x: Game.boss.x, y: Game.boss.y, radius: Game.boss.radius})) {
                const killed = Game.boss.takeDamage(bullet.damage);
                createExplosion(Game.boss.x, Game.boss.y, '#aa00ff', 10);

                if (killed) {
                    Game.bossActive = false;
                    Game.score += 5000 * Game.wave;
                    setTimeout(startNextWave, 2000);
                }

                bullet.life = 0;
            } else {
                // Check enemy collisions
                for (let j = Game.enemies.length - 1; j >= 0; j--) {
                    const enemy = Game.enemies[j];
                    if (checkCollision(bullet, {x: enemy.x, y: enemy.y, radius: enemy.radius})) {
                        const killed = enemy.takeDamage(bullet.damage);
                        createExplosion(enemy.x, enemy.y, '#ff4444', 5);

                        if (killed) {
                            Game.enemies.splice(j, 1);

                            // Drop powerup
                            if (Math.random() < 0.15) {
                                const types = ['S', 'M', 'D'];
                                Game.powerups.push(new Powerup(enemy.x, enemy.y, types[Math.floor(Math.random() * types.length)]));
                            }
                        }

                        bullet.life = 0;
                        break;
                    }
                }
            }
        } else {
            // Check player collision
            if (checkCollision(bullet, Game.player)) {
                Game.player.takeDamage(10);
                bullet.life = 0;
            }
        }

        // Remove off-screen or dead bullets
        if (bullet.life <= 0 || bullet.x < -50 || bullet.x > Game.width + 50 ||
            bullet.y < -50 || bullet.y > Game.height + 50) {
            Game.bullets.splice(i, 1);
        }
    }

    // Update enemy bullets
    for (let i = Game.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = Game.enemyBullets[i];
        bullet.update();

        // Check player collision
        if (checkCollision(bullet, Game.player)) {
            Game.player.takeDamage(10);
            bullet.life = 0;
        }

        // Remove off-screen or dead bullets
        if (bullet.life <= 0 || bullet.x < -50 || bullet.x > Game.width + 50 ||
            bullet.y < -50 || bullet.y > Game.height + 50) {
            Game.enemyBullets.splice(i, 1);
        }
    }

    // Update particles
    for (let i = Game.particles.length - 1; i >= 0; i--) {
        const particle = Game.particles[i];
        particle.update();
        if (particle.life <= 0) {
            Game.particles.splice(i, 1);
        }
    }

    // Update powerups
    for (let i = Game.powerups.length - 1; i >= 0; i--) {
        const powerup = Game.powerups[i];
        powerup.update();

        // Check player collection
        if (checkCollision(powerup, Game.player)) {
            activatePowerup(powerup.type);
            Game.powerups.splice(i, 1);
        } else if (powerup.life <= 0) {
            Game.powerups.splice(i, 1);
        }
    }

    // Check for boss battle
    if (!Game.bossActive && Game.enemies.length === 0 && !Game.boss) {
        startBossBattle();
    }

    // Check victory condition
    if (Game.enemies.length === 0 && !Game.bossActive && !Game.boss) {
        showVictory();
    }
}

function draw() {
    // Clear canvas
    Game.ctx.fillStyle = '#000';
    Game.ctx.fillRect(0, 0, Game.width, Game.height);

    // Draw stars
    Game.stars.forEach(star => star.draw(Game.ctx));

    // Draw powerups
    Game.powerups.forEach(p => p.draw(Game.ctx));

    // Draw enemies
    Game.enemies.forEach(e => e.draw(Game.ctx));

    // Draw boss
    if (Game.boss) {
        Game.boss.draw(Game.ctx);
    }

    // Draw player
    if (Game.player) {
        Game.player.draw(Game.ctx);
    }

    // Draw bullets
    Game.bullets.forEach(b => b.draw(Game.ctx));
    Game.enemyBullets.forEach(b => b.draw(Game.ctx));

    // Draw particles
    Game.particles.forEach(p => p.draw(Game.ctx));

    // Update UI
    updateUI();
}

function updateUI() {
    document.getElementById('score').textContent = Game.score.toLocaleString();
    document.getElementById('lives').textContent = Game.lives;

    if (Game.boss) {
        const bossPercent = Math.max(0, (Game.boss.health / Game.boss.maxHealth) * 100);
        document.getElementById('boss-bar').style.width = `${bossPercent}%`;

        if (Game.boss.phase === 1) {
            document.getElementById('boss-hud').classList.add('boss-active');
        }
    }

    // Update powerup indicators
    const badges = document.querySelectorAll('.powerup-badge');
    badges.forEach((badge, index) => {
        const type = ['S', 'M', 'D'][index];
        badge.classList.toggle('active', Game.activePowerups[type] && Game.powerupTimer > 0);
    });
}

function activatePowerup(type) {
    Game.activePowerups[type] = true;
    Game.powerupTimer = CONFIG.powerupDuration;

    // Visual feedback
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 24px;
        font-weight: bold;
        pointer-events: none;
        animation: fadeOut 1s ease-out;
    `;
    indicator.textContent = `POWERUP: ${type === 'S' ? 'SHIELD' : (type === 'M' ? 'MAGNET' : 'DASH')}`;
    document.getElementById('game-container').appendChild(indicator);
    setTimeout(() => indicator.remove(), 1000);
}

function deactivatePowerups() {
    Game.activePowerups = { shield: false, magnet: false, dash: false };
}

// ============================================
// GAME FLOW CONTROL
// ============================================

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');

    // Initialize player
    Game.player = new PlayerShip();

    // Start first wave
    startWave();

    Game.state = 'playing';
}

function endGame() {
    Game.state = 'gameover';
    document.getElementById('final-score').textContent = Game.score.toLocaleString();
    document.getElementById('game-over-screen').classList.remove('hidden');
}

function showVictory() {
    Game.state = 'victory';
    document.getElementById('victory-score').textContent = Game.score.toLocaleString();
    document.getElementById('victory-screen').classList.remove('hidden');
}

function resetGame() {
    // Reset all game state
    Game.score = 0;
    Game.lives = 3;
    Game.wave = 1;
    Game.enemies = [];
    Game.bullets = [];
    Game.enemyBullets = [];
    Game.particles = [];
    Game.powerups = [];
    Game.boss = null;
    Game.player = null;
    Game.bossActive = false;

    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('boss-hud').classList.add('hidden');

    startGame();
}

// ============================================
// PAUSE FUNCTIONALITY
// ============================================

function togglePause() {
    if (Game.state === 'playing') {
        Game.state = 'paused';

        const pauseScreen = document.createElement('div');
        pauseScreen.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 50;
        `;

        pauseScreen.innerHTML = `
            <div style="text-align: center; color: #fff;">
                <h1 style="font-size: 48px; margin-bottom: 20px;">PAUSED</h1>
                <p style="font-size: 18px; margin-bottom: 20px;">Press P to resume</p>
                <button class="btn" onclick="togglePause()">RESUME</button>
            </div>
        `;

        document.getElementById('game-container').appendChild(pauseScreen);
    } else if (Game.state === 'paused') {
        Game.state = 'playing';
        pauseScreen.remove();
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', init);
