// pong.js - ATUALIZADO com física de bola mais reta

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreDisplay = document.getElementById('player1Score');
const player2ScoreDisplay = document.getElementById('player2Score');
const player1LivesDisplay = document.getElementById('player1Lives');
const player2LivesDisplay = document.getElementById('player2Lives');

const pongModeSelection = document.getElementById('pongModeSelection');
const onePlayerBtn = document.getElementById('onePlayerBtn');
const twoPlayerBtn = document.getElementById('twoPlayerBtn');
const pongGameInfo = document.getElementById('pongGameInfo');

const paddleHeight = 100, paddleWidth = 10, ballRadius = 8, INITIAL_LIVES = 3;
const AI_PADDLE_SPEED = 5.5; 
const PLAYER_PADDLE_SPEED = 7;

let ballX, ballY, baseBallSpeedX, baseBallSpeedY, ballSpeedX, ballSpeedY;
let player1Y, player2Y;
let player1Score, player2Score, player1Lives, player2Lives;
let lastHitBy = null;

let upPressed = false, downPressed = false, wPressed = false, sPressed = false;
let gameHasStartedPong = false, animationFrameId, gameMode = null;
let speedIncreaseInterval = null;
const TIME_FOR_SPEED_INCREASE = 7000, SPEED_INCREMENT_TIME = 0.4, MAX_BALL_SPEED_MAGNITUDE = 12;

let pongGameCurrentUser = null, pongGameUsername = null;

if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) { pongGameCurrentUser = user; try { const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get(); pongGameUsername = (userDoc.exists && userDoc.data().username) ? userDoc.data().username : user.email; } catch (error) { pongGameUsername = user.email; } } 
        else { pongGameCurrentUser = null; pongGameUsername = null; }
    });
}

function updateUIDisplays() { /* ... (igual antes) ... */ }
function drawBall() { /* ... (igual antes) ... */ }
function drawPaddle(x, y) { /* ... (igual antes) ... */ }
function drawNet() { /* ... (igual antes) ... */ }
async function saveHighScorePong(playerIdentifier, scoreToSave) { /* ... (igual antes) ... */ }
function drawInitialPongScreen() { /* ... (igual antes) ... */ }
function initializePongVariables() { /* ... (igual antes) ... */ }
function startGamePong() { /* ... (igual antes) ... */ }
if (onePlayerBtn) { onePlayerBtn.addEventListener('click', () => { gameMode = 'AI'; startGamePong(); }); }
if (twoPlayerBtn) { twoPlayerBtn.addEventListener('click', () => { gameMode = '2P'; startGamePong(); }); }
document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);
function keyDownHandler(e) { /* ... (igual antes) ... */ }
function keyUpHandler(e) { /* ... (igual antes) ... */ }
function increaseBallSpeed() { /* ... (igual antes) ... */ }
function handleGameOver(winner) { /* ... (igual antes) ... */ }
function moveAIPaddle() { /* ... (igual antes) ... */ }

function resetBall(scorer) {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    let directionX = (Math.random() > 0.5 ? 1 : -1);
    if (scorer === 'player1') directionX = -1; 
    if (scorer === 'player2') directionX = 1;
    
    // CORREÇÃO: Garante que a bola comece com uma trajetória mais horizontal
    let speedMagnitude = Math.sqrt((ballSpeedX**2) + (ballSpeedY**2)) || baseBallSpeedX;
    if (speedMagnitude < baseBallSpeedX) speedMagnitude = baseBallSpeedX;
    
    ballSpeedX = speedMagnitude * 0.9 * directionX; // Mais velocidade no eixo X
    ballSpeedY = speedMagnitude * 0.4 * (Math.random() > 0.5 ? 1 : -1); // Menos velocidade no eixo Y
    lastHitBy = null;
}

function update() {
    if (!gameHasStartedPong) return;

    if (wPressed && player1Y > 0) player1Y -= PLAYER_PADDLE_SPEED;
    if (sPressed && player1Y < canvas.height - paddleHeight) player1Y += PLAYER_PADDLE_SPEED;
    if (gameMode === '2P') {
        if (upPressed && player2Y > 0) player2Y -= PLAYER_PADDLE_SPEED;
        if (downPressed && player2Y < canvas.height - paddleHeight) player2Y += PLAYER_PADDLE_SPEED;
    } else { moveAIPaddle(); }

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
        ballSpeedY = -ballSpeedY;
    }

    // --- FÍSICA DE COLISÃO COM PADDLE CORRIGIDA ---
    // Colisão com paddle 1 (esquerda)
    if (ballSpeedX < 0 && ballX - ballRadius < paddleWidth) {
        if (ballY > player1Y && ballY < player1Y + paddleHeight) {
            let speedMagnitude = Math.sqrt(ballSpeedX**2 + ballSpeedY**2);
            ballSpeedX = -ballSpeedX;
            let deltaY = ballY - (player1Y + paddleHeight / 2);
            // CORREÇÃO: O multiplicador foi reduzido (de 0.35 para 0.2) para um ângulo mais suave
            ballSpeedY = deltaY * 0.2;
            
            // Re-normaliza para manter a velocidade constante, mudando apenas o ângulo
            let newVectorMagnitude = Math.sqrt(ballSpeedX**2 + ballSpeedY**2);
            ballSpeedX = (ballSpeedX / newVectorMagnitude) * speedMagnitude;
            ballSpeedY = (ballSpeedY / newVectorMagnitude) * speedMagnitude;

            if (lastHitBy !== 'player1') { player1Score += 1; updateUIDisplays(); }
            lastHitBy = 'player1';
        }
    } 
    // Colisão com paddle 2 (direita)
    else if (ballSpeedX > 0 && ballX + ballRadius > canvas.width - paddleWidth) {
        if (ballY > player2Y && ballY < player2Y + paddleHeight) {
            let speedMagnitude = Math.sqrt(ballSpeedX**2 + ballSpeedY**2);
            ballSpeedX = -ballSpeedX;
            let deltaY = ballY - (player2Y + paddleHeight / 2);
            ballSpeedY = deltaY * 0.2; // CORREÇÃO: Multiplicador reduzido
            
            let newVectorMagnitude = Math.sqrt(ballSpeedX**2 + ballSpeedY**2);
            ballSpeedX = (ballSpeedX / newVectorMagnitude) * speedMagnitude;
            ballSpeedY = (ballSpeedY / newVectorMagnitude) * speedMagnitude;

            if (lastHitBy !== 'player2') { player2Score += 1; updateUIDisplays(); }
            lastHitBy = 'player2';
        }
    }

    // Ponto marcado / Perda de vida (sem alteração)
    if (ballX + ballRadius < 0) {
        player1Lives--; player2Score += 2; updateUIDisplays();
        if (player1Lives <= 0) { handleGameOver("player2"); return; }
        resetBall("player2");
    } else if (ballX - ballRadius > canvas.width) {
        player2Lives--; player1Score += 2; updateUIDisplays();
        if (player2Lives <= 0) { handleGameOver("player1"); return; }
        resetBall("player1");
    }
}

function draw() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameHasStartedPong) {
        drawNet(); drawBall();
        drawPaddle(0, player1Y); drawPaddle(canvas.width - paddleWidth, player2Y);
    }
}

function gameLoop() {
    update();
    draw();
    if (gameHasStartedPong) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Prepara e desenha a tela inicial de seleção de modo do Pong
drawInitialPongScreen();

// Para garantir que seu código esteja 100% completo, cole aqui o corpo das funções
// que foram omitidas para brevidade (ex: updateUIDisplays, saveHighScorePong, handleGameOver, etc.)
// da última versão completa do pong.js que te enviei.
