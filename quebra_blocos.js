// quebra_blocos.js - VERSÃO COM COLISÃO E CONTROLES CORRIGIDOS

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
const PADDLE_SPEED_QB = 7;
const ballRadius = 8;
const paddleHeight = 12;
const paddleWidth = 80;

let score, lives, currentLevel;
let gamePaused, gameOver, gameHasStartedQB, animationFrameIdQB;
let qbCurrentUser, qbUsername;
let ballX, ballY, ballSpeedX, ballSpeedY;
let paddleX;
let rightPressedQB = false, leftPressedQB = false;
let brickRowCount, brickColumnCount, brickWidth, brickHeight = 20, brickPadding = 5, brickOffsetTop = 40, brickOffsetLeft = 20;
let bricks = [];
const brickColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C'];
let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 8;
const SPEED_INCREMENT = 0.2;
const initialBallSpeedMagnitude = 3.5;

if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) { qbCurrentUser = user; try { const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get(); qbUsername = (userDoc.exists && userDoc.data().username) ? userDoc.data().username : user.email; } catch (error) { qbUsername = user.email; } } 
        else { qbCurrentUser = null; qbUsername = null; }
    });
}

function updateUIDisplaysQB() { if (scoreDisplayQB) scoreDisplayQB.textContent = score; if (livesDisplayQB) livesDisplayQB.textContent = lives; if (levelDisplayQB) levelDisplayQB.textContent = currentLevel; }
function setupLevel(levelNum) { brickRowCount = 2 + levelNum; if (brickRowCount > 7) brickRowCount = 7; brickColumnCount = 5 + levelNum; if (brickColumnCount > 10) brickColumnCount = 10; let totalPaddingWidth = brickPadding * (brickColumnCount - 1) || 0; let totalOffsetWidth = brickOffsetLeft * 2; brickWidth = (canvas.width - totalOffsetWidth - totalPaddingWidth) / brickColumnCount; if (brickWidth < 25) { brickWidth = 25; let totalBrickWidth = brickColumnCount * brickWidth; totalPaddingWidth = brickColumnCount > 1 ? brickPadding * (brickColumnCount - 1) : 0; brickOffsetLeft = (canvas.width - totalBrickWidth - totalPaddingWidth) / 2; } bricks = []; for (let c = 0; c < brickColumnCount; c++) { bricks[c] = []; for (let r = 0; r < brickRowCount; r++) { bricks[c][r] = { x: 0, y: 0, status: 1, color: brickColors[(c + r + levelNum) % brickColors.length] }; } } }
function resetBallAndPaddleQB() { ballX = canvas.width / 2; ballY = canvas.height - paddleHeight - ballRadius - 25; paddleX = (canvas.width - paddleWidth) / 2; let speedMultiplier = 1 + (currentLevel - 1) * 0.15; let currentSpeedMagnitude = initialBallSpeedMagnitude * speedMultiplier; let angle = (Math.PI / 4) + (Math.random() * Math.PI / 2); ballSpeedX = currentSpeedMagnitude * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1); ballSpeedY = -currentSpeedMagnitude * Math.sin(angle); if (Math.abs(ballSpeedX) < 2) ballSpeedX = (ballSpeedX >= 0 ? 2 : -2); if (ballSpeedY >= 0) ballSpeedY = -2; }
function drawBallQB() { if (!ctx) return; ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.closePath(); }
function drawPaddleQB() { if (!ctx) return; ctx.beginPath(); ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.closePath(); }
function drawBricksQB() { if (!ctx) return; for (let c = 0; c < brickColumnCount; c++) { for (let r = 0; r < brickRowCount; r++) { if (bricks[c] && bricks[c][r] && bricks[c][r].status === 1) { let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft; let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop; bricks[c][r].x = brickX; bricks[c][r].y = brickY; ctx.beginPath(); ctx.rect(brickX, brickY, brickWidth, brickHeight); ctx.fillStyle = bricks[c][r].color; ctx.fill(); ctx.closePath(); }}}}

function drawInitialQuebraBlocosScreen() { if (!ctx || !canvas) return; gameHasStartedQB = false; gameOver = false; gamePaused = false; currentLevel = 1; score = 0; lives = INITIAL_LIVES; setupLevel(1); resetBallAndPaddleQB(); updateUIDisplaysQB(); ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height); drawBricksQB(); drawPaddleQB(); drawBallQB(); if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block'; if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block'; if (quebraBlocosGameInfo) { quebraBlocosGameInfo.style.display = 'flex'; } if (canvas) canvas.style.display = 'block'; if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';}
function initializeGameQuebraBlocos() { if (gameHasStartedQB) return; gameHasStartedQB = true; gameOver = false; gamePaused = false; if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'none'; if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'none'; if (quebraBlocosGameInfo) quebraBlocosGameInfo.style.display = 'flex'; if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none'; score = 0; lives = INITIAL_LIVES; currentLevel = 1; paddleHitCount = 0; setupLevel(currentLevel); resetBallAndPaddleQB(); updateUIDisplaysQB(); if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB); gameLoopQB();}

if (startButtonQuebraBlocos) startButtonQuebraBlocos.addEventListener('click', initializeGameQuebraBlocos);
document.addEventListener('keydown', keyDownHandlerQB, false);
document.addEventListener('keyup', keyUpHandlerQB, false);

// --- CONTROLES CORRIGIDOS ---
function keyDownHandlerQB(e) {
    const MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'a', 'd'];
    const ACTION_KEYS = ['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const keyLower = e.key.toLowerCase();

    // Se a tecla for QUALQUER tecla de ação do jogo, previne a rolagem
    if (ACTION_KEYS.includes(e.key) || MOVE_KEYS.includes(keyLower) || e.code === 'Space') {
        e.preventDefault();
    }
    
    // Inicia o jogo com as teclas de movimento (Setas ou A/D)
    if (!gameHasStartedQB && MOVE_KEYS.includes(keyLower)) {
        initializeGameQuebraBlocos();
    }
    
    // Controla o paddle se o jogo estiver ativo
    if (gameHasStartedQB && !gameOver && !gamePaused) {
        if (e.key === 'ArrowRight' || keyLower === 'd') rightPressedQB = true;
        else if (e.key === 'ArrowLeft' || keyLower === 'a') leftPressedQB = true;
    }
    
    // Avança de nível na tela "Nível Completo"
    if (gamePaused && (ACTION_KEYS.includes(e.key) || e.code === 'Space')) {
        if(nextLevelButtonQB) nextLevelButtonQB.click(); 
    }
}
function keyUpHandlerQB(e) {
    const keyLower = e.key.toLowerCase();
    if (e.key === 'Right' || e.key === 'ArrowRight' || keyLower === 'd') rightPressedQB = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft' || keyLower === 'a') leftPressedQB = false;
}

function collisionDetectionQB() { let allBricksCleared = true; for (let c = 0; c < brickColumnCount; c++) { for (let r = 0; r < brickRowCount; r++) { let b = bricks[c][r]; if (b.status === 1) { allBricksCleared = false; if (ballX + ballRadius > b.x && ballX - ballRadius < b.x + brickWidth && ballY + ballRadius > b.y && ballY - ballRadius < b.y + brickHeight) { ballSpeedY = -ballSpeedY; b.status = 0; score += 10; updateUIDisplaysQB(); }}}} if (allBricksCleared && gameHasStartedQB && !gameOver && !gamePaused) { gamePaused = true; if (levelCompleteScreenQB) { if (completedLevelDisplayQB) completedLevelDisplayQB.textContent = currentLevel; if (levelCompleteMessageQB) levelCompleteMessageQB.textContent = `Nível ${currentLevel} Completo!`; levelCompleteScreenQB.style.display = 'flex'; }}}
async function saveHighScoreQuebraBlocos(finalScore) { if (qbCurrentUser && window.firebaseDb) { const userId = qbCurrentUser.uid; const gameId = "quebra_blocos"; const usernameToSave = qbUsername || qbCurrentUser.email; const highScoreDocId = `${userId}|${gameId}`; const highScoreRef = window.firebaseDb.collection("highscores").doc(highScoreDocId); try { const docSnap = await highScoreRef.get(); if (!docSnap.exists || finalScore > docSnap.data().score) { await highScoreRef.set({ userId, username: usernameToSave, gameId, score: finalScore, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); console.log(`Highscore de ${gameId} salvo/atualizado: ${finalScore}`); } } catch (error) { console.error(`Erro ao salvar highscore de ${gameId}: `, error); } } }
function handleQuebraBlocosGameOver() { gameOver = true; gameHasStartedQB = false; if (animationFrameIdQB) { cancelAnimationFrame(animationFrameIdQB); animationFrameIdQB = null; } alert(`FIM DE JOGO!\nNível: ${currentLevel}\nPontuação: ${score}`); saveHighScoreQuebraBlocos(score); setTimeout(() => { drawInitialQuebraBlocosScreen(); }, 1500); }
function increaseBallSpeed() { let currentMagnitude = Math.sqrt(ballSpeedX*ballSpeedX + ballSpeedY*ballSpeedY); let newMagnitude = currentMagnitude + SPEED_INCREMENT; ballSpeedX = (ballSpeedX / currentMagnitude) * newMagnitude; ballSpeedY = (ballSpeedY / currentMagnitude) * newMagnitude; }

// --- FUNÇÃO UPDATE COM LÓGICA DE COLISÃO CORRIGIDA ---
function updateQB() {
    if (gameOver || gamePaused) return;

    // Movimento da bola
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Colisão com paredes laterais
    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) {
        ballSpeedX = -ballSpeedX;
    }
    // Colisão com parede do topo
    if (ballY + ballSpeedY < ballRadius) {
        ballSpeedY = -ballSpeedY;
    } 
    // Colisão com a parte de baixo (onde fica o paddle)
    else if (ballY + ballSpeedY > canvas.height - paddleHeight - ballRadius) {
        // Verifica se a bola está na posição horizontal do paddle
        if (ballX > paddleX && ballX < paddleX + paddleWidth) {
            // COLISÃO COM O PADDLE!
            ballSpeedY = -ballSpeedY;
            // Opcional: Adicionar um leve ângulo de rebote
            let deltaX = ballX - (paddleX + paddleWidth / 2);
            ballSpeedX = ballSpeedX + deltaX * 0.15; // Influencia levemente a direção X
            
            // Lógica de aumento de velocidade por rebatida
            paddleHitCount++;
            if (paddleHitCount > 0 && paddleHitCount % HITS_FOR_SPEED_INCREASE === 0) {
                increaseBallSpeed();
            }
        } 
        // Se a bola passou da altura do paddle e não colidiu, ela caiu
        else if (ballY + ballRadius > canvas.height) {
            lives--;
            updateUIDisplaysQB();
            if (lives <= 0) {
                handleQuebraBlocosGameOver();
                return;
            } else {
                resetBallAndPaddleQB();
            }
        }
    }

    // Movimento do paddle com base nas teclas
    if (rightPressedQB && paddleX < canvas.width - paddleWidth) {
        paddleX += PADDLE_SPEED_QB;
    } else if (leftPressedQB && paddleX > 0) {
        paddleX -= PADDLE_SPEED_QB;
    }

    // Checa colisão com os tijolos
    collisionDetectionQB();
}

function drawQB() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawBricksQB(); drawPaddleQB(); drawBallQB();
}

function gameLoopQB() {
    if (!gameOver) {
        if (!gamePaused) { updateQB(); }
        drawQB();
        animationFrameIdQB = requestAnimationFrame(gameLoopQB);
    }
}

if (nextLevelButtonQB) {
    nextLevelButtonQB.addEventListener('click', () => {
        if (!gamePaused) return;
        if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
        gamePaused = false;
        currentLevel++;
        updateUIDisplaysQB();
        setupLevel(currentLevel);
        resetBallAndPaddleQB();
    });
}

// Prepara e desenha a tela inicial do Quebra Blocos
drawInitialQuebraBlocosScreen();
