// quebra_blocos.js - VERSÃO COMPLETA E CORRIGIDA

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

const INITIAL_LIVES = 3; // Constante para vidas iniciais
let score = 0;
let lives = INITIAL_LIVES; // Usa a constante
let currentLevel = 1;
const MAX_LEVELS_QB = 3; // Exemplo: 3 níveis (ajuste conforme desejar)

let gamePaused = false; 
let gameOver = false;
let gameHasStartedQB = false;
let animationFrameIdQB;

// Usuário Logado (do Firebase)
let qbCurrentUser = null;
let qbUsername = null;

// Listener do Firebase Auth (deve estar no HTML da página ou garantido que rode antes)
if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) {
            console.log("QuebraBlocos.js - onAuthStateChanged: Usuário LOGADO:", user.email);
            qbCurrentUser = user;
            try {
                const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get();
                if (userDoc.exists && userDoc.data().username) {
                    qbUsername = userDoc.data().username;
                } else { 
                    qbUsername = user.email; // Fallback para email
                    console.log("QuebraBlocos.js - Username não encontrado no Firestore, usando email.");
                }
            } catch (error) { 
                qbUsername = user.email; // Fallback em caso de erro
                console.error("QuebraBlocos.js - Erro ao buscar username:", error);
            }
        } else {
            console.log("QuebraBlocos.js - onAuthStateChanged: Usuário DESLOGADO.");
            qbCurrentUser = null; qbUsername = null;
        }
    });
} else {
    console.error("QuebraBlocos.js: Instâncias do Firebase (Auth ou Db) não disponíveis globalmente! Verifique a inicialização no HTML.");
}

// --- Configurações da Bola ---
let ballRadius = 8;
let ballX, ballY;
let initialBallSpeedX = 3.5; 
let initialBallSpeedY = -3.5; 
let ballSpeedX, ballSpeedY;
const MAX_BALL_SPEED_MAGNITUDE_QB = 9;

// --- Configurações da Barra (Paddle) ---
let paddleHeight = 12;
let paddleWidth = 80;
let paddleX;
const PADDLE_SPEED_QB = 7; 
let rightPressedQB = false;
let leftPressedQB = false;

// --- Configurações dos Tijolos ---
let brickRowCount, brickColumnCount;
let brickWidth, brickHeight = 20, brickPadding = 5, brickOffsetTop = 40, brickOffsetLeft = 20;
let bricks = [];
const brickColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6', '#1ABC9C', '#E74C3C'];

let paddleHitCount = 0; // Para aumento gradual de velocidade da bola
const HITS_FOR_SPEED_INCREASE = 8; // Aumenta velocidade a cada X rebatidas
const SPEED_INCREMENT = 0.25;


function updateUIDisplaysQB() {
    if (scoreDisplayQB) scoreDisplayQB.textContent = score;
    if (livesDisplayQB) livesDisplayQB.textContent = lives;
    if (levelDisplayQB) levelDisplayQB.textContent = currentLevel;
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
        totalPaddingWidth = brickColumnCount > 1 ? brickPadding * (brickColumnCount - 1) : 0;
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
    ballY = canvas.height - paddleHeight - ballRadius - 25; 
    paddleX = (canvas.width - paddleWidth) / 2;
    
    let speedMultiplier = 1 + (currentLevel - 1) * 0.18;
    let currentSpeedMagnitudeX = initialBallSpeedX * speedMultiplier;
    let currentSpeedMagnitudeY = Math.abs(initialBallSpeedY) * speedMultiplier;

    if (currentSpeedMagnitudeX > MAX_BALL_SPEED_MAGNITUDE_QB) currentSpeedMagnitudeX = MAX_BALL_SPEED_MAGNITUDE_QB;
    if (currentSpeedMagnitudeY > MAX_BALL_SPEED_MAGNITUDE_QB) currentSpeedMagnitudeY = MAX_BALL_SPEED_MAGNITUDE_QB;
    if (currentSpeedMagnitudeX < initialBallSpeedX) currentSpeedMagnitudeX = initialBallSpeedX; // Garante velocidade X mínima
    if (currentSpeedMagnitudeY < Math.abs(initialBallSpeedY)) currentSpeedMagnitudeY = Math.abs(initialBallSpeedY); // Garante velocidade Y mínima
    
    ballSpeedX = currentSpeedMagnitudeX * (Math.random() > 0.5 ? 1: -1); 
    ballSpeedY = -currentSpeedMagnitudeY; // Sempre começa subindo
    
    if (Math.abs(ballSpeedX) < 1.5) ballSpeedX = (ballSpeedX >= 0 ? 1.5 : -1.5);
    if (Math.abs(ballSpeedY) < 1.5) ballSpeedY = -1.5; 
}

// --- FUNÇÕES DE DESENHO ---
function drawBallQB() { 
    if (!ctx) return;
    ctx.beginPath(); 
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2); 
    ctx.fillStyle = '#FFFFFF'; // Bola branca
    ctx.fill(); 
    ctx.closePath(); 
}

function drawPaddleQB() { 
    if (!ctx) return;
    ctx.beginPath(); 
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight); 
    ctx.fillStyle = '#FFFFFF'; // COR DA BARRA MUDADA PARA BRANCO
    ctx.fill(); 
    ctx.closePath(); 
}

function drawBricksQB() {
    if (!ctx) return;
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c] && bricks[c][r] && bricks[c][r].status === 1) {
                let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX; bricks[c][r].y = brickY;
                ctx.beginPath(); ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = bricks[c][r].color; ctx.fill(); ctx.closePath();
            }
        }
    }
}

function drawInitialQuebraBlocosScreen() {
    if (!ctx || !canvas) return;
    console.log("QB.JS: drawInitialQuebraBlocosScreen chamada");
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Define o estado inicial para desenho (nível 1)
    currentLevel = 1; // Garante que estamos configurando para o nível 1
    score = 0;
    lives = INITIAL_LIVES; // Garante que vidas estejam corretas
    setupLevel(currentLevel); 
    resetBallAndPaddleQB(); // Define posições e velocidades iniciais da bola e paddle
                            
    drawBricksQB(); 
    drawPaddleQB();  
    drawBallQB();   

    if (quebraBlocosPreGameMessages) quebraBlocosPreGameMessages.style.display = 'block';
    if (startButtonQuebraBlocos) startButtonQuebraBlocos.style.display = 'inline-block';
    if (quebraBlocosGameInfo) {
        quebraBlocosGameInfo.style.display = 'flex'; 
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
// Controle do mouse foi removido

function keyDownHandlerQB(e) {
    const K_LEFT = 'ArrowLeft', K_RIGHT = 'ArrowRight', K_UP = 'ArrowUp', K_DOWN = 'ArrowDown';
    // Teclas de movimento do paddle (Setas e A/D)
    const PADDLE_MOVE_KEYS = [K_LEFT, K_RIGHT, 'a', 'A', 'd', 'D'];
    // Teclas de ação (Enter, Space, e Setas para continuar após nível)
    const ACTION_KEYS = ['Enter', ' ', K_UP, K_DOWN, K_LEFT, K_RIGHT]; // Adicionei ' ' para Spacebar

    if (!gameHasStartedQB && PADDLE_MOVE_KEYS.includes(e.key === 'A' || e.key === 'D' ? e.key.toLowerCase() : e.key )) {
        e.preventDefault(); 
        initializeGameQuebraBlocos();
    }
    if (gameHasStartedQB && !gameOver && !gamePaused) {
        if (e.key === K_RIGHT || e.key.toLowerCase() === 'd') rightPressedQB = true;
        else if (e.key === K_LEFT || e.key.toLowerCase() === 'a') leftPressedQB = true;
        
        if (PADDLE_MOVE_KEYS.includes(e.key === 'A' || e.key === 'D' ? e.key.toLowerCase() : e.key)) e.preventDefault();
    }
    if (gamePaused && levelCompleteScreenQB && levelCompleteScreenQB.style.display !== 'none' && 
        ACTION_KEYS.includes(e.key) || (e.code === 'Space')) { // Checa e.key para Enter, e.code para Space, e ARROW_KEYS_ALL para setas
        e.preventDefault();
        if(nextLevelButtonQB) nextLevelButtonQB.click(); 
    }
}
function keyUpHandlerQB(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') rightPressedQB = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') leftPressedQB = false;
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
                    // Simples ricochete no eixo Y. Poderia ser mais complexo para ricochete lateral nos tijolos.
                    // Se a bola bateu na lateral do tijolo, inverter ballSpeedX seria mais realista.
                    // Para simplificar por agora, apenas invertemos Y.
                    b.status = 0; 
                    score += 10;
                    updateUIDisplaysQB();
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
        const gameId = "quebra_blocos"; // IMPORTANTE: gameId correto
        const usernameToSave = qbUsername || qbCurrentUser.email;
        const highScoreDocId = `${userId}_${gameId}`;
        const highScoreRef = window.firebaseDb.collection("highscores").doc(highScoreDocId);
        try {
            const docSnap = await highScoreRef.get();
            if (!docSnap.exists || finalScore > docSnap.data().score) {
                await highScoreRef.set({ userId: userId, username: usernameToSave, gameId: gameId, score: finalScore, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                console.log(`Highscore de Quebra Blocos salvo/atualizado: ${finalScore} por ${usernameToSave}`);
            } else { console.log(`Nova pontuação (${finalScore}) não é maior que o highscore existente (${docSnap.data().score}).`);}
        } catch (error) { console.error("Erro ao salvar/atualizar highscore de Quebra Blocos: ", error); }
    } else { if (!qbCurrentUser) console.log("Nenhum usuário logado. Highscore não salvo."); else console.log("Firestore (window.firebaseDb) não disponível."); }
}

function handleQuebraBlocosGameOver() {
    gameOver = true; gameHasStartedQB = false; 
    if (animationFrameIdQB) cancelAnimationFrame(animationFrameIdQB);
    alert(`FIM DE JOGO!\nNível: ${currentLevel}\nPontuação: ${score}`); 
    saveHighScoreQuebraBlocos(score);
    setTimeout(() => { 
        drawInitialQuebraBlocosScreen(); 
    }, 1500);
}

function updateQB() {
    if (gameOver || gamePaused) return;

    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) ballSpeedX = -ballSpeedX;
    
    if (ballY + ballSpeedY < ballRadius) { 
        ballSpeedY = -ballSpeedY;
    } else if (ballY + ballSpeedY > canvas.height - ballRadius - paddleHeight) {
        if (ballX + ballRadius > paddleX && ballX - ballRadius < paddleX + paddleWidth) { // Colisão com o paddle (ajustado)
            ballSpeedY = -ballSpeedY; 
            ballY = canvas.height - paddleHeight - ballRadius - 0.1; 
            
            paddleHitCount++;
            if (paddleHitCount > 0 && paddleHitCount % HITS_FOR_SPEED_INCREASE === 0) {
                 let currentMagnitude = Math.sqrt(ballSpeedX*ballSpeedX + ballSpeedY*ballSpeedY);
                 if(currentMagnitude < MAX_BALL_SPEED_MAGNITUDE_QB) {
                    currentMagnitude += SPEED_INCREMENT;
                    if (currentMagnitude > MAX_BALL_SPEED_MAGNITUDE_QB) currentMagnitude = MAX_BALL_SPEED_MAGNITUDE_QB;
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
    drawBricksQB(); 
    drawPaddleQB(); 
    drawBallQB();
}

function gameLoopQB() {
    if (!gameOver && !gamePaused) { updateQB(); }
    drawQB(); 
    if (!gameOver) { animationFrameIdQB = requestAnimationFrame(gameLoopQB); }
}

if (nextLevelButtonQB) {
    nextLevelButtonQB.addEventListener('click', () => {
        if (levelCompleteScreenQB) levelCompleteScreenQB.style.display = 'none';
        gamePaused = false; 
        currentLevel++;
        updateUIDisplaysQB(); 
        if (currentLevel > MAX_LEVELS_QB) {
            alert("Parabéns! Você completou todos os níveis do Quebra Blocos!");
            handleQuebraBlocosGameOver(); return;
        }
        setupLevel(currentLevel);
        resetBallAndPaddleQB(); 
    });
}

// Prepara e desenha a tela inicial do Quebra Blocos
drawInitialQuebraBlocosScreen();
