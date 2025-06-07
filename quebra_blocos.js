// quebra_blocos.js - ATUALIZADO COM LOGS DE DEBUG PARA MOVIMENTO

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ... (todos os outros seletores de elementos como scoreDisplayQB, etc. continuam aqui) ...
const scoreDisplayQB = document.getElementById('scoreQB');
const livesDisplayQB = document.getElementById('livesQB');
const levelDisplayQB = document.getElementById('levelQB');
const startButtonQuebraBlocos = document.getElementById('startButtonQuebraBlocos');
const quebraBlocosPreGameMessages = document.getElementById('quebraBlocosPreGameMessages');
const quebraBlocosGameInfo = document.getElementById('quebraBlocosGameInfo');
const levelCompleteScreenQB = document.getElementById('levelCompleteScreenQB');
const completedLevelDisplayQB = document.getElementById('completedLevelDisplayQB');
const nextLevelButtonQB = document.getElementById('nextLevelButtonQB');

const INITIAL_LIVES = 3;
let score = 0;
let lives = INITIAL_LIVES;
let currentLevel = 1;
const MAX_LEVELS_QB = 3;

let gamePaused = false, gameOver = false, gameHasStartedQB = false, animationFrameIdQB;
let qbCurrentUser = null, qbUsername = null;

if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) {
            console.log("QuebraBlocos.js - onAuthStateChanged: Usuário LOGADO:", user.email);
            qbCurrentUser = user;
            try {
                const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get();
                if (userDoc.exists && userDoc.data().username) { qbUsername = userDoc.data().username; } else { qbUsername = user.email; }
            } catch (error) { qbUsername = user.email; }
        } else {
            console.log("QuebraBlocos.js - onAuthStateChanged: Usuário DESLOGADO.");
            qbCurrentUser = null; qbUsername = null;
        }
    });
} else { console.error("QuebraBlocos.js: Instâncias do Firebase não disponíveis!"); }

let ballRadius = 8;
let ballX, ballY, initialBallSpeedX = 3.5, initialBallSpeedY = -3.5, ballSpeedX, ballSpeedY;
const MAX_BALL_SPEED_MAGNITUDE_QB = 9;

let paddleHeight = 12, paddleWidth = 80, paddleX;
const PADDLE_SPEED_QB = 7;
let rightPressedQB = false, leftPressedQB = false;

let brickRowCount, brickColumnCount, brickWidth, brickHeight = 20, brickPadding = 5, brickOffsetTop = 40, brickOffsetLeft = 20, bricks = [];
const brickColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C'];

let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 8;
const SPEED_INCREMENT = 0.25;

function updateUIDisplaysQB() { /* ... (igual antes) ... */ }
function setupLevel(levelNum) { /* ... (igual antes) ... */ }
function resetBallAndPaddleQB() { /* ... (igual antes) ... */ }
function drawBallQB() { /* ... (igual antes) ... */ }
function drawPaddleQB() { /* ... (igual antes) ... */ }
function drawBricksQB() { /* ... (igual antes) ... */ }
function collisionDetectionQB() { /* ... (igual antes) ... */ }
async function saveHighScoreQuebraBlocos(finalScore) { /* ... (igual antes) ... */ }
function handleQuebraBlocosGameOver() { /* ... (igual antes) ... */ }

function drawInitialQuebraBlocosScreen() {
    if (!ctx || !canvas) return;
    console.log("QB.JS: drawInitialQuebraBlocosScreen chamada para desenhar tela inicial.");
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setupLevel(1);
    resetBallAndPaddleQB();
    drawBricksQB(); drawPaddleQB(); drawBallQB();
    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
    if (quebraBlocosGameInfo) { lives = INITIAL_LIVES; score = 0; currentLevel = 1; updateUIDisplaysQB(); quebraBlocosGameInfo.style.display = 'flex'; }
    if (canvas) canvas.style.display = 'block';
}

function initializeGameQuebraBlocos() {
    console.log("QB.JS: FUNÇÃO initializeGameQuebraBlocos FOI CHAMADA!");
    if (gameHasStartedQB) { console.log("QB.JS: Jogo já iniciado, retornando."); return; }
    gameHasStartedQB = true; gameOver = false; gamePaused = false;

    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'none';
    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'none';
    if (quebraBlocosGameInfo) quebraBlocosGameInfo.style.display = 'flex';
    if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';

    score = 0; lives = INITIAL_LIVES; currentLevel = 1; paddleHitCount = 0;
    setupLevel(currentLevel); resetBallAndPaddleQB(); updateUIDisplaysQB();
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    gameLoopQB();
}

if (startButtonQuebraBlocos) {
    console.log("QB.JS: Adicionando listener de clique ao botão Iniciar Jogo.");
    startButtonQuebraBlocos.addEventListener('click', initializeGameQuebraBlocos);
}

document.addEventListener('keydown', keyDownHandlerQB, false);
document.addEventListener('keyup', keyUpHandlerQB, false);

function keyDownHandlerQB(e) {
    console.log("QB.JS: Tecla Pressionada:", e.key); // LOG DE TECLA
    const K_LEFT = 'ArrowLeft', K_RIGHT = 'ArrowRight';
    const MOVE_KEYS = [K_LEFT, K_RIGHT, 'a', 'A', 'd', 'D'];
    
    if (!gameHasStartedQB && MOVE_KEYS.includes(e.key === 'A' || e.key === 'D' ? e.key.toLowerCase() : e.key)) {
        console.log("QB.JS: Tecla de início detectada!");
        e.preventDefault(); 
        initializeGameQuebraBlocos();
    }
    if (gameHasStartedQB && !gameOver && !gamePaused) {
        if (e.key === K_RIGHT || e.key.toLowerCase() === 'd') {
            rightPressedQB = true;
            console.log("QB.JS: rightPressedQB definido como true"); // LOG
        } else if (e.key === K_LEFT || e.key.toLowerCase() === 'a') {
            leftPressedQB = true;
            console.log("QB.JS: leftPressedQB definido como true"); // LOG
        }
        if (MOVE_KEYS.includes(e.key === 'A' || e.key === 'D' ? e.key.toLowerCase() : e.key)) e.preventDefault();
    }
    if (gamePaused && levelCompleteScreenQB && levelCompleteScreenQB.style.display !== 'none' && 
        (['Enter', ' ', K_LEFT, K_RIGHT, 'ArrowUp', 'ArrowDown'].includes(e.key) || e.code === 'Space')) {
        e.preventDefault();
        if(nextLevelButtonQB) nextLevelButtonQB.click(); 
    }
}
function keyUpHandlerQB(e) {
    console.log("QB.JS: Tecla Solta:", e.key); // LOG DE TECLA
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        rightPressedQB = false;
        console.log("QB.JS: rightPressedQB definido como false"); // LOG
    } else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        leftPressedQB = false;
        console.log("QB.JS: leftPressedQB definido como false"); // LOG
    }
}

function updateQB() {
    if (gameOver || gamePaused) return;

    // Movimento da barra (paddle)
    if (rightPressedQB && paddleX < canvas.width - paddleWidth) {
        paddleX += PADDLE_SPEED_QB;
    } else if (leftPressedQB && paddleX > 0) {
        paddleX -= PADDLE_SPEED_QB;
    }

    // Movimento da bola e colisões
    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) ballSpeedX = -ballSpeedX;
    if (ballY + ballSpeedY < ballRadius) { 
        ballSpeedY = -ballSpeedY;
    } else if (ballY + ballSpeedY > canvas.height - ballRadius - paddleHeight) {
        if (ballX + ballRadius > paddleX && ballX - ballRadius < paddleX + paddleWidth) {
            ballSpeedY = -ballSpeedY; ballY = canvas.height - paddleHeight - ballRadius - 0.1; 
            paddleHitCount++;
            if (paddleHitCount > 0 && paddleHitCount % HITS_FOR_SPEED_INCREASE === 0) {
                 let currentMagnitude = Math.sqrt(ballSpeedX*ballSpeedX + ballSpeedY*ballSpeedY);
                 if(currentMagnitude < MAX_BALL_SPEED_MAGNITUDE_QB) {
                    currentMagnitude += SPEED_INCREMENT;
                    if (currentMagnitude > MAX_BALL_SPEED_MAGNITUDE_QB) currentMagnitude = MAX_BALL_SPEED_MAGNITUDE_QB;
                    const angle = Math.atan2(ballSpeedY, ballSpeedX); 
                    ballSpeedX = currentMagnitude * Math.cos(angle); 
                    ballSpeedY = currentMagnitude * Math.sin(angle);
                 }
            }
        } else if (ballY + ballRadius > canvas.height) { 
            lives--; updateUIDisplaysQB();
            if (lives <= 0) { handleQuebraBlocosGameOver(); return; }
            else { resetBallAndPaddleQB(); }
        }
    }
    
    ballX += ballSpeedX; ballY += ballSpeedY;
    collisionDetectionQB();
}

function drawQB() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBricksQB(); drawPaddleQB(); drawBallQB();
}

function gameLoopQB() {
    // console.log("QB.JS: gameLoopQB rodando..."); // Este log é muito barulhento, então deixo comentado
    if (!gameOver && !gamePaused) { updateQB(); }
    drawQB(); 
    if (!gameOver) { animationFrameIdQB = requestAnimationFrame(gameLoopQB); }
}

if (nextLevelButtonQB) {
    nextLevelButtonQB.addEventListener('click', () => { /* ... (igual antes) ... */ });
}

// Prepara e desenha a tela inicial do Quebra Blocos
// Cole aqui as funções que foram omitidas para brevidade:
// drawBricksQB, collisionDetectionQB, saveHighScoreQuebraBlocos, handleQuebraBlocosGameOver, etc.
// Certifique-se de que todas as funções estão completas!
drawInitialQuebraBlocosScreen();
