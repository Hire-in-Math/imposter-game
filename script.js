// Multi-device Imposter Game
console.log('Multi-device game script loaded!');

// Global variables
let socket;
let currentGame = '';
let roomCode = '';
let isHost = false;
let players = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing multi-device game');
    
    // Initialize Socket.IO connection
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('connect_error', (error) => {
        console.log('Connection failed:', error);
        alert('Could not connect to server. Make sure it is running.');
    });
    
    // Set up Socket.IO event listeners for server responses
    setupSocketListeners();
    setupEventListeners();
    showScreen('main-menu-screen');
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Main menu buttons
    const hostGameBtn = document.getElementById('host-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    
    if (hostGameBtn) {
        hostGameBtn.addEventListener('click', function() {
            console.log('Host game selected');
            showScreen('host-game-selection-screen');
        });
    }
    
    if (joinGameBtn) {
        joinGameBtn.addEventListener('click', function() {
            console.log('Join game selected');
            showScreen('join-game-screen');
        });
    }
    
    // Host game selection buttons
    const categoryBtn = document.getElementById('category-game-btn');
    const questionBtn = document.getElementById('question-game-btn');
    
    if (categoryBtn) {
        categoryBtn.addEventListener('click', function() {
            console.log('Category game selected');
            currentGame = 'category';
            showScreen('room-selection-screen');
        });
    }
    
    if (questionBtn) {
        questionBtn.addEventListener('click', function() {
            console.log('Question game selected');
            currentGame = 'question';
            showScreen('room-selection-screen');
        });
    }
    
    // Room selection buttons
    const createBtn = document.getElementById('create-room-btn');
    
    if (createBtn) {
        createBtn.addEventListener('click', function() {
            console.log('Create room clicked');
            showScreen('create-room-screen');
        });
    }
    
    // Form buttons
    const createSubmit = document.getElementById('create-room-submit-btn');
    const joinSubmit = document.getElementById('join-game-submit-btn');
    
    if (createSubmit) {
        createSubmit.addEventListener('click', createRoom);
    }
    
    if (joinSubmit) {
        joinSubmit.addEventListener('click', joinGameDirect);
    }
    
    // Back to host selection button
    const backToHostSelection = document.querySelector('.back-to-host-selection');
    if (backToHostSelection) {
        backToHostSelection.addEventListener('click', function() {
            showScreen('host-game-selection-screen');
        });
    }
    
    // Back buttons - handle multiple types
    const backBtns = document.querySelectorAll('.back-to-menu');
    backBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Back to menu clicked');
            resetGameState();
            showScreen('main-menu-screen');
        });
    });
    
    // Additional back button selectors
    const backButtons = document.querySelectorAll('[class*="back"], [id*="back"]');
    backButtons.forEach(btn => {
        if (!btn.classList.contains('back-to-menu')) { // Don't double-bind
            btn.addEventListener('click', function() {
                console.log('Back button clicked:', btn.id || btn.className);
                if (btn.id === 'back-to-room-selection' || btn.classList.contains('back-to-room')) {
                    showScreen('room-selection-screen');
                } else {
                    showScreen('main-menu-screen');
                }
            });
        }
    });
    
    // Start game button (for host in waiting room)
    const startGameBtn = document.getElementById('start-game-from-room-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', startGame);
    }
    
    // Get role button (in player role screen)
    const getRoleBtn = document.getElementById('get-role-btn');
    if (getRoleBtn) {
        getRoleBtn.addEventListener('click', getRoleForPlayer);
    }
    
    // Ready button (after getting role)
    const readyBtn = document.getElementById('ready-btn');
    if (readyBtn) {
        readyBtn.addEventListener('click', markPlayerReady);
    }
    
    // Start game phase button (host only)
    const startPhaseBtn = document.getElementById('start-phase-btn');
    if (startPhaseBtn) {
        startPhaseBtn.addEventListener('click', function() {
            if (currentGame === 'question') {
                revealQuestions();
            } else {
                startVotingPhase();
            }
        });
    }
    
    // Start voting from revelation button (question game only)
    const startVotingFromRevelationBtn = document.getElementById('start-voting-from-revelation-btn');
    if (startVotingFromRevelationBtn) {
        startVotingFromRevelationBtn.addEventListener('click', startVotingPhase);
    }
    
    // Additional back buttons that might be missed
    const backToRoom = document.getElementById('back-to-room-btn');
    if (backToRoom) {
        backToRoom.addEventListener('click', function() {
            showScreen('room-selection-screen');
        });
    }
    
    // Results screen buttons
    const revealResultsBtn = document.getElementById('reveal-results-btn');
    if (revealResultsBtn) {
        revealResultsBtn.addEventListener('click', revealResults);
    }
    
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', playAgain);
    }
    
    const endGameBtn = document.getElementById('end-game-btn');
    if (endGameBtn) {
        endGameBtn.addEventListener('click', function() {
            // Host ends the game for everyone
            if (isHost && socket && socket.connected) {
                socket.emit('end-game', { roomCode: roomCode });
            }
            // Reset state and go to main menu
            resetGameState();
            showScreen('main-menu-screen');
        });
    }
    
    console.log('Event listeners setup complete');
}

function setupSocketListeners() {
    console.log('Setting up Socket.IO listeners...');
    
    // Handle successful room creation
    socket.on('room-created', (data) => {
        console.log('Room created:', data);
        roomCode = data.roomCode;
        isHost = true;
        
        // Update the UI with room code
        const roomCodeDisplay = document.getElementById('room-code-display');
        const joinCodeDisplay = document.getElementById('join-code-display');
        
        if (roomCodeDisplay) roomCodeDisplay.textContent = roomCode;
        if (joinCodeDisplay) joinCodeDisplay.textContent = roomCode;
        
        // Switch to waiting room
        showScreen('waiting-room-screen');
    });
    
    // Handle successful room joining
    socket.on('room-joined', (data) => {
        console.log('Room joined:', data);
        roomCode = data.roomCode;
        isHost = false;
        
        // Update the UI with room code
        const roomCodeDisplay = document.getElementById('room-code-display');
        if (roomCodeDisplay) roomCodeDisplay.textContent = roomCode;
        
        // Switch to waiting room
        showScreen('waiting-room-screen');
    });
    
    // Handle player list updates
    socket.on('player-joined', (data) => {
        console.log('Player joined:', data);
        players = data.players;
        updatePlayersList();
    });
    
    // Handle game start
    socket.on('game-started', (data) => {
        console.log('Game started:', data);
        // Make sure we have the correct game type
        if (data.gameType) {
            currentGame = data.gameType;
            console.log('Current game set to:', currentGame);
        }
        showScreen('player-role-screen');
    });
    
    // Handle role reveal
    socket.on('role-revealed', (data) => {
        console.log('Role revealed:', data);
        displayRole(data);
    });
    
    // Handle all roles revealed (move to game phase)
    socket.on('all-roles-revealed', (data) => {
        console.log('All roles revealed, moving to game phase');
        showScreen('game-phase-screen');
        
        if (isHost) {
            const hostControls = document.getElementById('host-controls');
            const playerWaiting = document.getElementById('player-waiting');
            if (hostControls) hostControls.style.display = 'block';
            if (playerWaiting) playerWaiting.style.display = 'none';
        } else {
            const hostControls = document.getElementById('host-controls');
            const playerWaiting = document.getElementById('player-waiting');
            if (hostControls) hostControls.style.display = 'none';
            if (playerWaiting) playerWaiting.style.display = 'block';
        }
    });
    
    // Handle all players ready
    socket.on('all-players-ready', (data) => {
        console.log('All players ready:', data);
        showScreen('game-phase-screen');
        
        if (isHost) {
            const hostControls = document.getElementById('host-controls');
            const playerWaiting = document.getElementById('player-waiting');
            if (hostControls) hostControls.style.display = 'block';
            if (playerWaiting) playerWaiting.style.display = 'none';
        } else {
            const hostControls = document.getElementById('host-controls');
            const playerWaiting = document.getElementById('player-waiting');
            if (hostControls) hostControls.style.display = 'none';
            if (playerWaiting) playerWaiting.style.display = 'block';
        }
    });
    
    // Handle question revelation (for question game)
    socket.on('questions-revealed', (data) => {
        console.log('Questions revealed:', data);
        showQuestionsRevelation(data);
    });
    
    // Handle voting started
    socket.on('voting-started', (data) => {
        console.log('Voting started:', data);
        players = data.players;
        createVoteButtons();
        showScreen('voting-screen');
    });
    
    // Handle vote confirmation
    socket.on('vote-cast', (data) => {
        console.log('Vote cast confirmed:', data);
        const statusMessage = document.getElementById('vote-status-message');
        if (statusMessage) {
            statusMessage.textContent = `Votes: ${data.totalVotesCast}/${data.totalVotesCast + data.votesRemaining}`;
        }
    });
    
    // Handle game results (replaces all-votes-cast)
    socket.on('game-ended', (data) => {
        console.log('Game ended with results:', data);
        
        // Show results screen
        showScreen('results-screen');
        
        // Display the actual game results
        displayGameResults(data);
        
        // Show appropriate controls
        if (isHost) {
            const hostEndControls = document.getElementById('host-end-controls');
            const playerEndWaiting = document.getElementById('player-end-waiting');
            if (hostEndControls) hostEndControls.style.display = 'block';
            if (playerEndWaiting) playerEndWaiting.style.display = 'none';
        } else {
            const hostEndControls = document.getElementById('host-end-controls');
            const playerEndWaiting = document.getElementById('player-end-waiting');
            if (hostEndControls) hostEndControls.style.display = 'none';
            if (playerEndWaiting) playerEndWaiting.style.display = 'block';
        }
    });
    
    // Handle game restart
    socket.on('game-restarted', (data) => {
        console.log('Game restarted:', data);
        
        // Update the current game type in case it changed
        if (data.gameType) {
            currentGame = data.gameType;
            console.log('Game restarted with type:', currentGame);
        }
        
        // Reset all player states and go back to role screen
        showScreen('player-role-screen');
        
        // Reset role display
        const roleWaiting = document.getElementById('role-waiting');
        const roleDisplay = document.getElementById('role-display');
        const waitingForOthers = document.getElementById('waiting-for-others');
        
        if (roleWaiting) roleWaiting.style.display = 'block';
        if (roleDisplay) roleDisplay.style.display = 'none';
        if (waitingForOthers) waitingForOthers.style.display = 'none';
        
        // Reset ready button
        const readyBtn = document.getElementById('ready-btn');
        if (readyBtn) readyBtn.style.display = 'none';
        
        // Reset vote buttons
        const voteContainer = document.getElementById('player-vote-buttons');
        if (voteContainer) voteContainer.innerHTML = '';
    });
    
    // Handle game ended by host
    socket.on('game-ended-by-host', (data) => {
        console.log('Game ended by host:', data);
        // Send all players back to main menu
        showScreen('main-menu-screen');
        
        // Complete reset of all game state
        resetGameState();
        
        // Show a message to players
        alert('The host has ended the game. Returning to main menu.');
    });
    
    // Handle errors
    socket.on('error', (data) => {
        console.log('Server error:', data);
        alert('Error: ' + data.message);
    });
    
    console.log('Socket.IO listeners setup complete');
}

function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    const playerCount = document.getElementById('player-count-display');
    const startButton = document.getElementById('start-game-from-room-btn');
    
    if (playersList) {
        playersList.innerHTML = '';
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            playerDiv.innerHTML = `
                <span>${player.name}</span>
                ${player.isHost ? '<span class="host-badge">HOST</span>' : ''}
            `;
            playersList.appendChild(playerDiv);
        });
    }
    
    if (playerCount) {
        playerCount.textContent = players.length;
    }
    
    // Show start button for host when enough players
    if (startButton && isHost) {
        startButton.style.display = players.length >= 4 ? 'block' : 'none';
    }
}

function showScreen(screenId) {
    console.log('Switching to screen:', screenId);
    
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    console.log('Total screens found:', screens.length);
    screens.forEach(screen => {
        screen.classList.remove('active');
        console.log('Hiding screen:', screen.id);
    });
    
    // Show target screen
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        console.log('Showing screen:', screenId, '- Active class added:', target.classList.contains('active'));
    } else {
        console.error('Screen not found:', screenId);
    }
}

function createRoom() {
    const name = document.getElementById('host-name').value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    console.log('Creating room as:', name);
    
    if (socket && socket.connected) {
        socket.emit('create-room', {
            gameType: currentGame,
            playerName: name
        });
    } else {
        alert('Not connected to server');
    }
}

function joinRoom() {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    const name = document.getElementById('player-name').value.trim();
    
    if (!code || !name) {
        alert('Please fill in both fields');
        return;
    }
    
    console.log('Joining room:', code, 'as:', name);
    
    if (socket && socket.connected) {
        socket.emit('join-room', {
            roomCode: code,
            playerName: name
        });
    } else {
        alert('Not connected to server');
    }
}

function joinGameDirect() {
    const code = document.getElementById('join-code-input').value.trim().toUpperCase();
    const name = document.getElementById('join-player-name').value.trim();
    
    if (!code || !name) {
        alert('Please fill in both fields');
        return;
    }
    
    console.log('Joining game directly:', code, 'as:', name);
    
    if (socket && socket.connected) {
        socket.emit('join-room', {
            roomCode: code,
            playerName: name
        });
    } else {
        alert('Not connected to server');
    }
}

// Copy room code to clipboard
function copyRoomCode() {
    if (roomCode) {
        navigator.clipboard.writeText(roomCode).then(() => {
            const copyBtn = document.getElementById('copy-code-btn');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
        }).catch(() => {
            // Fallback for older browsers
            alert('Room code: ' + roomCode);
        });
    }
}

// Make function available globally for HTML onclick
window.copyRoomCode = copyRoomCode;

// Start the game (host only)
function startGame() {
    console.log('Starting game...');
    
    if (!isHost) {
        alert('Only the host can start the game');
        return;
    }
    
    if (players.length < 4) {
        alert('Need at least 4 players to start');
        return;
    }
    
    // Generate game data
    const gameData = generateGameData();
    
    if (socket && socket.connected) {
        socket.emit('start-game', {
            roomCode: roomCode,
            gameData: gameData
        });
    } else {
        alert('Not connected to server');
    }
}

// Generate game data based on current game type
function generateGameData() {
    const categoryGameData = {
        "Superhero Movies": ["The Dark Knight", "Iron Man", "Spider-Man", "Wonder Woman", "Black Panther"],
        "Fast Food Chains": ["McDonald's", "Burger King", "Taco Bell", "KFC", "Subway"],
        "Social Media Apps": ["TikTok", "Instagram", "Twitter (X)", "Facebook", "Snapchat"],
        "Planets": ["Earth", "Mars", "Jupiter", "Saturn", "Venus"],
        "Types of Pasta": ["Spaghetti", "Penne", "Fettuccine", "Lasagna", "Ravioli"],
        "Board Games": ["Monopoly", "Chess", "Scrabble", "Clue", "Uno"],
        "NBA Teams": ["Lakers", "Warriors", "Celtics", "Bulls", "Heat"],
        "Animals": ["Dog", "Cat", "Elephant", "Lion", "Penguin"],
        "Countries": ["USA", "Canada", "Japan", "France", "Brazil"],
        "Video Games": ["Minecraft", "Fortnite", "Call of Duty", "Pokemon", "Among Us"],
        "TV Shows": ["Friends", "The Office", "Stranger Things", "Game of Thrones", "The Simpsons"],
        "Car Brands": ["Toyota", "Honda", "BMW", "Tesla", "Ford"],
        "Movie Genres": ["Action", "Comedy", "Drama", "Horror", "Sci-Fi"],
        "School Subjects": ["Math", "English", "Science", "History", "Art"],
        "Streaming Services": ["Netflix", "Disney+", "Hulu", "Amazon Prime", "HBO Max"],
        "Fruits": ["Apple", "Banana", "Strawberry", "Pineapple", "Mango"],
        "Colors": ["Red", "Blue", "Green", "Yellow", "Purple"],
        "Pizza Toppings": ["Pepperoni", "Mushrooms", "Olives", "Pineapple", "Bacon"],
        "Ice Cream Flavors": ["Vanilla", "Chocolate", "Strawberry", "Mint Chip", "Cookie Dough"],
        "Musical Instruments": ["Guitar", "Piano", "Drums", "Violin", "Saxophone"],
        "Sports": ["Football", "Basketball", "Soccer", "Tennis", "Baseball"],
        "Clothing Items": ["T-Shirt", "Jeans", "Sneakers", "Dress", "Jacket"],
        "Kitchen Appliances": ["Microwave", "Toaster", "Blender", "Oven", "Refrigerator"],
        "Weather": ["Sunny", "Rainy", "Snowy", "Windy", "Stormy"],
        "Breakfast Foods": ["Cereal", "Eggs", "Pancakes", "Bacon", "Oatmeal"],
        "Dog Breeds": ["Golden Retriever", "German Shepherd", "Bulldog", "Poodle", "Husky"],
        "Disney Movies": ["The Lion King", "Frozen", "Moana", "Aladdin", "Toy Story"],
        "Coffee Drinks": ["Latte", "Cappuccino", "Espresso", "Frappuccino", "Macchiato"],
        "Phone Brands": ["iPhone", "Samsung", "Google Pixel", "OnePlus", "Huawei"],
        "Candy": ["Chocolate", "Gummy Bears", "Skittles", "Snickers", "Lollipop"],
        "Ocean Animals": ["Shark", "Whale", "Dolphin", "Octopus", "Sea Turtle"],
        "Types of Bread": ["White", "Wheat", "Sourdough", "Rye", "Bagel"],
        "Art Supplies": ["Pencil", "Paint", "Brush", "Marker", "Clay"],
        "Transportation": ["Car", "Bus", "Train", "Plane", "Bike"],
        "Holidays": ["Christmas", "Halloween", "Thanksgiving", "Easter", "New Year's"],
        "Video Streaming Platforms": ["YouTube", "Twitch", "Netflix", "Disney+", "Hulu"],
        "Shoes": ["Sneakers", "Sandals", "Boots", "Flip Flops", "Heels"],
        "Amusement Park Rides": ["Roller Coaster", "Ferris Wheel", "Bumper Cars", "Log Ride", "Carousel"],
        "Types of Houses": ["Apartment", "Mansion", "Cabin", "Cottage", "Villa"],
        "Famous Landmarks": ["Eiffel Tower", "Great Wall", "Statue of Liberty", "Pyramids", "Big Ben"],
        "Jobs": ["Teacher", "Doctor", "Engineer", "Artist", "Chef"],
        "Desserts": ["Cake", "Ice Cream", "Brownies", "Cookies", "Pie"],
        "Shapes": ["Circle", "Square", "Triangle", "Rectangle", "Star"],
        "Superpowers": ["Flying", "Invisibility", "Super Strength", "Telepathy", "Speed"],
        "Music Genres": ["Pop", "Rock", "Rap", "Jazz", "Classical"],
        "Emoji": ["😂", "👍", "🔥", "❤️", "😎"],
        "Pets": ["Dog", "Cat", "Fish", "Hamster", "Parrot"]
    };

    const questionGameData = [
        // 🎭 Personality / Traits
        { A: "Who gives the best advice?", B: "Who do people go to when they have problems?" },
        { A: "Who gets embarrassed the easiest?", B: "Who laughs nervously the most?" },
        { A: "Who is the best at keeping secrets?", B: "Who is the hardest to read?" },
        { A: "Who complains the most?", B: "Who gets annoyed the fastest?" },
        { A: "Who has the loudest laugh?", B: "Who makes everyone laugh the hardest?" },
        { A: "Who is the most dramatic?", B: "Who overreacts the most?" },
        { A: "Who is the most patient?", B: "Who waits the longest without complaining?" },
        { A: "Who is the biggest risk-taker?", B: "Who jumps into things without thinking?" },
        { A: "Who is the most easygoing?", B: "Who stays calm the most often?" },
        { A: "Who is most likely to cheer someone up?", B: "Who is most likely to comfort a friend?" },

        // 🚀 Future / Aspirations
        { A: "Who is most likely to travel the world?", B: "Who is most likely to live abroad?" },
        { A: "Who is most likely to invent something new?", B: "Who is most likely to start a business?" },
        { A: "Who is most likely to end up on YouTube?", B: "Who is most likely to go viral online?" },
        { A: "Who is most likely to write a novel?", B: "Who is most likely to keep a daily journal?" },
        { A: "Who is most likely to be a teacher?", B: "Who is most likely to be a coach?" },
        { A: "Who is most likely to be a politician?", B: "Who is most likely to be a lawyer?" },
        { A: "Who is most likely to be famous?", B: "Who is most likely to be recognized in public?" },
        { A: "Who is most likely to own a mansion?", B: "Who is most likely to own a sports car?" },
        { A: "Who is most likely to become a doctor?", B: "Who is most likely to work in healthcare?" },
        { A: "Who is most likely to have kids early?", B: "Who is most likely to stay single the longest?" },

        // 📚 School / Work
        { A: "Who is most likely to fall asleep in class?", B: "Who is most likely to be late to class?" },
        { A: "Who is the teacher's favorite?", B: "Who participates in class the most?" },
        { A: "Who is most likely to forget their backpack?", B: "Who is most likely to forget homework?" },
        { A: "Who is the fastest test taker?", B: "Who finishes homework the quickest?" },
        { A: "Who is the best at group projects?", B: "Who ends up doing all the work?" },
        { A: "Who is most likely to skip studying?", B: "Who is most likely to cram last minute?" },
        { A: "Who is most likely to be late for a presentation?", B: "Who is most likely to forget their lines?" },
        { A: "Who gets the highest test grades?", B: "Who stresses the most before tests?" },
        { A: "Who doodles in their notebook?", B: "Who daydreams in class the most?" },
        { A: "Who is most likely to ask for extra credit?", B: "Who is most likely to stay after class for help?" },

        // 🏡 Daily Life / Habits
        { A: "Who eats the fastest?", B: "Who eats the most food?" },
        { A: "Who is always running late?", B: "Who always forgets the time?" },
        { A: "Who is most likely to lose their keys?", B: "Who is most likely to lose their phone?" },
        { A: "Who spends the most time on TikTok?", B: "Who spends the most time on Instagram?" },
        { A: "Who drinks the most soda?", B: "Who eats the most candy?" },
        { A: "Who takes the longest showers?", B: "Who spends the most time in the bathroom?" },
        { A: "Who has the messiest room?", B: "Who leaves their stuff everywhere?" },
        { A: "Who is most likely to break a glass?", B: "Who is most likely to spill a drink?" },
        { A: "Who is most likely to stay up past 2am?", B: "Who is most likely to sleep past noon?" },
        { A: "Who is most likely to forget their lunch?", B: "Who is most likely to borrow food?" },

        // 🎉 Social Life / Fun
        { A: "Who tells the funniest stories?", B: "Who exaggerates the most when telling stories?" },
        { A: "Who takes the best selfies?", B: "Who takes the most selfies?" },
        { A: "Who is the best dancer?", B: "Who dances the most at parties?" },
        { A: "Who is the best singer?", B: "Who sings the loudest in the car?" },
        { A: "Who plans the best hangouts?", B: "Who always suggests what to do?" },
        { A: "Who plays the most video games?", B: "Who is the best at video games?" },
        { A: "Who makes the best jokes?", B: "Who laughs the hardest at their own jokes?" },
        { A: "Who is the most photogenic?", B: "Who shows up in the most group photos?" },
        { A: "Who is most likely to go viral on TikTok?", B: "Who is most likely to start a new trend?" },
        { A: "Who is most likely to forget a birthday?", B: "Who is most likely to miss a party?" },

        // 🌀 "Most Likely To" Scenarios
        { A: "Who would survive the longest on a deserted island?", B: "Who is the most resourceful?" },
        { A: "Who would survive a zombie apocalypse?", B: "Who would defeat the zombies the best?" },
        { A: "Who is most likely to get lost in a new city?", B: "Who is most likely to forget directions?" },
        { A: "Who is most likely to win the lottery?", B: "Who is the luckiest?" },
        { A: "Who is most likely to get in trouble?", B: "Who is most likely to break the rules?" },
        { A: "Who is most likely to be late to their own wedding?", B: "Who is most likely to oversleep on an important day?" },
        { A: "Who is most likely to lose their phone?", B: "Who is most likely to drop their phone?" },
        { A: "Who is most likely to trip while walking?", B: "Who is most likely to spill a drink?" },
        { A: "Who is most likely to laugh at the wrong moment?", B: "Who laughs in serious situations?" },
        { A: "Who is most likely to become famous accidentally?", B: "Who is most likely to trend online by mistake?" },

        // 🎨 Preferences & Interests
        { A: "What's the best movie you've seen recently?", B: "What's a movie you could watch again and again?" },
        { A: "What's your favorite snack?", B: "What's your favorite dessert?" },
        { A: "What's your dream vacation spot?", B: "What's the farthest place you'd want to travel?" },
        { A: "What's the best video game you've played?", B: "What's the most addictive game you've played?" },
        { A: "What's your favorite holiday?", B: "What holiday has the best food?" },
        { A: "What's your favorite sport to play?", B: "What sport do you watch the most?" },
        { A: "What's your favorite season?", B: "What's the best type of weather?" },
        { A: "What's your favorite hobby?", B: "What hobby would you like to try?" },
        { A: "What's your favorite app?", B: "What app do you use the most?" },
        { A: "What's your favorite type of music?", B: "What's your favorite band or artist?" },

        // 🔀 Random & Hypotheticals
        { A: "If you could have any superpower, what would it be?", B: "If you could be invisible for a day, what would you do?" },
        { A: "If you could switch lives with someone here, who would it be?", B: "If you could trade talents with someone here, who would it be?" },
        { A: "If you could only eat one food forever, what would it be?", B: "If you had to give up one food forever, what would it be?" },
        { A: "If you could time travel anywhere, where would you go?", B: "If you could live in any decade, which would you pick?" },
        { A: "If you won a million dollars, what would you buy first?", B: "If you won a million dollars, what would you save it for?" },
        { A: "If you could meet any celebrity, who would it be?", B: "If you could meet any historical figure, who would it be?" },
        { A: "If you could change your name, what would it be?", B: "If you could give yourself a nickname, what would it be?" },
        { A: "If you could instantly learn a skill, what would it be?", B: "If you could instantly learn a language, what would it be?" },
        { A: "If you had to live without your phone for a week, what would you miss most?", B: "If you had to live without the internet for a week, what would you miss most?" },
        { A: "If you could be famous for anything, what would it be?", B: "If you could win an award for anything, what would it be?" }
    ];
    
    if (currentGame === 'category') {
        const categories = Object.keys(categoryGameData);
        const category = categories[Math.floor(Math.random() * categories.length)];
        const items = categoryGameData[category];
        const item = items[Math.floor(Math.random() * items.length)];
        return { category, item };
    } else {
        const pair = questionGameData[Math.floor(Math.random() * questionGameData.length)];
        return { questionA: pair.A, questionB: pair.B };
    }
}

// Display player's role when revealed
function displayRole(data) {
    const roleWaiting = document.getElementById('role-waiting');
    const roleDisplay = document.getElementById('role-display');
    const roleType = document.getElementById('role-type');
    const roleInfo = document.getElementById('role-info');
    const roleScreenTitle = document.getElementById('role-screen-title');
    
    console.log('Displaying role:', data, 'Current game:', currentGame);
    
    // Update screen title based on game type
    if (roleScreenTitle) {
        if (currentGame === 'question') {
            roleScreenTitle.textContent = 'Your Question';
        } else {
            roleScreenTitle.textContent = 'Your Role';
        }
    }
    
    if (roleWaiting) roleWaiting.style.display = 'none';
    if (roleDisplay) roleDisplay.style.display = 'block';
    
    // Category Game Role Display
    if (currentGame === 'category') {
        if (data.isImposter) {
            if (roleType) roleType.textContent = "🎭 You are the Imposter!";
            if (roleInfo) roleInfo.textContent = `Your Category: ${data.data}`;
        } else {
            if (roleType) roleType.textContent = "✅ Normal Player";
            if (roleInfo) roleInfo.textContent = `Your Item: ${data.data}`;
        }
    } 
    // Question Game Role Display
    else if (currentGame === 'question') {
        if (roleType) roleType.textContent = "❓ Your Question";
        if (roleInfo) roleInfo.textContent = data.data;
    } 
    // Fallback detection based on data structure
    else {
        if (data.isImposter !== undefined) {
            // This is category game data
            currentGame = 'category'; // Set the game type
            if (data.isImposter) {
                if (roleType) roleType.textContent = "🎭 You are the Imposter!";
                if (roleInfo) roleInfo.textContent = `Your Category: ${data.data}`;
            } else {
                if (roleType) roleType.textContent = "✅ Normal Player";
                if (roleInfo) roleInfo.textContent = `Your Item: ${data.data}`;
            }
        } else {
            // This is question game data
            currentGame = 'question'; // Set the game type
            if (roleType) roleType.textContent = "❓ Your Question";
            if (roleInfo) roleInfo.textContent = data.data;
        }
    }
    
    // Give the player time to read their role, then show ready button
    setTimeout(() => {
        const readyBtn = document.getElementById('ready-btn');
        if (readyBtn) readyBtn.style.display = 'block';
    }, 1000);
}

// Get role function (called when player clicks "Get Role" button)
function getRoleForPlayer() {
    console.log('Getting role for player...');
    
    if (socket && socket.connected) {
        socket.emit('get-role', { roomCode: roomCode });
    } else {
        alert('Not connected to server');
    }
}

// Mark player as ready
function markPlayerReady() {
    console.log('Player marking as ready...');
    
    const readyBtn = document.getElementById('ready-btn');
    const waitingMessage = document.getElementById('waiting-for-others');
    
    if (readyBtn) readyBtn.style.display = 'none';
    if (waitingMessage) waitingMessage.style.display = 'block';
    
    if (socket && socket.connected) {
        socket.emit('player-ready', { roomCode: roomCode });
    } else {
        alert('Not connected to server');
    }
}

// Reveal questions (for question game only)
function revealQuestions() {
    console.log('Revealing questions...');
    
    if (!isHost) {
        alert('Only the host can reveal questions');
        return;
    }
    
    if (socket && socket.connected) {
        socket.emit('reveal-questions', { roomCode: roomCode });
    } else {
        alert('Not connected to server');
    }
}

// Show questions revelation screen
function showQuestionsRevelation(data) {
    console.log('Showing questions revelation:', data);
    
    const questionADisplay = document.getElementById('question-a-display');
    
    if (questionADisplay && data.gameData) {
        questionADisplay.textContent = data.gameData.questionA;
    }
    
    // Show appropriate controls
    if (isHost) {
        const hostRevelationControls = document.getElementById('host-revelation-controls');
        const playerRevelationWaiting = document.getElementById('player-revelation-waiting');
        if (hostRevelationControls) hostRevelationControls.style.display = 'block';
        if (playerRevelationWaiting) playerRevelationWaiting.style.display = 'none';
    } else {
        const hostRevelationControls = document.getElementById('host-revelation-controls');
        const playerRevelationWaiting = document.getElementById('player-revelation-waiting');
        if (hostRevelationControls) hostRevelationControls.style.display = 'none';
        if (playerRevelationWaiting) playerRevelationWaiting.style.display = 'block';
    }
    
    showScreen('questions-revelation-screen');
}

// Start voting phase (host only)
function startVotingPhase() {
    console.log('Starting voting phase...');
    
    if (!isHost) {
        alert('Only the host can start the voting phase');
        return;
    }
    
    if (socket && socket.connected) {
        socket.emit('start-voting', { roomCode: roomCode });
    } else {
        alert('Not connected to server');
    }
}

// Create voting buttons for all players
function createVoteButtons() {
    const voteContainer = document.getElementById('player-vote-buttons');
    if (!voteContainer) return;
    
    voteContainer.innerHTML = '';
    
    players.forEach(player => {
        const button = document.createElement('button');
        button.textContent = player.name;
        button.className = 'vote-player-btn';
        button.addEventListener('click', () => voteForPlayer(player.id));
        voteContainer.appendChild(button);
    });
}

// Vote for a player
function voteForPlayer(playerId) {
    console.log('Voting for player:', playerId);
    
    if (socket && socket.connected) {
        socket.emit('cast-vote', {
            roomCode: roomCode,
            targetId: playerId
        });
        
        // Disable all vote buttons
        const voteButtons = document.querySelectorAll('.vote-player-btn');
        voteButtons.forEach(btn => btn.disabled = true);
        
        const statusMessage = document.getElementById('vote-status-message');
        if (statusMessage) statusMessage.textContent = 'Vote cast! Waiting for others...';
        
    } else {
        alert('Not connected to server');
    }
}

// Reveal results (host only)
function revealResults() {
    console.log('Revealing results...');
    
    if (!isHost) {
        alert('Only the host can reveal results');
        return;
    }
    
    if (socket && socket.connected) {
        socket.emit('reveal-results', { roomCode: roomCode });
    } else {
        alert('Not connected to server');
    }
}

// Reset all game state to clean slate
function resetGameState() {
    console.log('Resetting game state...');
    
    // Reset global variables
    roomCode = '';
    isHost = false;
    players = [];
    currentGame = '';
    
    // Reset any displayed values
    const roomCodeDisplay = document.getElementById('room-code-display');
    const joinCodeDisplay = document.getElementById('join-code-display');
    const playerCount = document.getElementById('player-count-display');
    const playersList = document.getElementById('players-list');
    
    if (roomCodeDisplay) roomCodeDisplay.textContent = '';
    if (joinCodeDisplay) joinCodeDisplay.textContent = '';
    if (playerCount) playerCount.textContent = '0';
    if (playersList) playersList.innerHTML = '';
    
    // Reset form inputs
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(input => input.value = '');
    
    // Reset role display
    const roleWaiting = document.getElementById('role-waiting');
    const roleDisplay = document.getElementById('role-display');
    const waitingForOthers = document.getElementById('waiting-for-others');
    
    if (roleWaiting) roleWaiting.style.display = 'block';
    if (roleDisplay) roleDisplay.style.display = 'none';
    if (waitingForOthers) waitingForOthers.style.display = 'none';
    
    // Reset buttons
    const readyBtn = document.getElementById('ready-btn');
    const startGameBtn = document.getElementById('start-game-from-room-btn');
    
    if (readyBtn) readyBtn.style.display = 'none';
    if (startGameBtn) startGameBtn.style.display = 'none';
    
    // Reset vote buttons
    const voteContainer = document.getElementById('player-vote-buttons');
    if (voteContainer) voteContainer.innerHTML = '';
    
    console.log('Game state reset complete');
}

// Display game results
function displayGameResults(data) {
    console.log('Displaying game results:', data);
    
    const resultsTitle = document.getElementById('results-title');
    const resultsMessage = document.getElementById('results-message');
    const resultsDetails = document.getElementById('results-details');
    
    // Find the imposter player
    const imposterPlayer = data.players ? data.players.find(p => p.isImposter) : null;
    const imposterName = data.imposterName || (imposterPlayer ? imposterPlayer.name : 'Unknown');
    
    // Determine who won
    const imposterWins = data.imposterWins;
    let winnerText = '';
    let resultText = '';
    
    if (data.votedOutId === -1) {
        // Tie scenario
        winnerText = "It's a Tie!";
        resultText = `No one was voted out due to a tie. The imposter (${imposterName}) wins!`;
    } else if (imposterWins) {
        // Imposter wins
        winnerText = "Imposter Wins! 🎭";
        resultText = `The imposter ${imposterName} fooled everyone! A non-imposter was voted out.`;
    } else {
        // Players win
        winnerText = "Players Win! 🕵️";
        resultText = `Great detective work! The imposter ${imposterName} was successfully identified and voted out.`;
    }
    
    // Update the results display
    if (resultsTitle) resultsTitle.textContent = winnerText;
    if (resultsMessage) resultsMessage.textContent = resultText;
    
    // Show additional game details
    if (resultsDetails) {
        let detailsHtml = `<p><strong>The Imposter:</strong> ${imposterName}</p>`;
        
        if (data.gameData) {
            if (currentGame === 'category' || data.gameData.category) {
                detailsHtml += `<p><strong>Category:</strong> ${data.gameData.category}</p>`;
                detailsHtml += `<p><strong>Item:</strong> ${data.gameData.item}</p>`;
            } else if (currentGame === 'question' || data.gameData.questionA) {
                detailsHtml += `<p><strong>Question A:</strong> ${data.gameData.questionA}</p>`;
                detailsHtml += `<p><strong>Question B:</strong> ${data.gameData.questionB}</p>`;
            }
        }
        
        resultsDetails.innerHTML = detailsHtml;
    }
}

// Play again function
function playAgain() {
    console.log('Starting new game...');
    
    if (!isHost) {
        alert('Only the host can start a new game');
        return;
    }
    
    const gameData = generateGameData();
    
    if (socket && socket.connected) {
        socket.emit('play-again', {
            roomCode: roomCode,
            gameData: gameData
        });
    } else {
        alert('Not connected to server');
    }
}