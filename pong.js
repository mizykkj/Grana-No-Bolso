// pong.js - ATUALIZADO com botão de início, username e highscore
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreDisplay = document.getElementById('player1Score');
const player2ScoreDisplay = document.getElementById('player2Score');
const startButtonPong = document.getElementById('startButtonPong');
const pongGameInfo = document.getElementById('pongGameInfo'); // Div que contém os placares
const pongPreGameMessages = document.getElementById('pongPreGameMessages');

// Configurações do Jogo
const paddleHeight = 100;
const paddleWidth = 10;
const ballRadius = 10;
const WINNING_SCORE = 5; // Pontuação para vencer a partida

let ballX, ballY, ballSpeedX, ballSpeedY;
let player1Y, player2Y;
const PADDLE_SPEED = 8;
let player1Score = 0;
let player2Score = 0;

let upPressed = false;
let downPressed = false;
let wPressed = false;
let sPressed = false;

let gameHasStartedPong = false;
let animationFrameId; // Para controlar o loop de animação

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
                } else {
                    pongGameUsername = user.email;
                }
            } catch (error) { pongGameUsername = user.email; }
        } else {
            console.log("Pong.js - onAuthStateChanged: Usuário DESLOGADO.");
            pongGameCurrentUser = null; pongGameUsername = null;
        }
    });
}

function initializePongVariables() {
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    player1Score = 0;
    player2Score = 0;
    if (player1ScoreDisplay) player1ScoreDisplay.textContent = player1Score;
    if (player2ScoreDisplay) player2ScoreDisplay.textContent = player2Score;
    resetBall(); // Coloca a bola no centro com velocidade inicial
}

function startGamePong() {
    if (gameHasStartedPong) return;
    gameHasStartedPong = true;

    if (startButtonPong) startButtonPong.style.display = 'none';
    if (pongPreGameMessages) pongPreGameMessages.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    if (pongGameInfo) pongGameInfo.style.display = 'flex'; // Mostra os placares

    initializePongVariables();
    if (animationFrameId) cancelAnimationFrame(animationFrameId); // Cancela loop anterior se houver
    gameLoop(); // Inicia o loop do jogo
}

if (startButtonPong) {
    startButtonPong.addEventListener('click', startGamePong);
}

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    if (!gameHasStartedPong && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key.toLowerCase() === 'w' || e.key.toLowerCase() === 's')) {
        // Se o jogo não começou, qualquer tecla de paddle inicia
        startGamePong();
    }
    const relevantKeys = ['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'];
    if (relevantKeys.includes(e.key)) e.preventDefault();
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

function drawBall() { /* ... (igual antes) ... */ ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.closePath(); }
function drawPaddle(x, y) { /* ... (igual antes) ... */ ctx.beginPath(); ctx.rect(x, y, paddleWidth, paddleHeight); ctx.fillStyle = '#fff'; ctx.fill(); ctx.closePath(); }
function drawNet() { /* ... (igual antes) ... */ ctx.beginPath(); ctx.setLineDash([10, 15]); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.closePath(); ctx.setLineDash([]); }

function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    let speedMagnitude = Math.sqrt(ballSpeedX*ballSpeedX + ballSpeedY*ballSpeedY) || 5; // Mantém magnitude ou usa 5
    if (speedMagnitude < 4) speedMagnitude = 4; // Velocidade mínima
    if (speedMagnitude > 8) speedMagnitude = 8; // Velocidade máxima (exemplo)

    ballSpeedX = speedMagnitude * (Math.random() > 0.5 ? 0.707 : -0.707) * (Math.random() > 0.5 ? 1 : -1); // Ângulos próximos a 45 graus
    ballSpeedY = speedMagnitude * 0.707 * (Math.random() > 0.5 ? 1 : -1);
}


async function saveHighScorePong(player, scoreToSave) {
    console.log(`SaveHighScorePong: Tentando salvar para ${player}. User:`, pongGameCurrentUser, "Username:", pongGameUsername, "Score:", scoreToSave);

    // Por enquanto, vamos considerar que o usuário logado é sempre o Jogador 1 para salvar no ranking.
    // Ou, se você tiver um sistema onde ambos os jogadores podem ser usuários do site, precisaria de uma lógica mais complexa.
    // Para este exemplo, só salvamos se o Jogador 1 (que é quem usa W/S) for o usuário logado e ele vencer.
    if (pongGameCurrentUser && player === "player1" && window.firebaseDb) {
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
        } catch (error) {
            console.error("Erro ao salvar/atualizar highscore de Pong: ", error);
        }
    } else if (pongGameCurrentUser && player === "player2") {
        console.log("Jogador 2 marcou. Não salvando score para Jogador 2 neste exemplo de ranking individual.");
    } else if (!pongGameCurrentUser) {
        console.log("Nenhum usuário logado. Highscore de Pong não será salvo.");
    }
}

function handleMatchEnd(winner) {
    gameHasStartedPong = false; // Para o jogo
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    let winnerName = winner === "player1" ? (pongGameUsername || (pongGameCurrentUser ? pongGameCurrentUser.email : "Jogador 1")) : "Jogador 2";
    alert(`Fim da Partida! ${winnerName} venceu com ${winner === "player1" ? player1Score : player2Score} pontos!`);

    if (winner === "player1" && pongGameCurrentUser) {
        saveHighScorePong("player1", player1Score);
    }
    // Se quiser salvar para o Jogador 2 (se ele fosse um usuário logado distinto), adicione lógica aqui.

    // Mostrar botão de iniciar novamente
    if (startButtonPong) startButtonPong.style.display = 'inline-block';
    if (pongPreGameMessages) pongPreGameMessages.style.display = 'block';
    if (canvas) canvas.style.display = 'none';
    if (pongGameInfo) pongGameInfo.style.display = 'none';
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

    if (ballX - ballRadius < paddleWidth && ballX - ballRadius > 0 && ballY > player1Y && ballY < player1Y + paddleHeight) {
        ballSpeedX = -ballSpeedX; let deltaY = ballY - (player1Y + paddleHeight / 2); ballSpeedY = deltaY * 0.25;
        if (Math.abs(ballSpeedX) < 12) ballSpeedX *= 1.03;
    }
    if (ballX + ballRadius > canvas.width - paddleWidth && ballX + ballRadius < canvas.width && ballY > player2Y && ballY < player2Y + paddleHeight) {
        ballSpeedX = -ballSpeedX; let deltaY = ballY - (player2Y + paddleHeight / 2); ballSpeedY = deltaY * 0.25;
        if (Math.abs(ballSpeedX) < 12) ballSpeedX *= 1.03;
    }

    if (ballX - ballRadius < 0) { // Ponto para Jogador 2
        player2Score++;
        if (player2ScoreDisplay) player2ScoreDisplay.textContent = player2Score;
        if (player2Score >= WINNING_SCORE) {
            handleMatchEnd("player2"); return; // Encerra o update
        }
        resetBall();
    } else if (ballX + ballRadius > canvas.width) { // Ponto para Jogador 1
        player1Score++;
        if (player1ScoreDisplay) player1ScoreDisplay.textContent = player1Score;
        if (player1Score >= WINNING_SCORE) {
            handleMatchEnd("player1"); return; // Encerra o update
        }
        resetBall();
    }
}

function draw() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameHasStartedPong) { // Só desenha elementos do jogo se iniciado
        drawNet(); drawBall();
        drawPaddle(0, player1Y); drawPaddle(canvas.width - paddleWidth, player2Y);
    }
}

function gameLoop() {
    update();
    draw();
    if (gameHasStartedPong) { // Só continua o loop se o jogo estiver ativo
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Prepara a tela inicial
if (canvas) canvas.style.display = 'none';
if (pongGameInfo) pongGameInfo.style.display = 'none';
if (player1ScoreDisplay) player1ScoreDisplay.textContent = 0;
if (player2ScoreDisplay) player2ScoreDisplay.textContent = 0;
