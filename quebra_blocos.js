// quebra_blocos.js - ATUALIZADO

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de UI do Jogo
const scoreDisplayQB = document.getElementById('scoreQB');
const livesDisplayQB = document.getElementById('livesQB');
const levelDisplayQB = document.getElementById('levelQB');

// Elementos da Tela de Início
const startButtonQuebraBlocos = document.getElementById('startButtonQuebraBlocos');
const quebraBlocosPreGameMessages = document.getElementById('quebraBlocosPreGameMessages');
const quebraBlocosGameInfo = document.getElementById('quebraBlocosGameInfo'); // Onde ficam score, vidas, nível

// Elementos da Tela de Nível Completo
const levelCompleteScreenQB = document.getElementById('levelCompleteScreenQB');
const completedLevelDisplayQB = document.getElementById('completedLevelDisplayQB');
const nextLevelButtonQB = document.getElementById('nextLevelButtonQB');

let score = 0;
let lives = 3;
let currentLevel = 1; // Renomeado de 'level' para 'currentLevel'
const MAX_LEVELS_QB = 3; // Exemplo: 3 níveis

let gamePaused = false; // Para quando a tela de nível completo está ativa
let gameOver = false;
let gameHasStartedQB = false;
let animationFrameIdQB;

// Usuário Logado
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
}

// --- Configurações da Bola ---
let ballRadius = 8;
let ballX, ballY;
let initialBallSpeedX = 3;
let initialBallSpeedY = -3;
let ballSpeedX, ballSpeedY;

// --- Configurações da Barra (Paddle) ---
let paddleHeight = 12;
let paddleWidth = 80;
let paddleX;
const PADDLE_SPEED_QB = 7;
let rightPressedQB = false;
let leftPressedQB = false;

// --- Configurações dos Tijolos ---
let brickRowCount, brickColumnCount; // Variarão por nível
let brickWidth, brickHeight = 20, brickPadding = 5, brickOffsetTop = 40, brickOffsetLeft = 20;
let bricks = [];
const brickColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6'];


// ================================================================================= //
//                             INICIALIZAÇÃO E CONTROLES                             //
// ================================================================================= //

function updateUIDisplaysQB() {
    if (scoreDisplayQB) scoreDisplayQB.textContent = score;
    if (livesDisplayQB) livesDisplayQB.textContent = lives;
    if (levelDisplayQB) levelDisplayQB.textContent = currentLevel;
}

function drawInitialQuebraBlocosScreen() {
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    paddleX = (canvas.width - paddleWidth) / 2;
    ballX = canvas.width / 2;
    ballY = canvas.height - paddleHeight - ballRadius - 5; // Bola em cima do paddle
    
    // Desenha um layout de tijolos simples para a tela inicial
    let tempBrickColCount = 5;
    let tempBrickRowCount = 2;
    let tempBrickWidth = (canvas.width - (brickOffsetLeft*2) - (tempBrickColCount-1)*brickPadding) / tempBrickColCount;

    for (let c = 0; c < tempBrickColCount; c++) {
        for (let r = 0; r < tempBrickRowCount; r++) {
            let brickX = (c * (tempBrickWidth + brickPadding)) + brickOffsetLeft;
            let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop + 20; // Um pouco mais para baixo
            ctx.beginPath(); ctx.rect(brickX, brickY, tempBrickWidth, brickHeight);
            ctx.fillStyle = brickColors[ (c+r) % brickColors.length ]; ctx.fill(); ctx.closePath();
        }
    }
    drawBall(); drawPaddle();

    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
    if (quebraBlocosGameInfo) quebraBlocosGameInfo.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    updateUIDisplaysQB(); // Mostra vidas, score e nível iniciais
}


function setupLevel(levelNum) {
    // Define o layout dos tijolos com base no nível
    brickRowCount = 2 + levelNum; // Ex: Nível 1 -> 3 linhas, Nível 2 -> 4 linhas
    if (brickRowCount > 7) brickRowCount = 7; // Limite
    brickColumnCount = 5 + levelNum;
    if (brickColumnCount > 10) brickColumnCount = 10;

    let totalPaddingWidth = brickPadding * (brickColumnCount - 1);
    if (brickColumnCount <= 1) totalPaddingWidth = 0;
    let totalOffsetWidth = brickOffsetLeft * 2;
    brickWidth = (canvas.width - totalOffsetWidth - totalPaddingWidth) / brickColumnCount;
    if (brickWidth < 25) { // Largura mínima
        brickWidth = 25;
        totalBrickWidth = brickColumnCount * brickWidth;
        totalPaddingWidth = brickColumnCount > 1 ? brickPadding * (brickColumnCount -1) : 0;
        brickOffsetLeft = (canvas.width - totalBrickWidth - totalPaddingWidth) / 2;
    }

    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { x: 0, y: 0, status: 1, color: brickColors[(c * r + r + c + levelNum) % brickColors.length] };
        }
    }
}

function resetBallAndPaddleQB() {
    ballX = canvas.width / 2;
    ballY = canvas.height - paddleHeight - ballRadius - 10;
    paddleX = (canvas.width - paddleWidth) / 2;
    
    let speedMultiplier = 1 + (currentLevel - 1) * 0.2; // Aumenta velocidade base por nível
    ballSpeedX = initialBallSpeedX * speedMultiplier * (Math.random() > 0.5 ? 1 : -1);
    ballSpeedY = initialBallSpeedY * speedMultiplier;
    if (ballSpeedY > 0) ballSpeedY = -ballSpeedY; // Garante que comece subindo
}

function initializeGameQuebraBlocos() {
    if (gameHasStartedQB) return;
    gameHasStartedQB = true;
    gameOver = false;
    gamePaused = false; // Garante que não esteja pausado

    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'none';
    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    if (quebraBlocosGameInfo) quebraBlocosGameInfo.style.display = 'flex'; // Mostra placar/vidas/nível
    if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';


    score = 0; // Reseta score no início de um novo jogo completo (não entre níveis)
    lives = INITIAL_LIVES;
    currentLevel = 1; // Começa no nível 1
    
    setupLevel(currentLevel);
    resetBallAndPaddleQB();
    updateUIDisplaysQB();
    
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    gameLoopQB();
}

if (startButtonQuebraBlocos) {
    startButtonQuebraBlocos.addEventListener('click', initializeGameQuebraBlocos);
}

document.addEventListener('keydown', keyDownHandlerQB, false);
document.addEventListener('keyup', keyUpHandlerQB, false);
document.addEventListener('mousemove', mouseMoveHandlerQB, false);

function keyDownHandlerQB(e) {
    const K_LEFT = 'ArrowLeft', K_RIGHT = 'ArrowRight';
    if (!gameHasStartedQB && (e.key === K_LEFT || e.key === K_RIGHT || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'd')) {
        initializeGameQuebraBlocos();
    }
    if (e.key === K_RIGHT || e.key.toLowerCase() === 'd') rightPressedQB = true;
    else if (e.key === K_LEFT || e.key.toLowerCase() === 'a') leftPressedQB = true;

    if ([K_LEFT, K_RIGHT, 'a', 'A', 'd', 'D'].includes(e.key)) e.preventDefault();
}
function keyUpHandlerQB(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressedQB = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressedQB = false;
}
function mouseMoveHandlerQB(e) {
    if (!gameHasStartedQB) return;
    let relativeX = e.clientX - canvas.getBoundingClientRect().left;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2;
        if (paddleX < 0) paddleX = 0;
        if (paddleX + paddleWidth > canvas.width) paddleX = canvas.width - paddleWidth;
    }
}

// ================================================================================= //
//                                 LÓGICA DO JOGO                                    //
// ================================================================================= //

function drawBallQB() { /* ... (similar ao Pong: ctx.arc, fill) ... */ ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.closePath(); }
function drawPaddleQB() { /* ... (similar ao Pong: ctx.rect, fill) ... */  ctx.beginPath(); ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight); ctx.fillStyle = 'var(--accent-color, #00bcd4)'; ctx.fill(); ctx.closePath(); }
function drawBricksQB() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX; bricks[c][r].y = brickY;
                ctx.beginPath(); ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = bricks[c][r].color; ctx.fill(); ctx.closePath();
            }
        }
    }
}

function collisionDetectionQB() {
    let allBricksCleared = true;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                allBricksCleared = false; // Ainda há tijolos
                if (ballX + ballRadius > b.x && ballX - ballRadius < b.x + brickWidth &&
                    ballY + ballRadius > b.y && ballY - ballRadius < b.y + brickHeight) {
                    ballSpeedY = -ballSpeedY;
                    b.status = 0;
                    score += 10;
                    updateUIDisplaysQB();
                }
            }
        }
    }
    if (allBricksCleared && gameHasStartedQB && !gameOver && !gamePaused) { // Verifica se o jogo está ativo
        gamePaused = true; // Pausa o jogo para mostrar a tela de nível completo
        if (levelCompleteScreenQB) {
            if (completedLevelDisplayQB) completedLevelDisplayQB.textContent = currentLevel;
            if (levelCompleteMessageQB) levelCompleteMessageQB.textContent = `Nível ${currentLevel} Completo!`;
            levelCompleteScreenQB.style.display = 'flex'; // Mostra a tela
        }
    }
}

async function saveHighScoreQuebraBlocos(finalScore) {
    console.log(`SaveHighScoreQuebraBlocos: User:`, qbCurrentUser, "Username:", qbUsername, "Score:", finalScore);
    if (qbCurrentUser && window.firebaseDb) {
        const userId = qbCurrentUser.uid;
        const gameId = "quebra_blocos";
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
                console.log(`Highscore de Quebra Blocos salvo/atualizado: ${finalScore} por ${usernameToSave}`);
            } else {
                console.log(`Nova pontuação (${finalScore}) não é maior que o highscore existente.`);
            }
        } catch (error) { console.error("Erro ao salvar/atualizar highscore de Quebra Blocos: ", error); }
    } else { /* ... (logs de usuário não logado ou DB não pronto) ... */ }
}


function handleQuebraBlocosGameOver() {
    gameOver = true;
    gameHasStartedQB = false; // Para o jogo
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    
    alert(`FIM DE JOGO!\nNível: ${currentLevel}\nPontuação: ${score}`);
    saveHighScoreQuebraBlocos(score);

    // Reset para tela inicial
    setTimeout(() => {
        if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
        if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
        if (canvas) drawInitialQuebraBlocosScreen(); // Redesenha estado inicial, não limpa apenas
        if (quebraBlocosGameInfo) quebraBlocosGameInfo.style.display = 'none';
    }, 1500);
}

function updateQB() {
    if (gameOver || gamePaused) return;

    // Colisão com paredes laterais e topo
    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) {
        ballSpeedX = -ballSpeedX;
    }
    if (ballY + ballSpeedY < ballRadius) {
        ballSpeedY = -ballSpeedY;
    } else if (ballY + ballSpeedY > canvas.height - ballRadius - paddleHeight) { // Perto da altura do paddle
        if (ballX > paddleX && ballX < paddleX + paddleWidth) { // Colidiu com o paddle
            ballSpeedY = -ballSpeedY;
            ballY = canvas.height - paddleHeight - ballRadius - 0.1; // Evita grudar
            // Aumento gradual de velocidade da bola PODE ser feito a cada X rebatidas no paddle
            paddleHitCount++;
            if (paddleHitCount % HITS_FOR_SPEED_INCREASE === 0 && HITS_FOR_SPEED_INCREASE > 0) {
                 let currentMagnitude = Math.sqrt(ballSpeedX*ballSpeedX + ballSpeedY*ballSpeedY);
                 if(currentMagnitude < MAX_BALL_SPEED_MAGNITUDE) {
                    currentMagnitude += SPEED_INCREMENT;
                    if (currentMagnitude > MAX_BALL_SPEED_MAGNITUDE) currentMagnitude = MAX_BALL_SPEED_MAGNITUDE;
                    const angle = Math.atan2(ballSpeedY, ballSpeedX);
                    ballSpeedX = currentMagnitude * Math.cos(angle);
                    ballSpeedY = currentMagnitude * Math.sin(angle);
                    console.log("Quebra Blocos: Velocidade aumentada para", currentMagnitude.toFixed(1));
                 }
            }
        } else if (ballY + ballRadius > canvas.height) { // Bola caiu no chão
            lives--;
            updateUIDisplaysQB();
            if (lives <= 0) {
                handleQuebraBlocosGameOver();
                return;
            } else {
                resetBallAndPaddleQB(); // Perdeu uma vida, reseta bola e paddle
            }
        }
    }

    if (rightPressedQB && paddleX < canvas.width - paddleWidth) paddleX += PADDLE_SPEED_QB;
    else if (leftPressedQB && paddleX > 0) paddleX -= PADDLE_SPEED_QB;

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    collisionDetectionQB();
}

function drawQB() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (gameHasStartedQB || (!gameHasStartedQB && !gameOver)) { // Desenha se o jogo começou ou se está na tela inicial antes do primeiro start
        drawBricksQB();
        drawBallQB();
        drawPaddleQB();
    }
}

function gameLoopQB() {
    if (!gameOver && !gamePaused) { // Só atualiza e desenha se não for game over ou pausado (tela de nível)
        updateQB();
        drawQB();
    } else if (gameOver) {
        // A lógica de Game Over já foi tratada em handleQuebraBlocosGameOver
        // (alert e reset para tela inicial)
        return; // Para o loop se for game over
    }
    // Se estiver pausado (levelCompleteScreen ativa), o loop continua mas update não roda.
    animationFrameIdQB = requestAnimationFrame(gameLoopQB);
}

// Listener para o botão "Próximo Nível" da tela de nível completo
if (nextLevelButtonQB) {
    nextLevelButtonQB.addEventListener('click', () => {
        if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
        gamePaused = false;
        currentLevel++;
        if (currentLevel > MAX_LEVELS_QB) {
            alert("Parabéns! Você completou todos os níveis do Quebra Blocos!");
            handleQuebraBlocosGameOver(); // Trata como um fim de jogo (salva score total)
            return;
        }
        setupLevel(currentLevel);
        resetBallAndPaddleQB();
        updateUIDisplaysQB();
        // O gameLoopQB já está rodando, apenas desbloqueamos o update e draw.
    });
}


// Prepara a tela inicial do Quebra Blocos
drawInitialQuebraBlocosScreen();
