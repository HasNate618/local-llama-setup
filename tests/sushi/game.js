/**
 * GALAGA CLONE - Complete Game Implementation
 * A fully featured space shooter with all classic mechanics
 */

// ============================================
// AUDIO SYSTEM (Web Audio API)
// ============================================
const AudioSys = (() => {
    let ctx = null;
    let masterGain = null;
    
    function init() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.3;
            masterGain.connect(ctx.destination);
        }
    }
    
    function playTone(freq, type, duration, vol = 1) {
        if (!ctx) init();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start();
        
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.stop(ctx.currentTime + duration);
    }
    
    function playNoise(duration, vol = 1) {
        if (!ctx) init();
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        noise.connect(gain);
        gain.connect(masterGain);
        gain.gain.value = vol;
        noise.start();
    }
    
    return {
        shoot: () => playTone(880, 'square', 0.1, 0.5),
        enemyShoot: () => playTone(200, 'sawtooth', 0.15, 0.4),
        explosion: () => playNoise(0.3, 0.6),
        powerup: () => {
            playTone(1200, 'sine', 0.1, 0.3);
            setTimeout(() => playTone(1800, 'sine', 0.1, 0.3), 100);
            setTimeout(() => playTone(2400, 'sine', 0.2, 0.3), 200);
        },
        levelUp: () => {
            [440, 554, 659, 880].forEach((f, i) => {
                setTimeout(() => playTone(f, 'sine', 0.3, 0.4), i * 100);
            });
        },
        gameOver: () => {
            [300, 250, 200, 150].forEach((f, i) => {
                setTimeout(() => playTone(f, 'triangle', 0.5, 0.5), i * 200);
            });
        }
    };
})();

// ============================================
// GAME CONSTANTS & CONFIGURATION
// ============================================
const CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    PLAYER_SPEED: 5,
    PLAYER_SIZE: 40,
    PLAYER_FIRE_RATE: 150,
    BULLET_SPEED: 10,
    ENEMY_BASE_SPEED: 2,
    ENEMY_FIRE_RATE: 1000,
    SPAWN_INTERVAL: 1000,
    LEVEL_DURATION: 30000,
    MAX_LEVELS: 10,
    COLORS: {
        player: '#00ff88',
        bullet: '#ffff00',
        enemy: ['#ff6b6b', '#ff886b', '#ffaa6b'],
        powerup: ['#00ff88', '#00ffff', '#ff00ff'],
        star: '#ffffff'
    }
};

// ============================================
// GAME ENGINE
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.state = 'start'; // start, playing, paused, gameover
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedTimeStep = 16;
        
        // Entities
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerups = [];
        
        // Game progression
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('galagaHighScore') || '0');
        this.lives = 3;
        this.level = 1;
        this.levelTime = 0;
        this.spawnTimer = 0;
        this.enemyFireTimer = 0;
        
        // Power-ups
        this.multiShot = 0;
        this.tripleShot = 0;
        
        // Input
        this.keys = {};
        this.mouseDown = false;
        
        // Bindings
        this.bindEvents();
    }
    
    bindEvents() {
        // Keyboard input - use code for more reliable detection
        const keyMap = {
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'KeyA': 'a',
            'KeyD': 'd',
            'KeyW': 'w',
            'KeyS': 's',
            'Space': 'space'
        };

        window.addEventListener('keydown', (e) => {
            const key = e.code || e.key;
            this.keys[key] = true;

            if (this.state === 'playing') {
                if (key === 'KeyP' || key === 'p') {
                    this.togglePause();
                } else if (key === 'Space' || key === 'ArrowUp') {
                    e.preventDefault();
                    console.log('SHOOT REQUESTED');
                    this.player.shoot();
                }
            } else if ((this.state === 'gameover' || this.state === 'start') && 
                       (key === 'KeyR' || key === 'r')) {
                this.restart();
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.code || e.key;
            this.keys[key] = false;
        });
        
        // Mouse input
        this.canvas.addEventListener('mousedown', () => {
            this.mouseDown = true;
            if (this.state === 'playing') {
                this.player.shoot();
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
        
        // UI buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.togglePause();
        });
    }
    
    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.levelTime = 0;
        this.spawnTimer = 0;
        this.enemyFireTimer = 0;
        this.multiShot = 0;
        this.tripleShot = 0;

        this.player = new Player(this);
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.particles = [];
        this.powerups = [];

        this.updateUI();
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseScreen').classList.add('hidden');

        // Start the game loop immediately
        this.loop();
        
        // Also start a separate render loop for smooth animation
        const renderLoop = () => {
            if (this.state === 'playing' || this.state === 'paused') {
                requestAnimationFrame(renderLoop);
            }
        };
        renderLoop();
    }
    
    restart() {
        this.startGame();
    }
    
    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.getElementById('pauseScreen').classList.remove('hidden');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('pauseScreen').classList.add('hidden');
            this.loop();
        }
    }
    
    gameOver() {
        this.state = 'gameover';
        // Play game over sound
        AudioSys.gameOver();
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    // ============================================
    // GAME LOOP
    // ============================================
    loop(timestamp) {
        if (this.state !== 'playing' && this.state !== 'paused') return;
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.accumulator += deltaTime;
        
        while (this.accumulator >= this.fixedTimeStep) {
            this.update(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }
        
        this.draw();
        
        requestAnimationFrame((ts) => this.loop(ts));
    }
    
    update(deltaTime) {
        // Debug: log input state
        const activeKeys = Object.keys(this.keys).filter(k => this.keys[k]);
        if (activeKeys.length > 0 && this.state === 'playing') {
            console.log('ACTIVE KEYS:', activeKeys);
        }

        // Update player
        this.player.update();

        // Update bullets
        this.bullets.forEach(b => b.update());
        this.enemyBullets.forEach(b => b.update());

        // Update particles
        this.particles.forEach(p => p.update());

        // Update powerups
        this.powerups.forEach(p => p.update());

        // Spawning enemies
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= CONFIG.SPAWN_INTERVAL) {
            this.spawnEnemies();
            this.spawnTimer = 0;
        }

        // Enemy fire
        this.enemyFireTimer += deltaTime;
        if (this.enemyFireTimer >= CONFIG.ENEMY_FIRE_RATE) {
            this.enemies.forEach(e => e.fire());
            this.enemyFireTimer = 0;
        }

        // Level progression
        this.levelTime += deltaTime;
        if (this.levelTime >= CONFIG.LEVEL_DURATION) {
            this.nextLevel();
        }

        // Update UI
        this.updateUI();
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Draw background stars
        this.drawStars();

        // Debug: log state
        if (this.state === 'playing') {
            console.log('STATE:', this.state, '| Player:', {x: Math.round(this.player.x), y: Math.round(this.player.y)});
        }

        // Draw entities
        this.player.draw(this.ctx);
        this.bullets.forEach(b => b.draw(this.ctx));
        this.enemyBullets.forEach(b => b.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        this.powerups.forEach(p => p.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));
    }
    
    drawStars() {
        this.ctx.fillStyle = CONFIG.COLORS.star;
        for (let i = 0; i < 100; i++) {
            const x = (i * 137) % CONFIG.CANVAS_WIDTH;
            const y = (i * 243) % CONFIG.CANVAS_HEIGHT;
            const size = (i % 3) + 1;
            this.ctx.fillRect(x, y, size, size);
        }
    }
    
    updateUI() {
        document.getElementById('scoreDisplay').textContent = this.score;
        document.getElementById('highScoreDisplay').textContent = this.highScore;
        document.getElementById('livesDisplay').textContent = this.lives;
        document.getElementById('levelDisplay').textContent = this.level;
        
        // Powerup indicators
        if (this.multiShot > 0) {
            document.getElementById('multiBar').style.width = (this.multiShot / 5 * 100) + '%';
            document.getElementById('powerupIndicator').classList.remove('hidden');
        } else {
            document.getElementById('multiBar').style.width = '100%';
            document.getElementById('powerupIndicator').classList.add('hidden');
        }
        
        if (this.tripleShot > 0) {
            document.getElementById('tripleBar').style.width = (this.tripleShot / 5 * 100) + '%';
        }
    }
    
    // ============================================
    // ENTITY FACTORIES
    // ============================================
    spawnEnemies() {
        const rows = 4 + Math.min(this.level, 3);
        const cols = 8 + Math.min(this.level, 2);
        const startX = (CONFIG.CANVAS_WIDTH - (cols - 1) * 50) / 2;
        
        // Play level up sound
        AudioSys.levelUp();
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                this.enemies.push(new Enemy(
                    startX + col * 50,
                    60 + row * 45,
                    this
                ));
            }
        }
    }
    
    spawnPowerup(x, y) {
        const types = [
            { type: 'multi', color: CONFIG.COLORS.powerup[0], value: 5 },
            { type: 'triple', color: CONFIG.COLORS.powerup[1], value: 5 },
            { type: 'life', color: CONFIG.COLORS.powerup[2], value: 1 }
        ];
        
        const type = types[Math.floor(Math.random() * types.length)];
        // Play powerup sound
        AudioSys.powerup();
        this.powerups.push(new Powerup(x, y, type.type, type.color, type.value, this));
    }
    
    spawnParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }
}

// ============================================
// PLAYER CLASS
// ============================================
class Player {
    constructor(game) {
        this.game = game;
        this.x = CONFIG.CANVAS_WIDTH / 2 - CONFIG.PLAYER_SIZE / 2;
        this.y = CONFIG.CANVAS_HEIGHT - 80;
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE * 0.6;
        this.speed = CONFIG.PLAYER_SPEED;
        this.fireRate = CONFIG.PLAYER_FIRE_RATE;
        this.lastFireTime = 0;
        this.invulnerable = 0;
    }
    
    update() {
        // Movement
        let dx = 0;
        let dy = 0;

        const leftKeys = ['ArrowLeft', 'KeyA', 'a', 'A'];
        const rightKeys = ['ArrowRight', 'KeyD', 'd', 'D'];
        const upKeys = ['ArrowUp', 'KeyW', 'w', 'W'];
        const downKeys = ['ArrowDown', 'KeyS', 's', 'S'];

        if (leftKeys.some(k => this.game.keys[k])) dx -= 1;
        if (rightKeys.some(k => this.game.keys[k])) dx += 1;
        if (upKeys.some(k => this.game.keys[k])) dy -= 1;
        if (downKeys.some(k => this.game.keys[k])) dy += 1;

        // Debug: log movement calculation
        if (dx !== 0 || dy !== 0) {
            console.log('MOVING:', {dx, dy}, 'Position:', {x: Math.round(this.x), y: Math.round(this.y)});
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        this.x += dx * this.speed;
        this.y += dy * this.speed;

        // Boundary checks
        this.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT - this.height, this.y));

        // Invulnerability blink
        if (this.invulnerable > 0) {
            this.invulnerable--;
        }
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.lastFireTime < this.fireRate) {
            console.log('COOLDOWN: fired at', now - this.lastFireTime, 'ms');
            return;
        }

        this.lastFireTime = now;

        // Debug: log shoot info
        console.log('SHOOTING from position:', {x: Math.round(this.x), y: Math.round(this.y)});

        // Play shoot sound
        AudioSys.shoot();

        // Multi-shot and triple-shot
        let count = 1;
        let spread = 0;

        if (this.game.multiShot > 0) {
            count = 2;
            spread = 0.3;
            this.game.multiShot--;
        } else if (this.game.tripleShot > 0) {
            count = 3;
            spread = 0.5;
            this.game.tripleShot--;
        }

        for (let i = 0; i < count; i++) {
            const angle = (i - (count - 1) / 2) * spread;
            this.game.bullets.push(new Bullet(
                this.x + this.width / 2,
                this.y,
                Math.cos(angle) * CONFIG.BULLET_SPEED,
                Math.sin(angle) * CONFIG.BULLET_SPEED,
                this.game
            ));
        }

        this.game.spawnParticles(this.x + this.width / 2, this.y, '#ffffaa', 5);
    }
    
    draw(ctx) {
        // Blink if invulnerable
        if (this.invulnerable > 0 && Math.floor(Date.now() / 100) % 2 === 0) return;
        
        ctx.fillStyle = CONFIG.COLORS.player;
        ctx.shadowColor = CONFIG.COLORS.player;
        ctx.shadowBlur = 15;
        
        // Draw spaceship (triangle shape)
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 10);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }
}

// ============================================
// BULLET CLASS
// ============================================
class Bullet {
    constructor(x, y, vx, vy, game) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 4;
        this.game = game;
        this.active = true;
    }
    
    update() {
        const oldX = this.x;
        const oldY = this.y;
        this.x += this.vx;
        this.y += this.vy;

        // Debug: log bullet movement
        if (Math.abs(this.x - oldX) > 0.1 || Math.abs(this.y - oldY) > 0.1) {
            console.log('BULLET MOVING:', {x: Math.round(this.x), y: Math.round(this.y)});
        }

        // Remove if out of bounds
        if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH ||
            this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.COLORS.bullet;
        ctx.shadowColor = CONFIG.COLORS.bullet;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================
// ENEMY CLASS
// ============================================
class Enemy {
    constructor(x, y, game) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 35;
        this.speed = CONFIG.ENEMY_BASE_SPEED + (this.game.level - 1) * 0.5;
        this.fireRate = CONFIG.ENEMY_FIRE_RATE / (this.game.level + 1);
        this.active = true;
        this.colorIndex = Math.floor(Math.random() * 3);
        this.color = CONFIG.COLORS.enemy[this.colorIndex];
        this.wobbleOffset = Math.random() * Math.PI * 2;
    }
    
    update() {
        // Debug: log enemy movement
        console.log('ENEMY MOVING:', {x: Math.round(this.x), y: Math.round(this.y)});
        
        // Move down with slight wobble
        this.y += this.speed;
        this.x += Math.sin(this.y * 0.02 + this.wobbleOffset) * 0.5;

        // Remove if off screen
        if (this.y > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    fire() {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 2;
        // Play enemy shoot sound
        AudioSys.enemyShoot();
        console.log('ENEMY FIRING from:', {x: Math.round(this.x), y: Math.round(this.y)});
        this.game.enemyBullets.push(new EnemyBullet(
            this.x + this.width / 2,
            this.y + this.height / 2,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            this.game
        ));
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Draw enemy shape (alien-like)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.lineTo(this.x + this.width - 8, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height - 5);
        ctx.lineTo(this.x + 8, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 10, this.y + 10, 6, 6);
        ctx.fillRect(this.x + 24, this.y + 10, 6, 6);
        
        ctx.shadowBlur = 0;
    }
}

// ============================================
// ENEMY BULLET CLASS
// ============================================
class EnemyBullet {
    constructor(x, y, vx, vy, game) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 5;
        this.game = game;
        this.active = true;
    }
    
    update() {
        const oldX = this.x;
        const oldY = this.y;
        this.x += this.vx;
        this.y += this.vy;

        // Debug: log enemy bullet movement
        if (Math.abs(this.x - oldX) > 0.1 || Math.abs(this.y - oldY) > 0.1) {
            console.log('ENEMY BULLET MOVING:', {x: Math.round(this.x), y: Math.round(this.y)});
        }

        if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH ||
            this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ============================================
// POWERUP CLASS
// ============================================
class Powerup {
    constructor(x, y, type, color, value, game) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        this.value = value;
        this.game = game;
        this.active = true;
        this.speed = 2;
    }
    
    update() {
        const oldY = this.y;
        this.y += this.speed;

        // Debug: log powerup movement
        if (Math.abs(this.y - oldY) > 0.1) {
            console.log('POWERUP MOVING:', {x: Math.round(this.x), y: Math.round(this.y)});
        }

        if (this.y > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;

        // Draw powerup icon
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let icon = '';
        switch(this.type) {
            case 'multi': icon = 'M'; break;
            case 'triple': icon = 'T'; break;
            case 'life': icon = '♥'; break;
        }

        ctx.fillText(icon, this.x, this.y);

        ctx.shadowBlur = 0;
    }
}

// ============================================
// PARTICLE CLASS
// ============================================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.03;
        this.color = color || '#ffff00';
        this.active = true;
    }
    
    update() {
        const oldX = this.x;
        const oldY = this.y;
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;

        // Debug: log particle movement
        if (Math.abs(this.x - oldX) > 0.1 || Math.abs(this.y - oldY) > 0.1) {
            console.log('PARTICLE MOVING:', {x: Math.round(this.x), y: Math.round(this.y)});
        }

        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1.0;
    }
}

// ============================================
// COLLISION DETECTION
// ============================================
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkCircleCollision(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.radius + circle2.radius;
}

// ============================================
// GAME INITIALIZATION
// ============================================
window.addEventListener('load', () => {
    const game = new Game();
    
    // Initial draw
    game.draw();
});
