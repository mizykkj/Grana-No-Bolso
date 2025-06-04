// pong.js - ATUALIZADO com LOGS DE DEBUG para tela inicial
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreDisplay = document.getElementById('player1Score');
const player2ScoreDisplay = document.getElementById('player2Score');
const player1LivesDisplay = document.getElementById('player1Lives');
const player2LivesDisplay = document.getElementById('player2Lives');

const startButtonPong = document.getElementById('startButtonPong');
const pongGameInfo = document.getElementById('pongGameInfo');
const pongPreGameMessages = document.getElementById('pongPreGameMessages');

// Configurações do Jogo
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

let upPressed = false; let downPressed = false; let wPressed = false; let sPressed = false;
let gameHasStartedPong = false;
let animationFrameId;

let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 5;
const SPEED_INCREMENT = 0.3;
const MAX_BALL_SPEED_MAGNITUDE = 10;

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
} else {
    console.error("Pong.js: Instâncias do Firebase não disponíveis para onAuthStateChanged!");
}

function updateUIDisplays() {
    if (player1ScoreDisplay) player1ScoreDisplay.textContent = player1Score;
    if (player2ScoreDisplay) player2ScoreDisplay.textContent = player2Score;
    if (player1LivesDisplay) player1LivesDisplay.textContent = player1Lives;
    if (player2LivesDisplay) player2LivesDisplay.textContent = player2Lives;
}

function drawInitialPongScreen() {
    console.log("PONG.JS: Iniciando drawInitialPongScreen"); // DEBUG
    if (!ctx || !canvas) {
        console.error("PONG.JS: CTX ou Canvas NÃO ENCONTRADO em drawInitialPongScreen!");
        return;
    }
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log("PONG.JS: Canvas preenchido com #0a0a0a"); // DEBUG

    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    console.log(`PONG.JS: Posições Iniciais Definidas - ballX: ${ballX}, ballY: ${ballY}, p1Y: ${player1Y}, p2Y: ${player2Y}`); // DEBUG

    drawNet();
    drawBall();
    drawPaddle(0, player1Y);
    drawPaddle(canvas.width - paddleWidth, player2Y);

    if (pongPreGameMessages) pongPreGameMessages.style.display = 'block';
    if (startButtonPong) startButtonPong.style.display = 'inline-block';
    if (pongGameInfo) pongGameInfo.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    updateUIDisplays();
    console.log("PONG.JS: Elementos da UI para tela inicial atualizados."); // DEBUG
}

function initializePongVariables() {
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    player1Score = 0;
    player2Score = 0;
    player1Lives = INITIAL_LIVES;
    player2Lives = INITIAL_LIVES;
    paddleHitCount = 0;
    baseBallSpeedX = 4;
    baseBallSpeedY = 4;
    resetBall();
    updateUIDisplays();
}

function startGamePong() {
    if (gameHasStartedPong) return;
    gameHasStartedPong = true;
    console.log("PONG.JS: startGamePong() chamado."); // DEBUG

    if (startButtonPong) startButtonPong.style.display = 'none';
    if (pongPreGameMessages) pongPreGameMessages.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    if (pongGameInfo) pongGameInfo.style.display = 'flex';

    initializePongVariables();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop();
}

if (startButtonPong) {
    startButtonPong.addEventListener('click', startGamePong);
} else {
    console.warn("PONG.JS: Botão startButtonPong não encontrado.");
}

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    const relevantKeys = ['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'];
    if (!gameHasStartedPong && relevantKeys.includes(e.key === 'W' || e.key === 'S' ? e.key.toLowerCase() : e.key )) { // Normaliza W/S para minúsculas
        startGamePong();
    }
    if (relevantKeys.includes(e.key === 'W' || e.key === 'S' ? e.key.toLowerCase() : e.key)) e.preventDefault();
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

function drawNet() {
    console.log("PONG.JS: drawNet() chamada"); // DEBUG
    ctx.beginPath(); ctx.setLineDash([10, 15]); ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height); ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2; ctx.stroke(); ctx.closePath(); ctx.setLineDash([]);
}
function drawBall() {
    console.log("PONG.JS: drawBall() chamada"); // DEBUG
    ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.closePath();
}
function drawPaddle(x, y) {
    console.log(`PONG.JS: drawPaddle() chamada para x=${x}, y=${y}`); // DEBUG
    ctx.beginPath(); ctx.rect(x, y, paddleWidth, paddleHeight);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.closePath();
}

function resetBall(lastWinner) {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    let directionX = (Math.random() > 0.5 ? 1 : -1);
    if (lastWinner === 'player1') directionX = 1;
    if (lastWinner === 'player2') directionX = -1;
    
    // Mantém a magnitude da velocidade atual ou usa a base se não definida
    let currentSpeedMagnitude = Math.sqrt((ballSpeedX || baseBallSpeedX)**2 + (ballSpeedY || baseBallSpeedY)**2);
    if (currentSpeedMagnitude < 4 || isNaN(currentSpeedMagnitude)) currentSpeedMagnitude = 4; 
    if (currentSpeedMagnitude > MAX_BALL_SPEED_MAGNITUDE) currentSpeedMagnitude = MAX_BALL_SPEED_MAGNITUDE;

    ballSpeedX = currentSpeedMagnitude * (Math.cos(Math.PI / 4)) * directionX; // ~45 graus
    ballSpeedY = currentSpeedMagnitude * (Math.sin(Math.PI / 4)) * (Math.random() > 0.5 ? 1 : -1);

    if (Math.abs(ballSpeedY) < 1.5) ballSpeedY = (ballSpeedY > 0 ? 1 : -1) * 1.5; // Evita ficar muito horizontal
    console.log(`PONG.JS: Bola resetada. ballSpeedX: ${ballSpeedX.toFixed(2)}, ballSpeedY: ${ballSpeedY.toFixed(2)}`); // DEBUG
}

function increaseBallSpeed() {
    let currentMagnitude = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
    if (currentMagnitude < MAX_BALL_SPEED_MAGNITUDE) {
        let newMagnitude = currentMagnitude + SPEED_INCREMENT;
        if (newMagnitude > MAX_BALL_SPEED_MAGNITUDE) newMagnitude = MAX_BALL_SPEED_MAGNITUDE;
        ballSpeedX = (ballSpeedX / currentMagnitude) * newMagnitude;
        ballSpeedY = (ballSpeedY / currentMagnitude) * newMagnitude;
        console.log("PONG.JS: Velocidade da bola aumentada para:", newMagnitude.toFixed(2));
    }
}

async function saveHighScorePong(playerIdentifier, scoreToSave) {
    console.log(`SaveHighScorePong: Tentando salvar para ${playerIdentifier}. User:`, pongGameCurrentUser, "Username:", pongGameUsername, "Score:", scoreToSave);
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
                console.log(`Nova pontuação de Pong (${scoreToSave}) não é maior que o highscore existente (${docSnap.data().score}).`);
            }
        } catch (error) { console.error("Erro ao salvar/atualizar highscore de Pong: ", error); }
    } else if (pongGameCurrentUser && playerIdentifier === "player2") {
        console.log("Jogador 2 venceu. Neste exemplo, salvamos apenas o score do Jogador 1 (se logado).");
    } else if (!pongGameCurrentUser) {
        console.log("Nenhum usuário logado. Highscore de Pong não será salvo.");
    }
}

function handleGameOver(winner) {
    gameHasStartedPong = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    let winnerName = winner === "player1" ? (pongGameUsername || "Jogador 1") : "Jogador 2";
    alert(`FIM DE JOGO! ${winnerName} venceu! \nPlacar Final: P1 ${player1Score} (Vidas: ${player1Lives}) - P2 ${player2Score} (Vidas: ${player2Lives})`);

    if (pongGameCurrentUser && winner === "player1") { // Salva o score do P1 se ele estiver logado e vencer
        saveHighScorePong("player1", player1Score);
    } else if (pongGameCurrentUser && winner === "player2") {
        // Se o usuário logado for P1, mas P2 venceu, talvez salvar o score de P1 (que perdeu)
        // ou não salvar nada. Por enquanto, só salvamos se P1 (logado) vencer.
        // Para uma lógica mais complexa, você precisaria saber qual jogador é o usuário logado.
        // Vamos salvar o score do Jogador 1 mesmo que ele tenha perdido, se ele estiver logado.
        saveHighScorePong("player1", player1Score);
        console.log("Jogador 2 venceu, mas salvando a pontuação final do Jogador 1 (logado).")
    }


    if (startButtonPong) startButtonPong.style.display = 'inline-block';
    if (pongPreGameMessages) pongPreGameMessages.style.display = 'block';
    // Não esconder o canvas, apenas redesenhar a tela inicial para o próximo jogo
    drawInitialPongScreen();
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
    if (ballX - ballRadius < paddleWidth && ballX - ballRadius > 0 && ballY > player1Y && ballY < player1Y + paddleHeight) {
        ballSpeedX = -ballSpeedX; // Inverte direção X
        let deltaY = ballY - (player1Y + paddleHeight / 2);
        ballSpeedY = ballSpeedY + (deltaY * 0.15); // Adiciona uma leve influência do ângulo, limita para não ficar muito rápido
        if (Math.abs(ballSpeedY) > Math.abs(ballSpeedX) * 1.5) ballSpeedY = (ballSpeedY > 0 ? 1 : -1) * Math.abs(ballSpeedX) * 1.5; // Limita ângulo
        paddleHit = true;
    } else if (ballX + ballRadius > canvas.width - paddleWidth && ballX + ballRadius < canvas.width && ballY > player2Y && ballY < player2Y + paddleHeight) {
        ballSpeedX = -ballSpeedX; // Inverte direção X
        let deltaY = ballY - (player2Y + paddleHeight / 2);
        ballSpeedY = ballSpeedY + (deltaY * 0.15);
        if (Math.abs(ballSpeedY) > Math.abs(ballSpeedX) * 1.5) ballSpeedY = (ballSpeedY > 0 ? 1 : -1) * Math.abs(ballSpeedX) * 1.5;
        paddleHit = true;
    }

    if (paddleHit) {
        paddleHitCount++;
        if (paddleHitCount > 0 && paddleHitCount % HITS_FOR_SPEED_INCREASE === 0) {
            increaseBallSpeed();
        }
    }

    if (ballX - ballRadius < 0) {
        player2Score++; player1Lives--; updateUIDisplays();
        if (player1Lives <= 0) { handleGameOver("player2"); return; }
        resetBall("player2");
    } else if (ballX + ballRadius > canvas.width) {
        player1Score++; player2Lives--; updateUIDisplays();
        if (player2Lives <= 0) { handleGameOver("player1"); return; }
        resetBall("player1");
    }
}

function draw() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameHasStartedPong) {
        drawNet(); drawBall();
        drawPaddle(0, player1Y); drawPaddle(canvas.width - paddleWidth, player2Y);
    } else {
        // A função drawInitialPongScreen cuida do desenho da tela inicial.
        // Podemos chamá-la aqui se quisermos que ela seja redesenhada constantemente
        // antes do jogo começar, mas não é necessário se for estática.
    }
}

function gameLoop() {
    update();
    draw();
    if (gameHasStartedPong) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Prepara e desenha a tela inicial do Pong quando o script carrega
drawInitialPongScreen();
