// quebra_blocos.js - ATUALIZADO COM MELHORIAS DE VELOCIDADE E TELA DE INÍCIO

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

const INITIAL_LIVES = 3;
let score = 0;
let lives = INITIAL_LIVES;
let currentLevel = 1;
const MAX_LEVELS_QB = 3; // Defina quantos níveis você quer

let gamePaused = false;
let gameOver = false;
let gameHasStartedQB = false;
let animationFrameIdQB;

let qbCurrentUser = null;
let qbUsername = null;

if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) {
            console.log("QuebraBlocos.js - onAuthStateChanged: Usuário LOGADO:", user.email);
            qbCurrentUser = user;
            try {
                const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get();
                if (userDoc.exists && userDoc.data().username) {
                    qbUsername = userDoc.data().username;
                } else { qbUsername = user.email; }
            } catch (error) { qbUsername = user.email; }
        } else {
            console.log("QuebraBlocos.js - onAuthStateChanged: Usuário DESLOGADO.");
            qbCurrentUser = null; qbUsername = null;
        }
    });
} else {
    console.error("QuebraBlocos.js: Instâncias do Firebase não disponíveis!");
}

// --- Configurações da Bola ---
let ballRadius = 8;
let ballX, ballY;
// AUMENTADA A VELOCIDADE INICIAL BASE DA BOLA
let initialBallSpeedX = 3.5; // Era 3
let initialBallSpeedY = -3.5; // Era -3
let ballSpeedX, ballSpeedY;
const MAX_BALL_SPEED_MAGNITUDE_QB = 9; // Mantido o mesmo limite máximo


// --- Configurações da Barra (Paddle) ---
let paddleHeight = 12;
let paddleWidth = 80;
let paddleX;
const PADDLE_SPEED_QB = 7;
let rightPressedQB = false;
let leftPressedQB = false;

// --- Configurações dos Tijolos ---
let brickRowCount, brickColumnCount;
let brickWidth, brickHeight = 20, brickPadding = 5, brickOffsetTop = 40, brickOffsetLeft = 20;
let bricks = [];
const brickColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C'];

// REMOVIDO: paddleHitCount e HITS_FOR_SPEED_INCREASE, SPEED_INCREMENT (aumento por rebatida)
// A velocidade agora só aumenta por nível.

function updateUIDisplaysQB() {
    if (scoreDisplayQB) scoreDisplayQB.textContent = score;
    if (livesDisplayQB) livesDisplayQB.textContent = lives;
    if (levelDisplayQB) levelDisplayQB.textContent = currentLevel;
}

function setupLevel(levelNum) {
    brickRowCount = 2 + levelNum; 
    if (brickRowCount > 7) brickRowCount = 7;
    brickColumnCount = 5 + levelNum;
    if (brickColumnCount > 10) brickColumnCount = 10;

    let totalPaddingWidth = brickPadding * (brickColumnCount - 1);
    if (brickColumnCount <= 1) totalPaddingWidth = 0;
    let totalOffsetWidth = brickOffsetLeft * 2;
    brickWidth = (canvas.width - totalOffsetWidth - totalPaddingWidth) / brickColumnCount;
    
    if (brickWidth < 25) {
        brickWidth = 25;
        let totalBrickWidth = brickColumnCount * brickWidth;
        totalPaddingWidth = brickColumnCount > 1 ? brickPadding * (brickColumnCount - 1) : 0;
        brickOffsetLeft = (canvas.width - totalBrickWidth - totalPaddingWidth) / 2;
    }

    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1, color: brickColors[(c * r + r + c + levelNum) % brickColors.length] };
        }
    }
}

function resetBallAndPaddleQB() {
    ballX = canvas.width / 2;
    // Ajuste para a bola começar um pouco mais acima do paddle e não dentro dele
    ballY = canvas.height - paddleHeight - ballRadius - 10; 
    paddleX = (canvas.width - paddleWidth) / 2;
    
    // Velocidade aumenta 15% da base por nível (ajuste o 0.15 se quiser mais ou menos)
    let speedMultiplier = 1 + (currentLevel - 1) * 0.15; 
    let currentSpeedMagnitudeX = initialBallSpeedX * speedMultiplier;
    let currentSpeedMagnitudeY = Math.abs(initialBallSpeedY) * speedMultiplier; // Usar valor absoluto para Y e depois negativar

    if (currentSpeedMagnitudeX > MAX_BALL_SPEED_MAGNITUDE_QB) currentSpeedMagnitudeX = MAX_BALL_SPEED_MAGNITUDE_QB;
    if (currentSpeedMagnitudeY > MAX_BALL_SPEED_MAGNITUDE_QB) currentSpeedMagnitudeY = MAX_BALL_SPEED_MAGNITUDE_QB;
    
    ballSpeedX = currentSpeedMagnitudeX * (Math.random() > 0.5 ? 1 : -1); // Direção X aleatória
    ballSpeedY = -currentSpeedMagnitudeY; // Sempre começa subindo
    
    if (Math.abs(ballSpeedX) < 1.5) ballSpeedX = (ballSpeedX >= 0 ? 1.5 : -1.5);
    if (Math.abs(ballSpeedY) < 1.5) ballSpeedY = -1.5; // Garante que Y não seja muito lento e sempre suba
}

function drawInitialQuebraBlocosScreen() {
    if (!ctx || !canvas) return;
    console.log("QB.JS: drawInitialQuebraBlocosScreen chamada");
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setupLevel(1); // Configura tijolos do nível 1 para desenho inicial
    resetBallAndPaddleQB(); // Define posições iniciais da bola e paddle para desenho
                            // (currentLevel será 1 aqui, então a velocidade será a base)
    
    drawBricksQB();
    drawPaddleQB();
    drawBallQB(); // Garante que estas são as funções corretas com sufixo QB

    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
    if (quebraBlocosGameInfo) {
        quebraBlocosGameInfo.style.display = 'flex'; 
        lives = INITIAL_LIVES; // Garante que vidas estejam corretas na UI inicial
        score = 0;
        // currentLevel já é 1 globalmente no início
        updateUIDisplaysQB(); 
    }
    if (canvas) canvas.style.display = 'block';
}


function initializeGameQuebraBlocos() {
    if (gameHasStartedQB) return;
    gameHasStartedQB = true;
    gameOver = false;
    gamePaused = false;

    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'none';
    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'none';
    // canvas e quebraBlocosGameInfo já devem estar visíveis pela drawInitialQuebraBlocosScreen
    // mas podemos garantir aqui:
    if (canvas) canvas.style.display = 'block';
    if (quebraBlocosGameInfo) quebraBlocosGameInfo.style.display = 'flex';
    if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';

    score = 0; 
    lives = INITIAL_LIVES;
    currentLevel = 1;
    // REMOVIDO: paddleHitCount = 0; 
    
    setupLevel(currentLevel);
    resetBallAndPaddleQB(); // Define velocidade de acordo com currentLevel 1
    updateUIDisplaysQB();
    
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    gameLoopQB();
}

if (startButtonQuebraBlocos) {
    startButtonQuebraBlocos.addEventListener('click', initializeGameQuebraBlocos);
}

document.addEventListener('keydown', keyDownHandlerQB, false);
document.addEventListener('keyup', keyUpHandlerQB, false);
// Controle do mouse foi removido

function keyDownHandlerQB(e) {
    const K_LEFT = 'ArrowLeft', K_RIGHT = 'ArrowRight';
    if (!gameHasStartedQB && (e.key === K_LEFT || e.key === K_RIGHT || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'd')) {
        e.preventDefault(); 
        initializeGameQuebraBlocos();
    }
    if (gameHasStartedQB && !gameOver && !gamePaused) {
        if (e.key === K_RIGHT || e.key.toLowerCase() === 'd') rightPressedQB = true;
        else if (e.key === K_LEFT || e.key.toLowerCase() === 'a') leftPressedQB = true;
        if ([K_LEFT, K_RIGHT, 'a', 'A', 'd', 'D'].includes(e.key)) e.preventDefault();
    }
    if (gamePaused && levelCompleteScreenQB && levelCompleteScreenQB.style.display !== 'none' && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        if(nextLevelButtonQB) nextLevelButtonQB.click(); 
    }
}
function keyUpHandlerQB(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressedQB = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressedQB = false;
}

function drawBallQB() { ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.closePath(); }
function drawPaddleQB() { ctx.beginPath(); ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight); ctx.fillStyle = 'var(--accent-color, #00bcd4)'; ctx.fill(); ctx.closePath(); }
function drawBricksQB() { /* ... (igual à versão anterior) ... */ } // Cole sua função drawBricksQB aqui

function collisionDetectionQB() { /* ... (igual à versão anterior) ... */ } // Cole sua função collisionDetectionQB aqui

async function saveHighScoreQuebraBlocos(finalScore) { /* ... (igual à versão anterior) ... */ } // Cole sua função saveHighScoreQuebraBlocos aqui

function handleQuebraBlocosGameOver() { /* ... (igual à versão anterior, mas o reset para tela inicial é drawInitialQuebraBlocosScreen) ... */
    gameOver = true; gameHasStartedQB = false; 
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    alert(`FIM DE JOGO!\nNível: ${currentLevel}\nPontuação: ${score}`); 
    saveHighScoreQuebraBlocos(score);
    setTimeout(() => { 
        drawInitialQuebraBlocosScreen(); // Mostra a tela inicial de novo
    }, 1500);
}

function updateQB() {
    if (gameOver || gamePaused) return;

    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) ballSpeedX = -ballSpeedX;
    
    if (ballY + ballSpeedY < ballRadius) { 
        ballSpeedY = -ballSpeedY;
    } else if (ballY + ballSpeedY > canvas.height - ballRadius - paddleHeight) {
        if (ballX > paddleX && ballX < paddleX + paddleWidth) { // Colidiu com o paddle
            ballSpeedY = -ballSpeedY; 
            ballY = canvas.height - paddleHeight - ballRadius - 0.1;
            // REMOVIDO: paddleHitCount e aumento de velocidade por rebatida.
            // A velocidade agora só aumenta por nível (em resetBallAndPaddleQB)
        } else if (ballY + ballRadius > canvas.height) { // Bola caiu
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

function drawQB() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBricksQB(); drawPaddleQB(); drawBallQB();
    // A UI (score, vidas, nível) é atualizada por updateUIDisplaysQB e mostrada no HTML
}

function gameLoopQB() {
    if (!gameOver && !gamePaused) { updateQB(); }
    drawQB(); 
    if (!gameOver) { animationFrameIdQB = requestAnimationFrame(gameLoopQB); }
}

if (nextLevelButtonQB) {
    nextLevelButtonQB.addEventListener('click', () => {
        if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
        gamePaused = false; currentLevel++;
        updateUIDisplaysQB(); // Atualiza o display do nível
        if (currentLevel > MAX_LEVELS_QB) {
            alert("Parabéns! Você completou todos os níveis do Quebra Blocos!");
            handleQuebraBlocosGameOver(); return;
        }
        setupLevel(currentLevel);
        resetBallAndPaddleQB(); // Reseta bola com velocidade do novo nível
    });
}

// Prepara e desenha a tela inicial do Quebra Blocos
drawInitialQuebraBlocosScreen();
