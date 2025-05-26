const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

const gridSize = 20; // Tamanho de cada célula do grid
let snake = [{ x: 10, y: 10 }]; // Posição inicial da cobra (em unidades do grid)
let food = {}; // Objeto para armazenar a posição da comida
let direction = 'right'; // Direção inicial
let score = 0;
let changingDirection = false; // Flag para evitar múltiplas mudanças de direção no mesmo tick

// AJUSTE PARA FLUIDEZ/VELOCIDADE:
// Valor original era 150. Valores menores tornam o jogo mais rápido.
let gameSpeed = 100; // Milliseconds (intervalo entre cada movimento da cobra)

function main() {
    if (didGameEnd()) {
        alert("Fim de Jogo! Pontuação: " + score);
        document.location.reload(); // Recarrega para jogar de novo ou voltar
        return;
    }

    changingDirection = false; // Permite nova mudança de direção
    setTimeout(function onTick() {
        clearCanvas();
        drawFood();
        advanceSnake();
        drawSnake();
        main(); // Chama a próxima iteração do loop do jogo
    }, gameSpeed);
}

function clearCanvas() {
    ctx.fillStyle = '#0a0a0a'; // Cor de fundo do canvas (deve combinar com o CSS)
    // Se você estiver usando variáveis CSS no seu JS através de alguma técnica,
    // senão, use uma cor hexadecimal diretamente, ex: '#383838' para var(--border-color)
    ctx.strokeStyle = '#383838'; // Exemplo de cor fixa para a borda do canvas
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function drawSnakePart(snakePart) {
    ctx.fillStyle = 'lightgreen'; // Cor da cobra
    ctx.strokeStyle = 'darkgreen'; // Borda da cobra
    ctx.fillRect(snakePart.x * gridSize, snakePart.y * gridSize, gridSize, gridSize);
    ctx.strokeRect(snakePart.x * gridSize, snakePart.y * gridSize, gridSize, gridSize);
}

function drawSnake() {
    snake.forEach(drawSnakePart);
}

function advanceSnake() {
    const head = { x: snake[0].x, y: snake[0].y };

    // Atualiza a posição da cabeça baseado na direção
    switch (direction) {
        case 'up': head.y -= 1; break;
        case 'down': head.y += 1; break;
        case 'left': head.x -= 1; break;
        case 'right': head.x += 1; break;
    }

    snake.unshift(head); // Adiciona a nova cabeça no início do array

    const didEatFood = snake[0].x === food.x && snake[0].y === food.y;
    if (didEatFood) {
        score += 10;
        scoreDisplay.textContent = score;
        createFood(); // Cria nova comida
    } else {
        snake.pop(); // Remove o último segmento da cauda se não comeu
    }
}

function changeDirection(event) {
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    // >>> CORREÇÃO BUG DE ROLAGEM <<<
    // Verifica se a tecla pressionada é uma das setas direcionais
    if ([LEFT_KEY, RIGHT_KEY, UP_KEY, DOWN_KEY].includes(event.keyCode)) {
        event.preventDefault(); // Impede o comportamento padrão do navegador (rolar a página)
    }
    // >>> FIM DA CORREÇÃO <<<

    if (changingDirection) return; // Impede mudança de direção múltipla antes do próximo movimento
    changingDirection = true;

    const keyPressed = event.keyCode;
    const goingUp = direction === 'up';
    const goingDown = direction === 'down';
    const goingLeft = direction === 'left';
    const goingRight = direction === 'right';

    // Impede que a cobra inverta a direção sobre si mesma
    if (keyPressed === LEFT_KEY && !goingRight) { direction = 'left'; }
    if (keyPressed === UP_KEY && !goingDown) { direction = 'up'; }
    if (keyPressed === RIGHT_KEY && !goingLeft) { direction = 'right'; }
    if (keyPressed === DOWN_KEY && !goingUp) { direction = 'down'; }
}

function createFood() {
    // Gera posição aleatória para a comida dentro do grid
    food.x = Math.floor(Math.random() * (canvas.width / gridSize));
    food.y = Math.floor(Math.random() * (canvas.height / gridSize));

    // Verifica se a comida não foi criada em cima da cobra
    snake.forEach(function isFoodOnSnake(part) {
        if (part.x === food.x && part.y === food.y) {
            createFood(); // Se sim, cria a comida novamente
        }
    });
}

function drawFood() {
    ctx.fillStyle = 'red'; // Cor da comida
    ctx.strokeStyle = 'darkred'; // Borda da comida
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
    ctx.strokeRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
}

function didGameEnd() {
    // Colisão com a própria cobra
    for (let i = 4; i < snake.length; i++) { // Começa em 4 para a cabeça não colidir com o "pescoço"
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
    }

    // Colisão com as paredes
    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x >= canvas.width / gridSize;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y >= canvas.height / gridSize;

    return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

// Inicia o Jogo
document.addEventListener('keydown', changeDirection);
createFood(); // Cria a primeira comida
main(); // Inicia o loop principal do jogo
