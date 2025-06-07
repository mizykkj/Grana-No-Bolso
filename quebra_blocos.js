// quebra_blocos.js - CONFIGURADO PARA SALVAR HIGHSCORE

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
const MAX_LEVELS_QB = 3;

let gamePaused = false, gameOver = false, gameHasStartedQB = false, animationFrameIdQB;

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
    console.error("QuebraBlocos.js: Firebase não inicializado!");
}

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

function updateUIDisplaysQB() { /* ... (igual antes) ... */ if (scoreDisplayQB) scoreDisplayQB.textContent = score; if (livesDisplayQB) livesDisplayQB.textContent = lives; if (levelDisplayQB) levelDisplayQB.textContent = currentLevel; }
function setupLevel(levelNum) { /* ... (igual antes) ... */ brickRowCount = 2 + levelNum; if (brickRowCount > 7) brickRowCount = 7; brickColumnCount = 5 + levelNum; if (brickColumnCount > 10) brickColumnCount = 10; let totalPaddingWidth = brickPadding * (brickColumnCount - 1); if (brickColumnCount <= 1) totalPaddingWidth = 0; let totalOffsetWidth = brickOffsetLeft * 2; brickWidth = (canvas.width - totalOffsetWidth - totalPaddingWidth) / brickColumnCount; if (brickWidth < 25) { brickWidth = 25; let totalBrickWidth = brickColumnCount * brickWidth; totalPaddingWidth = brickColumnCount > 1 ? brickPadding * (brickColumnCount - 1) : 0; brickOffsetLeft = (canvas.width - totalBrickWidth - totalPaddingWidth) / 2; } bricks = []; for (let c = 0; c < brickColumnCount; c++) { bricks[c] = []; for (let r = 0; r < brickRowCount; r++) { bricks[c][r] = { x: 0, y: 0, status: 1, color: brickColors[(c * r + r + c + levelNum) % brickColors.length] }; } } }
function resetBallAndPaddleQB() { /* ... (igual antes) ... */ ballX = canvas.width / 2; ballY = canvas.height - paddleHeight - ballRadius - 25; paddleX = (canvas.width - paddleWidth) / 2; let speedMultiplier = 1 + (currentLevel - 1) * 0.18; let currentSpeedMagnitudeX = initialBallSpeedX * speedMultiplier; let currentSpeedMagnitudeY = Math.abs(initialBallSpeedY) * speedMultiplier; if (currentSpeedMagnitudeX > MAX_BALL_SPEED_MAGNITUDE_QB) currentSpeedMagnitudeX = MAX_BALL_SPEED_MAGNITUDE_QB; if (currentSpeedMagnitudeY > MAX_BALL_SPEED_MAGNITUDE_QB) currentSpeedMagnitudeY = MAX_BALL_SPEED_MAGNITUDE_QB; if (currentSpeedMagnitudeX < initialBallSpeedX) currentSpeedMagnitudeX = initialBallSpeedX; if (currentSpeedMagnitudeY < Math.abs(initialBallSpeedY)) currentSpeedMagnitudeY = Math.abs(initialBallSpeedY); ballSpeedX = currentSpeedMagnitudeX * (Math.random() > 0.5 ? 1: -1); ballSpeedY = -currentSpeedMagnitudeY; if (Math.abs(ballSpeedX) < 1.5) ballSpeedX = (ballSpeedX >= 0 ? 1.5 : -1.5); if (Math.abs(ballSpeedY) < 1.5) ballSpeedY = -1.5; }
function drawBallQB() { /* ... (igual antes) ... */ if (!ctx) return; ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.closePath(); }
function drawPaddleQB() { /* ... (igual antes) ... */ if (!ctx) return; ctx.beginPath(); ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.closePath(); }
function drawBricksQB() { /* ... (igual antes) ... */ if (!ctx) return; for (let c = 0; c < brickColumnCount; c++) { for (let r = 0; r < brickRowCount; r++) { if (bricks[c] && bricks[c][r] && bricks[c][r].status === 1) { let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft; let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop; bricks[c][r].x = brickX; bricks[c][r].y = brickY; ctx.beginPath(); ctx.rect(brickX, brickY, brickWidth, brickHeight); ctx.fillStyle = bricks[c][r].color; ctx.fill(); ctx.closePath(); } } } }

function drawInitialQuebraBlocosScreen() {
    if (!ctx || !canvas) return;
    gameHasStartedQB = false; // Garante que o jogo não está rodando
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setupLevel(1); 
    resetBallAndPaddleQB();
    drawBricksQB(); drawPaddleQB(); drawBallQB();
    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
    if (quebraBlocosGameInfo) {
        lives = INITIAL_LIVES; score = 0; currentLevel = 1; updateUIDisplaysQB(); 
        quebraBlocosGameInfo.style.display = 'flex';
    }
    if (canvas) canvas.style.display = 'block';
}

function initializeGameQuebraBlocos() {
    if (gameHasStartedQB) return;
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

if (startButtonQuebraBlocos) startButtonQuebraBlocos.addEventListener('click', initializeGameQuebraBlocos);

document.addEventListener('keydown', keyDownHandlerQB, false);
document.addEventListener('keyup', keyUpHandlerQB, false);

function keyDownHandlerQB(e) { /* ... (igual antes) ... */ }
function keyUpHandlerQB(e) { /* ... (igual antes) ... */ }

function collisionDetectionQB() { /* ... (igual antes) ... */ }

// ===== FUNÇÃO PARA SALVAR HIGHSCORE =====
async function saveHighScoreQuebraBlocos(finalScore) {
    console.log(`SaveHighScoreQuebraBlocos: Tentando salvar score: ${finalScore}`);
    if (qbCurrentUser && window.firebaseDb) {
        const userId = qbCurrentUser.uid;
        const gameId = "quebra_blocos"; // ID CORRETO PARA ESTE JOGO
        const usernameToSave = qbUsername || qbCurrentUser.email;
        const highScoreDocId = `${userId}_${gameId}`;
        const highScoreRef = window.firebaseDb.collection("highscores").doc(highScoreDocId);
        try {
            const docSnap = await highScoreRef.get();
            if (!docSnap.exists || finalScore > docSnap.data().score) {
                await highScoreRef.set({
                    userId: userId, username: usernameToSave, gameId: gameId,
                    score: finalScore, timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Highscore de ${gameId} salvo/atualizado: ${finalScore}`);
            } else {
                console.log(`Nova pontuação (${finalScore}) não é maior que o highscore existente.`);
            }
        } catch (error) { console.error(`Erro ao salvar/atualizar highscore de ${gameId}: `, error); }
    } else {
        console.log("Nenhum usuário logado. Highscore de Quebra Blocos não será salvo.");
    }
}

function handleQuebraBlocosGameOver() {
    gameOver = true; gameHasStartedQB = false; 
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    alert(`FIM DE JOGO!\nNível: ${currentLevel}\nPontuação: ${score}`); 
    saveHighScoreQuebraBlocos(score); // <<< CHAMA A FUNÇÃO DE SALVAR
    setTimeout(() => { 
        drawInitialQuebraBlocosScreen(); 
    }, 1500);
}

function updateQB() { /* ... (igual antes) ... */ }
function drawQB() { /* ... (igual antes) ... */ }
function gameLoopQB() { /* ... (igual antes) ... */ }

if (nextLevelButtonQB) {
    nextLevelButtonQB.addEventListener('click', () => {
        if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
        gamePaused = false; currentLevel++; updateUIDisplaysQB(); 
        if (currentLevel > MAX_LEVELS_QB) {
            alert("Parabéns! Você completou todos os níveis!");
            handleQuebraBlocosGameOver(); return;
        }
        setupLevel(currentLevel); resetBallAndPaddleQB(); 
    });
}

// Prepara e desenha a tela inicial do Quebra Blocos
drawInitialQuebraBlocosScreen();
