const roomCodeInput = document.getElementById('room-code');
const joinRoomButton = document.getElementById('join-room');
const createRoomButton = document.getElementById('create-room');

// Function to create a new room
function createRoom() {
  const roomCode = generateRoomCode();
  localStorage.setItem('roomCode', roomCode); // Store room code for use in game.html
  localStorage.setItem('role', 'Defense');
  window.location.href = 'game.html'; // Redirect to game.html
}

// Function to join an existing room
function joinRoom() {
  const roomCode = roomCodeInput.value.trim();
  if (roomCode) {
    localStorage.setItem('roomCode', roomCode); // Store room code for use in game.html
    localStorage.setItem('role', 'Attack');
    window.location.href = 'game.html'; // Redirect to game.html
  } else {
    alert('Please enter a valid room code.');
  }
}

// Function to generate a random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8); // Random 6-character code
}

// Event listeners for buttons
createRoomButton.addEventListener('click', createRoom);
joinRoomButton.addEventListener('click', joinRoom);
