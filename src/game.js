const roomCode = localStorage.getItem('roomCode');
const role = localStorage.getItem('role');
// Display the room code stored in localStorage
document.getElementById('code').innerText = roomCode;

// Show the chat box
const chatBox = document.getElementById('chatBox');
chatBox.style.display = 'block';
let timeout;

chatBox.onmouseover = () => {
  chatBox.style.opacity = '1';
  clearTimeout(timeout);
};

chatBox.onmouseleave = () => {
  timeout = setTimeout(() => {
    chatBox.style.opacity = '0.1';
  }, 2000);
};

const username = localStorage.getItem('username') || 'New User';
var piesocket;
var channel;

// Connect to the chat using the provided PieHost code
async function connectChat() {

  piesocket = new PieSocket.default({
    clusterId: 'free.blr2', // I have no clue what "free.blr2" means, but here we are.
    apiKey: 'Adfa5neh1Itih3stVA46TeRkqjj4XHFfbV8dZhEg', // Yay, another API key to leak in public code.
    notifySelf: true, // Because apparently, I need to notify myself that I exist.
    presence: true, // Sure, let’s keep track of who's present like we’re taking attendance in kindergarten.
  });

  // Assuming piesocket is already initialized and connected
  channel = await piesocket.subscribe('chat-room' + roomCode);


  channel.listen('new_message', function (data) {
    if (data.sender && data.text) {
      document.getElementById(
        'chatLog'
      ).innerText += `${data.sender}: ${data.text}\n`;
      chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to the bottom
    }

    if(data.event && data.object) {
      if(data.event == "towerPlaced") {
    gameBoard[data.object.y][data.object.x] = data.object.tower;

    // Draw the tower on the canvas
    drawTower(data.object.x, data.object.y, data.object.tower);

    console.log(`Network tower placed at (${data.object.x}, ${data.object.y}).`);
      }
    }
  });

}

connectChat(); // Call the chat connection function

  function sendMessage(username, message) {
    channel.publish('new_message', {
      sender: username,
      text: message,
    });
  }

  document.getElementById('sendMessage').onclick = () => {
    const messageInput = document.getElementById('message');
    const message = messageInput.value.trim();
    if (message) {
      // Use the sendMessage function from your PieHost code
      sendMessage(username, message);
      messageInput.value = ''; // Clear input
    }
  };

function sendData(e, o) {
  channel.publish('new_message', {
    event: e,
    object: o
  });
}

document.getElementById('role').innerHTML = 'Role: ' + role;

//Now we start the game. draw a 20x20 grid, use math to make it fit within the canvas based on the canvas' height/width in pixels.
//Defense can select towers on the left, attack can select enemies on the left.
//Defense places towers on the grid
//Attack selects enemies and selects "spawn" (there will be preset enemy spawn points.)

// Function to load and display towers
function loadTowers() {
  const towerContainer = document.querySelector('.left-nav'); // Get the left navigation div

  // Loop through the defenseTowers array and create buttons
  defenseTowers.forEach(tower => {
    const towerBtn = document.createElement('button');
    towerBtn.classList.add('tower-btn');
    towerBtn.innerText = `${tower.name} (Cost: ${tower.cost})`;
    towerBtn.onclick = () => showTowerInfo(tower); // Show info on click

    towerContainer.appendChild(towerBtn); // Add button to the container
  });
}

// Function to show tower info in a context menu
function showTowerInfo(tower) {
  player.selectedTower = tower;

  const infoContainer = document.createElement('div');
  infoContainer.classList.add('tower-info');

  infoContainer.innerHTML = `
    <h4>${tower.name}</h4>
    <p>Cost: ${tower.cost}</p>
    <p>Damage: ${tower.damage}</p>
    <p>Range: ${tower.range}</p>
    <p>Fire Rate: ${tower.fireRate} seconds</p>
  `;

  // Append to the body and position below the clicked button
  document.body.appendChild(infoContainer);
  infoContainer.style.position = 'absolute';
  infoContainer.style.left = `${event.pageX}px`;
  infoContainer.style.top = `${event.pageY}px`;

  // Remove info when clicking elsewhere
  document.addEventListener('keydown', (e) => {
    if (infoContainer && e.key == "Escape") {
      document.body.removeChild(infoContainer);
      player.selectedTower = null;
    }
  }, { once: true });
}

// Load towers when the game starts
loadTowers();

// Get the canvas element and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
  ctx.strokeStyle = '#ccc';
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

// Initialize a 2D array representing the game board
const rows = 20;
const cols = 20;
const gameBoard = Array.from({ length: rows }, () => Array(cols).fill(null)); // Each cell starts as 'null'

// Function to draw the tower on the grid
function drawTower(x, y, tower) {
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  // Draw the tower as a filled rectangle in the center of the cell
  ctx.fillStyle = 'blue'; // Change to a color representing the tower
  ctx.fillRect(
    x * cellWidth + cellWidth / 4,
    y * cellHeight + cellHeight / 4,
    cellWidth / 2,
    cellHeight / 2
  );

  // Optionally, add text to indicate tower details, e.g., range or name
  ctx.fillStyle = 'white';
  ctx.font = '10px Arial';
  ctx.fillText(tower.name, x * cellWidth + cellWidth / 4, y * cellHeight + cellHeight / 4 + 10);
}

// Update canvas click handler to place a tower
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

    // Draw the tower on the canvas
    drawTower(x, y, player.selectedTower);

    // Deduct the tower cost from player's cash
    player.cash -= player.selectedTower.cost;

    console.log(`Tower placed at (${x}, ${y}). Player's remaining cash: ${player.cash}`);
    let dataObj = {x:x, y:y, tower:player.selectedTower};
    sendData("towerPlaced", dataObj);
  } else if (gameBoard[y][x] !== null) {
    console.log("This cell already has a tower or enemy.");
  }
};

// Draw grid initially
drawGrid();

/* Start of game */
var player = {
  cash: 100,
  selectedTower: null,
};

/* place network at end, so it may use all functions */
