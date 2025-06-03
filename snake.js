// snake.js - ATUALIZADO COM BOTÃO DE INÍCIO E DEBUG
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

function initializeGameVariables() {
    snake = [{ x: 10, y: 10 }];
    food = {};
    direction = 'right';
    currentScore = 0;
    if (scoreDisplay) scoreDisplay.textContent = currentScore;
    changingDirection = false;
    if (gameLoopTimeout) clearTimeout(gameLoopTimeout); // Limpa timeout anterior, se houver
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
    console.log("Valor de window.firebaseAuth neste momento:", window.firebaseAuth);

    if (!window.firebaseAuth) {
        console.error("ERRO CRÍTICO: window.firebaseAuth está INDEFINIDO quando saveScoreToFirestore é chamada!");
        alert("Erro crítico: Autenticação do Firebase não está pronta. A pontuação não pode ser salva.");
        return;
    }

    const user = window.firebaseAuth.currentUser;
    console.log("Objeto currentUser obtido:", user);

    if (user) {
        try {
            await window.firebaseDb.collection("pontuacoes").add({
                userId: user.uid,
                userEmail: user.email,
                gameId: "snake",
                score: gameScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Pontuação salva com sucesso no Firestore! Score: " + gameScore);
        } catch (error) {
            console.error("Erro ao salvar pontuação no Firestore: ", error);
        }
    } else {
        console.log("Nenhum usuário logado (verificado dentro de saveScoreToFirestore). Pontuação não será salva no ranking.");
    }
}

function main() {
    if (didGameEnd()) {
        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
        alert("Fim de Jogo! Pontuação: " + currentScore);
        saveScoreToFirestore(currentScore).then(() => {
            setTimeout(() => {
                // Para testar sem recarregar e poder ver o console:
                // console.log("Jogo terminado, pontuação processada.");
                // if (startButtonSnake) startButtonSnake.style.display = 'block'; // Mostrar botão de novo
                // if (canvas) canvas.style.display = 'none';
                // if (snakeGameInstructions) snakeGameInstructions.style.display = 'none';
                document.location.reload(); // Recarrega para jogar de novo
            }, 1500);
        });
        return;
    }

    changingDirection = false;
    gameLoopTimeout = setTimeout(function onTick() {
        clearCanvas();
        drawFood();
        advanceSnake();
        drawSnake();
        main();
    }, gameSpeed);
}

function clearCanvas() {
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#383838';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function drawSnakePart(snakePart) {
    ctx.fillStyle = 'lightgreen';
    ctx.strokeStyle = 'darkgreen';
    ctx.fillRect(snakePart.x * gridSize, snakePart.y * gridSize, gridSize, gridSize);
    ctx.strokeRect(snakePart.x * gridSize, snakePart.y * gridSize, gridSize, gridSize);
}

function drawSnake() {
    snake.forEach(drawSnakePart);
}

function advanceSnake() {
    const head = { x: snake[0].x, y: snake[0].y };
    switch (direction) {
        case 'up': head.y -= 1; break;
        case 'down': head.y += 1; break;
        case 'left': head.x -= 1; break;
        case 'right': head.x += 1; break;
    }
    snake.unshift(head);
    const didEatFood = snake[0].x === food.x && snake[0].y === food.y;
    if (didEatFood) {
        currentScore += 10;
        if (scoreDisplay) scoreDisplay.textContent = currentScore;
        createFood();
    } else {
        snake.pop();
    }
}

function createFood() {
    food.x = Math.floor(Math.random() * (canvas.width / gridSize));
    food.y = Math.floor(Math.random() * (canvas.height / gridSize));
    snake.forEach(function isFoodOnSnake(part) {
        if (part.x === food.x && part.y === food.y) {
            createFood();
        }
    });
}

function drawFood() {
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'darkred';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
    ctx.strokeRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
}

function didGameEnd() {
    if (!snake || snake.length === 0 || !snake[0]) return false; // Checagem de segurança
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
    }
    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x >= canvas.width / gridSize;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y >= canvas.height / gridSize;
    return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

function changeDirection(event) {
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    if ([LEFT_KEY, RIGHT_KEY, UP_KEY, DOWN_KEY].includes(event.keyCode)) {
        event.preventDefault();
    }

    if (changingDirection) return;
    // Só permite mudar direção se o jogo estiver ativo (canvas visível)
    if (canvas && canvas.style.display === 'block' && !didGameEnd()) {
        changingDirection = true;
        const keyPressed = event.keyCode;
        const goingUp = direction === 'up';
        const goingDown = direction === 'down';
        const goingLeft = direction === 'left';
        const goingRight = direction === 'right';

        if (keyPressed === LEFT_KEY && !goingRight) { direction = 'left'; }
        if (keyPressed === UP_KEY && !goingDown) { direction = 'up'; }
        if (keyPressed === RIGHT_KEY && !goingLeft) { direction = 'right'; }
        if (keyPressed === DOWN_KEY && !goingUp) { direction = 'down'; }
    }
}
document.addEventListener('keydown', changeDirection);

// Não inicia o jogo automaticamente aqui. O jogo começa com o clique no botão.
// A UI inicial (score 0) é definida em initializeGameVariables() ou pode ser setada no HTML diretamente.
if (scoreDisplay) scoreDisplay.textContent = 0; // Garante que o placar comece em 0 visualmente
