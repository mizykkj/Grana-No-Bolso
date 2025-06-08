// quebra_blocos.js - ATUALIZADO com aumento de velocidade por rebatidas

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreDisplayQB = document.getElementById('scoreQB');
const livesDisplayQB = document.getElementById('livesQB');
const levelDisplayQB = document.getElementById('levelQB');
const startButtonQuebraBlocos = document.getElementById('startButtonQuebraBlocos');
const quebraBlocosPreGameMessages = document.getElementById('quebraBlocosPreGameMessages');
const quebraBlocosGameInfo = document.getElementById('quebraBlocosGameInfo');
const levelCompleteScreenQB = document.getElementById('levelCompleteScreenQB');
const completedLevelDisplayQB = document.getElementById('completedLevelDisplayQB');
const nextLevelButtonQB = document.getElementById('nextLevelButtonQB');

// --- Variáveis Globais do Jogo ---
const INITIAL_LIVES = 3;
const PADDLE_SPEED_QB = 7;
const ballRadius = 8;
const paddleHeight = 12;
const paddleWidth = 80;

let score, lives, currentLevel;
let gamePaused, gameOver, gameHasStartedQB, animationFrameIdQB;
let qbCurrentUser, qbUsername;

let ballX, ballY, ballSpeedX, ballSpeedY;
let paddleX;
let rightPressedQB = false, leftPressedQB = false;

let brickRowCount, brickColumnCount, brickWidth, brickHeight = 20, brickPadding = 5, brickOffsetTop = 40, brickOffsetLeft = 20;
let bricks = [];
const brickColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C'];

// --- LÓGICA DE VELOCIDADE REINTRODUZIDA ---
let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 8; // Aumenta a velocidade a cada 8 rebatidas
const SPEED_INCREMENT = 0.2; // Aumento um pouco mais sutil por rebatida
const initialBallSpeedMagnitude = 3.5;
// Não há mais limite máximo de velocidade

// --- INICIALIZAÇÃO DO FIREBASE E AUTH ---
if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) { qbCurrentUser = user; try { const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get(); qbUsername = (userDoc.exists && userDoc.data().username) ? userDoc.data().username : user.email; } catch (error) { qbUsername = user.email; } } 
        else { qbCurrentUser = null; qbUsername = null; }
    });
}

function updateUIDisplaysQB() { /* ... (igual antes) ... */ }
function setupLevel(levelNum) { /* ... (igual antes) ... */ }
function drawBallQB() { /* ... (igual antes) ... */ }
function drawPaddleQB() { /* ... (igual antes) ... */ }
function drawBricksQB() { /* ... (igual antes) ... */ }
function collisionDetectionQB() { /* ... (igual antes) ... */ }
async function saveHighScoreQuebraBlocos(finalScore) { /* ... (igual antes) ... */ }
function keyDownHandlerQB(e) { /* ... (igual antes) ... */ }
function keyUpHandlerQB(e) { /* ... (igual antes) ... */ }

function resetBallAndPaddleQB() {
    ballX = canvas.width / 2;
    ballY = canvas.height - paddleHeight - ballRadius - 25;
    paddleX = (canvas.width - paddleWidth) / 2;
    
    let speedMultiplier = 1 + (currentLevel - 1) * 0.15; // Aumento de 15% da base por nível
    let currentSpeedMagnitude = initialBallSpeedMagnitude * speedMultiplier;
    
    let angle = (Math.PI / 4) + (Math.random() * Math.PI / 2);
    ballSpeedX = currentSpeedMagnitude * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1);
    ballSpeedY = -currentSpeedMagnitude * Math.sin(angle);
    
    if (Math.abs(ballSpeedX) < 2) ballSpeedX = (ballSpeedX >= 0 ? 2 : -2);
    if (ballSpeedY >= 0) ballSpeedY = -2;
}

function drawInitialQuebraBlocosScreen() {
    if (!ctx || !canvas) return;
    gameHasStartedQB = false; gameOver = false; gamePaused = false;
    currentLevel = 1; score = 0; lives = INITIAL_LIVES;
    setupLevel(1); resetBallAndPaddleQB(); updateUIDisplaysQB();
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBricksQB(); drawPaddleQB(); drawBallQB();
    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
    if (quebraBlocosGameInfo) { quebraBlocosGameInfo.style.display = 'flex'; }
    if (canvas) canvas.style.display = 'block';
    if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
}

function initializeGameQuebraBlocos() {
    if (gameHasStartedQB) return;
    gameHasStartedQB = true; gameOver = false; gamePaused = false;
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'none';
    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'none';
    if (quebraBlocosGameInfo) quebraBlocosGameInfo.style.display = 'flex';
    if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
    score = 0; lives = INITIAL_LIVES; currentLevel = 1; paddleHitCount = 0; // Reseta contador de rebatidas
    setupLevel(currentLevel); resetBallAndPaddleQB(); updateUIDisplaysQB();
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    gameLoopQB();
}

if (startButtonQuebraBlocos) {
    startButtonQuebraBlocos.addEventListener('click', initializeGameQuebraBlocos);
}

function handleQuebraBlocosGameOver() {
    gameOver = true; gameHasStartedQB = false;
    if (animationFrameIdQB) { cancelAnimationFrame(animationFrameIdQB); animationFrameIdQB = null; }
    alert(`FIM DE JOGO!\nNível: ${currentLevel}\nPontuação: ${score}`);
    saveHighScoreQuebraBlocos(score);
    setTimeout(() => { drawInitialQuebraBlocosScreen(); }, 1500);
}

function increaseBallSpeed() {
    let currentMagnitude = Math.sqrt(ballSpeedX*ballSpeedX + ballSpeedY*ballSpeedY);
    let newMagnitude = currentMagnitude + SPEED_INCREMENT;
    // Sem limite máximo aqui, para velocidade "infinita"
    ballSpeedX = (ballSpeedX / currentMagnitude) * newMagnitude;
    ballSpeedY = (ballSpeedY / currentMagnitude) * newMagnitude;
    console.log("Velocidade aumentada por rebatida para:", newMagnitude.toFixed(1));
}

function updateQB() {
    if (gameOver || gamePaused) return;

    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) ballSpeedX = -ballSpeedX;
    
    if (ballY + ballSpeedY < ballRadius) {
        ballSpeedY = -ballSpeedY;
    } else if (ballY + ballSpeedY > canvas.height - ballRadius) {
        if (ballX > paddleX && ballX < paddleX + paddleWidth && ballY < canvas.height - paddleHeight) {
             ballSpeedY = -ballSpeedY;
             
             // --- LÓGICA DE AUMENTO DE VELOCIDADE POR REBATIDA REINTRODUZIDA ---
             paddleHitCount++;
             if (paddleHitCount > 0 && paddleHitCount % HITS_FOR_SPEED_INCREASE === 0) {
                 increaseBallSpeed();
             }
             // ---------------------------------------------------------------

        } else {
            lives--; updateUIDisplaysQB();
            if (lives <= 0) { handleQuebraBlocosGameOver(); return; }
            else { resetBallAndPaddleQB(); }
        }
    }

    if (rightPressedQB && paddleX < canvas.width - paddleWidth) paddleX += PADDLE_SPEED_QB;
    else if (leftPressedQB && paddleX > 0) paddleX -= PADDLE_SPEED_QB;

    ballX += ballSpeedX; ballY += ballSpeedY;
    collisionDetectionQB();
}

function gameLoopQB() {
    if (!gameOver) {
        if (!gamePaused) { updateQB(); }
        drawQB();
        animationFrameIdQB = requestAnimationFrame(gameLoopQB);
    }
}

if (nextLevelButtonQB) {
    nextLevelButtonQB.addEventListener('click', () => {
        if (!gamePaused) return;
        if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
        gamePaused = false; 
        currentLevel++;
        updateUIDisplaysQB(); 
        
        // Sem verificação de nível máximo para níveis infinitos
        setupLevel(currentLevel);
        resetBallAndPaddleQB(); 
    });
}

// COLE AQUI O CORPO COMPLETO DAS SEGUINTES FUNÇÕES da última versão que te enviei:
// - updateUIDisplaysQB
// - setupLevel
// - drawBricksQB
// - drawPaddleQB
// - drawBallQB
// - collisionDetectionQB
// - saveHighScoreQuebraBlocos
// - keyDownHandlerQB
// - keyUpHandlerQB

// Prepara e desenha a tela inicial do Quebra Blocos
drawInitialQuebraBlocosScreen();
