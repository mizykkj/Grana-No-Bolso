// quebra_blocos.js - CORRIGIDO

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

const INITIAL_LIVES = 3; // <<< ADICIONADO: Constante para vidas iniciais
let score = 0;
let lives = INITIAL_LIVES; // Usa a constante
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
let initialBallSpeedX = 3; // Velocidade X base da bola
let initialBallSpeedY = -3; // Velocidade Y base da bola (negativa para subir)
let ballSpeedX, ballSpeedY;

let paddleHeight = 12;
let paddleWidth = 80;
let paddleX;
const PADDLE_SPEED_QB = 7;
let rightPressedQB = false;
let leftPressedQB = false;

let brickRowCount, brickColumnCount;
let brickWidth, brickHeight = 20, brickPadding = 5, brickOffsetTop = 40, brickOffsetLeft = 20;
let bricks = [];
const brickColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C'];

let paddleHitCount = 0;
const HITS_FOR_SPEED_INCREASE = 8;
const SPEED_INCREMENT = 0.25;
const MAX_BALL_SPEED_MAGNITUDE = 9;

function updateUIDisplaysQB() {
    if (scoreDisplayQB) scoreDisplayQB.textContent = score;
    if (livesDisplayQB) livesDisplayQB.textContent = lives;
    if (levelDisplayQB) levelDisplayQB.textContent = currentLevel;
}

function setupLevel(levelNum) {
    // ... (código da função setupLevel como na versão anterior, garantindo que brickWidth, etc., sejam calculados)
    brickRowCount = 2 + levelNum; 
    if (brickRowCount > 7) brickRowCount = 7;
    brickColumnCount = 5 + levelNum;
    if (brickColumnCount > 10) brickColumnCount = 10;

    let totalPaddingWidth = brickPadding * (brickColumnCount - 1);
    if (brickColumnCount <= 1) totalPaddingWidth = 0;
    let totalOffsetWidth = brickOffsetLeft * 2;
    brickWidth = (canvas.width - totalOffsetWidth - totalPaddingWidth) / brickColumnCount;
    
    if (brickWidth < 25) { // Largura mínima para os tijolos
        brickWidth = 25;
        let totalBrickWidth = brickColumnCount * brickWidth;
        totalPaddingWidth = brickColumnCount > 1 ? brickPadding * (brickColumnCount - 1) : 0;
        brickOffsetLeft = (canvas.width - totalBrickWidth - totalPaddingWidth) / 2; // Recalcula offset para centralizar
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
    ballY = canvas.height - paddleHeight - ballRadius - 25; // Começa um pouco acima da barra
    paddleX = (canvas.width - paddleWidth) / 2;
    
    let speedMultiplier = 1 + (currentLevel - 1) * 0.18;
    let currentSpeedMagnitude = initialBallSpeedX * speedMultiplier; 
    if (currentSpeedMagnitude > MAX_BALL_SPEED_MAGNITUDE) currentSpeedMagnitude = MAX_BALL_SPEED_MAGNITUDE;
    if (currentSpeedMagnitude < initialBallSpeedX) currentSpeedMagnitude = initialBallSpeedX; // Garante velocidade mínima

    let angle = (Math.PI / 4) + (Math.random() * Math.PI / 2); 
    ballSpeedX = currentSpeedMagnitude * Math.cos(angle) * (Math.random() > 0.5 ? 1: -1); 
    ballSpeedY = -currentSpeedMagnitude * Math.sin(angle); 
    
    if (Math.abs(ballSpeedX) < 1.5) ballSpeedX = (ballSpeedX >= 0 ? 1.5 : -1.5);
    if (Math.abs(ballSpeedY) < 1.5) ballSpeedY = (ballSpeedY >= 0 ? 1.5 : -1.5); // Garante que Y não seja 0 e tenha direção
    if (ballSpeedY >=0) ballSpeedY = -Math.abs(ballSpeedY); // Força a bola a ir para cima
}


function drawInitialQuebraBlocosScreen() {
    if (!ctx || !canvas) return;
    console.log("PONG.JS->QB.JS: drawInitialQuebraBlocosScreen chamada"); // Mudei o log para QB.JS
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setupLevel(1); // Configura tijolos do nível 1 para desenho inicial
    resetBallAndPaddleQB(); // Define posições iniciais da bola e paddle para desenho
    
    drawBricksQB();
    drawPaddleQB();
    drawBallQB();

    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
    if (quebraBlocosGameInfo) {
        quebraBlocosGameInfo.style.display = 'flex'; // Mostrar para exibir vidas e nível inicial
        // As variáveis lives, score, currentLevel já devem ter seus valores iniciais
        updateUIDisplaysQB(); 
    }
    if (canvas) canvas.style.display = 'block';
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
    lives = INITIAL_LIVES; // Usa a constante
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

document.addEventListener('keydown', keyDownHandlerQB, false);
document.addEventListener('keyup', keyUpHandlerQB, false);
// REMOVIDO: document.addEventListener('mousemove', mouseMoveHandlerQB, false);

function keyDownHandlerQB(e) {
    const K_LEFT = 'ArrowLeft', K_RIGHT = 'ArrowRight';
    if (!gameHasStartedQB && (e.key === K_LEFT || e.key === K_RIGHT || e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 'd')) {
        e.preventDefault(); 
        initializeGameQuebraBlocos();
    }
    if (gameHasStartedQB && !gameOver && !gamePaused) {
        if (e.key === K_RIGHT || e.key.toLowerCase() === 'd') rightPressedQB = true;
        else if (e.key === K_LEFT || e.key.toLowerCase() === 'a') leftPressedQB = true;
        if ([K_LEFT, K_RIGHT, 'a', 'A', 'd', 'D'].includes(e.key)) e.preventDefault();
    }
    if (gamePaused && levelCompleteScreenQB && levelCompleteScreenQB.style.display !== 'none' && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        if(nextLevelButtonQB) nextLevelButtonQB.click(); 
    }
}
function keyUpHandlerQB(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressedQB = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressedQB = false;
}
// REMOVIDA: function mouseMoveHandlerQB(e) { ... }

function drawBallQB() { ctx.beginPath(); ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.closePath(); }
function drawPaddleQB() { ctx.beginPath(); ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight); ctx.fillStyle = 'var(--accent-color, #00bcd4)'; ctx.fill(); ctx.closePath(); }
function drawBricksQB() { /* ... (igual à versão anterior) ... */
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

function collisionDetectionQB() { /* ... (igual à versão anterior) ... */
    let allBricksCleared = true;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                allBricksCleared = false; 
                if (ballX + ballRadius > b.x && ballX - ballRadius < b.x + brickWidth &&
                    ballY + ballRadius > b.y && ballY - ballRadius < b.y + brickHeight) {
                    ballSpeedY = -ballSpeedY; b.status = 0; score += 10; updateUIDisplaysQB();
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

async function saveHighScoreQuebraBlocos(finalScore) { /* ... (igual à versão anterior) ... */
    console.log(`SaveHighScoreQuebraBlocos: User:`, qbCurrentUser, "Username:", qbUsername, "Score:", finalScore);
    if (qbCurrentUser && window.firebaseDb) {
        const userId = qbCurrentUser.uid; const gameId = "quebra_blocos"; const usernameToSave = qbUsername || qbCurrentUser.email;
        const highScoreDocId = `${userId}_${gameId}`; const highScoreRef = window.firebaseDb.collection("highscores").doc(highScoreDocId);
        try {
            const docSnap = await highScoreRef.get();
            if (!docSnap.exists || finalScore > docSnap.data().score) {
                await highScoreRef.set({ userId: userId, username: usernameToSave, gameId: gameId, score: finalScore, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                console.log(`Highscore de Quebra Blocos salvo/atualizado: ${finalScore} por ${usernameToSave}`);
            } else { console.log(`Nova pontuação (${finalScore}) não é maior que o highscore existente.`);}
        } catch (error) { console.error("Erro ao salvar/atualizar highscore de Quebra Blocos: ", error); }
    } else { if (!qbCurrentUser) console.log("Nenhum usuário logado. Highscore não salvo."); else console.log("Firestore (window.firebaseDb) não disponível."); }
}

function handleQuebraBlocosGameOver() { /* ... (igual à versão anterior) ... */
    gameOver = true; gameHasStartedQB = false; if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    alert(`FIM DE JOGO!\nNível: ${currentLevel}\nPontuação: ${score}`); saveHighScoreQuebraBlocos(score);
    setTimeout(() => { drawInitialQuebraBlocosScreen(); }, 1500);
}

function updateQB() { /* ... (igual à versão anterior, com a lógica de velocidade gradual e vidas) ... */
    if (gameOver || gamePaused) return;
    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) ballSpeedX = -ballSpeedX;
    if (ballY + ballSpeedY < ballRadius) { ballSpeedY = -ballSpeedY;
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
                    ballSpeedX = currentMagnitude * Math.cos(angle); ballSpeedY = currentMagnitude * Math.sin(angle);
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
    // Sempre desenha os elementos base do jogo para a tela inicial ou durante o jogo
    drawBricksQB(); drawPaddleQB(); drawBallQB();
}

function gameLoopQB() {
    if (!gameOver && !gamePaused) { updateQB(); }
    drawQB(); 
    if (!gameOver) { animationFrameIdQB = requestAnimationFrame(gameLoopQB); }
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
        // Se o loop principal parou por causa do gamePaused, precisa ser reiniciado ou continuar
        if (gameHasStartedQB && !animationFrameIdQB && !gameOver) { // Se o jogo tinha começado mas o loop parou
             // gameLoopQB(); // Chamada direta aqui pode empilhar. Melhor apenas mudar o estado gamePaused.
        } else if (!gameHasStartedQB && !gameOver) { // Caso raro, mas se o jogo não começou ainda
            // initializeGameQuebraBlocos(); // Não deveria ser necessário
        }
    });
}

// Prepara e desenha a tela inicial do Quebra Blocos
// As variáveis globais score, lives, currentLevel são definidas no topo.
// A função drawInitialQuebraBlocosScreen usa essas globais e as configura para o nível 1.
drawInitialQuebraBlocosScreen();
