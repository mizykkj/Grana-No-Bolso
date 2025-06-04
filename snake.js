// snake.js - ATUALIZADO com tela de início, início por setas e username
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score'); // Span para pontuação dentro de #snakeGameInfo
const startButtonSnake = document.getElementById('startButtonSnake');
const snakeGameInstructionsAndScore = document.getElementById('snakeGameInfo'); // Div que contém o score
const snakeStartMessage = document.getElementById('snakeStartMessage'); // Parágrafo da mensagem de início

const gridSize = 20;
let snake, food, direction, currentScore, changingDirection, gameLoopTimeout;
let gameSpeed = 100;
let gameHasStarted = false;

let snakeGameCurrentUser = null;
let snakeGameUsername = null;

if (window.firebaseAuth && window.firebaseDb) {
    window.firebaseAuth.onAuthStateChanged(async user => {
        if (user) {
            console.log("Snake.js - onAuthStateChanged: Usuário LOGADO:", user.email);
            snakeGameCurrentUser = user;
            try {
                const userDoc = await window.firebaseDb.collection("usuarios").doc(user.uid).get();
                if (userDoc.exists && userDoc.data().username) {
                    snakeGameUsername = userDoc.data().username;
                    console.log("Snake.js - Username obtido para o jogo:", snakeGameUsername);
                } else {
                    snakeGameUsername = user.email; // Fallback
                }
            } catch (error) { snakeGameUsername = user.email; console.error("Snake.js - Erro ao buscar username:", error); }
        } else {
            console.log("Snake.js - onAuthStateChanged: Usuário DESLOGADO.");
            snakeGameCurrentUser = null; snakeGameUsername = null;
        }
    });
} else {
    console.error("Snake.js: Instâncias do Firebase não disponíveis!");
}

function initializeStaticElements() {
    snake = [{ x: 10, y: 10 }];
    direction = 'right';
    currentScore = 0;
    if (scoreDisplay) scoreDisplay.textContent = currentScore;
    if (Object.keys(food || {}).length === 0) createFood();
}

function drawInitialScreen() {
    if (!canvas || !ctx) return;
    clearCanvas();
    if (snake) drawSnake();
    if (food && Object.keys(food).length !== 0) drawFood();
    
    if (snakeStartMessage) snakeStartMessage.style.display = 'block';
    if (startButtonSnake) startButtonSnake.style.display = 'inline-block';
    if (snakeGameInstructionsAndScore) snakeGameInstructionsAndScore.style.display = 'none'; // Esconde pontuação até começar
    if (canvas) canvas.style.display = 'block'; // Canvas visível
}

function initializeGameVariablesAndStart() {
    if (gameHasStarted) return;
    gameHasStarted = true;
    console.log("Iniciando o jogo da cobrinha...");

    if (startButtonSnake) startButtonSnake.style.display = 'none';
    if (snakeStartMessage) snakeStartMessage.style.display = 'none';
    if (snakeGameInstructionsAndScore) snakeGameInstructionsAndScore.style.display = 'block'; // Mostra a pontuação

    snake = [{ x: 10, y: 10 }];
    food = {};
    direction = 'right';
    currentScore = 0;
    if (scoreDisplay) scoreDisplay.textContent = currentScore;
    changingDirection = false;
    if (gameLoopTimeout) clearTimeout(gameLoopTimeout);

    createFood();
    main();
}

if (startButtonSnake) {
    startButtonSnake.addEventListener('click', initializeGameVariablesAndStart);
}

function startGameWithArrowKey(event) {
    const ARROW_KEYS = [37, 38, 39, 40];
    if (ARROW_KEYS.includes(event.keyCode) && !gameHasStarted) {
        // event.preventDefault(); // O changeDirection já faz isso se o jogo começar
        initializeGameVariablesAndStart();
    }
}
document.addEventListener('keydown', startGameWithArrowKey);

async function saveScoreToFirestore(gameScore) {
    // ... (função saveScoreToFirestore igual à última versão, usando snakeGameCurrentUser e snakeGameUsername) ...
    console.log("SaveScore (snake.js): User:", snakeGameCurrentUser, "Username:", snakeGameUsername, "Score:", gameScore);
    if (snakeGameCurrentUser && window.firebaseDb) {
        const userId = snakeGameCurrentUser.uid;
        const gameId = "snake";
        const usernameToSave = snakeGameUsername || snakeGameCurrentUser.email;
        const highScoreDocId = `${userId}_${gameId}`;
        const highScoreRef = window.firebaseDb.collection("highscores").doc(highScoreDocId);
        try {
            const docSnap = await highScoreRef.get();
            if (!docSnap.exists || gameScore > docSnap.data().score) {
                await highScoreRef.set({ userId: userId, username: usernameToSave, gameId: gameId, score: gameScore, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                console.log(`Highscore salvo/atualizado para ${gameId}: ${gameScore} por ${usernameToSave}`);
            } else {
                console.log(`Nova pontuação (${gameScore}) não é maior que o highscore existente (${docSnap.data().score}).`);
            }
        } catch (error) { console.error("Erro ao salvar/atualizar highscore (snake.js): ", error); }
    } else { if (!snakeGameCurrentUser) console.log("Nenhum usuário logado. Highscore não salvo."); else console.log("Firestore (window.firebaseDb) não disponível."); }
}

function main() {
    if (didGameEnd()) {
        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
        alert("Fim de Jogo! Pontuação: " + currentScore);
        saveScoreToFirestore(currentScore).then(() => {
            setTimeout(() => { 
                // Opção: Resetar para tela inicial do jogo em vez de recarregar a página toda
                // gameHasStarted = false;
                // initializeStaticElements();
                // drawInitialScreen();
                document.location.reload(); // Mais simples por enquanto
            }, 1500);
        });
        return;
    }
    changingDirection = false;
    gameLoopTimeout = setTimeout(function onTick() {
        clearCanvas(); drawFood(); advanceSnake(); drawSnake(); main();
    }, gameSpeed);
}

function clearCanvas() { ctx.fillStyle = '#0a0a0a'; ctx.strokeStyle = '#383838'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeRect(0, 0, canvas.width, canvas.height); }
function drawSnakePart(snakePart) { ctx.fillStyle = 'lightgreen'; ctx.strokeStyle = 'darkgreen'; ctx.fillRect(snakePart.x * gridSize, snakePart.y * gridSize, gridSize, gridSize); ctx.strokeRect(snakePart.x * gridSize, snakePart.y * gridSize, gridSize, gridSize); }
function drawSnake() { snake.forEach(drawSnakePart); }
function advanceSnake() { const head = { x: snake[0].x, y: snake[0].y }; switch (direction) { case 'up': head.y -= 1; break; case 'down': head.y += 1; break; case 'left': head.x -= 1; break; case 'right': head.x += 1; break; } snake.unshift(head); const didEatFood = snake[0].x === food.x && snake[0].y === food.y; if (didEatFood) { currentScore += 10; if (scoreDisplay) scoreDisplay.textContent = currentScore; createFood(); } else { snake.pop(); } }
function createFood() { food.x = Math.floor(Math.random() * (canvas.width / gridSize)); food.y = Math.floor(Math.random() * (canvas.height / gridSize)); snake.forEach(function isFoodOnSnake(part) { if (part.x === food.x && part.y === food.y) createFood(); }); }
function drawFood() { ctx.fillStyle = 'red'; ctx.strokeStyle = 'darkred'; ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize); ctx.strokeRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize); }
function didGameEnd() { if (!snake || snake.length === 0 || !snake[0]) return false; for (let i = 4; i < snake.length; i++) { if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true; } const hitLeftWall = snake[0].x < 0; const hitRightWall = snake[0].x >= canvas.width / gridSize; const hitTopWall = snake[0].y < 0; const hitBottomWall = snake[0].y >= canvas.height / gridSize; return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall; }
function changeDirection(event) {
    if (!gameHasStarted || didGameEnd()) return; // Só permite mudar direção se o jogo estiver rodando
    const LEFT_KEY = 37, RIGHT_KEY = 39, UP_KEY = 38, DOWN_KEY = 40;
    if ([LEFT_KEY, RIGHT_KEY, UP_KEY, DOWN_KEY].includes(event.keyCode)) {
        event.preventDefault();
    }
    if (changingDirection) return;
    changingDirection = true;
    const keyPressed = event.keyCode;
    const goingUp = direction === 'up', goingDown = direction === 'down', goingLeft = direction === 'left', goingRight = direction === 'right';
    if (keyPressed === LEFT_KEY && !goingRight) direction = 'left';
    if (keyPressed === UP_KEY && !goingDown) direction = 'up';
    if (keyPressed === RIGHT_KEY && !goingLeft) direction = 'right';
    if (keyPressed === DOWN_KEY && !goingUp) direction = 'down';
}
document.addEventListener('keydown', changeDirection);

// Prepara a tela inicial, mas não inicia o loop do jogo.
initializeStaticElements();
drawInitialScreen();
