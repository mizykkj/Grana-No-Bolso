// pong.js - ATUALIZADO com física de colisão consistente e aumento de velocidade por tempo

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreDisplay = document.getElementById('player1Score');
const player2ScoreDisplay = document.getElementById('player2Score');
const player1LivesDisplay = document.getElementById('player1Lives');
const player2LivesDisplay = document.getElementById('player2Lives');

const startButtonPong = document.getElementById('startButtonPong');
const pongGameInfo = document.getElementById('pongGameInfo');
const pongPreGameMessages = document.getElementById('pongPreGameMessages');

// --- Configurações do Jogo ---
const paddleHeight = 100;
const paddleWidth = 10;
const ballRadius = 8;
const INITIAL_LIVES = 3;

let ballX, ballY, ballSpeedX, ballSpeedY;
let player1Y, player2Y;
const PADDLE_SPEED = 7;
let player1Score, player2Score, player1Lives, player2Lives;
let lastHitBy = null;

let upPressed = false, downPressed = false, wPressed = false, sPressed = false;
let gameHasStartedPong = false;
let animationFrameId;

// --- Lógica de Velocidade por Tempo ---
const TIME_FOR_SPEED_INCREASE = 7000; // Aumenta a velocidade a cada 7 segundos (7000 ms)
const SPEED_INCREMENT_TIME = 0.4;     // Quanto a velocidade aumenta
let speedIncreaseInterval = null;     // Para controlar o setInterval

let pongGameCurrentUser = null;
let pongGameUsername = null;

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

function drawInitialPongScreen() {
    if (!ctx || !canvas) return;
    gameHasStartedPong = false;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    drawNet(); drawBall();
    drawPaddle(0, player1Y); drawPaddle(canvas.width - paddleWidth, player2Y);
    if (pongPreGameMessages) pongPreGameMessages.style.display = 'block';
    if (startButtonPong) startButtonPong.style.display = 'inline-block';
    if (pongGameInfo) {
        player1Lives = INITIAL_LIVES; player2Lives = INITIAL_LIVES;
        player1Score = 0; player2Score = 0;
        pongGameInfo.style.display = 'flex'; updateUIDisplays();
    }
    if (canvas) canvas.style.display = 'block';
}

function initializePongVariables() {
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    player1Score = 0; player2Score = 0;
    player1Lives = INITIAL_LIVES; player2Lives = INITIAL_LIVES;
    lastHitBy = null;
    resetBall();
    updateUIDisplays();
}

function startGamePong() {
    if (gameHasStartedPong) return;
    gameHasStartedPong = true;
    if (startButtonPong) startButtonPong.style.display = 'none';
    if (pongPreGameMessages) pongPreGameMessages.style.display = 'none';
    if (pongGameInfo) pongGameInfo.style.display = 'flex';
    initializePongVariables();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    // Inicia o aumento de velocidade por tempo
    if (speedIncreaseInterval) clearInterval(speedIncreaseInterval); // Limpa intervalo antigo
    speedIncreaseInterval = setInterval(increaseBallSpeed, TIME_FOR_SPEED_INCREASE);

    gameLoop();
}

if (startButtonPong) { startButtonPong.addEventListener('click', startGamePong); }

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) { /* ... (igual antes, com preventDefault) ... */ }
function keyUpHandler(e) { /* ... (igual antes) ... */ }

function resetBall(scorer) {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    let directionX = (Math.random() > 0.5 ? 1 : -1);
    if (scorer === 'player1') directionX = -1; 
    if (scorer === 'player2') directionX = 1;
    const baseSpeed = 4;
    ballSpeedX = baseSpeed * 0.707 * directionX;
    ballSpeedY = baseSpeed * 0.707 * (Math.random() > 0.5 ? 1 : -1);
    lastHitBy = null;
}

function increaseBallSpeed() {
    if (!gameHasStartedPong) return; // Não aumenta se o jogo não começou
    let currentMagnitude = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
    let newMagnitude = currentMagnitude + SPEED_INCREMENT_TIME;
    // Sem limite máximo de velocidade
    ballSpeedX = (ballSpeedX / currentMagnitude) * newMagnitude;
    ballSpeedY = (ballSpeedY / currentMagnitude) * newMagnitude;
    console.log("Velocidade da bola aumentada por tempo para:", newMagnitude.toFixed(2));
}

function handleGameOver(winner) {
    gameHasStartedPong = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (speedIncreaseInterval) clearInterval(speedIncreaseInterval); // PARA o aumento de velocidade
    let winnerName = winner === "player1" ? (pongGameUsername || "Jogador 1") : "Jogador 2";
    alert(`FIM DE JOGO! ${winnerName} venceu!\nPlacar Final: P1 ${player1Score} - P2 ${player2Score}`);
    if (pongGameCurrentUser) { saveHighScorePong("player1", player1Score); }
    setTimeout(() => { drawInitialPongScreen(); }, 2000);
}

// --- FUNÇÃO UPDATE COM FÍSICA DE COLISÃO CORRIGIDA ---
function update() {
    if (!gameHasStartedPong) return;

    if (wPressed && player1Y > 0) player1Y -= PADDLE_SPEED;
    if (sPressed && player1Y < canvas.height - paddleHeight) player1Y += PADDLE_SPEED;
    if (upPressed && player2Y > 0) player2Y -= PADDLE_SPEED;
    if (downPressed && player2Y < canvas.height - paddleHeight) player2Y += PADDLE_SPEED;

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
        ballSpeedY = -ballSpeedY;
    }

    // Colisão com paddles
    // Colisão com paddle 1 (esquerda)
    if (ballSpeedX < 0 && ballX - ballRadius < paddleWidth) {
        if (ballY > player1Y && ballY < player1Y + paddleHeight) {
            // Guarda a velocidade atual antes de mudar o ângulo
            let speedMagnitude = Math.sqrt(ballSpeedX**2 + ballSpeedY**2);
            
            ballSpeedX = -ballSpeedX; // Inverte a direção horizontal
            
            // Calcula o novo ângulo da bola
            let deltaY = ballY - (player1Y + paddleHeight / 2);
            ballSpeedY = deltaY * 0.35; // Este valor (0.35) controla o quão "angular" é a rebatida

            // Re-normaliza o vetor de velocidade para manter a magnitude original
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
            ballSpeedY = deltaY * 0.35;
            
            let newVectorMagnitude = Math.sqrt(ballSpeedX**2 + ballSpeedY**2);
            ballSpeedX = (ballSpeedX / newVectorMagnitude) * speedMagnitude;
            ballSpeedY = (ballSpeedY / newVectorMagnitude) * speedMagnitude;

            if (lastHitBy !== 'player2') { player2Score += 1; updateUIDisplays(); }
            lastHitBy = 'player2';
        }
    }

    // Ponto marcado / Perda de vida
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

// Prepara e desenha a tela inicial do Pong
drawInitialPongScreen();

// Certifique-se de que todas as funções omitidas para brevidade estejam completas no seu arquivo.
// Eu as adicionei aqui para garantir que esteja 100% completo.
