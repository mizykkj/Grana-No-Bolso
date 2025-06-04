// pong.js - ATUALIZADO com vidas, score infinito, velocidade gradual, tela de início
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreDisplay = document.getElementById('player1Score');
const player2ScoreDisplay = document.getElementById('player2Score');
const player1LivesDisplay = document.getElementById('player1Lives'); // NOVO
const player2LivesDisplay = document.getElementById('player2Lives'); // NOVO

const startButtonPong = document.getElementById('startButtonPong');
const pongGameInfo = document.getElementById('pongGameInfo');
const pongPreGameMessages = document.getElementById('pongPreGameMessages');

// Configurações do Jogo
const paddleHeight = 100;
const paddleWidth = 10;
const ballRadius = 8; // Bola um pouco menor
const INITIAL_LIVES = 3;

let ballX, ballY, baseBallSpeedX, baseBallSpeedY, ballSpeedX, ballSpeedY;
let player1Y, player2Y;
const PADDLE_SPEED = 7; // Ajustado
let player1Score = 0;
let player2Score = 0;
let player1Lives = INITIAL_LIVES; // NOVO
let player2Lives = INITIAL_LIVES; // NOVO

let upPressed = false; let downPressed = false; let wPressed = false; let sPressed = false;
let gameHasStartedPong = false;
let animationFrameId;

// Para aumento gradual de velocidade
let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 5; // Aumenta velocidade a cada 5 rebatidas nos paddles
const SPEED_INCREMENT = 0.3; // Quanto aumenta a velocidade
const MAX_BALL_SPEED_MAGNITUDE = 10; // Velocidade máxima da bola

let pongGameCurrentUser = null;
let pongGameUsername = null;

if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) {
            console.log("Pong.js - onAuthStateChanged: Usuário LOGADO:", user.email);
            pongGameCurrentUser = user;
            try {
                const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get();
                if (userDoc.exists && userDoc.data().username) {
                    pongGameUsername = userDoc.data().username;
                } else { pongGameUsername = user.email; }
            } catch (error) { pongGameUsername = user.email; }
        } else {
            console.log("Pong.js - onAuthStateChanged: Usuário DESLOGADO.");
            pongGameCurrentUser = null; pongGameUsername = null;
        }
    });
}

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
    // Posições iniciais para paddles e bola
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    drawNet(); drawBall();
    drawPaddle(0, player1Y); drawPaddle(canvas.width - paddleWidth, player2Y);

    if (pongPreGameMessages) pongPreGameMessages.style.display = 'block';
    if (startButtonPong) startButtonPong.style.display = 'inline-block';
    if (pongGameInfo) pongGameInfo.style.display = 'none';
    if (canvas) canvas.style.display = 'block'; // Canvas visível
    updateUIDisplays(); // Mostra vidas iniciais
}

function initializePongVariables() {
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    player1Score = 0;
    player2Score = 0;
    player1Lives = INITIAL_LIVES;
    player2Lives = INITIAL_LIVES;
    paddleHitCount = 0; // Reseta contador de rebatidas

    baseBallSpeedX = 4; // Velocidade X base
    baseBallSpeedY = 4; // Velocidade Y base (magnitude)
    resetBall(); // Coloca a bola no centro com velocidade inicial
    updateUIDisplays();
}

function startGamePong() {
    if (gameHasStartedPong) return;
    gameHasStartedPong = true;

    if (startButtonPong) startButtonPong.style.display = 'none';
    if (pongPreGameMessages) pongPreGameMessages.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    if (pongGameInfo) pongGameInfo.style.display = 'flex';

    initializePongVariables();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

if (startButtonPong) startButtonPong.addEventListener('click', startGamePong);

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    const relevantKeys = ['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'];
    if (!gameHasStartedPong && relevantKeys.includes(e.key)) {
        startGamePong();
    }
    if (relevantKeys.includes(e.key)) e.preventDefault();
    if (e.key === 'Up' || e.key === 'ArrowUp') upPressed = true;
    if (e.key === 'Down' || e.key === 'ArrowDown') downPressed = true;
    if (e.key.toLowerCase() === 'w') wPressed = true;
    if (e.key.toLowerCase() === 's') sPressed = true;
}
function keyUpHandler(e) { /* ... (igual antes) ... */ if (e.key === 'Up' || e.key === 'ArrowUp') upPressed = false; if (e.key === 'Down' || e.key === 'ArrowDown') downPressed = false; if (e.key.toLowerCase() === 'w') wPressed = false; if (e.key.toLowerCase() === 's') sPressed = false;}

function drawBall() { /* ... (igual antes) ... */ }
function drawPaddle(x, y) { /* ... (igual antes) ... */ }
function drawNet() { /* ... (igual antes) ... */ }

function resetBall(lastWinner) { // lastWinner pode ser 'player1' ou 'player2'
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;

    // A bola vai para o lado oposto de quem marcou o último ponto (ou aleatório no início)
    let directionX = (Math.random() > 0.5 ? 1 : -1);
    if (lastWinner === 'player1') directionX = 1; // Bola vai para jogador 2
    if (lastWinner === 'player2') directionX = -1; // Bola vai para jogador 1
    
    ballSpeedX = baseBallSpeedX * directionX;
    ballSpeedY = baseBallSpeedY * (Math.random() > 0.5 ? 1 : -1); // Direção Y aleatória
}

function increaseBallSpeed() {
    let currentMagnitude = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
    if (currentMagnitude < MAX_BALL_SPEED_MAGNITUDE) {
        let newMagnitude = currentMagnitude + SPEED_INCREMENT;
        if (newMagnitude > MAX_BALL_SPEED_MAGNITUDE) newMagnitude = MAX_BALL_SPEED_MAGNITUDE;
        
        ballSpeedX = (ballSpeedX / currentMagnitude) * newMagnitude;
        ballSpeedY = (ballSpeedY / currentMagnitude) * newMagnitude;
        console.log("Velocidade da bola aumentada para:", newMagnitude.toFixed(2));
    }
}

async function saveHighScorePong(playerIdentifier, scoreToSave) {
    // Salva o score do Jogador 1 (usuário logado) se ele for o 'playerIdentifier'
    // ou se for um jogo onde o score do usuário logado é sempre o player1Score
    if (pongGameCurrentUser && playerIdentifier === "player1" && window.firebaseDb) {
        const userId = pongGameCurrentUser.uid;
        const gameId = "pong";
        const usernameToSave = pongGameUsername || pongGameCurrentUser.email;
        const highScoreDocId = `${userId}_${gameId}`;
        const highScoreRef = window.firebaseDb.collection("highscores").doc(highScoreDocId);
        try {
            const docSnap = await highScoreRef.get();
            if (!docSnap.exists || scoreToSave > docSnap.data().score) {
                await highScoreRef.set({
                    userId: userId, username: usernameToSave, gameId: gameId,
                    score: scoreToSave, timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Highscore de Pong salvo/atualizado: ${scoreToSave} por ${usernameToSave}`);
            } else {
                console.log(`Nova pontuação de Pong (${scoreToSave}) não é maior.`);
            }
        } catch (error) { console.error("Erro ao salvar/atualizar highscore de Pong: ", error); }
    } else {
        // console.log("Condições para salvar highscore de Pong não atendidas.");
    }
}

function handleGameOver(winner) {
    gameHasStartedPong = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    let winnerName = winner === "player1" ? (pongGameUsername || "Jogador 1") : "Jogador 2";
    alert(`FIM DE JOGO! ${winnerName} venceu! \nPlacar Final: P1 ${player1Score} (Vidas: ${player1Lives}) - P2 ${player2Score} (Vidas: ${player2Lives})`);

    // Salva o score do Jogador 1 se ele for o usuário logado
    if (pongGameCurrentUser) {
        saveHighScorePong("player1", player1Score); // Salva a pontuação acumulada do Jogador 1
    }

    if (startButtonPong) startButtonPong.style.display = 'inline-block';
    if (pongPreGameMessages) pongPreGameMessages.style.display = 'block';
    if (canvas) canvas.style.display = 'block'; // Manter canvas visível com estado final
    drawInitialPongScreen(); // Redesenha a tela inicial, mas o jogo não recomeça automaticamente
    // Para reiniciar, o usuário precisa clicar no botão ou usar as teclas
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

    // Colisão com paddles - SEM aumento de velocidade aqui, apenas inversão e leve ângulo
    let paddleHit = false;
    if (ballX - ballRadius < paddleWidth && ballX - ballRadius > 0 && ballY > player1Y && ballY < player1Y + paddleHeight) { // Paddle 1
        ballSpeedX = -ballSpeedX;
        let deltaY = ballY - (player1Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.2; // Ângulo de rebote mais sutil, não afeta magnitude geral drasticamente
        paddleHit = true;
    } else if (ballX + ballRadius > canvas.width - paddleWidth && ballX + ballRadius < canvas.width && ballY > player2Y && ballY < player2Y + paddleHeight) { // Paddle 2
        ballSpeedX = -ballSpeedX;
        let deltaY = ballY - (player2Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.2;
        paddleHit = true;
    }

    if (paddleHit) {
        paddleHitCount++;
        if (paddleHitCount % HITS_FOR_SPEED_INCREASE === 0) {
            increaseBallSpeed();
        }
    }

    // Pontuação e Vidas
    if (ballX - ballRadius < 0) { // Ponto para Jogador 2, Jogador 1 perde vida
        player2Score++;
        player1Lives--;
        updateUIDisplays();
        if (player1Lives <= 0) { handleGameOver("player2"); return; }
        resetBall("player2"); // Bola vai para o lado do jogador 1
    } else if (ballX + ballRadius > canvas.width) { // Ponto para Jogador 1, Jogador 2 perde vida
        player1Score++;
        player2Lives--;
        updateUIDisplays();
        if (player2Lives <= 0) { handleGameOver("player1"); return; }
        resetBall("player1"); // Bola vai para o lado do jogador 2
    }
}

function draw() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameHasStartedPong) {
        drawNet(); drawBall();
        drawPaddle(0, player1Y); drawPaddle(canvas.width - paddleWidth, player2Y);
    } else {
        // Se o jogo não começou, desenha a tela inicial (já é feito por drawInitialPongScreen)
        // Poderia redesenhar aqui se quisesse animação na tela inicial
    }
}

function gameLoop() {
    update();
    draw();
    if (gameHasStartedPong) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Prepara a tela inicial do Pong
drawInitialPongScreen();
