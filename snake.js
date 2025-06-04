// snake.js - ATUALIZADO com listener 'firebaseReady'
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const startButtonSnake = document.getElementById('startButtonSnake');
const snakeGameInstructions = document.getElementById('snakeGameInstructions');

const gridSize = 20;
let snake;
let food;
let direction;
let currentScore;
let changingDirection;
let gameSpeed = 100;
let gameLoopTimeout;

let snakeGameCurrentUser = null; // Para armazenar o usuário logado nesta página

window.addEventListener('firebaseReady', () => {
    console.log("Snake.js: Evento 'firebaseReady' recebido!");
    if (window.fbOnAuthStateChanged && window.firebaseAuthInstance) { // Verifica as funções/instâncias globais
        window.fbOnAuthStateChanged(user => { // Usa a função global exposta
            if (user) {
                console.log("Snake.js - onAuthStateChanged via firebaseReady: Usuário está LOGADO:", user.email);
                snakeGameCurrentUser = user;
            } else {
                console.log("Snake.js - onAuthStateChanged via firebaseReady: Usuário está DESLOGADO.");
                snakeGameCurrentUser = null;
            }
        });
    } else {
        console.error("Snake.js: Funções globais do Firebase (fbOnAuthStateChanged ou firebaseAuthInstance) não estão disponíveis após 'firebaseReady'!");
    }
});

function initializeGameVariables() {
    snake = [{ x: 10, y: 10 }];
    food = {};
    direction = 'right';
    currentScore = 0;
    if (scoreDisplay) scoreDisplay.textContent = currentScore;
    changingDirection = false;
    if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
}

function startGame() {
    if (startButtonSnake) startButtonSnake.style.display = 'none';
    if (canvas) canvas.style.display = 'block';
    if (snakeGameInstructions) snakeGameInstructions.style.display = 'block';
    initializeGameVariables();
    createFood();
    main();
}

if (startButtonSnake) {
    startButtonSnake.addEventListener('click', startGame);
} else {
    console.warn("Botão de iniciar (startButtonSnake) não encontrado no HTML.");
}

async function saveScoreToFirestore(gameScore) {
    console.log("Função saveScoreToFirestore FOI CHAMADA com score:", gameScore);
    console.log("Objeto snakeGameCurrentUser no momento de salvar:", snakeGameCurrentUser);

    if (snakeGameCurrentUser && window.fbAddDoc && window.fbServerTimestamp) {
        try {
            await window.fbAddDoc("pontuacoes", { // Usa a função global exposta
                userId: snakeGameCurrentUser.uid,
                userEmail: snakeGameCurrentUser.email,
                gameId: "snake",
                score: gameScore,
                timestamp: window.fbServerTimestamp() // Usa a função global exposta
            });
            console.log("Pontuação salva com sucesso no Firestore! Score: " + gameScore);
        } catch (error) {
            console.error("Erro ao salvar pontuação no Firestore (snake.js): ", error);
        }
    } else {
        if (!snakeGameCurrentUser) {
            console.log("Nenhum usuário logado (verificado através de snakeGameCurrentUser). Pontuação não será salva.");
        }
        if (!window.fbAddDoc || !window.fbServerTimestamp) {
            console.error("Funções do Firestore (fbAddDoc ou fbServerTimestamp) não encontradas globalmente em snake.js.");
        }
    }
}

function main() {
    if (didGameEnd()) {
        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
        alert("Fim de Jogo! Pontuação: " + currentScore);
        saveScoreToFirestore(currentScore).then(() => {
            setTimeout(() => {
                document.location.reload();
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
function changeDirection(event) { const LEFT_KEY = 37, RIGHT_KEY = 39, UP_KEY = 38, DOWN_KEY = 40; if ([LEFT_KEY, RIGHT_KEY, UP_KEY, DOWN_KEY].includes(event.keyCode)) event.preventDefault(); if (changingDirection) return; if (canvas && canvas.style.display === 'block' && !didGameEnd()) { changingDirection = true; const keyPressed = event.keyCode; const goingUp = direction === 'up', goingDown = direction === 'down', goingLeft = direction === 'left', goingRight = direction === 'right'; if (keyPressed === LEFT_KEY && !goingRight) direction = 'left'; if (keyPressed === UP_KEY && !goingDown) direction = 'up'; if (keyPressed === RIGHT_KEY && !goingLeft) direction = 'right'; if (keyPressed === DOWN_KEY && !goingUp) direction = 'down'; } }

document.addEventListener('keydown', changeDirection);
if (scoreDisplay) scoreDisplay.textContent = 0;
