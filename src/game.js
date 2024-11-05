const roomCode = localStorage.getItem("roomCode");
const role = localStorage.getItem("role");

document.getElementById("code").innerText = roomCode;

const chatBox = document.getElementById("chatBox");
chatBox.style.display = "block";
let timeout;

chatBox.onmouseover = () => {
  chatBox.style.opacity = "1";
  clearTimeout(timeout);
};

chatBox.onmouseleave = () => {
  timeout = setTimeout(() => {
    chatBox.style.opacity = "0.1";
  }, 2000);
};

var username = localStorage.getItem("username") || "New User";
var piesocket;
var channel;
var UID;

async function connectChat() {
  piesocket = new PieSocket.default({
    clusterId: "free.blr2",
    apiKey: "Adfa5neh1Itih3stVA46TeRkqjj4XHFfbV8dZhEg",
    notifySelf: true,
    presence: true
  });

  channel = await piesocket.subscribe("chat-room" + roomCode);
  UID = Math.random().toString(36).substring(2, 8);
  username = UID;

  /* RPC LISTENER */
  channel.listen("new_message", function (data) {
    // Ignore non-messages that user already sent
    if (data.sender == UID && !data.text) return;

    /* Message */
    if (data.event == "message" && data.sender && data.text) {
      document.getElementById("chatLog").innerText += `${data.sender}: ${data.text}\n`;
      chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the bottom
    }

    /* Tower placed */
    if (data.event && data.object) {
      if (data.event == "towerPlaced") {
        gameBoard[data.object.y][data.object.x] = data.object.tower;

        // Draw the tower on the canvas
        drawTower(data.object.x, data.object.y, data.object.tower);

        console.log(`Network tower placed at (${data.object.x}, ${data.object.y}).`);
      }
    }

    /* Client joined and requests game state */
    if (data.event == "requestGameState" && data.sender && role == "Defense") {
      let gameState = {
        board: gameBoard,
        chat: document.getElementById("chatLog").innerHTML
      };

      sendData("syncGameState", gameState, data.sender);
    }

    /* Host sent game state */
    if (data.event == "syncGameState" && data.recipient == UID && data.object) {
      gameBoard = data.object.board;
      console.log("board updated");
      drawBoard();
      document.getElementById("chatLog").innerHTML = data.object.chat;
    }
  });
  /* END RPC LISTENER */

  /* Request board and chat from host */
  sendData("requestGameState", null);
}

connectChat();

/* Keep outside connect function */
function sendMessage(message) {
  channel.publish("new_message", {
    event: "message",
    sender: username,
    text: message
  });
}

document.getElementById("sendMessage").onclick = () => {
  const messageInput = document.getElementById("message");
  const message = messageInput.value.trim();
  if (message) {
    sendMessage(message);
    messageInput.value = "";
  }
};

function sendData(e, o = null, r = null) {
  channel.publish("new_message", {
    event: e,
    object: o,
    recipient: r,
    sender: UID
  });
}

document.getElementById("role").innerHTML = "Role: " + role;

// Function to load and display towers
function loadUI() {
  const container = document.querySelector("#towerContainer");
  container.innerHTML = ""; // Clear existing content

  if (role === "Defense") {
    loadTowers();
    console.log("Attempted loading of towers");
  } else if (role === "Attack") {
    loadEnemies();
  }
}

function loadTowers() {
  const towerContainer = document.querySelector(".left-nav");
  defenseTowers.forEach((tower) => {
    const towerBtn = document.createElement("button");
    towerBtn.classList.add("tower-btn");
    towerBtn.innerText = `${tower.name} (Cost: ${tower.cost})`;
    towerBtn.onclick = () => showTowerInfo(tower);
    towerContainer.appendChild(towerBtn);
  });
}

function loadEnemies() {
  const enemyContainer = document.querySelector(".left-nav");
  attackEnemies.forEach((enemy) => {
    const enemyBtn = document.createElement("button");
    enemyBtn.classList.add("enemy-btn");
    enemyBtn.innerText = `${enemy.name} (HP: ${enemy.health})`;
    enemyBtn.onclick = () => showEnemyInfo(enemy);
    enemyContainer.appendChild(enemyBtn);
  });
}

function showEnemyInfo(enemy) {
  player.selectedEnemy = enemy;

  // Clear pre-existing info divs
  document.querySelectorAll(".enemy-info").forEach((i) => {
    i.remove();
  });

  const infoContainer = document.createElement("div");
  infoContainer.classList.add("enemy-info");
  infoContainer.innerHTML = `
    <h4>${enemy.name}</h4>
    <p>HP: ${enemy.health}</p>
    <p>Speed: ${enemy.speed}</p>
    <button id="spawnNow" class="spawn-btn">Spawn</button>
  `;
  document.body.appendChild(infoContainer);
  infoContainer.style.position = "absolute";
  infoContainer.style.left = `${event.pageX}px`;
  infoContainer.style.top = `${event.pageY}px`;

  document.querySelector("#spawnNow").onclick = spawnEnemy(enemy);

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key == "Escape" && infoContainer) {
        document.body.removeChild(infoContainer);
        player.selectedEnemy = null;
      }
    },
    { once: true }
  );
}

// Function to show tower info in a context menu
function showTowerInfo(tower) {
  player.selectedTower = tower;

  // Clear pre-existing info divs
  document.querySelectorAll(".tower-info").forEach((i) => {
    i.remove();
  });

  const infoContainer = document.createElement("div");
  infoContainer.classList.add("tower-info");

  infoContainer.innerHTML = `
    <h4>${tower.name}</h4>
    <p>Cost: ${tower.cost}</p>
    <p>Damage: ${tower.damage}</p>
    <p>Range: ${tower.range}</p>
    <p>Fire Rate: ${tower.fireRate} seconds</p>
  `;

  // Append to the body and position below the clicked button
  document.body.appendChild(infoContainer);
  infoContainer.style.position = "absolute";
  infoContainer.style.left = `${event.pageX}px`;
  infoContainer.style.top = `${event.pageY}px`;

  // Remove info when clicking elsewhere
  document.addEventListener(
    "keydown",
    (e) => {
      if (infoContainer && e.key == "Escape") {
        document.body.removeChild(infoContainer);
        player.selectedTower = null;
      }
    },
    { once: true }
  );
}

loadUI();

// Get the canvas element and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas size
canvas.width = window.innerWidth * 0.8; // Set to 80% of the window width
canvas.height = window.innerHeight * 0.8; // Set to 80% of the window height

// Function to draw the grid
function drawGrid() {
  const rows = 20; // Number of rows
  const cols = 20; // Number of columns
  const cellWidth = canvas.width / cols; // Width of each cell
  const cellHeight = canvas.height / rows; // Height of each cell

  // Set grid line color and width
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;

  // Draw vertical lines
  for (let x = 0; x <= cols; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellWidth, 0);
    ctx.lineTo(x * cellWidth, canvas.height);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= rows; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * cellHeight);
    ctx.lineTo(canvas.width, y * cellHeight);
    ctx.stroke();
  }
}

// Call the function to draw the grid
drawGrid();

class Tile {
  constructor(type) {
    this.type = type
  }
}

// Initialize a 2D array representing the game board
const rows = 20;
const cols = 20;
var gameBoard = Array.from({ length: rows }, () => Array.from({ length: cols }, () => new Tile("empty")));
var spawnPoints = [[Math.floor(Math.random() * 3) + 17, Math.floor(Math.random() * 3) + 17], [Math.floor(Math.random() * 3) + 17, Math.floor(Math.random() * 3) + 17]];
var defensePoint = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];

// Function to draw the tower on the grid
function drawTower(x, y, tower) {
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  // Draw the tower as a filled rectangle in the center of the cell
  ctx.fillStyle = "blue"; // Change to a color representing the tower
  ctx.fillRect(x * cellWidth + cellWidth / 4, y * cellHeight + cellHeight / 4, cellWidth / 2, cellHeight / 2);

  // Optionally, add text to indicate tower details, e.g., range or name
  ctx.fillStyle = "white";
  ctx.font = "10px Arial";
  ctx.fillText(tower.name, x * cellWidth + cellWidth / 4, y * cellHeight + cellHeight / 4 + 10);
}

// Sample function to draw enemies on the grid (if needed)
function drawEnemy(x, y, enemy) {
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  // Draw the enemy as a filled circle in the center of the cell
  ctx.fillStyle = "red"; // Change to a color representing the enemy
  ctx.beginPath();
  ctx.arc(
    x * cellWidth + cellWidth / 2,
    y * cellHeight + cellHeight / 2,
    Math.min(cellWidth, cellHeight) / 4,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Optionally, add text to indicate enemy details
  ctx.fillStyle = "white";
  ctx.font = "10px Arial";
  ctx.fillText(enemy.name, x * cellWidth + cellWidth / 4, y * cellHeight + cellHeight / 4 + 10);
}

// Function to draw towers and enemies on the game board based on gameBoard array
function drawBoard() {
  // Clear the canvas first to prevent overlapping drawings
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Redraw the grid
  drawGrid();

  // Loop through each cell in gameBoard
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = gameBoard[y][x];
      if (cell) {
        if (cell.type === "tower") {
          drawTower(x, y, cell); // Pass cell info (like name) to drawTower
        } else if (cell.type === "enemy") {
          drawEnemy(x, y, cell); // Use a similar draw function for enemies
        }
      }
    }
  }
}

function pointToTile(x, y) {
  const cellWidth = canvas.offsetWidth / cols;
  const cellHeight = canvas.offsetHeight / rows;
  const x2 = Math.floor(x / cellWidth);
  const y2 = Math.floor(y / cellHeight);

  return [x2, y2];
}

function tileToPoint(tileX, tileY) {
  const cellWidth = canvas.offsetWidth / cols;
  const cellHeight = canvas.offsetHeight / rows;

  const centerX = (tileX * cellWidth) + (cellWidth / 2);
  const centerY = (tileY * cellHeight) + (cellHeight / 2);

  return [centerX, centerY];
}


/* Place tower function */
canvas.onclick = (e) => {
  // Calculate the clicked cell position
  const cellWidth = canvas.offsetWidth / cols;
  const cellHeight = canvas.offsetHeight / rows;
  const x = Math.floor(e.offsetX / cellWidth);
  const y = Math.floor(e.offsetY / cellHeight);

  console.log(player.selectedTower, x, y);
  // Check if a tower is selected and the cell is empty
  if (player.selectedTower && gameBoard[y][x] === null && player.selectedTower.cost <= player.cash) {
    // Place the selected tower in the game board array
    gameBoard[y][x] = player.selectedTower;
    gameBoard[y][x].type = "tower";

    // Draw the tower on the canvas
    drawTower(x, y, player.selectedTower);

    // Deduct the tower cost from player's cash
    player.cash -= player.selectedTower.cost;

    console.log(`Tower placed at (${x}, ${y}). Player's remaining cash: ${player.cash}`);
    let dataObj = { x: x, y: y, tower: player.selectedTower };
    sendData("towerPlaced", dataObj);
  } else if (gameBoard[y][x] !== null) {
    console.log("This cell already has a tower or enemy.");
  }
};

function chooseEnemySpawn() {
  let choice;
  //Choose spawn point based on which spawn point is less crowded
  //Take radius aroudn spawn spoint see how many people in radius
  //Then choose lowest density or first spawn point.
  let score1 = 0;
  let score2 = 0;

  enemies.forEach((e) => {
    //First spawn point, x and y. radius = < 3
    if(Math.abs(e.xTile-spawnPoints[0][0])<3&&Math.abs(e.yTile-spawnPoints[0][1])<3) score1++;
    if(Math.abs(e.xTile-spawnPoints[1][0])<3&&Math.abs(e.yTile-spawnPoints[1][1])<3) score2++;
  });

  if(score1<score2) choice = [spawnPoints[0][0], spawnPoints[0][1]];
  if(score1>score2) choice = [spawnPoints[1][0], spawnPoints[1][1]];
  if(score1==score2) {let rnd = Math.round(Math.random()); choice = [spawnPoints[rnd][0], spawnPoints[rnd][1]];}

  return choice;
}

function spawnEnemy(enemy) {
  let spawnPoint = chooseEnemySpawn();
  enemies.push(new Enemy(enemy, spawnPoint[0], spawnPoint[1], tileToPoint(spawnPoint[0], spawnPoint[1])[0], tileToPoint(spawnPoint[0], spawnPoint[1])[1]));
  console.log(tileToPoint(spawnPoint[0], spawnPoint[1]))
  console.log("Ive been spawned, im at: "+spawnPoint[0]+", "+spawnPoint[1]);
  gameBoard[spawnPoint[1]][spawnPoint[0]].type = "enemy"; 
}

// Draw grid initially
drawGrid();

class Enemy {
    constructor(info, xTile, yTile, xOff = 0, yOff = 0) {
        this.info = info;
        this.xTile = xTile;
        this.yTile = yTile;
        this.xOff = xOff;
        this.yOff = yOff;
        this.path = []; // Holds calculated path
        this.pathIndex = 0; // Track current position in path

        // Calculate the initial path to target (set a target tile here, like [19, 19])
        this.targetTile = defensePoint; // Adjust target as needed
        this.findPath();
    }

    findPath() {
      console.log("My path is being updated, im at: "+this.xTile + ","+this.yTile);
        // BFS or "flowing water" algorithm to calculate path
        this.path = calculateFlowingWaterPath(this.xTile, this.yTile, this.targetTile, gameBoard);
        this.pathIndex = 0;
        console.log("My path is going to be: "+this.path);
    }

    update() {
        // Check for gameBoard changes (if `gameBoardChanged` is true)
        if (gameBoardChanged) {
            this.findPath();
            console.log("My path is being updated, im at: "+this.xTile + ","+this.yTile);
        }

        gameBoard[this.yTile][this.xTile].type = "enemy";

        // Smoothly move toward the next tile in path if there is one
        if (this.path.length > 0 && this.pathIndex < this.path.length) {
            const [nextTileX, nextTileY] = this.path[this.pathIndex];
            const [nextPointX, nextPointY] = tileToPoint(nextTileX, nextTileY);

            this.xOff = Number(this.xOff);
            this.yOff = Number(this.yOff)

            var dx = nextPointX - this.xOff;
            var dy = nextPointY - this.yOff;

            this.xOff += Math.sign(dx)
            this.yOff += Math.sign(dy)

            // Check if we have reached the center of the next tile
            if (pointToTile(this.xOff, this.yOff)[0] == nextTileX && pointToTile(this.xOff, this.yOff)[1] == nextTileY) {
                // Update xTile and yTile
                this.xTile = nextTileX;
                this.yTile = nextTileY;

                // Move to the next tile in the path
                this.pathIndex++;
            }
        }
    }
}

// "Flowing water" BFS pathfinding function
function calculateFlowingWaterPath(startX, startY, targetTile, gameBoard) {
    const queue = [[startX, startY]];
    const visited = new Set([`${startX},${startY}`]);
    const prev = {};

    while (queue.length > 0) {
        const [x, y] = queue.shift();

        // Check if we've reached the target
        if (x === targetTile[0] && y === targetTile[1]) {
            return reconstructPath(prev, startX, startY, targetTile);
        }

        // Explore neighbors in four directions
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            const cellKey = `${nx},${ny}`;

            if (
                nx >= 0 && nx < gameBoard.length &&
                ny >= 0 && ny < gameBoard[0].length &&
                !visited.has(cellKey) &&
                (gameBoard[ny][nx] === null || gameBoard[ny][nx].type !== "tower" && gameBoard[ny][nx].type !== "wall")
            ) {
                queue.push([nx, ny]);
                visited.add(cellKey);
                prev[cellKey] = [x, y];
            }
        }
    }

    // Return empty path if no path found
    return [];
}

// Helper to reconstruct path from BFS
function reconstructPath(prev, startX, startY, targetTile) {
    const path = [];
    let [x, y] = targetTile;

    while (`${x},${y}` !== `${startX},${startY}`) {
        path.unshift([x, y]);
        [x, y] = prev[`${x},${y}`];
    }
    return path;
}

// Tile conversion helpers provided in your example
function pointToTile(x, y) {
    const cellWidth = canvas.offsetWidth / cols;
    const cellHeight = canvas.offsetHeight / rows;
    const x2 = Math.floor(x / cellWidth);
    const y2 = Math.floor(y / cellHeight);
    return [x2, y2];
}

function tileToPoint(tileX, tileY) {
    const cellWidth = canvas.offsetWidth / cols;
    const cellHeight = canvas.offsetHeight / rows;
    const centerX = (tileX * cellWidth) + (cellWidth / 2);
    const centerY = (tileY * cellHeight) + (cellHeight / 2);
    return [centerX, centerY];
}


/* Start of game */
//Attack role keeps track of enemies
var enemies = [];

var player = {
  cash: 100,
  selectedTower: null,
  selectedEnemy: null
};

var gameBoardChanged = false;
var oldBoard = gameBoard;

function update() {
    // Main game loop
    checkGameBoard();

    for (const enemy of enemies) {
        enemy.update();
    }

    drawBoard();

    oldBoard = gameBoard;
    requestAnimationFrame(update);
}

function checkGameBoard() {
  if(!oldBoard) return;
    for (let y = 0; y < cols; y++) {
        for (let x = 0; x < rows; x++) {

            var currentCell = gameBoard[y][x];
            var previousCell = oldBoard[y][x];

            // Check if cell.type was previously "tower" or "wall" and is not now or vice versa
            currentCell = gameBoard[y][x];
            previousCell = oldBoard[y][x];
            if (
                (currentCell.type === "tower" || currentCell.type === "wall") &&
                (previousCell.type !== "tower" && previousCell.type !== "wall")
            ) {
                gameBoardChanged = true; // Cell changed from empty to tower/wall
                return; // No need to check further
            }

            if (
                (previousCell.type === "tower" || previousCell.type === "wall") &&
                (currentCell.type !== "tower" && currentCell.type !== "wall")
            ) {
                gameBoardChanged = true; // Cell changed from tower/wall to empty
                return; // No need to check further
            }
        }
    }
    gameBoardChanged = false; // If no changes were found, set the flag to false
}

update();
