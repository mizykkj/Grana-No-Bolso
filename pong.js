// pong.js - ATUALIZADO com novo sistema de pontuação (Defesa/Ataque)

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

let ballX, ballY, baseBallSpeedX, baseBallSpeedY, ballSpeedX, ballSpeedY;
let player1Y, player2Y;
const PADDLE_SPEED = 7;
let player1Score = 0;
let player2Score = 0;
let player1Lives = INITIAL_LIVES;
let player2Lives = INITIAL_LIVES;
let lastHitBy = null; // NOVO: 'player1' ou 'player2'

let upPressed = false, downPressed = false, wPressed = false, sPressed = false;
let gameHasStartedPong = false;
let animationFrameId;

// Para aumento gradual de velocidade
let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 4; // Aumenta velocidade a cada 4 rebatidas no total
const SPEED_INCREMENT = 0.4;
const MAX_BALL_SPEED_MAGNITUDE = 10;

// Usuário Logado
let pongGameCurrentUser = null;
let pongGameUsername = null;

if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) {
            pongGameCurrentUser = user;
            try {
                const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get();
                pongGameUsername = (userDoc.exists && userDoc.data().username) ? userDoc.data().username : user.email;
            } catch (error) { pongGameUsername = user.email; }
        } else {
            pongGameCurrentUser = null; pongGameUsername = null;
        }
    });
}

// --- Funções de Setup e UI ---
function updateUIDisplays() {
    if (player1ScoreDisplay) player1ScoreDisplay.textContent = player1Score;
    if (player2ScoreDisplay) player2ScoreDisplay.textContent = player2Score;
    if (player1LivesDisplay) player1LivesDisplay.textContent = player1Lives;
    if (player2LivesDisplay) player2LivesDisplay.textContent = player2Lives;
}

function drawInitialPongScreen() {
    if (!ctx || !canvas) return;
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
    player1Score = 0;
    player2Score = 0;
    player1Lives = INITIAL_LIVES;
    player2Lives = INITIAL_LIVES;
    paddleHitCount = 0;
    lastHitBy = null;
    baseBallSpeedX = 4;
    baseBallSpeedY = 4;
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
    gameLoop();
}

if (startButtonPong) startButtonPong.addEventListener('click', startGamePong);

// --- Controles ---
document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    const relevantKeys = ['ArrowUp', 'ArrowDown', 'w', 's'];
    if (!gameHasStartedPong && relevantKeys.some(k => k === e.key.toLowerCase())) {
        startGamePong();
    }
    if (relevantKeys.some(k => k === e.key.toLowerCase())) e.preventDefault();
    if (e.key === 'Up' || e.key === 'ArrowUp') upPressed = true;
    if (e.key === 'Down' || e.key === 'ArrowDown') downPressed = true;
    if (e.key.toLowerCase() === 'w') wPressed = true;
    if (e.key.toLowerCase() === 's') sPressed = true;
}
function keyUpHandler(e) {
    if (e.key === 'Up' || e.key === 'ArrowUp') upPressed = false;
    if (e.key === 'Down' || e.key === 'ArrowDown') downPressed = false;
    if (e.key.toLowerCase() === 'w') wPressed = false;
    if (e.key.toLowerCase() === 's') sPressed = false;
}

// --- Funções de Desenho ---
function drawBall() { ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.closePath(); }
function drawPaddle(x, y) { ctx.beginPath(); ctx.rect(x, y, paddleWidth, paddleHeight); ctx.fillStyle = '#fff'; ctx.fill(); ctx.closePath(); }
function drawNet() { ctx.beginPath(); ctx.setLineDash([10, 15]); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.closePath(); ctx.setLineDash([]); }

// --- Lógica de Jogo ---
function resetBall(scorer) {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    let directionX = (Math.random() > 0.5 ? 1 : -1);
    if (scorer === 'player1') directionX = -1; // Bola vai para quem marcou o ponto
    if (scorer === 'player2') directionX = 1;
    
    ballSpeedX = baseBallSpeedX * directionX;
    ballSpeedY = baseBallSpeedY * (Math.random() > 0.5 ? 1 : -1);
    lastHitBy = null; // Reseta quem tocou por último
}

function increaseBallSpeed() {
    let currentMagnitude = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
    if (currentMagnitude < MAX_BALL_SPEED_MAGNITUDE) {
        let newMagnitude = currentMagnitude + SPEED_INCREMENT;
        ballSpeedX = (ballSpeedX / currentMagnitude) * newMagnitude;
        ballSpeedY = (ballSpeedY / currentMagnitude) * newMagnitude;
    }
}

async function saveHighScorePong(playerIdentifier, scoreToSave) {
    if (pongGameCurrentUser && playerIdentifier === "player1" && window.firebaseDb) {
        const userId = pongGameCurrentUser.uid;
        const gameId = "pong";
        const usernameToSave = pongGameUsername || pongGameCurrentUser.email;
        const highScoreDocId = `${userId}|${gameId}`;
        const highScoreRef = window.firebaseDb.collection("highscores").doc(highScoreDocId);
        try {
            const docSnap = await highScoreRef.get();
            if (!docSnap.exists || scoreToSave > docSnap.data().score) {
                await highScoreRef.set({
                    userId: userId, username: usernameToSave, gameId: gameId,
                    score: scoreToSave, timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Highscore de Pong salvo/atualizado: ${scoreToSave}`);
            }
        } catch (error) { console.error("Erro ao salvar highscore de Pong: ", error); }
    }
}

function handleGameOver(winner) {
    gameHasStartedPong = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    let winnerName = winner === "player1" ? (pongGameUsername || "Jogador 1") : "Jogador 2";
    alert(`FIM DE JOGO! ${winnerName} venceu!\nPlacar Final: P1 ${player1Score} - P2 ${player2Score}`);
    
    if (pongGameCurrentUser) { // Se houver um usuário logado
        saveHighScorePong("player1", player1Score); // Salva o score final do Jogador 1 (que é o usuário logado)
    }

    setTimeout(() => { drawInitialPongScreen(); }, 2000); // Mostra a tela inicial após 2 segundos
}

function update() {
    if (!gameHasStartedPong) return;

    if (wPressed && player1Y > 0) player1Y -= PADDLE_SPEED;
    if (sPressed && player1Y < canvas.height - paddleHeight) player1Y += PADDLE_SPEED;
    if (upPressed && player2Y > 0) player2Y -= PADDLE_SPEED;
    if (downPressed && player2Y < canvas.height - paddleHeight) player2Y += PADDLE_SPEED;

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) ballSpeedY = -ballSpeedY;

    let paddleHit = false;
    // Colisão com paddle 1 (esquerda)
    if (ballX - ballRadius < paddleWidth && ballX - ballRadius > 0 && ballY > player1Y && ballY < player1Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        let deltaY = ballY - (player1Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.25; // Leve ângulo de rebote
        
        // NOVO: Adiciona ponto de defesa
        if (lastHitBy !== 'player1') { // Evita ganhar pontos rebatendo em sequência
             player1Score += 1;
             updateUIDisplays();
        }
        lastHitBy = 'player1';
        paddleHit = true;
    } 
    // Colisão com paddle 2 (direita)
    else if (ballX + ballRadius > canvas.width - paddleWidth && ballX + ballRadius < canvas.width && ballY > player2Y && ballY < player2Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        let deltaY = ballY - (player2Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.25;
        
        // NOVO: Adiciona ponto de defesa
        if (lastHitBy !== 'player2') {
            player2Score += 1;
            updateUIDisplays();
        }
        lastHitBy = 'player2';
        paddleHit = true;
    }

    if (paddleHit) {
        paddleHitCount++;
        if (paddleHitCount > 0 && paddleHitCount % HITS_FOR_SPEED_INCREASE === 0) {
            increaseBallSpeed();
        }
    }

    // Ponto marcado / Perda de vida
    if (ballX - ballRadius < 0) { // Ponto para Jogador 2
        player1Lives--; // Jogador 1 perde vida
        player2Score += 2; // Jogador 2 ganha 2 pontos de ataque
        updateUIDisplays();
        if (player1Lives <= 0) { handleGameOver("player2"); return; }
        resetBall("player2");
    } else if (ballX + ballRadius > canvas.width) { // Ponto para Jogador 1
        player2Lives--; // Jogador 2 perde vida
        player1Score += 2; // Jogador 1 ganha 2 pontos de ataque
        updateUIDisplays();
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
