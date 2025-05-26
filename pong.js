const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreDisplay = document.getElementById('player1Score');
const player2ScoreDisplay = document.getElementById('player2Score');

// Configurações do Jogo
const paddleHeight = 100;
const paddleWidth = 10;
const ballRadius = 10;

let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballSpeedX = 5;
let ballSpeedY = 5;

let player1Y = (canvas.height - paddleHeight) / 2;
let player2Y = (canvas.height - paddleHeight) / 2;
const paddleSpeed = 10;

let player1Score = 0;
let player2Score = 0;

let upPressed = false;
let downPressed = false;
let wPressed = false;
let sPressed = false;

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    // Impede a rolagem da página para as teclas de controle do jogo
    const relevantKeys = ['Up', 'ArrowUp', 'Down', 'ArrowDown', 'w', 'W', 's', 'S'];
    if (relevantKeys.includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === 'Up' || e.key === 'ArrowUp') { upPressed = true; }
    if (e.key === 'Down' || e.key === 'ArrowDown') { downPressed = true; }
    if (e.key === 'w' || e.key === 'W') { wPressed = true; }
    if (e.key === 's' || e.key === 'S') { sPressed = true; }
}

function keyUpHandler(e) {
    if (e.key === 'Up' || e.key === 'ArrowUp') { upPressed = false; }
    if (e.key === 'Down' || e.key === 'ArrowDown') { downPressed = false; }
    if (e.key === 'w' || e.key === 'W') { wPressed = false; }
    if (e.key === 's' || e.key === 'S') { sPressed = false; }
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.closePath();
}

function drawPaddle(x, y) {
    ctx.beginPath();
    ctx.rect(x, y, paddleWidth, paddleHeight);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.closePath();
}

function drawNet() {
    ctx.beginPath();
    ctx.setLineDash([10, 15]);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.closePath();
    ctx.setLineDash([]); // Reset line dash
}

function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeedX = -ballSpeedX; // Inverte a direção
    ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * 5; // Direção Y aleatória
}

function update() {
    // Mover paddles
    if (wPressed && player1Y > 0) { player1Y -= paddleSpeed; }
    if (sPressed && player1Y < canvas.height - paddleHeight) { player1Y += paddleSpeed; }
    if (upPressed && player2Y > 0) { player2Y -= paddleSpeed; }
    if (downPressed && player2Y < canvas.height - paddleHeight) { player2Y += paddleSpeed; }

    // Mover bola
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Colisão com paredes (Cima/Baixo)
    if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
        ballSpeedY = -ballSpeedY;
    }

    // Colisão com Paddles
    // Jogador 1 (Esquerda)
    if (ballX - ballRadius < paddleWidth && // Verifica se a bola está na "largura" do paddle
        ballX - ballRadius > 0 && // Garante que não atravesse completamente
        ballY > player1Y &&
        ballY < player1Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        // Ajuste opcional para mudar o ângulo da bola dependendo de onde atinge o paddle
        let deltaY = ballY - (player1Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.35; // Ajuste este valor para mudar a sensibilidade
    }
    // Jogador 2 (Direita)
    if (ballX + ballRadius > canvas.width - paddleWidth && // Verifica se a bola está na "largura" do paddle
        ballX + ballRadius < canvas.width && // Garante que não atravesse completamente
        ballY > player2Y &&
        ballY < player2Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        let deltaY = ballY - (player2Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.35; // Ajuste este valor para mudar a sensibilidade
    }

    // Ponto marcado
    if (ballX - ballRadius < 0) {
        player2Score++;
        player2ScoreDisplay.textContent = player2Score;
        resetBall();
    } else if (ballX + ballRadius > canvas.width) {
        player1Score++;
        player1ScoreDisplay.textContent = player1Score;
        resetBall();
    }
}

function draw() {
    // Limpa o canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha rede
    drawNet();

    // Desenha bola
    drawBall();

    // Desenha paddles
    drawPaddle(0, player1Y); // Player 1
    drawPaddle(canvas.width - paddleWidth, player2Y); // Player 2
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop); // Cria o loop de animação
}

// Inicia o Jogo
gameLoop();
