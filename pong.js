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
let ballSpeedX = 5; // Velocidade horizontal inicial da bola
let ballSpeedY = 5; // Velocidade vertical inicial da bola

let player1Y = (canvas.height - paddleHeight) / 2;
let player2Y = (canvas.height - paddleHeight) / 2;
const paddleSpeed = 8; // Velocidade dos paddles

let player1Score = 0;
let player2Score = 0;

// Flags para controle de movimento dos paddles
let upPressed = false;
let downPressed = false;
let wPressed = false;
let sPressed = false;

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);

function keyDownHandler(e) {
    // Teclas relevantes para o jogo Pong
    const relevantKeys = ['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'];

    // CORREÇÃO BUG DE ROLAGEM: Impede a rolagem da página
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
    ctx.fillStyle = '#fff'; // Cor da bola
    ctx.fill();
    ctx.closePath();
}

function drawPaddle(x, y) {
    ctx.beginPath();
    ctx.rect(x, y, paddleWidth, paddleHeight);
    ctx.fillStyle = '#fff'; // Cor dos paddles
    ctx.fill();
    ctx.closePath();
}

function drawNet() {
    ctx.beginPath();
    ctx.setLineDash([10, 15]); // Estilo tracejado para a rede
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = '#fff'; // Cor da rede
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
    ctx.setLineDash([]); // Reseta o estilo da linha para não afetar outros desenhos
}

function resetBall() {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    // Inverte a direção horizontal da bola após um ponto
    ballSpeedX = -ballSpeedX;
    // Dá uma direção vertical aleatória (ou fixa, se preferir) para a bola
    ballSpeedY = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 4); // Velocidade Y entre 4 e 7, direção aleatória
}

function update() {
    // Movimentação do paddle do Jogador 1 (Esquerda - W, S)
    if (wPressed && player1Y > 0) {
        player1Y -= paddleSpeed;
    }
    if (sPressed && player1Y < canvas.height - paddleHeight) {
        player1Y += paddleSpeed;
    }

    // Movimentação do paddle do Jogador 2 (Direita - Setas Cima/Baixo)
    if (upPressed && player2Y > 0) {
        player2Y -= paddleSpeed;
    }
    if (downPressed && player2Y < canvas.height - paddleHeight) {
        player2Y += paddleSpeed;
    }

    // Movimentação da bola
    ballX += ballSpeedX;
    ballY += ballSpeedY;

    // Colisão da bola com as paredes superior e inferior
    if (ballY + ballRadius > canvas.height || ballY - ballRadius < 0) {
        ballSpeedY = -ballSpeedY; // Inverte a direção vertical
    }

    // Colisão da bola com o paddle do Jogador 1 (Esquerda)
    if (ballX - ballRadius < paddleWidth &&             // Bola está na área horizontal do paddle
        ballY > player1Y &&                           // Bola está abaixo do topo do paddle
        ballY < player1Y + paddleHeight) {            // Bola está acima da base do paddle
        ballSpeedX = -ballSpeedX; // Inverte a direção horizontal

        // Opcional: Fazer a bola ganhar um pouco de velocidade ou ângulo ao rebater
        let deltaY = ballY - (player1Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.3; // Ajuste este multiplicador para mudar o efeito do ângulo
        if (Math.abs(ballSpeedX) < 15) ballSpeedX *= 1.05; // Aumenta velocidade horizontal sutilmente
    }

    // Colisão da bola com o paddle do Jogador 2 (Direita)
    if (ballX + ballRadius > canvas.width - paddleWidth && // Bola está na área horizontal do paddle
        ballY > player2Y &&                              // Bola está abaixo do topo do paddle
        ballY < player2Y + paddleHeight) {               // Bola está acima da base do paddle
        ballSpeedX = -ballSpeedX; // Inverte a direção horizontal

        let deltaY = ballY - (player2Y + paddleHeight / 2);
        ballSpeedY = deltaY * 0.3;
         if (Math.abs(ballSpeedX) < 15) ballSpeedX *= 1.05;
    }

    // Bola ultrapassa o paddle esquerdo (Ponto para Jogador 2)
    if (ballX - ballRadius < 0) {
        player2Score++;
        player2ScoreDisplay.textContent = player2Score;
        resetBall(); // Reseta a posição da bola
    }
    // Bola ultrapassa o paddle direito (Ponto para Jogador 1)
    else if (ballX + ballRadius > canvas.width) {
        player1Score++;
        player1ScoreDisplay.textContent = player1Score;
        resetBall(); // Reseta a posição da bola
    }
}

function draw() {
    // Limpa o canvas (fundo)
    ctx.fillStyle = '#0a0a0a'; // Cor de fundo do canvas (deve combinar com o CSS)
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Desenha a rede no meio
    drawNet();

    // Desenha a bola
    drawBall();

    // Desenha os paddles
    drawPaddle(0, player1Y); // Paddle do Jogador 1
    drawPaddle(canvas.width - paddleWidth, player2Y); // Paddle do Jogador 2
}

function gameLoop() {
    update(); // Atualiza a lógica do jogo (movimentos, colisões, pontuação)
    draw();   // Desenha tudo na tela
    requestAnimationFrame(gameLoop); // Cria o loop de animação suave
}

// Inicia o Jogo
gameLoop();
