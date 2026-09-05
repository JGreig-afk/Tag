let canvas, ctx, menuScreen, gameScreen, timerEl, statusEl, instructionText, gameTitle;
let gameMode = 'ai', isRoundOver = false, isMatchOver = false, roundStartTime = Date.now(), animationFrameId;
let blueWins = 0, redWins = 0, currentRoundNumber = 1;
let player1 = { x: 150, y: 250, vx: 0, vy: 0, radius: 15, speed: 4, color: "#38bdf8" };
let player2 = { x: 650, y: 250, vx: 0, vy: 0, radius: 15, speed: 4, color: "#f43f5e" };
let p2IsChaser = true;
let initialRandomChaser = true;
const cornerThreshold = 180;
const hysteresisBuffer = 20;
const keys = {};

window.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    menuScreen = document.getElementById("menuScreen");
    gameScreen = document.getElementById("gameScreen");
    timerEl = document.getElementById("timer");
    statusEl = document.getElementById("status");
    instructionText = document.getElementById("instructionText");
    gameTitle = document.getElementById("gameTitle");
});

window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

function startMatch(mode) {
    gameMode = mode; blueWins = 0; redWins = 0; 
    currentRoundNumber = 1; isMatchOver = false;
    updateDotsUI();
    
    initialRandomChaser = Math.random() < 0.5;

    menuScreen.classList.add("hidden"); 
    gameScreen.classList.remove("hidden");
    
    if (gameMode === 'ai') {
        gameTitle.innerText = "1-Player vs Smart AI";
        instructionText.innerText = "Use WASD to move.";
    } else {
        gameTitle.innerText = "2-Player Tag Match";
        instructionText.innerText = "Blue: WASD | Red: Arrow Keys";
    }

    startNewRound();
}

function startNewRound() {
    isRoundOver = false; 
    roundStartTime = Date.now();
    
    if (currentRoundNumber === 1) {
        p2IsChaser = initialRandomChaser;
    } else {
        p2IsChaser = (currentRoundNumber % 2 !== 0) ? initialRandomChaser : !initialRandomChaser;
    }

    player1.x = 150; player1.y = 250; 
    player2.x = 650; player2.y = 250;
    
    statusEl.innerText = p2IsChaser ? "Red is it!" : "Blue is it!";
    statusEl.style.color = p2IsChaser ? "#f43f5e" : "#38bdf8";
    
    cancelAnimationFrame(animationFrameId); 
    gameLoop();
}

function returnToMenu() { 
    cancelAnimationFrame(animationFrameId); 
    gameScreen.classList.add("hidden"); 
    menuScreen.classList.remove("hidden"); 
}

function updateDotsUI() {
    for (let i = 0; i < 5; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) {
            dot.style.backgroundColor = "#334155"; 
            dot.style.borderColor = "#475569";
        }
    }
    for (let i = 0; i < blueWins; i++) { 
        const dot = document.getElementById(`dot-${i}`);
        if (dot) dot.style.backgroundColor = "#38bdf8"; 
    }
    for (let i = 0; i < redWins; i++) { 
        const dot = document.getElementById(`dot-${4-i}`);
        if (dot) dot.style.backgroundColor = "#f43f5e"; 
    }
}

function handleRoundWin(winnerColor, winMessage) {
    isRoundOver = true; 
    statusEl.innerText = winMessage; 
    statusEl.style.color = winnerColor;
    
    if (winnerColor === "#38bdf8") blueWins++; 
    else redWins++;
    
    updateDotsUI();
    
    if (blueWins >= 3 || redWins >= 3) { 
        statusEl.innerText = "MATCH OVER!"; 
        return; 
    }
    
    currentRoundNumber++; 
    setTimeout(() => { if (!isMatchOver) startNewRound(); }, 2000);
}

function update() {
    if (isRoundOver || isMatchOver) return;
    const elapsedSeconds = Math.floor((Date.now() - roundStartTime) / 1000);
    const timeLeft = Math.max(0, 20 - elapsedSeconds);
    timerEl.innerText = timeLeft;
    
    if (timeLeft <= 0) { 
        handleRoundWin(p2IsChaser ? "#38bdf8" : "#f43f5e", "Time's Up!"); 
        return; 
    }

    // Move P1
    let p1MoveX = (keys["d"]?1:0) - (keys["a"]?1:0), p1MoveY = (keys["s"]?1:0) - (keys["w"]?1:0);
    player1.x = Math.max(player1.radius, Math.min(canvas.width - player1.radius, player1.x + p1MoveX * player1.speed));
    player1.y = Math.max(player1.radius, Math.min(canvas.height - player1.radius, player1.y + p1MoveY * player1.speed));

    if (gameMode === 'ai' && !p2IsChaser) {
        const dx = player2.x - player1.x, dy = player2.y - player1.y;
        const dist = Math.hypot(dx, dy);
        
        let vx = dx / (dist || 1), vy = dy / (dist || 1);

        const distToLeft = player1.x;
        const distToRight = canvas.width - player1.x;
        const distToTop = player1.y;
        const distToBottom = canvas.height - player1.y;
        
        const activeThreshold = cornerThreshold + hysteresisBuffer;
        const isLeft = player2.x < activeThreshold;
        const isRight = player2.x > canvas.width - activeThreshold;
        const isTop = player2.y < activeThreshold;
        const isBottom = player2.y > canvas.height - activeThreshold;

        if ((isLeft || isRight) && (isTop || isBottom)) {
            let spinDirection = 1;
            const horizDist = isRight ? distToRight : distToLeft;
            const vertDist = isBottom ? distToBottom : distToTop;

            if (isBottom && isRight) {
                spinDirection = (horizDist < vertDist) ? 1 : -1;
            } else if (isBottom && isLeft) {
                spinDirection = (horizDist < vertDist) ? -1 : 1;
            } else if (isTop && isRight) {
                spinDirection = (horizDist < vertDist) ? -1 : 1;
            } else if (isTop && isLeft) {
                spinDirection = (horizDist < vertDist) ? 1 : -1;
            }

            const tangentX = -vy * spinDirection, tangentY = vx * spinDirection;
            vx = (vx * 0.25) + (tangentX * 0.75);
            vy = (vy * 0.25) + (tangentY * 0.75);
        }

        let mag = Math.hypot(vx, vy);
        if (mag > 0) {
            vx = (vx / mag) * player2.speed;
            vy = (vy / mag) * player2.speed;
        }

        player2.x += vx;
        player2.y += vy;

        player2.x = Math.max(player2.radius, Math.min(canvas.width - player2.radius, player2.x));
        player2.y = Math.max(player2.radius, Math.min(canvas.height - player2.radius, player2.y));

    } else if (gameMode === 'ai' && p2IsChaser) {
        // Chasing
        const dx = player1.x - player2.x, dy = player1.y - player2.y;
        const mag = Math.hypot(dx, dy);
        if (mag > 0) {
            player2.x += (dx / mag) * player2.speed;
            player2.y += (dy / mag) * player2.speed;
        }
        player2.x = Math.max(player2.radius, Math.min(canvas.width - player2.radius, player2.x));
        player2.y = Math.max(player2.radius, Math.min(canvas.height - player2.radius, player2.y));
    } else {
        // PvP movement
        let p2MoveX = (keys["ArrowRight"]?1:0) - (keys["ArrowLeft"]?1:0), p2MoveY = (keys["ArrowDown"]?1:0) - (keys["ArrowUp"]?1:0);
        player2.x = Math.max(player2.radius, Math.min(canvas.width - player2.radius, player2.x + p2MoveX * player2.speed));
        player2.y = Math.max(player2.radius, Math.min(canvas.height - player2.radius, player2.y + p2MoveY * player2.speed));
    }
    
    if (Math.hypot(player1.x - player2.x, player1.y - player2.y) < player1.radius + player2.radius) {
        handleRoundWin(p2IsChaser ? "#f43f5e" : "#38bdf8", "Tagged!");
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Canvas Border
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Players
    ctx.fillStyle = player1.color; 
    ctx.beginPath(); 
    ctx.arc(player1.x, player1.y, player1.radius, 0, Math.PI * 2); 
    ctx.fill();

    ctx.fillStyle = player2.color; 
    ctx.beginPath(); 
    ctx.arc(player2.y ? player2.x : player2.x, player2.y, player2.radius, 0, Math.PI * 2); 
    ctx.fill();
}

function gameLoop() { 
    update(); 
    draw(); 
    if (!isRoundOver && !isMatchOver) {
        animationFrameId = requestAnimationFrame(gameLoop); 
    }
}