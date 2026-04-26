(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W, H;
  function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  addEventListener('resize', resize); resize();

  const uiScore = document.getElementById('score');
  const uiLives = document.getElementById('lives');
  const restartBtn = document.getElementById('restart');

  const state = {
    score: 0, lives: 3, running: true
  };

  // Player
  const player = { w:40, h:20, x: W/2, y: H-60, speed: 6 };
  const keys = {};
  addEventListener('keydown', e=>keys[e.code]=true);
  addEventListener('keyup', e=>keys[e.code]=false);

  // Bullets
  const bullets = [];
  const enemies = [];
  const enemyBullets = [];

  function spawnEnemies(){
    enemies.length = 0;
    const rows = 4, cols = 8;
    const pad = 20; const ew=36, eh=20;
    const startX = (W - (cols*(ew+pad)-pad))/2;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        enemies.push({ x:startX + c*(ew+pad), y:60 + r*(eh+12), w:ew, h:eh, alive:true });
      }
    }
  }
  spawnEnemies();

  let enemyDir = 1; let enemySpeed = 0.3; let moveTimer = 0;

  function fireBullet(){
    bullets.push({ x: player.x, y: player.y - 12, vy:-8 });
  }

  let lastShot = 0;

  function loop(ts){
    if(!state.running) return;
    // input
    if(keys['ArrowLeft']||keys['KeyA']) player.x -= player.speed;
    if(keys['ArrowRight']||keys['KeyD']) player.x += player.speed;
    if(keys['Space']||keys['KeyW']||keys['ArrowUp']){
      if(ts - lastShot > 300){ fireBullet(); lastShot = ts; }
    }
    player.x = Math.max(player.w/2, Math.min(W - player.w/2, player.x));

    // enemies movement
    moveTimer += enemySpeed;
    if(moveTimer > 1){
      let leftMost = Math.min(...enemies.filter(e=>e.alive).map(e=>e.x));
      let rightMost = Math.max(...enemies.filter(e=>e.alive).map(e=>e.x+e.w));
      if(rightMost >= W-10 && enemyDir>0){ enemyDir = -1; enemies.forEach(e=>e.y+=12); }
      if(leftMost <= 10 && enemyDir<0){ enemyDir = 1; enemies.forEach(e=>e.y+=12); }
      enemies.forEach(e=>{ if(e.alive) e.x += enemyDir*6; });
      moveTimer = 0;
    }

    // enemy shooting
    if(Math.random() < 0.02){
      const cols = {};
      enemies.filter(e=>e.alive).forEach(e=>{ const col = Math.round(e.x/50); cols[col]=cols[col]||[]; cols[col].push(e); });
      const available = Object.values(cols).map(a=>a[a.length-1]).filter(Boolean);
      if(available.length){ const shooter = available[Math.floor(Math.random()*available.length)]; enemyBullets.push({x: shooter.x+shooter.w/2, y: shooter.y+shooter.h, vy:4}); }
    }

    // update bullets
    bullets.forEach(b=> b.y += b.vy);
    enemyBullets.forEach(b=> b.y += b.vy);
    // collisions bullet->enemy
    bullets.forEach(b=>{
      enemies.forEach(e=>{
        if(e.alive && b.x > e.x && b.x < e.x+e.w && b.y > e.y && b.y < e.y+e.h){ e.alive = false; b.dead = true; state.score += 100; }
      });
    });
    // enemy bullet -> player
    enemyBullets.forEach(b=>{
      if(b.x > player.x - player.w/2 && b.x < player.x + player.w/2 && b.y > player.y - player.h/2 && b.y < player.y + player.h/2){ b.dead = true; state.lives -= 1; }
    });

    // remove offscreen or dead
    for(let i=bullets.length-1;i>=0;i--) if(bullets[i].y < -10 || bullets[i].dead) bullets.splice(i,1);
    for(let i=enemyBullets.length-1;i>=0;i--) if(enemyBullets[i].y > H+10 || enemyBullets[i].dead) enemyBullets.splice(i,1);

    // check enemies reaching bottom
    if(enemies.some(e=> e.alive && e.y + e.h >= player.y - 20)) state.lives = 0;

    // check win/loss
    if(state.lives <= 0){ state.running=false; restartBtn.style.display='block'; }
    if(enemies.every(e=>!e.alive)){ // next level
      spawnEnemies(); enemySpeed += 0.1; state.score += 500; }

    // draw
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    // player
    ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.moveTo(player.x, player.y - player.h/2); ctx.lineTo(player.x - player.w/2, player.y + player.h/2); ctx.lineTo(player.x + player.w/2, player.y + player.h/2); ctx.closePath(); ctx.fill();
    // bullets
    ctx.fillStyle = '#ff0'; bullets.forEach(b=>{ ctx.fillRect(b.x-2,b.y-8,4,8); });
    // enemies
    ctx.fillStyle = '#f66'; enemies.forEach(e=>{ if(e.alive) ctx.fillRect(e.x,e.y,e.w,e.h); });
    // enemy bullets
    ctx.fillStyle = '#6cf'; enemyBullets.forEach(b=> ctx.fillRect(b.x-3,b.y,6,12));

    uiScore.textContent = 'Score: ' + state.score;
    uiLives.textContent = 'Lives: ' + state.lives;

    requestAnimationFrame(loop);
  }

  restartBtn.addEventListener('click', ()=>{ state.score=0; state.lives=3; state.running=true; restartBtn.style.display='none'; spawnEnemies(); enemySpeed=0.3; requestAnimationFrame(loop); });

  requestAnimationFrame(loop);
})();
