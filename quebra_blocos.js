// quebra_blocos.js - CORRIGIDO E SEM CONTROLE DO MOUSE

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

let score = 0;
let lives = 3;
let currentLevel = 1;
const MAX_LEVELS_QB = 3;

let gamePaused = false;
let gameOver = false;
let gameHasStartedQB = false;
let animationFrameIdQB;

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
    console.error("QuebraBlocos.js: Instâncias do Firebase não disponíveis!");
}

let ballRadius = 8;
let ballX, ballY;
let initialBallSpeedX = 3;
let initialBallSpeedY = -3;
let ballSpeedX, ballSpeedY;

let paddleHeight = 12;
let paddleWidth = 80;
let paddleX;
const PADDLE_SPEED_QB = 7; // Velocidade do paddle COM TECLADO
let rightPressedQB = false;
let leftPressedQB = false;

let brickRowCount, brickColumnCount;
let brickWidth, brickHeight = 20, brickPadding = 5, brickOffsetTop = 40, brickOffsetLeft = 20;
let bricks = [];
const brickColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C'];

let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 8; // Aumenta velocidade a cada X rebatidas
const SPEED_INCREMENT = 0.25; // Aumento menor para ser mais gradual
const MAX_BALL_SPEED_MAGNITUDE = 9;


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
    ballY = canvas.height - paddleHeight - ballRadius - 25; // Bola um pouco mais acima do paddle

    // Desenha um layout de tijolos simples para a tela inicial
    // Certifique-se que as variáveis de tijolo (brickWidth, etc.) sejam calculadas antes
    setupLevel(1); // Configura o layout para o nível 1 para ter algo para desenhar
    drawBricksQB(); // CORRIGIDO
    
    drawPaddleQB(); // CORRIGIDO
    drawBallQB();   // CORRIGIDO

    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
    if (quebraBlocosGameInfo) {
        quebraBlocosGameInfo.style.display = 'flex'; // Mostrar para vidas iniciais
        updateUIDisplaysQB(); // Atualiza para mostrar vidas = 3, score = 0, level = 1
    }
    if (canvas) canvas.style.display = 'block';
}

function setupLevel(levelNum) {
    brickRowCount = 2 + levelNum; 
    if (brickRowCount > 7) brickRowCount = 7;
    brickColumnCount = 5 + levelNum;
    if (brickColumnCount > 10) brickColumnCount = 10;

    let totalPaddingWidth = brickPadding * (brickColumnCount - 1);
    if (brickColumnCount <= 1) totalPaddingWidth = 0;
    let totalOffsetWidth = brickOffsetLeft * 2;
    brickWidth = (canvas.width - totalOffsetWidth - totalPaddingWidth) / brickColumnCount;
    if (brickWidth < 25) {
        brickWidth = 25;
        let totalBrickWidth = brickColumnCount * brickWidth;
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
    
    let speedMultiplier = 1 + (currentLevel - 1) * 0.18; // Ajuste no multiplicador
    let currentSpeedMagnitude = initialBallSpeedX * speedMultiplier; // Usa initialBallSpeedX como base
    if (currentSpeedMagnitude > MAX_BALL_SPEED_MAGNITUDE) currentSpeedMagnitude = MAX_BALL_SPEED_MAGNITUDE;


    let angle = (Math.PI / 4) + (Math.random() * Math.PI / 2); 
    ballSpeedX = currentSpeedMagnitude * Math.cos(angle) * (Math.random() > 0.5 ? 1: -1); 
    ballSpeedY = -currentSpeedMagnitude * Math.sin(angle); 
    
    if (Math.abs(ballSpeedX) < 1.5) ballSpeedX = (ballSpeedX > 0 ? 1 : -1) * 1.5;
    if (Math.abs(ballSpeedY) < 1.5) ballSpeedY = (ballSpeedY > 0 ? 1 : -1) * 1.5;
}

function initializeGameQuebraBlocos() {
    if (gameHasStartedQB) return;
    gameHasStartedQB = true;
    gameOver = false;
    gamePaused = false;

    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'none';
    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    if (quebraBlocosGameInfo) quebraBlocosGameInfo.style.display = 'flex';
    if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';

    score = 0; 
    lives = INITIAL_LIVES;
    currentLevel = 1;
    paddleHitCount = 0;
    
    setupLevel(currentLevel);
    resetBallAndPaddleQB();
    updateUIDisplaysQB();
    
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    gameLoopQB();
}

if (startButtonQuebraBlocos) {
    startButtonQuebraBlocos.addEventListener('click', initializeGameQuebraBlocos);
}

// --- CONTROLES APENAS POR TECLADO ---
document.addEventListener('keydown', keyDownHandlerQB, false);
document.addEventListener('keyup', keyUpHandlerQB, false);
// REMOVIDO: document.addEventListener('mousemove', mouseMoveHandlerQB, false);

function keyDownHandlerQB(e) {
    const K_LEFT = 'ArrowLeft', K_RIGHT = 'ArrowRight';
    // Permitir que as setas iniciem o jogo
    if (!gameHasStartedQB && (e.key === K_LEFT || e.key === K_RIGHT || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'd')) {
        e.preventDefault(); // Prevenir rolagem ANTES de iniciar
        initializeGameQuebraBlocos();
    }
    if (gameHasStartedQB && !gameOver && !gamePaused) { // Só processa teclas se o jogo estiver ativo
        if (e.key === K_RIGHT || e.key.toLowerCase() === 'd') rightPressedQB = true;
        else if (e.key === K_LEFT || e.key.toLowerCase() === 'a') leftPressedQB = true;
        
        if ([K_LEFT, K_RIGHT, 'a', 'A', 'd', 'D'].includes(e.key)) e.preventDefault(); // Prevenir rolagem durante o jogo
    }
     // Permitir próximo nível com Enter/Espaço na tela de nível completo
    if (gamePaused && levelCompleteScreenQB && levelCompleteScreenQB.style.display !== 'none' && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        nextLevelButtonQB.click(); // Simula o clique no botão
    }
}
function keyUpHandlerQB(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressedQB = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressedQB = false;
}
// REMOVIDA: function mouseMoveHandlerQB(e) { ... }


function drawBallQB() { ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.closePath(); }
function drawPaddleQB() { ctx.beginPath(); ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight); ctx.fillStyle = 'var(--accent-color, #00bcd4)'; ctx.fill(); ctx.closePath(); }
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
                allBricksCleared = false;
                if (ballX + ballRadius > b.x && ballX - ballRadius < b.x + brickWidth &&
                    ballY + ballRadius > b.y && ballY - ballRadius < b.y + brickHeight) {
                    ballSpeedY = -ballSpeedY;
                    b.status = 0; score += 10; updateUIDisplaysQB();
                }
            }
        }
    }
    if (allBricksCleared && gameHasStartedQB && !gameOver && !gamePaused) {
        gamePaused = true;
        if (levelCompleteScreenQB) {
            if (completedLevelDisplayQB) completedLevelDisplayQB.textContent = currentLevel;
            if (levelCompleteMessageQB) levelCompleteMessageQB.textContent = `Nível ${currentLevel} Completo!`;
            levelCompleteScreenQB.style.display = 'flex';
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
                await highScoreRef.set({ userId: userId, username: usernameToSave, gameId: gameId, score: finalScore, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                console.log(`Highscore de Quebra Blocos salvo/atualizado: ${finalScore} por ${usernameToSave}`);
            } else { console.log(`Nova pontuação (${finalScore}) não é maior.`); }
        } catch (error) { console.error("Erro ao salvar/atualizar highscore de Quebra Blocos: ", error); }
    } else { if (!qbCurrentUser) console.log("Nenhum usuário logado. Highscore não salvo."); else console.log("Firestore (window.firebaseDb) não disponível."); }
}

function handleQuebraBlocosGameOver() {
    gameOver = true; gameHasStartedQB = false;
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    alert(`FIM DE JOGO!\nNível: ${currentLevel}\nPontuação: ${score}`);
    saveHighScoreQuebraBlocos(score);
    setTimeout(() => {
        drawInitialQuebraBlocosScreen(); // Mostra a tela inicial de novo
    }, 1500);
}

function updateQB() {
    if (gameOver || gamePaused) return;

    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) ballSpeedX = -ballSpeedX;
    if (ballY + ballSpeedY < ballRadius) {
        ballSpeedY = -ballSpeedY;
    } else if (ballY + ballSpeedY > canvas.height - ballRadius - paddleHeight) {
        if (ballX > paddleX && ballX < paddleX + paddleWidth) {
            ballSpeedY = -ballSpeedY; ballY = canvas.height - paddleHeight - ballRadius - 0.1;
            paddleHitCount++;
            if (paddleHitCount > 0 && paddleHitCount % HITS_FOR_SPEED_INCREASE === 0) {
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
        } else if (ballY + ballRadius > canvas.height) {
            lives--; updateUIDisplaysQB();
            if (lives <= 0) { handleQuebraBlocosGameOver(); return; }
            else { resetBallAndPaddleQB(); }
        }
    }

    if (rightPressedQB && paddleX < canvas.width - paddleWidth) paddleX += PADDLE_SPEED_QB;
    else if (leftPressedQB && paddleX > 0) paddleX -= PADDLE_SPEED_QB;

    ballX += ballSpeedX; ballY += ballSpeedY;
    collisionDetectionQB();
}

function drawQB() {
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Desenha mesmo se o jogo não começou para a tela inicial
    drawBricksQB(); drawPaddleQB(); drawBallQB();
}

function gameLoopQB() {
    if (!gameOver && !gamePaused) { updateQB(); }
    // Sempre desenha para mostrar o estado atual (incluindo tela inicial, ou jogo pausado com bola/paddle parados)
    drawQB(); 
    
    if (!gameOver) { // Só continua o loop se não for game over
      animationFrameIdQB = requestAnimationFrame(gameLoopQB);
    }
}

if (nextLevelButtonQB) {
    nextLevelButtonQB.addEventListener('click', () => {
        if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
        gamePaused = false; currentLevel++;
        if (currentLevel > MAX_LEVELS_QB) {
            alert("Parabéns! Você completou todos os níveis do Quebra Blocos!");
            handleQuebraBlocosGameOver(); return;
        }
        setupLevel(currentLevel); resetBallAndPaddleQB(); updateUIDisplaysQB();
        // Não precisa chamar gameLoopQB() aqui de novo se ele já está rodando e só estava pausado no update.
        // Se o loop foi parado, precisa reiniciar:
        if (gameOver) return; // Se o jogo acabou ao completar o último nível
        if (!animationFrameIdQB && gameHasStartedQB) gameLoopQB(); // Reinicia se necessário
    });
}

// Prepara e desenha a tela inicial do Quebra Blocos
initializePongVariables(); // Reutilizei para setar velocidades base e chamar resetBall
drawInitialQuebraBlocosScreen();
