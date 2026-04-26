const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const startButton = document.getElementById('startButton');

let score = 0;
let lives = 3;
let gameOver = false;
let gameStarted = false;

// Player
const player = {
    x: canvas.width / 2 - 20,
    y: canvas.height - 40,
    width: 40,
    height: 30,
    speed: 5,
    bullets: []
};

// Bullets
const playerBullets = [];
const enemyBullets = [];

// Enemies
const enemies = [];
const enemyRows = 5;
const enemyCols = 10;
const enemyWidth = 40;
const enemyHeight = 30;
const enemyPadding = 10;
const enemyOffsetTop = 50;
const enemyOffsetLeft = 50;
const enemySpeed = 1;
let enemyDirection = 1; // 1 for right, -1 for left
let enemyMoveDown = false;
let enemyMoveCounter = 0;

// Input
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

// Initialize enemies
function initEnemies() {
    for (let row = 0; row < enemyRows; row++) {
        for (let col = 0; col < enemyCols; col++) {
            enemies.push({
                x: enemyOffsetLeft + col * (enemyWidth + enemyPadding),
                y: enemyOffsetTop + row * (enemyHeight + enemyPadding),
                width: enemyWidth,
                height: enemyHeight,
                speed: enemySpeed,
                isAlive: true,
                shootTimer: 0
            });
        }
    }
}

// Draw player
function drawPlayer() {
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Draw bullets
function drawBullets() {
    ctx.fillStyle = '#ffff00';
    playerBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    ctx.fillStyle = '#ff0000';
    enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.isAlive) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });
}

// Update player position
function updatePlayer() {
    if (keys.ArrowLeft && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys.ArrowRight && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    
    if (keys.Space && playerBullets.length < 3) {
        playerBullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 10,
            speed: 7
        });
        keys.Space = false; // Prevent multiple shots on hold
    }
}

// Update bullets
function updateBullets() {
    // Player bullets
    playerBullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        
        // Remove if off screen
        if (bullet.y < 0) {
            playerBullets.splice(index, 1);
        }
    });
    
    // Enemy bullets
    enemyBullets.forEach((bullet, index) => {
        bullet.y += bullet.speed;
        
        // Remove if off screen
        if (bullet.y > canvas.height) {
            enemyBullets.splice(index, 1);
        }
    });
}

// Update enemies
function updateEnemies() {
    let moveDown = false;
    let hitEdge = false;
    
    enemies.forEach(enemy => {
        if (!enemy.isAlive) return;
        
        // Check for edge collision
        if (enemy.x <= 0 || enemy.x + enemyWidth >= canvas.width) {
            hitEdge = true;
        }
    });
    
    if (hitEdge) {
        enemyDirection *= -1;
        moveDown = true;
    }
    
    enemies.forEach(enemy => {
        if (!enemy.isAlive) return;
        
        enemy.x += enemy.speed * enemyDirection;
        
        if (moveDown) {
            enemy.y += 20;
        }
        
        // Enemy shooting
        enemy.shootTimer++;
        if (enemy.shootTimer > 100 && Math.random() < 0.01) {
            enemyBullets.push({
                x: enemy.x + enemy.width / 2 - 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 10,
                speed: 3
            });
            enemy.shootTimer = 0;
        }
    });
}

// Collision detection
function checkCollisions() {
    // Player bullets vs enemies
    playerBullets.forEach((pBullet, pIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (!enemy.isAlive) return;
            
            if (pBullet.x < enemy.x + enemy.width &&
                pBullet.x + pBullet.width > enemy.x &&
                pBullet.y < enemy.y + enemy.height &&
                pBullet.y + pBullet.height > enemy.y) {
                
                // Collision
                enemy.isAlive = false;
                playerBullets.splice(pIndex, 1);
                score += 10;
                scoreElement.textContent = score;
            }
        });
    });
    
    // Enemy bullets vs player
    enemyBullets.forEach((eBullet, eIndex) => {
        if (eBullet.x < player.x + player.width &&
            eBullet.x + eBullet.width > player.x &&
            eBullet.y < player.y + player.height &&
            eBullet.y + eBullet.height > player.y) {
            
            // Collision
            enemyBullets.splice(eIndex, 1);
            lives--;
            livesElement.textContent = lives;
            
            if (lives <= 0) {
                gameOver = true;
            }
        }
    });
    
    // Enemies vs player (if they reach bottom)
    enemies.forEach(enemy => {
        if (!enemy.isAlive) return;
        
        if (enemy.y + enemy.height > player.y) {
            gameOver = true;
        }
    });
}

// Game over
function showGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.font = '24px Arial';
    ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText('Click Start to Play Again', canvas.width / 2, canvas.height / 2 + 60);
}

// Game loop
function gameLoop() {
    if (gameOver) {
        showGameOver();
        return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update
    updatePlayer();
    updateBullets();
    updateEnemies();
    checkCollisions();
    
    // Draw
    drawPlayer();
    drawBullets();
    drawEnemies();
    
    requestAnimationFrame(gameLoop);
}

// Event listeners
window.addEventListener('keydown', (e) => {
    if (keys[e.key] !== undefined) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys[e.key] !== undefined) {
        keys[e.key] = false;
    }
});

startButton.addEventListener('click', () => {
    if (gameOver) {
        // Reset game
        score = 0;
        lives = 3;
        gameOver = false;
        playerBullets.length = 0;
        enemyBullets.length = 0;
        enemies.length = 0;
        player.x = canvas.width / 2 - 20;
        player.y = canvas.height - 40;
        scoreElement.textContent = score;
        livesElement.textContent = lives;
        initEnemies();
    }
    
    gameStarted = true;
    startButton.disabled = true;
    gameLoop();
});

// Initialize
initEnemies();