const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const player1ScoreDisplay = document.getElementById('player1Score');
const player2ScoreDisplay = document.getElementById('player2Score');

const paddleHeight = 100;
const paddleWidth = 10;
const ballRadius = 10;

let ballX, ballY, ballSpeedX, ballSpeedY;
let player1Y, player2Y;
const PADDLE_SPEED = 8; // Renomeado para PADDLE_SPEED

let player1Score = 0;
let player2Score = 0;

let upPressed = false;
let downPressed = false;
let wPressed = false;
let sPressed = false;

function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    // Mantém a magnitude da velocidade, inverte direção X e aleatoriza Y
    let currentSpeedMagnitude = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY) || 5; // Usa 5 se for o primeiro reset
    if (currentSpeedMagnitude < 4) currentSpeedMagnitude = 4; // Velocidade mínima
    
    ballSpeedX = -ballSpeedX; // Inverte direção X
    ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * (currentSpeedMagnitude * 0.7); // Ajusta velocidade Y
    // Garante que a bola não fique muito vertical
     if (Math.abs(ballSpeedY) < 2) ballSpeedY = (ballSpeedY > 0 ? 1 : -1) * 2;
}


function initializeGame() {
    player1Y = (canvas.height - paddleHeight) / 2;
    player2Y = (canvas.height - paddleHeight) / 2;
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    ballSpeedX = 5 * (Math.random() > 0.5 ? 1 : -1); // Começa com direção X aleatória
    ballSpeedY = (Math.random() * 4 + 3) * (Math.random() > 0.5 ? 1 : -1); // Velocidade Y entre 3 e 7, direção aleatória

    if (player1ScoreDisplay) player1ScoreDisplay.textContent = player1Score;
    if (player2ScoreDisplay) player2ScoreDisplay.textContent = player2Score;
}


document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    const relevantKeys = ['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'];
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
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
    ctx.setLineDash([]);
}

function update() {
    if (wPressed && player1Y > 0) player1Y -= PADDLE_SPEED;
    if (sPressed && player1Y < canvas.height - paddleHeight) player1Y += PADDLE_SPEED;
    if (upPressed && player2Y > 0) player2Y -= PADDLE_SPEED;
    if (downPressed && player2Y < canvas.height - paddleHeight) player2Y += PADDLE_SPEED;

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
        ballSpeedY = -ballSpeedY;
    }

    // Colisão com paddle 1 (esquerda)
    if (ballX - ballRadius < paddleWidth && ballX - ballRadius > 0 && ballY > player1Y && ballY < player1Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        let deltaY = ballY - (player1Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.25; // Efeito de ângulo
        if (Math.abs(ballSpeedX) < 12) ballSpeedX *= 1.03; // Aumenta velocidade sutilmente
    }

    // Colisão com paddle 2 (direita)
    if (ballX + ballRadius > canvas.width - paddleWidth && ballX + ballRadius < canvas.width && ballY > player2Y && ballY < player2Y + paddleHeight) {
        ballSpeedX = -ballSpeedX;
        let deltaY = ballY - (player2Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.25; // Efeito de ângulo
        if (Math.abs(ballSpeedX) < 12) ballSpeedX *= 1.03; // Aumenta velocidade sutilmente
    }

    if (ballX - ballRadius < 0) {
        player2Score++;
        if (player2ScoreDisplay) player2ScoreDisplay.textContent = player2Score;
        resetBall();
    } else if (ballX + ballRadius > canvas.width) {
        player1Score++;
        if (player1ScoreDisplay) player1ScoreDisplay.textContent = player1Score;
        resetBall();
    }
}

function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawNet();
    drawBall();
    drawPaddle(0, player1Y);
    drawPaddle(canvas.width - paddleWidth, player2Y);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

initializeGame(); // Chama para configurar o estado inicial
gameLoop();
