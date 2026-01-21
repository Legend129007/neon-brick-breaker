// === NEON BRICK BREAKER ===
// Cyberpunk-themed brick breaker game with physics, particles, and power-ups

(() => {
    // === DIFFICULTY SETTINGS ===
    const DIFFICULTY_SETTINGS = {
        easy: {
            name: 'EASY',
            ballSpeed: 5,
            maxBallSpeed: 9,
            speedIncrement: 0.1,
            lives: 5,
            paddleWidth: 140,
            brickRows: 4,
            powerupChance: 0.2
        },
        medium: {
            name: 'MEDIUM',
            ballSpeed: 6,
            maxBallSpeed: 11,
            speedIncrement: 0.15,
            lives: 3,
            paddleWidth: 120,
            brickRows: 5,
            powerupChance: 0.15
        },
        hard: {
            name: 'HARD',
            ballSpeed: 7.5,
            maxBallSpeed: 14,
            speedIncrement: 0.2,
            lives: 2,
            paddleWidth: 100,
            brickRows: 6,
            powerupChance: 0.1
        }
    };

    // === CONFIGURATION ===
    const CONFIG = {
        CANVAS_WIDTH: 800,
        CANVAS_HEIGHT: 600,
        ASPECT_RATIO: 800 / 600,

        // Ball settings (defaults, overridden by difficulty)
        INITIAL_BALL_SPEED: 6,
        MAX_BALL_SPEED: 12,
        SPEED_INCREMENT: 0.15,
        MIN_VERTICAL_VELOCITY: 2,

        // Paddle settings
        PADDLE_WIDTH: 120,
        PADDLE_HEIGHT: 16,
        PADDLE_MARGIN: 40,
        EXPANDED_PADDLE_WIDTH: 180,

        // Brick settings
        BRICK_ROWS: 5,
        BRICK_COLS: 10,
        BRICK_WIDTH: 70,
        BRICK_HEIGHT: 25,
        BRICK_PADDING: 8,
        BRICK_TOP_OFFSET: 60,
        BRICK_LEFT_OFFSET: 25,

        // Effects
        SCREEN_SHAKE_INTENSITY: 8,
        SCREEN_SHAKE_DURATION: 100,
        PARTICLE_COUNT: 15,
        SLOW_MOTION_DURATION: 1000,

        // Power-ups
        POWERUP_CHANCE: 0.15,
        POWERUP_SPEED: 3,
        POWERUP_DURATION: 10000,

        // Colors
        COLORS: {
            NEON_PINK: '#ff00ff',
            NEON_CYAN: '#00ffff',
            NEON_YELLOW: '#ffff00',
            NEON_GREEN: '#00ff88',
            NEON_ORANGE: '#ff6600',
            NEON_PURPLE: '#9900ff',
            DARK_BG: '#0a0a1a'
        },

        BRICK_COLORS: [
            { fill: '#ff00ff', glow: '#ff00ff', hits: 1 },  // Pink - 1 hit
            { fill: '#00ffff', glow: '#00ffff', hits: 1 },  // Cyan - 1 hit
            { fill: '#ff6600', glow: '#ff6600', hits: 2 },  // Orange - 2 hits
            { fill: '#9900ff', glow: '#9900ff', hits: 2 },  // Purple - 2 hits
            { fill: '#ffff00', glow: '#ffff00', hits: 3 },  // Yellow - 3 hits
        ]
    };

    // === GAME STATE ===
    const GameState = {
        score: 0,
        lives: 3,
        level: 1,
        difficulty: 'easy',
        isPlaying: false,
        isPaused: false,
        slowMotion: false,
        slowMotionTimer: 0
    };

    // === DOM ELEMENTS ===
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startOverlay = document.getElementById('start-overlay');
    const gameoverOverlay = document.getElementById('gameover-overlay');
    const levelOverlay = document.getElementById('level-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');
    const highscoresOverlay = document.getElementById('highscores-overlay');
    const pauseBtn = document.getElementById('pause-btn');
    const hud = document.getElementById('hud');
    const resumeBtn = document.getElementById('resume-btn');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const homeBtn = document.getElementById('home-btn');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const endGameBtn = document.getElementById('end-game-btn');
    const pauseHighscoreBtn = document.getElementById('pause-highscore-btn');
    const viewHighscoresBtn = document.getElementById('view-highscores-btn');
    const backFromHighscoresBtn = document.getElementById('back-from-highscores-btn');
    const scoreDisplay = document.getElementById('score');
    const livesDisplay = document.getElementById('lives');
    const levelDisplay = document.getElementById('level');
    const difficultyDisplay = document.getElementById('difficulty-display');
    const gameoverTitle = document.getElementById('gameover-title');
    const finalScore = document.getElementById('final-score');
    const levelScore = document.getElementById('level-score');
    const newHighscoreEl = document.getElementById('new-highscore');
    const gameoverHighscoreList = document.getElementById('gameover-highscore-list');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Track where to return after viewing highscores
    let returnFromHighscores = 'start';

    // === GAME OBJECTS ===
    let paddle = null;
    let balls = [];
    let bricks = [];
    let particles = [];
    let powerUps = [];
    let screenShake = { x: 0, y: 0, timer: 0 };

    // === INITIALIZATION ===
    function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Mouse/Touch controls
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchstart', handleTouchMove, { passive: false });

        // Button listeners
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', restartGame);
        homeBtn.addEventListener('click', goHome);
        nextLevelBtn.addEventListener('click', nextLevel);
        pauseBtn.addEventListener('click', togglePause);
        resumeBtn.addEventListener('click', resumeGame);
        endGameBtn.addEventListener('click', endGame);
        pauseHighscoreBtn.addEventListener('click', () => showHighscores('pause'));
        viewHighscoresBtn.addEventListener('click', () => showHighscores('start'));
        backFromHighscoresBtn.addEventListener('click', hideHighscores);

        // Difficulty button listeners
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                difficultyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                GameState.difficulty = btn.dataset.difficulty;
            });
        });

        // Tab button listeners
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Show corresponding content
                document.querySelectorAll('.highscore-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`highscore-tab-${btn.dataset.tab}`).classList.add('active');
            });
        });

        // Keyboard listener for pause (Escape or P)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && GameState.isPlaying) {
                togglePause();
            }
        });

        // Initial render
        drawBackground();

        // Load highscores on start
        updateAllHighscoreLists();
    }

    function resizeCanvas() {
        const container = document.getElementById('game-container');
        const maxWidth = window.innerWidth - 40;
        const maxHeight = window.innerHeight - 120;

        let width = CONFIG.CANVAS_WIDTH;
        let height = CONFIG.CANVAS_HEIGHT;

        if (width > maxWidth) {
            width = maxWidth;
            height = width / CONFIG.ASPECT_RATIO;
        }

        if (height > maxHeight) {
            height = maxHeight;
            width = height * CONFIG.ASPECT_RATIO;
        }

        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
    }

    // === GAME CONTROLS ===
    function handleMouseMove(e) {
        if (!GameState.isPlaying) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        updatePaddlePosition(mouseX);
    }

    function handleTouchMove(e) {
        if (!GameState.isPlaying) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
        const touchX = (e.touches[0].clientX - rect.left) * scaleX;
        updatePaddlePosition(touchX);
    }

    function updatePaddlePosition(x) {
        const halfWidth = paddle.width / 2;
        paddle.x = Math.max(halfWidth, Math.min(CONFIG.CANVAS_WIDTH - halfWidth, x));
    }

    // === HIGHSCORE VIEW ===
    function showHighscores(from) {
        returnFromHighscores = from;
        updateAllHighscoreLists();

        if (from === 'pause') {
            pauseOverlay.classList.add('hidden');
        }

        highscoresOverlay.classList.remove('hidden');
    }

    function hideHighscores() {
        highscoresOverlay.classList.add('hidden');

        if (returnFromHighscores === 'pause') {
            pauseOverlay.classList.remove('hidden');
        } else {
            startOverlay.classList.remove('hidden');
        }
    }

    function updateAllHighscoreLists() {
        ['easy', 'medium', 'hard'].forEach(diff => {
            const list = document.getElementById(`${diff}-highscore-list`);
            if (list) {
                updateHighscoreDisplay(list, diff);
            }
        });
    }

    // === GAME STATE MANAGEMENT ===
    function startGame() {
        const diffSettings = DIFFICULTY_SETTINGS[GameState.difficulty];
        applyDifficultySettings(diffSettings);

        resetGame();
        startOverlay.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        hud.classList.remove('hidden');
        difficultyDisplay.textContent = diffSettings.name;
        GameState.isPlaying = true;
        GameState.isPaused = false;
        gameLoop();
    }

    function applyDifficultySettings(settings) {
        CONFIG.INITIAL_BALL_SPEED = settings.ballSpeed;
        CONFIG.MAX_BALL_SPEED = settings.maxBallSpeed;
        CONFIG.SPEED_INCREMENT = settings.speedIncrement;
        CONFIG.PADDLE_WIDTH = settings.paddleWidth;
        CONFIG.BRICK_ROWS = settings.brickRows;
        CONFIG.POWERUP_CHANCE = settings.powerupChance;
        GameState.lives = settings.lives;
    }

    function togglePause() {
        if (!GameState.isPlaying) return;

        GameState.isPaused = !GameState.isPaused;

        if (GameState.isPaused) {
            pauseOverlay.classList.remove('hidden');
            pauseBtn.textContent = '▶';
        } else {
            pauseOverlay.classList.add('hidden');
            pauseBtn.textContent = '❚❚';
            lastTime = performance.now();
            gameLoop();
        }
    }

    function resumeGame() {
        if (GameState.isPaused) {
            GameState.isPaused = false;
            pauseOverlay.classList.add('hidden');
            pauseBtn.textContent = '❚❚';
            lastTime = performance.now();
            gameLoop();
        }
    }

    function endGame() {
        GameState.isPlaying = false;
        GameState.isPaused = false;
        pauseOverlay.classList.add('hidden');
        pauseBtn.classList.add('hidden');
        hud.classList.add('hidden');

        // Save score if any
        if (GameState.score > 0) {
            saveHighscore(GameState.score, GameState.level, GameState.difficulty);
        }

        goHome();
    }

    function goHome() {
        gameoverOverlay.classList.add('hidden');
        newHighscoreEl.classList.add('hidden');
        pauseBtn.classList.add('hidden');
        hud.classList.add('hidden');
        startOverlay.classList.remove('hidden');
        updateAllHighscoreLists();
    }

    function restartGame() {
        gameoverOverlay.classList.add('hidden');
        newHighscoreEl.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        hud.classList.remove('hidden');

        const diffSettings = DIFFICULTY_SETTINGS[GameState.difficulty];
        applyDifficultySettings(diffSettings);

        GameState.level = 1;
        resetGame();
        GameState.isPlaying = true;
        GameState.isPaused = false;
        gameLoop();
    }

    function nextLevel() {
        levelOverlay.classList.add('hidden');
        pauseBtn.classList.remove('hidden');
        GameState.level++;
        resetLevel();
        GameState.isPlaying = true;
        GameState.isPaused = false;
        gameLoop();
    }

    function resetGame() {
        GameState.score = 0;
        GameState.level = 1;
        GameState.slowMotion = false;
        resetLevel();
        updateHUD();
    }

    function resetLevel() {
        const diffSettings = DIFFICULTY_SETTINGS[GameState.difficulty];

        // Create paddle
        paddle = {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: CONFIG.CANVAS_HEIGHT - CONFIG.PADDLE_MARGIN,
            width: CONFIG.PADDLE_WIDTH,
            height: CONFIG.PADDLE_HEIGHT,
            expanded: false,
            expandTimer: 0
        };

        // Create initial ball
        balls = [createBall()];

        // Create bricks
        createBricks();

        // Clear effects
        particles = [];
        powerUps = [];
        screenShake = { x: 0, y: 0, timer: 0 };

        updateHUD();
    }

    function createBall() {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        const speed = CONFIG.INITIAL_BALL_SPEED + (GameState.level - 1) * 0.5;
        return {
            x: CONFIG.CANVAS_WIDTH / 2,
            y: CONFIG.CANVAS_HEIGHT - CONFIG.PADDLE_MARGIN - 30,
            radius: 10,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            speed: speed
        };
    }

    function createBricks() {
        bricks = [];
        const rows = CONFIG.BRICK_ROWS + Math.floor(GameState.level / 2);
        const cols = CONFIG.BRICK_COLS;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const colorIndex = Math.min(row, CONFIG.BRICK_COLORS.length - 1);
                const brickType = CONFIG.BRICK_COLORS[colorIndex];

                bricks.push({
                    x: CONFIG.BRICK_LEFT_OFFSET + col * (CONFIG.BRICK_WIDTH + CONFIG.BRICK_PADDING),
                    y: CONFIG.BRICK_TOP_OFFSET + row * (CONFIG.BRICK_HEIGHT + CONFIG.BRICK_PADDING),
                    width: CONFIG.BRICK_WIDTH,
                    height: CONFIG.BRICK_HEIGHT,
                    hits: brickType.hits,
                    maxHits: brickType.hits,
                    color: brickType.fill,
                    glow: brickType.glow,
                    alive: true
                });
            }
        }
    }

    // === GAME LOOP ===
    let lastTime = 0;

    function gameLoop(currentTime = 0) {
        if (!GameState.isPlaying || GameState.isPaused) return;

        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // Time scale for slow motion
        const timeScale = GameState.slowMotion ? 0.3 : 1;

        update(deltaTime * timeScale);
        render();

        requestAnimationFrame(gameLoop);
    }

    function update(deltaTime) {
        // Update slow motion timer
        if (GameState.slowMotion) {
            GameState.slowMotionTimer -= deltaTime / 0.3; // Adjust for time scale
            if (GameState.slowMotionTimer <= 0) {
                GameState.slowMotion = false;
            }
        }

        // Update paddle power-up timer
        if (paddle.expanded) {
            paddle.expandTimer -= deltaTime;
            if (paddle.expandTimer <= 0) {
                paddle.expanded = false;
                paddle.width = CONFIG.PADDLE_WIDTH;
            }
        }

        // Update balls
        updateBalls();

        // Update particles
        updateParticles(deltaTime);

        // Update power-ups
        updatePowerUps();

        // Update screen shake
        updateScreenShake(deltaTime);

        // Check win condition
        if (bricks.filter(b => b.alive).length === 0) {
            winLevel();
        }
    }

    function updateBalls() {
        for (let i = balls.length - 1; i >= 0; i--) {
            const ball = balls[i];

            // Move ball
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Wall collisions
            if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= CONFIG.CANVAS_WIDTH) {
                ball.dx = -ball.dx;
                ball.x = Math.max(ball.radius, Math.min(CONFIG.CANVAS_WIDTH - ball.radius, ball.x));
            }

            if (ball.y - ball.radius <= 0) {
                ball.dy = -ball.dy;
                ball.y = ball.radius;
            }

            // Paddle collision
            if (checkPaddleCollision(ball)) {
                handlePaddleCollision(ball);
            }

            // Brick collisions
            checkBrickCollisions(ball);

            // Bottom - lose ball
            if (ball.y + ball.radius >= CONFIG.CANVAS_HEIGHT) {
                balls.splice(i, 1);

                if (balls.length === 0) {
                    loseLife();
                }
            }

            // Prevent infinite horizontal bouncing
            if (Math.abs(ball.dy) < CONFIG.MIN_VERTICAL_VELOCITY) {
                ball.dy = ball.dy < 0 ? -CONFIG.MIN_VERTICAL_VELOCITY : CONFIG.MIN_VERTICAL_VELOCITY;
            }
        }
    }

    function checkPaddleCollision(ball) {
        return ball.y + ball.radius >= paddle.y &&
            ball.y - ball.radius <= paddle.y + paddle.height &&
            ball.x >= paddle.x - paddle.width / 2 &&
            ball.x <= paddle.x + paddle.width / 2 &&
            ball.dy > 0;
    }

    function handlePaddleCollision(ball) {
        // Calculate hit position relative to paddle center (-1 to 1)
        const hitPos = (ball.x - paddle.x) / (paddle.width / 2);

        // Calculate new angle based on hit position
        // Center = straight up, edges = sharp angle
        const maxAngle = Math.PI / 3; // 60 degrees max
        const angle = hitPos * maxAngle - Math.PI / 2;

        // Increase speed slightly
        ball.speed = Math.min(ball.speed + CONFIG.SPEED_INCREMENT, CONFIG.MAX_BALL_SPEED);

        // Apply new velocity
        ball.dx = Math.cos(angle) * ball.speed;
        ball.dy = Math.sin(angle) * ball.speed;

        // Ensure ball moves upward
        if (ball.dy > 0) ball.dy = -ball.dy;

        // Move ball above paddle
        ball.y = paddle.y - ball.radius - 1;
    }

    function checkBrickCollisions(ball) {
        for (const brick of bricks) {
            if (!brick.alive) continue;

            if (ball.x + ball.radius > brick.x &&
                ball.x - ball.radius < brick.x + brick.width &&
                ball.y + ball.radius > brick.y &&
                ball.y - ball.radius < brick.y + brick.height) {

                // Determine collision side
                const overlapLeft = ball.x + ball.radius - brick.x;
                const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
                const overlapTop = ball.y + ball.radius - brick.y;
                const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);

                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);

                if (minOverlapX < minOverlapY) {
                    ball.dx = -ball.dx;
                } else {
                    ball.dy = -ball.dy;
                }

                // Damage brick
                brick.hits--;
                triggerScreenShake();

                if (brick.hits <= 0) {
                    brick.alive = false;
                    GameState.score += 10 * GameState.level;
                    updateHUD();

                    // Spawn particles
                    spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);

                    // Check for power-up spawn
                    if (Math.random() < CONFIG.POWERUP_CHANCE) {
                        spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
                    }

                    // Check if last brick - trigger slow motion
                    if (bricks.filter(b => b.alive).length === 0) {
                        GameState.slowMotion = true;
                        GameState.slowMotionTimer = CONFIG.SLOW_MOTION_DURATION;
                    }
                }

                break; // Only handle one collision per frame
            }
        }
    }

    function loseLife() {
        GameState.lives--;
        updateHUD();

        if (GameState.lives <= 0) {
            gameOver(false);
        } else {
            // Reset ball
            balls = [createBall()];
        }
    }

    function winLevel() {
        GameState.isPlaying = false;
        pauseBtn.classList.add('hidden');
        levelScore.textContent = `Score: ${GameState.score}`;
        levelOverlay.classList.remove('hidden');
    }

    function gameOver(won) {
        GameState.isPlaying = false;
        pauseBtn.classList.add('hidden');
        hud.classList.add('hidden');
        gameoverTitle.textContent = won ? 'YOU WIN!' : 'GAME OVER';
        gameoverTitle.style.textShadow = won
            ? '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 40px #00ff88, 0 0 80px #00ff88'
            : '0 0 10px #ff00ff, 0 0 20px #ff00ff, 0 0 40px #ff00ff, 0 0 80px #ff00ff';
        finalScore.textContent = `Final Score: ${GameState.score}`;

        // Save and display highscores
        const isNewHighscore = saveHighscore(GameState.score, GameState.level, GameState.difficulty);
        if (isNewHighscore) {
            newHighscoreEl.classList.remove('hidden');
        } else {
            newHighscoreEl.classList.add('hidden');
        }
        updateHighscoreDisplay(gameoverHighscoreList, GameState.difficulty);

        gameoverOverlay.classList.remove('hidden');
    }

    function updateHUD() {
        scoreDisplay.textContent = GameState.score;
        livesDisplay.textContent = GameState.lives;
        levelDisplay.textContent = GameState.level;
    }

    // === EFFECTS ===
    function triggerScreenShake() {
        screenShake.timer = CONFIG.SCREEN_SHAKE_DURATION;
    }

    function updateScreenShake(deltaTime) {
        if (screenShake.timer > 0) {
            screenShake.timer -= deltaTime;
            const intensity = (screenShake.timer / CONFIG.SCREEN_SHAKE_DURATION) * CONFIG.SCREEN_SHAKE_INTENSITY;
            screenShake.x = (Math.random() - 0.5) * intensity * 2;
            screenShake.y = (Math.random() - 0.5) * intensity * 2;
        } else {
            screenShake.x = 0;
            screenShake.y = 0;
        }
    }

    function spawnParticles(x, y, color) {
        for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 4,
                color: color,
                life: 1,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    }

    function updateParticles(deltaTime) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.dy += 0.1; // Gravity
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    // === POWER-UPS ===
    function spawnPowerUp(x, y) {
        const types = ['expand', 'multiball'];
        const type = types[Math.floor(Math.random() * types.length)];

        powerUps.push({
            x: x,
            y: y,
            width: 30,
            height: 20,
            type: type,
            dy: CONFIG.POWERUP_SPEED
        });
    }

    function updatePowerUps() {
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const pu = powerUps[i];
            pu.y += pu.dy;

            // Check paddle collision
            if (pu.y + pu.height >= paddle.y &&
                pu.y <= paddle.y + paddle.height &&
                pu.x + pu.width / 2 >= paddle.x - paddle.width / 2 &&
                pu.x - pu.width / 2 <= paddle.x + paddle.width / 2) {

                activatePowerUp(pu.type);
                powerUps.splice(i, 1);
                continue;
            }

            // Remove if off screen
            if (pu.y > CONFIG.CANVAS_HEIGHT) {
                powerUps.splice(i, 1);
            }
        }
    }

    function activatePowerUp(type) {
        switch (type) {
            case 'expand':
                paddle.expanded = true;
                paddle.width = CONFIG.EXPANDED_PADDLE_WIDTH;
                paddle.expandTimer = CONFIG.POWERUP_DURATION;
                break;
            case 'multiball':
                if (balls.length < 5) {
                    const newBall = createBall();
                    newBall.x = balls[0].x;
                    newBall.y = balls[0].y;
                    newBall.dx = -balls[0].dx;
                    newBall.dy = balls[0].dy;
                    balls.push(newBall);
                }
                break;
        }

        // Visual feedback
        spawnParticles(paddle.x, paddle.y, CONFIG.COLORS.NEON_GREEN);
        GameState.score += 50;
        updateHUD();
    }

    // === RENDERING ===
    function render() {
        ctx.save();

        // Apply screen shake
        ctx.translate(screenShake.x, screenShake.y);

        // Clear and draw background
        drawBackground();

        // Draw bricks
        drawBricks();

        // Draw particles
        drawParticles();

        // Draw power-ups
        drawPowerUps();

        // Draw balls
        drawBalls();

        // Draw paddle
        drawPaddle();

        ctx.restore();
    }

    function drawBackground() {
        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(1, '#1a0a2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Subtle grid
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        const gridSize = 40;

        for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            ctx.stroke();
        }

        for (let y = 0; y <= CONFIG.CANVAS_HEIGHT; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
            ctx.stroke();
        }
    }

    function drawPaddle() {
        const x = paddle.x - paddle.width / 2;
        const y = paddle.y;

        // Glow effect
        ctx.shadowColor = paddle.expanded ? CONFIG.COLORS.NEON_GREEN : CONFIG.COLORS.NEON_CYAN;
        ctx.shadowBlur = 20;

        // Main paddle
        const gradient = ctx.createLinearGradient(x, y, x, y + paddle.height);
        gradient.addColorStop(0, paddle.expanded ? CONFIG.COLORS.NEON_GREEN : CONFIG.COLORS.NEON_CYAN);
        gradient.addColorStop(1, paddle.expanded ? '#005544' : '#004455');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, paddle.width, paddle.height, 4);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    function drawBalls() {
        for (const ball of balls) {
            // Glow
            ctx.shadowColor = CONFIG.COLORS.NEON_PINK;
            ctx.shadowBlur = 15;

            // Trail effect
            const gradient = ctx.createRadialGradient(
                ball.x, ball.y, 0,
                ball.x, ball.y, ball.radius * 2
            );
            gradient.addColorStop(0, CONFIG.COLORS.NEON_PINK);
            gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius * 2, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
        }
    }

    function drawBricks() {
        for (const brick of bricks) {
            if (!brick.alive) continue;

            // Calculate opacity based on remaining hits
            const alpha = 0.5 + (brick.hits / brick.maxHits) * 0.5;

            // Glow
            ctx.shadowColor = brick.glow;
            ctx.shadowBlur = 12;

            // Brick body with gradient
            const gradient = ctx.createLinearGradient(
                brick.x, brick.y,
                brick.x, brick.y + brick.height
            );
            gradient.addColorStop(0, brick.color);
            gradient.addColorStop(1, adjustBrightness(brick.color, -50));

            ctx.globalAlpha = alpha;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
            ctx.fill();

            // Border
            ctx.strokeStyle = brick.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Hit indicator for multi-hit bricks
            if (brick.maxHits > 1) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = 'bold 12px Orbitron';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    brick.hits.toString(),
                    brick.x + brick.width / 2,
                    brick.y + brick.height / 2
                );
            }
        }
    }

    function drawParticles() {
        for (const p of particles) {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function drawPowerUps() {
        for (const pu of powerUps) {
            const color = pu.type === 'expand' ? CONFIG.COLORS.NEON_GREEN : CONFIG.COLORS.NEON_YELLOW;

            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = color;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.roundRect(
                pu.x - pu.width / 2,
                pu.y - pu.height / 2,
                pu.width,
                pu.height,
                6
            );
            ctx.fill();
            ctx.stroke();

            // Icon
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                pu.type === 'expand' ? '⟷' : '⊕',
                pu.x,
                pu.y
            );

            ctx.shadowBlur = 0;
        }
    }

    // === UTILITIES ===
    function adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // === HIGHSCORE SYSTEM ===
    const HIGHSCORE_KEY = 'neonBreakerHighscores';
    const MAX_HIGHSCORES = 10;

    function getHighscores(difficulty) {
        try {
            const data = localStorage.getItem(HIGHSCORE_KEY);
            const allScores = data ? JSON.parse(data) : {};
            return allScores[difficulty] || [];
        } catch (e) {
            return [];
        }
    }

    function saveHighscore(score, level, difficulty) {
        if (score === 0) return false;

        try {
            const data = localStorage.getItem(HIGHSCORE_KEY);
            const allScores = data ? JSON.parse(data) : {};

            if (!allScores[difficulty]) {
                allScores[difficulty] = [];
            }

            const highscores = allScores[difficulty];
            const newEntry = {
                score: score,
                level: level,
                date: new Date().toISOString()
            };

            // Check if this is a new highscore
            const isNewHighscore = highscores.length < MAX_HIGHSCORES ||
                score > highscores[highscores.length - 1].score;

            // Add new score and sort
            highscores.push(newEntry);
            highscores.sort((a, b) => b.score - a.score);

            // Keep only top scores
            allScores[difficulty] = highscores.slice(0, MAX_HIGHSCORES);

            localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(allScores));

            return isNewHighscore && allScores[difficulty].some(s => s.score === score && s.date === newEntry.date);
        } catch (e) {
            console.warn('Could not save highscore:', e);
            return false;
        }
    }

    function updateHighscoreDisplay(listElement, difficulty) {
        const highscores = getHighscores(difficulty);

        if (highscores.length === 0) {
            listElement.innerHTML = '<p class="no-scores">No scores yet! Play to set a record.</p>';
            return;
        }

        listElement.innerHTML = highscores.map((entry, index) => `
            <div class="highscore-item rank-${index + 1}">
                <span class="highscore-rank">#${index + 1}</span>
                <span class="highscore-score">${entry.score.toLocaleString()}</span>
                <span class="highscore-level">LVL ${entry.level}</span>
            </div>
        `).join('');
    }

    // === START ===
    init();
})();
