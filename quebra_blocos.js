// --- quebra_blocos.js ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de UI (se você tiver no HTML)
const scoreDisplay = document.getElementById('score'); // Supondo que você terá <span id="score">0</span>
const livesDisplay = document.getElementById('lives'); // Supondo que você terá <span id="lives">3</span>

let score = 0;
let lives = 3;
let gamePaused = false; // Para futuras implementações de pausa
let gameOver = false;
let level = 1; // Começaremos com o nível 1

// --- Configurações da Bola ---
let ballRadius = 10;
let ballX = canvas.width / 2;
let ballY = canvas.height - 30;
let ballSpeedX = 4; // Velocidade horizontal da bola
let ballSpeedY = -4; // Velocidade vertical da bola (negativa para começar subindo)

// --- Configurações da Barra (Paddle) ---
let paddleHeight = 12;
let paddleWidth = 90;
let paddleX = (canvas.width - paddleWidth) / 2;
const paddleSpeed = 7;
let rightPressed = false;
let leftPressed = false;

// --- Configurações dos Tijolos ---
let brickRowCount = 4; // Número de linhas de tijolos
let brickColumnCount = 7; // Número de colunas de tijolos
let brickWidth = (canvas.width / brickColumnCount) - 10; // Largura calculada
let brickHeight = 20;
let brickPadding = 10;
let brickOffsetTop = 30;
let brickOffsetLeft = 5; // Ajuste para centralizar melhor

let bricks = [];
function initializeBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            // Adiciona status: 1 para tijolo visível, 0 para quebrado
            // Poderíamos adicionar 'hits' para tijolos que precisam de mais de uma batida
            bricks[c][r] = { x: 0, y: 0, status: 1, color: getRandomBrickColor() };
        }
    }
}
initializeBricks(); // Inicializa os tijolos para o primeiro nível

function getRandomBrickColor() {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#9B59B6'];
    return colors[Math.floor(Math.random() * colors.length)];
}


// --- Controles ---
document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);
document.addEventListener('mousemove', mouseMoveHandler, false); // Controle pelo mouse

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = true;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = true;
    }
    // Prevenir rolagem da página com as setas
    if (['ArrowRight', 'ArrowLeft'].includes(e.key)) {
        e.preventDefault();
    }
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        rightPressed = false;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        leftPressed = false;
    }
}

function mouseMoveHandler(e) {
    // Obtém a posição X do mouse relativa ao canvas
    let relativeX = e.clientX - canvas.offsetLeft;
    if (canvas.offsetParent) { // Verifica se há um offsetParent para subtrair seus offsets
        let currentElement = canvas;
        while(currentElement.offsetParent) {
            currentElement = currentElement.offsetParent;
            relativeX -= currentElement.offsetLeft;
        }
    }

    if (relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth / 2;
        // Limitar o paddle dentro das bordas do canvas
        if (paddleX < 0) {
            paddleX = 0;
        }
        if (paddleX + paddleWidth > canvas.width) {
            paddleX = canvas.width - paddleWidth;
        }
    }
}


// --- Funções de Desenho ---
function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF'; // Bola branca
    ctx.fill();
    ctx.closePath();
}

function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = 'var(--accent-color, #00bcd4)'; // Cor da barra (paddle)
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) { // Se o tijolo está ativo
                let brickX = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                let brickY = (r * (brickHeight + brickPadding)) + brickOffsetTop;
                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;
                ctx.beginPath();
                ctx.rect(brickX, brickY, brickWidth, brickHeight);
                ctx.fillStyle = bricks[c][r].color;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

function drawScore() {
    if (scoreDisplay) scoreDisplay.textContent = score;
    // Alternativa se não houver span:
    // ctx.font = '16px Arial';
    // ctx.fillStyle = '#FFF';
    // ctx.fillText('Pontos: ' + score, 8, 20);
}

function drawLives() {
    if (livesDisplay) livesDisplay.textContent = lives;
    // Alternativa se não houver span:
    // ctx.font = '16px Arial';
    // ctx.fillStyle = '#FFF';
    // ctx.fillText('Vidas: ' + lives, canvas.width - 65, 20);
}

// --- Lógica de Colisão ---
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            let b = bricks[c][r];
            if (b.status === 1) {
                if (ballX + ballRadius > b.x && ballX - ballRadius < b.x + brickWidth &&
                    ballY + ballRadius > b.y && ballY - ballRadius < b.y + brickHeight) {
                    ballSpeedY = -ballSpeedY; // Inverte direção da bola
                    b.status = 0; // Quebra o tijolo
                    score += 10;
                    // Verificar se todos os tijolos foram quebrados (condição de vitória do nível)
                    if (checkWin()) {
                        levelUp();
                    }
                }
            }
        }
    }
}

function checkWin() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
                return false; // Ainda há tijolos
            }
        }
    }
    return true; // Todos os tijolos quebrados
}

function levelUp() {
    alert('Nível ' + level + ' Completo! Próximo nível...');
    level++;
    // Aumentar dificuldade (ex: mais linhas/colunas, bola mais rápida)
    brickRowCount++; // Exemplo simples: adiciona uma linha
    if (brickRowCount > 8) brickRowCount = 8; // Limite
    ballSpeedX += (ballSpeedX > 0 ? 0.5 : -0.5); // Aumenta velocidade X
    ballSpeedY += (ballSpeedY > 0 ? 0.5 : -0.5); // Aumenta velocidade Y
    
    // Reposicionar bola e paddle
    ballX = canvas.width / 2;
    ballY = canvas.height - 30;
    // Mantém a direção da velocidade, mas reseta a posição
    let currentSpeedXDirection = Math.sign(ballSpeedX);
    let currentSpeedYDirection = Math.sign(ballSpeedY);
    ballSpeedX = Math.abs(ballSpeedX) * currentSpeedXDirection;
    // Garante que a bola comece subindo no novo nível, se estava descendo
    ballSpeedY = Math.abs(ballSpeedY) * (currentSpeedYDirection > 0 && ballY > canvas.height / 2 ? -1 : currentSpeedYDirection) ;
     if (ballSpeedY > 0) ballSpeedY = -ballSpeedY; // Forçar a bola a subir


    paddleX = (canvas.width - paddleWidth) / 2;
    initializeBricks(); // Recria os tijolos para o novo nível
}


// --- Loop Principal do Jogo ---
function update() {
    if (gameOver) return;

    // Colisão com paredes laterais
    if (ballX + ballSpeedX > canvas.width - ballRadius || ballX + ballSpeedX < ballRadius) {
        ballSpeedX = -ballSpeedX;
    }
    // Colisão com parede superior
    if (ballY + ballSpeedY < ballRadius) {
        ballSpeedY = -ballSpeedY;
    }
    // Colisão com a barra (paddle) ou chão
    else if (ballY + ballSpeedY > canvas.height - ballRadius - paddleHeight) {
        if (ballX > paddleX && ballX < paddleX + paddleWidth) { // Se atingiu a barra
            ballSpeedY = -ballSpeedY;
            // Opcional: variar o ângulo de rebote baseado em onde a bola atinge a barra
            let deltaX = ballX - (paddleX + paddleWidth / 2);
            ballSpeedX = deltaX * 0.25; // Ajuste este valor para sensibilidade do ângulo
        } else if (ballY + ballSpeedY > canvas.height - ballRadius) { // Se passou da barra e atingiu o chão
            lives--;
            if (livesDisplay) livesDisplay.textContent = lives;

            if (lives <= 0) {
                gameOver = true;
                alert('FIM DE JOGO! Pontuação Final: ' + score);
                document.location.reload(); // Recarrega o jogo
            } else {
                // Reseta posição da bola e da barra
                ballX = canvas.width / 2;
                ballY = canvas.height - 30 - paddleHeight;
                ballSpeedX = 4 * (Math.random() > 0.5 ? 1 : -1) ; // Direção X aleatória
                ballSpeedY = -4; // Começa subindo
                paddleX = (canvas.width - paddleWidth) / 2;
            }
        }
    }


    // Mover a barra (paddle) - com teclado
    if (rightPressed && paddleX < canvas.width - paddleWidth) {
        paddleX += paddleSpeed;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= paddleSpeed;
    }
    // O movimento do mouse já atualiza paddleX diretamente no mouseMoveHandler

    // Mover a bola
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    collisionDetection();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas
    // Ou preenche com a cor de fundo do seu tema:
    // ctx.fillStyle = '#0a0a0a'; (ou a cor do seu .game-area canvas no CSS)
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBricks();
    drawBall();
    drawPaddle();
    drawScore();
    drawLives();
}

function gameLoop() {
    if (!gamePaused && !gameOver) {
        update();
        draw();
    }
    requestAnimationFrame(gameLoop);
}

// Ajustar o tamanho do canvas aqui se necessário, ou pegar do HTML
// canvas.width = 480;
// canvas.height = 360;
// brickWidth = (canvas.width / brickColumnCount) - 10; // Recalcular se mudar tamanho do canvas

// Garante que os elementos de UI sejam atualizados no início
drawScore();
drawLives();

gameLoop(); // Inicia o jogo
