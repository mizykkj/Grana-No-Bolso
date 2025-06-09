// pong.js - ATUALIZADO com modo de 1 Jogador (IA)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreDisplay = document.getElementById('player1Score');
const player2ScoreDisplay = document.getElementById('player2Score');
const player1LivesDisplay = document.getElementById('player1Lives');
const player2LivesDisplay = document.getElementById('player2Lives');

// --- Novos Seletores para Modo de Jogo ---
const pongModeSelection = document.getElementById('pongModeSelection');
const onePlayerBtn = document.getElementById('onePlayerBtn');
const twoPlayerBtn = document.getElementById('twoPlayerBtn');

const pongGameInfo = document.getElementById('pongGameInfo');

// --- Configurações do Jogo ---
const paddleHeight = 100, paddleWidth = 10, ballRadius = 8, INITIAL_LIVES = 3;
const AI_PADDLE_SPEED = 5; // Velocidade da IA (um pouco mais lenta que o jogador)
const PLAYER_PADDLE_SPEED = 7;

let ballX, ballY, baseBallSpeedX, baseBallSpeedY, ballSpeedX, ballSpeedY;
let player1Y, player2Y;
let player1Score, player2Score, player1Lives, player2Lives;
let lastHitBy = null;

let upPressed = false, downPressed = false, wPressed = false, sPressed = false;
let gameHasStartedPong = false;
let animationFrameId;
let gameMode = null; // NOVO: 'AI' ou '2P'

let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 4, SPEED_INCREMENT = 0.4, MAX_BALL_SPEED_MAGNITUDE = 10;
let pongGameCurrentUser = null, pongGameUsername = null;

if (window.firebaseAuth && window.firebaseDb) { /* ... (onAuthStateChanged como antes) ... */ }

function updateUIDisplays() { /* ... (igual antes) ... */ }
function drawBall() { /* ... (igual antes) ... */ }
function drawPaddle(x, y) { /* ... (igual antes) ... */ }
function drawNet() { /* ... (igual antes) ... */ }
async function saveHighScorePong(playerIdentifier, scoreToSave) { /* ... (igual antes) ... */ }

function drawInitialPongScreen() {
    gameHasStartedPong = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (pongModeSelection) pongModeSelection.style.display = 'block';
    if (pongGameInfo) pongGameInfo.style.display = 'none';
    if (canvas) canvas.style.display = 'none'; // Esconde o canvas na tela inicial de seleção de modo
}

function initializePongVariables() {
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    player1Score = 0; player2Score = 0; player1Lives = INITIAL_LIVES; player2Lives = INITIAL_LIVES;
    paddleHitCount = 0; lastHitBy = null; baseBallSpeedX = 4; baseBallSpeedY = 4;
    resetBall(); updateUIDisplays();
}

function startGamePong() {
    if (gameHasStartedPong || !gameMode) return; // Só inicia se um modo foi escolhido
    gameHasStartedPong = true;
    if (pongModeSelection) pongModeSelection.style.display = 'none';
    if (pongGameInfo) pongGameInfo.style.display = 'flex';
    if (canvas) canvas.style.display = 'block';
    initializePongVariables();
    gameLoop();
}

// --- Listeners para Seleção de Modo ---
if (onePlayerBtn) {
    onePlayerBtn.addEventListener('click', () => {
        gameMode = 'AI';
        startGamePong();
    });
}
if (twoPlayerBtn) {
    twoPlayerBtn.addEventListener('click', () => {
        gameMode = '2P';
        startGamePong();
    });
}

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    const keyLower = e.key.toLowerCase();
    const isUp = keyLower === 'arrowup' || keyLower === 'up';
    const isDown = keyLower === 'arrowdown' || keyLower === 'down';
    const isW = keyLower === 'w';
    const isS = keyLower === 's';
    if (isUp || isDown || isW || isS) e.preventDefault();
    if (isUp) upPressed = true; if (isDown) downPressed = true;
    if (isW) wPressed = true; if (isS) sPressed = true;
}
function keyUpHandler(e) {
    const keyLower = e.key.toLowerCase();
    const isUp = keyLower === 'arrowup' || keyLower === 'up';
    const isDown = keyLower === 'arrowdown' || keyLower === 'down';
    const isW = keyLower === 'w';
    const isS = keyLower === 's';
    if (isUp) upPressed = false; if (isDown) downPressed = false;
    if (isW) wPressed = false; if (isS) sPressed = false;
}

function resetBall(scorer) { /* ... (igual antes) ... */ }
function increaseBallSpeed() { /* ... (igual antes) ... */ }

function handleGameOver(winner) {
    gameHasStartedPong = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    let winnerName = winner === "player1" ? (pongGameUsername || "Jogador 1") : "Jogador 2";
    alert(`FIM DE JOGO! ${winnerName} venceu!\nPlacar Final: P1 ${player1Score} - P2 ${player2Score}`);
    if (pongGameCurrentUser) { saveHighScorePong("player1", player1Score); }
    setTimeout(() => { drawInitialPongScreen(); }, 2000);
}

// --- NOVA FUNÇÃO PARA A IA ---
function moveAIPaddle() {
    const paddleCenter = player2Y + (paddleHeight / 2);
    const deadZone = 15; // A IA não se move se a bola estiver muito perto do centro da barra

    // A IA só reage se a bola estiver se movendo em sua direção e na sua metade do campo
    if (ballSpeedX > 0 && ballX > canvas.width / 3) {
        if (paddleCenter < ballY - deadZone) {
            // Bola está abaixo, mover para baixo
            player2Y += AI_PADDLE_SPEED;
        } else if (paddleCenter > ballY + deadZone) {
            // Bola está acima, mover para cima
            player2Y -= AI_PADDLE_SPEED;
        }
    }

    // Limitar o movimento da IA dentro do canvas
    if (player2Y < 0) { player2Y = 0; }
    else if (player2Y + paddleHeight > canvas.height) { player2Y = canvas.height - paddleHeight; }
}

// --- FUNÇÃO UPDATE ATUALIZADA ---
function update() {
    if (!gameHasStartedPong) return;

    // Movimento do Jogador 1 (sempre humano)
    if (wPressed && player1Y > 0) player1Y -= PLAYER_PADDLE_SPEED;
    if (sPressed && player1Y < canvas.height - paddleHeight) player1Y += PLAYER_PADDLE_SPEED;

    // Movimento do Jogador 2 (depende do modo de jogo)
    if (gameMode === '2P') {
        // Modo 2 Jogadores: usa as teclas
        if (upPressed && player2Y > 0) player2Y -= PLAYER_PADDLE_SPEED;
        if (downPressed && player2Y < canvas.height - paddleHeight) player2Y += PLAYER_PADDLE_SPEED;
    } else { // gameMode === 'AI'
        // Modo 1 Jogador: usa a lógica da IA
        moveAIPaddle();
    }

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // ... (toda a lógica de colisão e pontuação continua a mesma) ...
    // ...
}

function draw() { /* ... (igual antes) ... */ }

function gameLoop() {
    update();
    draw();
    if (gameHasStartedPong) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Prepara a tela inicial de seleção de modo
drawInitialPongScreen();

// Para garantir que as funções omitidas para brevidade estejam no seu código final,
// cole aqui as versões completas de: updateUIDisplays, drawBall, drawPaddle, drawNet,
// saveHighScorePong, resetBall, e increaseBallSpeed da última versão completa do pong.js que te enviei.
