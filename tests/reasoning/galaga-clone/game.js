// Galaga Clone - Main Game Engine
// A complete arcade-style space shooter with boss battles

class GalagaClone {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.width = 1024;
        this.height = 768;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Game state
        this.gameState = 'start'; // start, playing, paused, gameover
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.wave = 1;
        this.highScore = parseInt(localStorage.getItem('galagaHighScore') || '0');
        this.enemiesKilled = 0;

        // Ship
        this.ship = null;

        // Projectiles
        this.playerBullets = [];
        this.enemyBullets = [];
        this.bossBullets = [];

        // Enemies
        this.enemies = [];
        this.boss = null;

        // Particles
        this.particles = [];
        this.stars = [];

        // Powerups
        this.powerups = {
            spread: 0,
            triple: 0,
            shield: 0,
            boost: 0
        };

        // Wave management
        this.waveEnemies = [];
        this.waveActive = false;
        this.waveTimer = 0;
        this.spawnTimer = 0;
        this.enemiesToSpawn = 0;

        // Boss battle
        this.bossPhase = null;
        this.bossHealth = 0;
        this.bossMaxHealth = 0;

        // Input
        this.keys = {};
        this.mouseDown = false;

        // Boss phases and patterns
        this.bossPatterns = {
            phase1: { name: 'PHASE 1', healthPercent: 1.0, pattern: 'sine' },
            phase2: { name: 'PHASE 2', healthPercent: 0.65, pattern: 'zigzag' },
            phase3: { name: 'PHASE 3', healthPercent: 0.40, pattern: 'spread' },
            phase4: { name: 'FINAL FORM', healthPercent: 0.15, pattern: 'rain' }
        };

        // Initialize
        this.initInput();
        this.createStars();
        this.setupPowerupIcons();
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code] = true;

            if (e.code === 'Space') {
                e.preventDefault();
                this.shoot();
            }

            if (e.key.toLowerCase() === 'p') {
                if (this.gameState === 'playing') {
                    this.togglePause();
                } else if (this.gameState === 'paused') {
                    this.togglePause();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code] = false;
        });

        this.canvas.addEventListener('mousedown', () => {
            this.mouseDown = true;
            if (this.gameState === 'playing' && this.ship) {
                this.shoot();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.ship && this.gameState === 'playing') {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.width / rect.width;
                const mouseX = (e.clientX - rect.left) * scaleX;
                const mouseY = (e.clientY - rect.top) * scaleY;

                // Mouse aim influence
                const angle = Math.atan2(mouseY - this.ship.y, mouseX - this.ship.x);
                this.ship.aimAngle = angle;
            }
        });
    }

    createStars() {
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.5 + 0.1,
                brightness: Math.random()
            });
        }
    }

    setupPowerupIcons() {
        const powerupContainer = document.getElementById('powerups');
        const icons = [
            { id: 'spread', char: '🔱', color: '#00ff88' },
            { id: 'triple', char: '⚡', color: '#ffff00' },
            { id: 'shield', char: '🛡️', color: '#00aaff' },
            { id: 'boost', char: '⚙️', color: '#ff6600' }
        ];

        icons.forEach(icon => {
            const el = document.createElement('div');
            el.className = 'powerup-icon';
            el.style.background = icon.color;
            el.textContent = icon.char;
            el.id = `powerup-${icon.id}`;
            powerupContainer.appendChild(el);
        });
    }

    startGame() {
        // Reset all game state
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.wave = 1;
        this.enemiesKilled = 0;
        this.powerups = { spread: 0, triple: 0, shield: 0, boost: 0 };
        this.playerBullets = [];
        this.enemyBullets = [];
        this.bossBullets = [];
        this.enemies = [];
        this.boss = null;
        this.particles = [];
        this.gameState = 'playing';

        // Hide overlays
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseScreen').classList.add('hidden');

        // Update HUD
        this.updateHUD();

        // Start first wave
        this.startWave();
    }

    startWave() {
        this.waveActive = true;
        this.waveTimer = 0;
        this.spawnTimer = 0;
        this.enemiesToSpawn = this.calculateWaveSize();
        this.waveEnemies = [];

        console.log(`Starting Wave ${this.wave}: ${this.enemiesToSpawn} enemies`);
    }

    calculateWaveSize() {
        // Exponential wave growth
        const base = 5 + Math.floor(this.wave * 1.8);
        return Math.floor(base * Math.pow(1.15, this.wave - 1));
    }

    spawnEnemy() {
        const types = [
            { type: 'fighter', hp: 2, speed: 1.5, score: 100, color: '#ff4444' },
            { type: 'scout', hp: 1, speed: 2.5, score: 50, color: '#44ff44' },
            { type: 'tank', hp: 8, speed: 0.8, score: 300, color: '#4444ff' },
            { type: 'speeder', hp: 1, speed: 3.5, score: 75, color: '#ffff44' }
        ];

        const type = types[Math.floor(Math.random() * types.length)];

        // Spawn at random edge
        let x, y;
        const edge = Math.floor(Math.random() * 4);
        switch(edge) {
            case 0: x = Math.random() * this.width; y = -50; break; // top
            case 1: x = this.width + 50; y = Math.random() * this.height; break; // right
            case 2: x = Math.random() * this.width; y = this.height + 50; break; // bottom
            case 3: x = -50; y = Math.random() * this.height; break; // left
        }

        const angle = Math.atan2(this.ship.y - y, this.ship.x - x);

        this.enemies.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * type.speed,
            vy: Math.sin(angle) * type.speed,
            hp: type.hp,
            maxHp: type.hp,
            type: type.type,
            score: type.score,
            color: type.color,
            radius: 15 + Math.random() * 5,
            shootTimer: Math.random() * 300
        });
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Update stars
        this.updateStars();

        // Handle ship
        if (this.ship) {
            this.updateShip();
        }

        // Spawn enemies
        if (this.waveActive && this.enemiesToSpawn > 0) {
            this.spawnEnemies();
        }

        // Update enemies
        this.updateEnemies();

        // Update boss
        if (this.boss) {
            this.updateBoss();
        }

        // Update projectiles
        this.updateProjectiles();

        // Update particles
        this.updateParticles();

        // Update powerups
        this.updatePowerups();

        // Check wave completion
        this.checkWaveCompletion();

        // Update UI
        this.updateHUD();
    }

    updateStars() {
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }
        });
    }

    updateShip() {
        const speed = 6;
        const boostSpeed = 10;

        let dx = 0;
        let dy = 0;

        // Movement
        if (this.keys['arrowleft'] || this.keys['a']) dx -= 1;
        if (this.keys['arrowright'] || this.keys['d']) dx += 1;
        if (this.keys['arrowup'] || this.keys['w']) dy -= 1;
        if (this.keys['arrowdown'] || this.keys['s']) dy += 1;

        // Normalize diagonal movement
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
            dx /= mag;
            dy /= mag;
        }

        let currentSpeed = this.powerups.boost > 0 ? boostSpeed : speed;

        this.ship.x += dx * currentSpeed;
        this.ship.y += dy * currentSpeed;

        // Boundaries
        this.ship.x = Math.max(20, Math.min(this.width - 20, this.ship.x));
        this.ship.y = Math.max(20, Math.min(this.height - 20, this.ship.y));

        // Auto-fire
        if (this.keys[' '] || this.mouseDown) {
            this.shoot();
        }
    }

    shoot() {
        if (!this.ship) return;

        const spread = this.powerups.spread > 0 ? 0.3 : 0;
        const baseSpeed = 12;

        // Triple shot
        if (this.powerups.triple > 0) {
            const angles = [-0.3, 0, 0.3];
            angles.forEach(angle => {
                this.playerBullets.push({
                    x: this.ship.x,
                    y: this.ship.y - 20,
                    vx: Math.cos(angle) * baseSpeed,
                    vy: Math.sin(angle) * baseSpeed,
                    damage: 1,
                    life: 60
                });
            });
        } else {
            // Normal shot with slight spread
            for (let i = -spread; i <= spread; i += spread * 0.5) {
                this.playerBullets.push({
                    x: this.ship.x,
                    y: this.ship.y - 20,
                    vx: Math.cos(i) * baseSpeed,
                    vy: Math.sin(i) * baseSpeed,
                    damage: 1,
                    life: 60
                });
            }
        }

        // Sound effect (visual feedback)
        this.createParticles(this.ship.x, this.ship.y - 30, '#00ff88', 3);
    }

    updateEnemies() {
        const now = Date.now();

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Move towards ship
            const angle = Math.atan2(this.ship.y - enemy.y, this.ship.x - enemy.x);
            enemy.x += Math.cos(angle) * enemy.vx;
            enemy.y += Math.sin(angle) * enemy.vy;

            // Keep within bounds
            enemy.x = Math.max(0, Math.min(this.width, enemy.x));
            enemy.y = Math.max(0, Math.min(this.height, enemy.y));

            // Shoot
            if (now - enemy.shootTimer > 1500) {
                this.enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4,
                    damage: 1,
                    life: 60
                });
                enemy.shootTimer = now;
            }

            // Collision with ship
            const dx = this.ship.x - enemy.x;
            const dy = this.ship.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.ship.radius + enemy.radius) {
                this.takeDamage(1);
                this.enemies.splice(i, 1);
                continue;
            }

            // Remove if off-screen
            if (enemy.x < -50 || enemy.x > this.width + 50 ||
                enemy.y < -50 || enemy.y > this.height + 50) {
                this.enemies.splice(i, 1);
            }
        }
    }

    updateBoss() {
        const now = Date.now();
        const boss = this.boss;

        // Move towards ship
        const angle = Math.atan2(this.ship.y - boss.y, this.ship.x - boss.x);
        boss.x += Math.cos(angle) * boss.speed;
        boss.y += Math.sin(angle) * boss.speed;

        // Keep within bounds
        boss.x = Math.max(50, Math.min(this.width - 50, boss.x));
        boss.y = Math.max(100, Math.min(this.height - 100, boss.y));

        // Shoot
        if (now - boss.lastShot > boss.shootInterval) {
            this.fireBossPattern();
            boss.lastShot = now;
        }

        // Collision with ship
        const dx = this.ship.x - boss.x;
        const dy = this.ship.y - boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.ship.radius + boss.radius) {
            this.takeDamage(5);
            this.bossBullets = [];
        }
    }

    fireBossPattern() {
        const pattern = this.bossPatterns[this.bossPhase]?.pattern || 'sine';

        switch(pattern) {
            case 'sine':
                // Sine wave spread
                const time = now / 1000;
                for (let i = -2; i <= 2; i++) {
                    const angle = (i * Math.PI / 4) + Math.sin(time) * 0.3;
                    this.bossBullets.push({
                        x: boss.x,
                        y: boss.y,
                        vx: Math.cos(angle) * 6,
                        vy: Math.sin(angle) * 6,
                        damage: 2,
                        life: 80,
                        color: '#ff00ff'
                    });
                }
                break;

            case 'zigzag':
                // Zigzag pattern
                for (let i = -1; i <= 1; i++) {
                    const angle = (i * Math.PI / 3) + (Math.random() - 0.5) * 0.2;
                    this.bossBullets.push({
                        x: boss.x,
                        y: boss.y,
                        vx: Math.cos(angle) * 7,
                        vy: Math.sin(angle) * 7,
                        damage: 3,
                        life: 80,
                        color: '#ff6600'
                    });
                }
                break;

            case 'spread':
                // Wide spread
                for (let i = -3; i <= 3; i++) {
                    const angle = (i * Math.PI / 6) + (Math.random() - 0.5) * 0.1;
                    this.bossBullets.push({
                        x: boss.x,
                        y: boss.y,
                        vx: Math.cos(angle) * 5,
                        vy: Math.sin(angle) * 5,
                        damage: 2,
                        life: 80,
                        color: '#ff4400'
                    });
                }
                break;

            case 'rain':
                // Falling rain pattern
                for (let i = 0; i < 8; i++) {
                    const angle = Math.PI + (Math.random() - 0.5) * 1;
                    this.bossBullets.push({
                        x: boss.x,
                        y: boss.y,
                        vx: Math.cos(angle) * 4,
                        vy: Math.sin(angle) * 4 + 2,
                        damage: 1,
                        life: 80,
                        color: '#ffaa00'
                    });
                }
                break;
        }
    }

    updateProjectiles() {
        // Player bullets
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;

            if (bullet.life <= 0 ||
                bullet.x < 0 || bullet.x > this.width ||
                bullet.y < 0 || bullet.y > this.height) {
                this.playerBullets.splice(i, 1);
                continue;
            }

            // Check enemy collisions
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < enemy.radius + 5) {
                    enemy.hp -= bullet.damage;
                    this.createParticles(bullet.x, bullet.y, '#fff', 3);

                    if (enemy.hp <= 0) {
                        this.killEnemy(j);
                    }

                    this.playerBullets.splice(i, 1);
                    break;
                }
            }
        }

        // Enemy bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;

            if (bullet.life <= 0 ||
                bullet.x < 0 || bullet.x > this.width ||
                bullet.y < 0 || bullet.y > this.height) {
                this.enemyBullets.splice(i, 1);
                continue;
            }

            // Check ship collision
            const dx = bullet.x - this.ship.x;
            const dy = bullet.y - this.ship.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.ship.radius) {
                this.takeDamage(bullet.damage);
                this.enemyBullets.splice(i, 1);
                continue;
            }
        }

        // Boss bullets
        for (let i = this.bossBullets.length - 1; i >= 0; i--) {
            const bullet = this.bossBullets[i];
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.life--;

            if (bullet.life <= 0 ||
                bullet.x < 0 || bullet.x > this.width ||
                bullet.y < 0 || bullet.y > this.height) {
                this.bossBullets.splice(i, 1);
                continue;
            }

            // Check ship collision
            const dx = bullet.x - this.ship.x;
            const dy = bullet.y - this.ship.y;
            if (Math.sqrt(dx * dx + dy * dy) < this.ship.radius) {
                this.takeDamage(bullet.damage);
                this.bossBullets.splice(i, 1);
                continue;
            }
        }
    }

    takeDamage(amount) {
        if (this.powerups.shield > 0) {
            this.powerups.shield--;
            return;
        }

        this.lives -= amount;
        this.createParticles(this.ship.x, this.ship.y, '#ff0000', 20);

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    killEnemy(index) {
        const enemy = this.enemies[index];
        this.score += enemy.score;
        this.enemiesKilled++;
        this.enemies.splice(index, 1);

        // Check for boss
        if (this.wave === 5 && this.enemiesToSpawn === 1) {
            this.spawnBoss();
        } else if (this.enemies.length === 0 && !this.boss) {
            this.nextWave();
        }
    }

    spawnBoss() {
        console.log('BOSS SPAWNED!');

        this.boss = {
            x: this.width / 2,
            y: 80,
            radius: 60,
            hp: 10000,
            maxHp: 10000,
            speed: 1.5,
            lastShot: 0,
            shootInterval: 2000,
            phase: 'phase1'
        };

        this.bossHealth = 10000;
        this.bossMaxHealth = 10000;
        this.bossPhase = 'phase1';

        document.getElementById('bossName').innerHTML =
            `<span>${this.bossPatterns.phase1.name}</span>`;
    }

    updateBossPhase() {
        if (!this.boss) return;

        const currentPhase = this.bossPatterns[this.bossPhase];
        const targetPhase = this.bossPatterns[Object.keys(this.bossPatterns).find(key =>
            this.bossPatterns[key].healthPercent <= (this.bossHealth / this.bossMaxHealth))
        ];

        if (targetPhase && targetPhase !== currentPhase) {
            this.bossPhase = targetPhase.name;
            document.getElementById('bossName').innerHTML =
                `<span>${targetPhase.name}</span>`;

            // Visual effect
            this.createParticles(this.boss.x, this.boss.y, '#fff', 50);
        }
    }

    updatePowerups() {
        const now = Date.now();

        for (const key in this.powerups) {
            if (this.powerups[key] > 0) {
                this.powerups[key]--;
            }
        }

        // Update UI
        const powerupContainer = document.getElementById('powerups');
        Object.keys(this.powerups).forEach(key => {
            const el = document.getElementById(`powerup-${key}`);
            if (el && this.powerups[key] > 0) {
                el.classList.add('active');
            } else if (el) {
                el.classList.remove('active');
            }
        });
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    spawnEnemies() {
        if (this.spawnTimer > 50) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        } else {
            this.spawnTimer++;
        }
    }

    checkWaveCompletion() {
        const now = Date.now();

        if (!this.waveActive) return;

        // Check if all enemies are dead
        if (this.enemies.length === 0 && this.enemiesToSpawn === 0 && !this.boss) {
            // Wave complete - start next wave after delay
            setTimeout(() => {
                this.wave++;
                this.startWave();
            }, 2000);
        }
    }

    nextWave() {
        this.waveActive = false;
        this.waveTimer = now;
        this.spawnTimer = 0;
        this.enemiesToSpawn = this.calculateWaveSize();
        console.log(`Wave ${this.wave} starting with ${this.enemiesToSpawn} enemies`);
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score.toLocaleString();
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('enemies').textContent = this.enemies.length + (this.boss ? 1 : 0);
        document.getElementById('highScore').textContent = this.highScore.toLocaleString();

        // Boss bar
        if (this.boss) {
            const hpPercent = Math.max(0, this.bossHealth / this.bossMaxHealth);
            document.getElementById('bossBar').style.width = `${hpPercent * 100}%`;
            document.querySelector('.game-container').classList.add('boss-active');
        }
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseScreen').classList.remove('hidden');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseScreen').classList.add('hidden');
        }
    }

    gameOver() {
        this.gameState = 'gameover';

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('galagaHighScore', this.highScore.toString());
        }

        // Show game over screen
        setTimeout(() => {
            document.getElementById('finalScore').textContent = this.score.toLocaleString();
            document.getElementById('enemiesKilled').textContent = this.enemiesKilled;
            document.getElementById('wavesSurvived').textContent = this.wave;
            document.getElementById('bestScore').textContent = this.highScore.toLocaleString();
            document.getElementById('gameOverScreen').classList.remove('hidden');
        }, 1000);
    }

    resetGame() {
        this.startGame();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0a0a16';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw stars
        this.stars.forEach(star => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw grid
        this.drawGrid();

        // Draw powerup zones
        this.drawPowerupZones();

        // Draw ship
        if (this.ship) {
            this.drawShip();
        }

        // Draw enemies
        this.enemies.forEach(enemy => {
            this.drawEnemy(enemy);
        });

        // Draw boss
        if (this.boss) {
            this.drawBoss();
        }

        // Draw bullets
        this.drawBullets();

        // Draw particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life / p.maxLife;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        });

        // Draw wave complete message
        if (!this.waveActive && this.enemies.length === 0 && !this.boss) {
            this.drawWaveComplete();
        }
    }

    drawGrid() {
        const gridSize = 64;
        const offsetX = (Date.now() / 50) % gridSize;

        this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.1)';
        this.ctx.lineWidth = 1;

        for (let x = -offsetX; x < this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y < this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    drawPowerupZones() {
        const zones = [
            { x: 50, y: 300, w: 100, h: 200, color: '#00ff88', label: 'SPREAD' },
            { x: 200, y: 300, w: 100, h: 200, color: '#ffff00', label: 'TRIPLE' },
            { x: 350, y: 300, w: 100, h: 200, color: '#00aaff', label: 'SHIELD' },
            { x: 500, y: 300, w: 100, h: 200, color: '#ff6600', label: 'BOOST' }
        ];

        zones.forEach(zone => {
            this.ctx.strokeStyle = zone.color;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);

            this.ctx.fillStyle = zone.color + '40';
            this.ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

            this.ctx.fillStyle = zone.color;
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(zone.label, zone.x + zone.w/2, zone.y - 10);
        });
    }

    drawShip() {
        const ship = this.ship;
        const now = Date.now();

        // Engine glow
        if (now % 10 < 5) {
            this.ctx.fillStyle = `rgba(0, 255, 136, ${Math.random() * 0.5 + 0.3})`;
            this.ctx.beginPath();
            this.ctx.ellipse(ship.x, ship.y + ship.radius + 10, 8, 15, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Shield effect
        if (this.powerups.shield > 0) {
            this.ctx.strokeStyle = `rgba(0, 170, 255, ${0.3 + Math.sin(now / 100) * 0.1})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(ship.x, ship.y, ship.radius + 10, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Ship body
        this.ctx.fillStyle = '#0096ff';
        this.ctx.beginPath();
        this.ctx.moveTo(ship.x, ship.y - ship.radius);
        this.ctx.lineTo(ship.x + ship.radius, ship.y + ship.radius);
        this.ctx.lineTo(ship.x, ship.y + ship.radius - 10);
        this.ctx.lineTo(ship.x - ship.radius, ship.y + ship.radius);
        this.ctx.closePath();
        this.ctx.fill();

        // Cockpit
        this.ctx.fillStyle = '#88ccff';
        this.ctx.beginPath();
        this.ctx.arc(ship.x, ship.y - 5, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Wings
        this.ctx.fillStyle = '#0077cc';
        this.ctx.beginPath();
        this.ctx.moveTo(ship.x - ship.radius + 5, ship.y + ship.radius - 5);
        this.ctx.lineTo(ship.x - ship.radius - 10, ship.y + ship.radius + 10);
        this.ctx.lineTo(ship.x - ship.radius + 5, ship.y + ship.radius - 5);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(ship.x + ship.radius - 5, ship.y + ship.radius - 5);
        this.ctx.lineTo(ship.x + ship.radius + 10, ship.y + ship.radius + 10);
        this.ctx.lineTo(ship.x + ship.radius - 5, ship.y + ship.radius - 5);
        this.ctx.fill();
    }

    drawEnemy(enemy) {
        const now = Date.now();
        const pulse = Math.sin(now / 200) * 2;

        // Glow
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = enemy.color;

        // Body
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        this.ctx.arc(enemy.x, enemy.y, enemy.radius - pulse/2, 0, Math.PI * 2);
        this.ctx.fill();

        // Details based on type
        switch(enemy.type) {
            case 'fighter':
                // Wings
                this.ctx.fillStyle = '#ff6666';
                this.ctx.beginPath();
                this.ctx.moveTo(enemy.x - 8, enemy.y + enemy.radius);
                this.ctx.lineTo(enemy.x - 15, enemy.y + enemy.radius + 8);
                this.ctx.lineTo(enemy.x - 8, enemy.y + enemy.radius + 3);
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.moveTo(enemy.x + 8, enemy.y + enemy.radius);
                this.ctx.lineTo(enemy.x + 15, enemy.y + enemy.radius + 8);
                this.ctx.lineTo(enemy.x + 8, enemy.y + enemy.radius + 3);
                this.ctx.fill();
                break;

            case 'tank':
                // Armor plates
                this.ctx.fillStyle = '#222';
                this.ctx.fillRect(enemy.x - enemy.radius + 5, enemy.y - enemy.radius + 5, 10, 10);
                this.ctx.fillRect(enemy.x - enemy.radius + 15, enemy.y - enemy.radius + 5, 10, 10);
                break;

            case 'speeder':
                // Speed lines
                if (now % 10 < 5) {
                    this.ctx.strokeStyle = '#ffff44';
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(enemy.x - 10, enemy.y);
                    this.ctx.lineTo(enemy.x - 20, enemy.y + 5);
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(enemy.x + 10, enemy.y);
                    this.ctx.lineTo(enemy.x + 20, enemy.y - 5);
                    this.ctx.stroke();
                }
                break;
        }

        // HP bar for tank
        if (enemy.type === 'tank') {
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(enemy.x - 15, enemy.y - enemy.radius - 10, 30, 4);
            this.ctx.fillStyle = '#0f0';
            this.ctx.fillRect(enemy.x - 15, enemy.y - enemy.radius - 10, 30 * (enemy.hp / enemy.maxHp), 4);
        }

        this.ctx.shadowBlur = 0;
    }

    drawBoss() {
        const boss = this.boss;
        const now = Date.now();

        // Boss glow
        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = '#ff6600';

        // Main body
        this.ctx.fillStyle = '#ff4400';
        this.ctx.beginPath();
        this.ctx.arc(boss.x, boss.y, boss.radius - 5, 0, Math.PI * 2);
        this.ctx.fill();

        // Core
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(boss.x, boss.y, boss.radius * 0.4, 0, Math.PI * 2);
        this.ctx.fill();

        // Pulsing effect
        const pulse = Math.sin(now / 100) * 5;
        this.ctx.strokeStyle = `rgba(255, 100, 0, ${0.5 + Math.sin(now / 200) * 0.3})`;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(boss.x, boss.y, boss.radius - 10 + pulse, 0, Math.PI * 2);
        this.ctx.stroke();

        // Wings
        this.ctx.fillStyle = '#ff6600';
        this.ctx.beginPath();
        this.ctx.moveTo(boss.x - boss.radius + 5, boss.y);
        this.ctx.lineTo(boss.x - boss.radius - 20, boss.y - 20);
        this.ctx.lineTo(boss.x - boss.radius + 5, boss.y - 10);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(boss.x + boss.radius - 5, boss.y);
        this.ctx.lineTo(boss.x + boss.radius + 20, boss.y - 20);
        this.ctx.lineTo(boss.x + boss.radius - 5, boss.y - 10);
        this.ctx.fill();

        // Eyes
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(boss.x - 15, boss.y - 5, 6, 0, Math.PI * 2);
        this.ctx.arc(boss.x + 15, boss.y - 5, 6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(boss.x - 13, boss.y - 5, 3, 0, Math.PI * 2);
        this.ctx.arc(boss.x + 17, boss.y - 5, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Health rings
        const hpPercent = boss.hp / boss.maxHp;
        const ringRadius = boss.radius + 20;
        const maxRings = 4;

        for (let i = maxRings - 1; i >= 0; i--) {
            const radius = ringRadius - i * 8;
            const opacity = (i + 1) / maxRings * hpPercent;

            this.ctx.strokeStyle = `rgba(255, 100, 0, ${opacity})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(boss.x, boss.y, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        this.ctx.shadowBlur = 0;
    }

    drawBullets() {
        // Player bullets
        this.playerBullets.forEach(bullet => {
            this.ctx.fillStyle = '#00ff88';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#00ff88';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

        // Enemy bullets
        this.enemyBullets.forEach(bullet => {
            this.ctx.fillStyle = '#ff4444';
            this.ctx.shadowBlur = 3;
            this.ctx.shadowColor = '#ff4444';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

        // Boss bullets
        this.bossBullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color || '#ff6600';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = bullet.color || '#ff6600';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    drawWaveComplete() {
        const now = Date.now();
        const alpha = Math.min(1, (now - Date.now()) / 500);

        this.ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = '#00ff88';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('WAVE COMPLETE!', this.width/2, this.height/2 - 20);

        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Enemies destroyed: ${this.enemiesKilled}`, this.width/2, this.height/2 + 30);
    }
}

// Initialize game
let game;

function initGame() {
    game = new GalagaClone('gameCanvas');

    // Game loop
    function loop() {
        if (game.gameState === 'playing') {
            game.update();
        }
        game.draw();
        requestAnimationFrame(loop);
    }

    loop();
}

function startGame() {
    game.startGame();
}

function resetGame() {
    game.resetGame();
}

function togglePause() {
    game.togglePause();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
