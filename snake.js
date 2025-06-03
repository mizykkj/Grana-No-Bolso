// snake.js - ATUALIZADO PARA SALVAR PONTUAÇÕES
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

const gridSize = 20;
let snake = [{ x: 10, y: 10 }];
let food = {};
let direction = 'right';
let currentScore = 0; // Renomeado de 'score' para evitar conflito
let changingDirection = false;
let gameSpeed = 100; // Mantivemos a velocidade ajustada

// Função para salvar a pontuação no Firestore
async function saveScoreToFirestore(gameScore) {
    // Acessa a instância de autenticação global do Firebase
    const user = window.firebaseAuth.currentUser;

    if (user) { // Só salva se houver um usuário logado
        try {
            // Acessa a instância 'db' do Firestore que tornamos global
            await window.firebaseDb.collection("pontuacoes").add({
                userId: user.uid,
                userEmail: user.email,
                gameId: "snake", // Identificador para o jogo da cobrinha
                score: gameScore,
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Pega a data/hora do servidor Firebase
            });
            console.log("Pontuação salva com sucesso no Firestore! Score: " + gameScore);
        } catch (error) {
            console.error("Erro ao salvar pontuação no Firestore: ", error);
        }
    } else {
        console.log("Nenhum usuário logado. Pontuação não será salva no ranking.");
    }
}

function main() {
    if (didGameEnd()) {
        alert("Fim de Jogo! Pontuação: " + currentScore);
        // Chama a função para salvar a pontuação ANTES de recarregar
        saveScoreToFirestore(currentScore).then(() => {
            // Recarrega a página após a tentativa de salvar (bem-sucedida ou não)
            // Adicionamos um pequeno delay para dar tempo de ver logs ou mensagens
            setTimeout(() => {
                document.location.reload();
            }, 1500); // Espera 1.5 segundos
        });
        return; // Para a execução da função main aqui
    }

    changingDirection = false;
    setTimeout(function onTick() {
        clearCanvas();
        drawFood();
        advanceSnake();
        drawSnake();
        main();
    }, gameSpeed);
}

function clearCanvas() {
    ctx.fillStyle = '#0a0a0a';
    ctx.strokeStyle = '#383838'; // Cor de borda consistente com o tema
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

function changeDirection(event) {
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    if ([LEFT_KEY, RIGHT_KEY, UP_KEY, DOWN_KEY].includes(event.keyCode)) {
        event.preventDefault();
    }

    if (changingDirection) return;
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
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
    }

    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x >= canvas.width / gridSize;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y >= canvas.height / gridSize;

    return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

// Inicia o Jogo
document.addEventListener('keydown', changeDirection);
createFood();
if (scoreDisplay) scoreDisplay.textContent = currentScore; // Atualiza pontuação inicial
main();
