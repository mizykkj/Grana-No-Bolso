// pong.js - ATUALIZADO com reset de velocidade e física de bola aprimorada

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

function updateUIDisplays() { if (player1ScoreDisplay) player1ScoreDisplay.textContent = player1Score; if (player2ScoreDisplay) player2ScoreDisplay.textContent = player2Score; if (player1LivesDisplay) player1LivesDisplay.textContent = player1Lives; if (player2LivesDisplay) player2LivesDisplay.textContent = player2Lives; }
function drawBall() { ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.closePath(); }
function drawPaddle(x, y) { ctx.beginPath(); ctx.rect(x, y, paddleWidth, paddleHeight); ctx.fillStyle = '#fff'; ctx.fill(); ctx.closePath(); }
function drawNet() { ctx.beginPath(); ctx.setLineDash([10, 15]); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.closePath(); ctx.setLineDash([]); }
async function saveHighScorePong(playerIdentifier, scoreToSave) { if (pongGameCurrentUser && playerIdentifier === "player1" && window.firebaseDb) { const userId = pongGameCurrentUser.uid; const gameId = "pong"; const usernameToSave = pongGameUsername || pongGameCurrentUser.email; const highScoreDocId = `${userId}|${gameId}`; const highScoreRef = window.firebaseDb.collection("highscores").doc(highScoreDocId); try { const docSnap = await highScoreRef.get(); if (!docSnap.exists || scoreToSave > docSnap.data().score) { await highScoreRef.set({ userId, username: usernameToSave, gameId, score: scoreToSave, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); } } catch (error) { console.error("Erro ao salvar highscore de Pong: ", error); } } }

function drawInitialPongScreen() {
    gameHasStartedPong = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (speedIncreaseInterval) clearInterval(speedIncreaseInterval);
    if (pongModeSelection) pongModeSelection.style.display = 'block';
    if (pongGameInfo) pongGameInfo.style.display = 'none';
    if (canvas) canvas.style.display = 'none';
}

function initializePongVariables() {
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    player1Score = 0; player2Score = 0;
    player1Lives = INITIAL_LIVES; player2Lives = INITIAL_LIVES;
    lastHitBy = null;
    baseBallSpeedX = 4; // Velocidade base X
    baseBallSpeedY = 4; // Velocidade base Y
    
    // CORREÇÃO: Garante que a velocidade da bola seja resetada para a base
    let directionX = (Math.random() > 0.5 ? 1 : -1);
    ballSpeedX = baseBallSpeedX * directionX;
    ballSpeedY = baseBallSpeedY * (Math.random() > 0.5 ? 1 : -1);
    
    resetBallPosition(); // Apenas reseta a posição
    updateUIDisplays();
}

function startGamePong() {
    if (gameHasStartedPong || !gameMode) return;
    gameHasStartedPong = true;
    if (pongModeSelection) pongModeSelection.style.display = 'none';
    if (pongGameInfo) pongGameInfo.style.display = 'flex';
    if (canvas) canvas.style.display = 'block';
    initializePongVariables();
    if (speedIncreaseInterval) clearInterval(speedIncreaseInterval);
    speedIncreaseInterval = setInterval(increaseBallSpeed, TIME_FOR_SPEED_INCREASE);
    gameLoop();
}

if (onePlayerBtn) { onePlayerBtn.addEventListener('click', () => { gameMode = 'AI'; startGamePong(); }); }
if (twoPlayerBtn) { twoPlayerBtn.addEventListener('click', () => { gameMode = '2P'; startGamePong(); }); }

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) { /* ... (igual antes) ... */ }
function keyUpHandler(e) { /* ... (igual antes) ... */ }

function resetBallPosition() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
}

function resetBall(scorer) {
    resetBallPosition();
    let directionX = (Math.random() > 0.5 ? 1 : -1);
    if (scorer === 'player1') directionX = -1; 
    if (scorer === 'player2') directionX = 1;
    let speedMagnitude = Math.sqrt((ballSpeedX**2) + (ballSpeedY**2)); // Mantém a velocidade atual
    ballSpeedX = speedMagnitude * 0.707 * directionX;
    ballSpeedY = speedMagnitude * 0.707 * (Math.random() > 0.5 ? 1 : -1);
    lastHitBy = null;
}

function increaseBallSpeed() {
    if (!gameHasStartedPong) return;
    let mag = Math.sqrt(ballSpeedX**2 + ballSpeedY**2); 
    // Sem limite máximo para velocidade "quase infinita"
    let newMag = mag + SPEED_INCREMENT_TIME;
    ballSpeedX = (ballSpeedX/mag)*newMag; 
    ballSpeedY = (ballSpeedY/mag)*newMag;
    console.log("Velocidade do Pong aumentada para:", newMag.toFixed(2));
}

function handleGameOver(winner) {
    gameHasStartedPong = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (speedIncreaseInterval) clearInterval(speedIncreaseInterval);
    let winnerName = winner === "player1" ? (pongGameUsername || "Jogador 1") : "Jogador 2";
    alert(`FIM DE JOGO! ${winnerName} venceu!\nPlacar Final: P1 ${player1Score} - P2 ${player2Score}`);
    if (pongGameCurrentUser) { saveHighScorePong("player1", player1Score); }
    setTimeout(() => { drawInitialPongScreen(); }, 2000);
}

function moveAIPaddle() { /* ... (igual antes) ... */ }

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

    if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) ballSpeedY = -ballSpeedY;

    // Colisão com paddles
    // Colisão com paddle 1 (esquerda)
    if (ballSpeedX < 0 && ballX - ballRadius < paddleWidth) {
        if (ballY > player1Y && ballY < player1Y + paddleHeight) {
            let speedMagnitude = Math.sqrt(ballSpeedX**2 + ballSpeedY**2);
            ballSpeedX = -ballSpeedX;
            let deltaY = ballY - (player1Y + paddleHeight / 2);
            ballSpeedY = deltaY * 0.35;
            
            // CORREÇÃO: Evitar que a bola fique presa em loop vertical
            if (Math.abs(ballSpeedX) < 0.5) ballSpeedX = (ballSpeedX > 0 ? 0.5 : -0.5);
            
            // Re-normaliza o vetor para MANTER a velocidade constante, mudando apenas o ângulo
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

            if (Math.abs(ballSpeedX) < 0.5) ballSpeedX = (ballSpeedX > 0 ? 0.5 : -0.5);

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

function draw() { /* ... (igual antes) ... */ }
function gameLoop() { /* ... (igual antes) ... */ }

drawInitialPongScreen();
