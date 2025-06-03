// --- quebra_blocos.js ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de UI
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('levelDisplay');

const levelCompleteScreen = document.getElementById('levelCompleteScreen');
const levelCompleteMessage = document.getElementById('levelCompleteMessage');
const completedLevelDisplay = document.getElementById('completedLevelDisplay');
const nextLevelButton = document.getElementById('nextLevelButton');

let score = 0;
let lives = 3;
let level = 1;
const maxLevels = 5;

let gamePaused = false;
let gameOver = false;
let levelComplete = false;

// --- Configurações da Bola ---
let ballRadius = 10;
let ballX, ballY;
let initialBallSpeedMagnitude = 3.5; // Magnitude base da velocidade (combinando X e Y)
let ballSpeedX, ballSpeedY;

// --- Configurações da Barra (Paddle) ---
let paddleHeight = 12;
let paddleWidth = 80;
let paddleX;
const PADDLE_SPEED_KEYBOARD = 7;
let rightPressed = false;
let leftPressed = false;

// --- Configurações dos Tijolos ---
let baseBrickRowCount = 3;
let baseBrickColumnCount = 6;
let brickRowCount, brickColumnCount;
let brickWidth, brickHeight = 20, brickPadding = 8, brickOffsetTop = 40, brickOffsetLeft = 15;

let bricks = [];

function updateBrickLayout() {
    brickRowCount = baseBrickRowCount + (level - 1);
    if (brickRowCount > 7) brickRowCount = 7;

    brickColumnCount = baseBrickColumnCount + Math.floor((level - 1) / 2);
    if (brickColumnCount > 9) brickColumnCount = 9;

    let totalPaddingWidth = brickPadding * (brickColumnCount - 1);
    if (brickColumnCount <= 1) totalPaddingWidth = 0; // Sem padding se só uma coluna
    let totalOffsetWidth = brickOffsetLeft * 2;
    brickWidth = (canvas.width - totalOffsetWidth - totalPaddingWidth) / brickColumnCount;

    if (brickWidth < 30) {
        brickWidth = 30;
        let totalBrickWidth = brickColumnCount * brickWidth;
        totalPaddingWidth = brickColumnCount > 1 ? brickPadding * (brickColumnCount - 1) : 0;
        brickOffsetLeft = (canvas.width - totalBrickWidth - totalPaddingWidth) / 2;
    }
}

function initializeBricks() {
    updateBrickLayout();
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1, color: getRandomBrickColor() };
        }
    }
}

function getRandomBrickColor() {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function resetBallAndPaddle() {
    ballX = canvas.width / 2;
    ballY = canvas.height - paddleHeight - ballRadius - 15; // Um pouco mais acima
    paddleX = (canvas.width - paddleWidth) / 2;

    let currentSpeedMagnitude = initialBallSpeedMagnitude + (level - 1) * 0.5; // Aumenta magnitude por nível
    if (currentSpeedMagnitude > 8) currentSpeedMagnitude = 8; // Limite de velocidade

    let angle = (Math.PI / 4) + (Math.random() * Math.PI / 2); // Ângulo entre 45 e 135 graus (para cima)
    ballSpeedX = currentSpeedMagnitude * Math.cos(angle) * (Math.random() > 0.5 ? 1: -1); // Componente X, direção aleatória
    ballSpeedY = -currentSpeedMagnitude * Math.sin(angle); // Componente Y, sempre para cima
    
    // Assegurar que não seja muito vertical ou horizontal
    if (Math.abs(ballSpeedX) < 1.5) ballSpeedX = (ballSpeedX > 0 ? 1 : -1) * 1.5;
    if (Math.abs(ballSpeedY) < 1.5) ballSpeedY = (ballSpeedY > 0 ? 1 : -1) * 1.5;
}

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;

    if (['ArrowRight', 'ArrowLeft'].includes(e.key) && !levelComplete && !gameOver) {
        e.preventDefault();
    }
    if ((e.key === 'Enter' || e.code === 'Space') && levelComplete && !gameOver) {
        e.preventDefault();
        proceedToNextLevel();
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
}

function drawBall() {
    ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.closePath();
}
function drawPaddle() {
    ctx.beginPath(); ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight); ctx.fillStyle = 'var(--accent-color, #00bcd4)'; ctx.fill(); ctx.closePath();
}
function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX; bricks[c][r].y = brickY;
                ctx.beginPath(); ctx.rect(brickX, brickY, brickWidth, brickHeight); ctx.fillStyle = bricks[c][r].color; ctx.fill(); ctx.closePath();
            }
        }
    }
}

function updateUIDisplays() {
    if (scoreDisplay) scoreDisplay.textContent = score;
    if (livesDisplay) livesDisplay.textContent = lives;
    if (levelDisplay) levelDisplay.textContent = level;
}

function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                if (ballX + ballRadius > b.x && ballX - ballRadius < b.x + brickWidth &&
                    ballY + ballRadius > b.y && ballY - ballRadius < b.y + brickHeight) {
                    ballSpeedY = -ballSpeedY;
                    b.status = 0;
                    score += 10;
                    updateUIDisplays();
                    if (checkWin()) {
                        levelComplete = true;
                        return;
                    }
                }
            }
        }
    }
}

function checkWin() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) return false;
        }
    }
    return true;
}

function showLevelCompleteScreen() {
    if (levelCompleteScreen) {
        levelCompleteMessage.textContent = `Nível ${level} Completo!`;
        if(completedLevelDisplay) completedLevelDisplay.textContent = level;
        levelCompleteScreen.style.display = 'flex'; // Use flex se o CSS estiver configurado para centralizar com flex
        gamePaused = true;
    }
}

function proceedToNextLevel() {
    if (levelCompleteScreen) levelCompleteScreen.style.display = 'none';
    gamePaused = false;
    levelComplete = false;

    if (level >= maxLevels) {
        gameOver = true;
        // O gameLoop vai lidar com a exibição da mensagem de jogo vencido/finalizado
        return;
    }

    level++;
    initializeBricks();
    resetBallAndPaddle();
    updateUIDisplays();
}
if (nextLevelButton) nextLevelButton.addEventListener('click', proceedToNextLevel);

function update() {
    if (gameOver || gamePaused || levelComplete) return;

    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) {
        ballSpeedX = -ballSpeedX;
    }
    if (ballY + ballSpeedY < ballRadius) {
        ballSpeedY = -ballSpeedY;
    } else if (ballY + ballSpeedY > canvas.height - ballRadius - paddleHeight) {
        if (ballX > paddleX - ballRadius && ballX < paddleX + paddleWidth + ballRadius) { // Colisão com o paddle
            ballSpeedY = -ballSpeedY;
            ballY = canvas.height - paddleHeight - ballRadius - 0.1; // Previne grudar
        } else if (ballY + ballRadius > canvas.height) { // Atingiu o chão
            lives--;
            updateUIDisplays();
            if (lives <= 0) {
                gameOver = true;
                return;
            } else {
                resetBallAndPaddle();
            }
        }
    }

    if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += PADDLE_SPEED_KEYBOARD;
    else if (leftPressed && paddleX > 0) paddleX -= PADDLE_SPEED_KEYBOARD;

    ballX += ballSpeedX;
    ballY += ballSpeedY;
    collisionDetection();
}

function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
}

function gameLoop() {
    if (!gameOver) {
        if (levelComplete && !gamePaused) {
            showLevelCompleteScreen();
        }
        if (!gamePaused) {
            update();
        }
        draw();
    } else {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "bold 28px 'Montserrat', sans-serif";
        ctx.fillStyle = "var(--accent-color, #00bcd4)";
        ctx.textAlign = "center";
        if (level > maxLevels) { // Checa se venceu todos os níveis
             ctx.fillText("VOCÊ VENCEU!", canvas.width/2, canvas.height/2 - 40);
             ctx.font = "20px 'Roboto', sans-serif";
             ctx.fillStyle = "var(--text-light, white)";
             ctx.fillText("Pontuação Final: " + score, canvas.width/2, canvas.height/2);
        } else {
            ctx.fillText("FIM DE JOGO!", canvas.width/2, canvas.height/2 - 40);
            ctx.font = "20px 'Roboto', sans-serif";
            ctx.fillStyle = "var(--text-light, white)";
            ctx.fillText("Nível: " + level + " | Pontos: " + score, canvas.width/2, canvas.height/2);
        }
        ctx.font = "16px 'Roboto', sans-serif";
        ctx.fillStyle = "var(--text-medium, grey)";
        ctx.fillText("Pressione F5 para jogar novamente.", canvas.width/2, canvas.height/2 + 40);
        return;
    }
    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameOver = false;
    levelComplete = false;
    gamePaused = false;
    score = 0;
    lives = 3;
    level = 1;

    if (levelCompleteScreen) levelCompleteScreen.style.display = 'none';

    initializeBricks();
    resetBallAndPaddle();
    updateUIDisplays();
    gameLoop();
}

startGame();
