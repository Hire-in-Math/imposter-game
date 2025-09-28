const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Game state storage
const rooms = new Map();

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Room class to manage game state
class GameRoom {
  constructor(roomCode, hostId, gameType) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.gameType = gameType; // 'category' or 'question'
    this.players = new Map();
    this.gameState = 'waiting'; // waiting, revealing, playing, voting, ended
    this.currentPlayerReveal = 0;
    this.votes = new Map();
    this.totalVotesCast = 0;
    this.gameData = {};
    this.imposterId = null;
  }

  addPlayer(socketId, name) {
    const playerId = this.players.size;
    this.players.set(socketId, {
      id: playerId,
      socketId: socketId,
      name: name,
      isHost: socketId === this.hostId,
      isImposter: false,
      hasRevealed: false,
      isReady: false,
      hasVoted: false
    });
    this.votes.set(playerId, 0);
    return playerId;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  getPlayerList() {
    return Array.from(this.players.values());
  }

  startGame(gameData) {
    if (this.players.size < 4) return false;
    
    this.gameData = gameData;
    this.gameState = 'revealing';
    
    // Assign imposter randomly
    const playerIds = Array.from(this.players.keys());
    const imposterSocketId = playerIds[Math.floor(Math.random() * playerIds.length)];
    this.players.get(imposterSocketId).isImposter = true;
    this.imposterId = this.players.get(imposterSocketId).id;
    
    return true;
  }

  getPlayerRole(socketId) {
    const player = this.players.get(socketId);
    if (!player) return null;

    if (this.gameType === 'category') {
      return {
        isImposter: player.isImposter,
        data: player.isImposter ? this.gameData.category : this.gameData.item
      };
    } else if (this.gameType === 'question') {
      return {
        isImposter: player.isImposter,
        data: player.isImposter ? this.gameData.questionB : this.gameData.questionA
      };
    }
  }

  castVote(voterId, targetId) {
    // Check if this player has already voted
    const voter = this.players.get(voterId);
    console.log(`Voting attempt - VoterID: ${voterId}, TargetID: ${targetId}, Voter exists: ${!!voter}, Already voted: ${voter?.hasVoted}`);
    
    if (!voter || voter.hasVoted) {
      console.log(`Vote rejected - voter not found or already voted`);
      return false;
    }
    
    if (this.totalVotesCast >= this.players.size) {
      console.log(`Vote rejected - voting complete (${this.totalVotesCast}/${this.players.size})`);
      return false;
    }
    
    // Mark player as having voted
    voter.hasVoted = true;
    this.totalVotesCast++;
    const currentVotes = this.votes.get(targetId) || 0;
    this.votes.set(targetId, currentVotes + 1);
    
    console.log(`Vote cast successfully - Total votes: ${this.totalVotesCast}/${this.players.size}`);
    return true;
  }

  subtractVote(targetId) {
    const currentVotes = this.votes.get(targetId) || 0;
    if (currentVotes > 0) {
      this.totalVotesCast--;
      this.votes.set(targetId, currentVotes - 1);
      return true;
    }
    return false;
  }

  getVoteResults() {
    let maxVotes = -1;
    let votedOutId = -1;
    
    for (const [playerId, votes] of this.votes.entries()) {
      if (votes > maxVotes) {
        maxVotes = votes;
        votedOutId = playerId;
      }
    }
    
    // Check for ties
    const playersWithMaxVotes = Array.from(this.votes.entries())
      .filter(([, votes]) => votes === maxVotes && votes > 0);
    
    if (playersWithMaxVotes.length > 1) {
      votedOutId = -1; // Tie
    }
    
    return {
      votedOutId,
      imposterId: this.imposterId,
      imposterWins: votedOutId !== this.imposterId
    };
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create room
  socket.on('create-room', (data) => {
    const { gameType, playerName } = data;
    const roomCode = generateRoomCode();
    
    const room = new GameRoom(roomCode, socket.id, gameType);
    const playerId = room.addPlayer(socket.id, playerName);
    rooms.set(roomCode, room);
    
    socket.join(roomCode);
    socket.emit('room-created', { roomCode, playerId, isHost: true });
    
    console.log(`Room ${roomCode} created by ${playerName}`);
  });

  // Join room
  socket.on('join-room', (data) => {
    const { roomCode, playerName } = data;
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.gameState !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    
    const playerId = room.addPlayer(socket.id, playerName);
    socket.join(roomCode);
    
    socket.emit('room-joined', { roomCode, playerId, isHost: false });
    
    // Notify all players in room
    io.to(roomCode).emit('player-joined', {
      players: room.getPlayerList(),
      newPlayer: { id: playerId, name: playerName }
    });
    
    console.log(`${playerName} joined room ${roomCode}`);
  });

  // Start game
  socket.on('start-game', (data) => {
    const { roomCode, gameData } = data;
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Not authorized or room not found' });
      return;
    }
    
    if (room.startGame(gameData)) {
      io.to(roomCode).emit('game-started', {
        gameType: room.gameType,
        totalPlayers: room.players.size
      });
      console.log(`Game started in room ${roomCode}`);
    } else {
      socket.emit('error', { message: 'Need at least 4 players to start' });
    }
  });

  // Get player role
  socket.on('get-role', (data) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const role = room.getPlayerRole(socket.id);
    if (role) {
      socket.emit('role-revealed', role);
      
      const player = room.players.get(socket.id);
      player.hasRevealed = true;
      
      // Don't immediately check for all revealed - wait for player-ready events instead
    }
  });

  // Player ready (after seeing role)
  socket.on('player-ready', (data) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const player = room.players.get(socket.id);
    if (player) {
      player.isReady = true;
      
      // Check if all players are ready
      const allReady = Array.from(room.players.values()).every(p => p.isReady);
      if (allReady) {
        room.gameState = 'phase';
        io.to(roomCode).emit('all-players-ready', {
          message: 'All players ready! Host can start voting phase.'
        });
      }
    }
  });

  // Reveal questions (for question game)
  socket.on('reveal-questions', (data) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Not authorized or room not found' });
      return;
    }
    
    if (room.gameType !== 'question') {
      socket.emit('error', { message: 'Question revelation only available for question games' });
      return;
    }
    
    console.log(`Revealing questions in room ${roomCode}`);
    
    // Emit questions to all players
    io.to(roomCode).emit('questions-revealed', {
      gameData: room.gameData
    });
  });

  // Start voting phase
  socket.on('start-voting', (data) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Not authorized or room not found' });
      return;
    }
    
    // Reset voting state
    room.gameState = 'voting';
    room.totalVotesCast = 0;
    room.players.forEach(player => {
      player.hasVoted = false;
    });
    
    io.to(roomCode).emit('voting-started', {
      players: room.getPlayerList(),
      totalVotes: room.players.size
    });
  });

  // Cast vote
  socket.on('cast-vote', (data) => {
    const { roomCode, targetId } = data;
    const room = rooms.get(roomCode);
    
    console.log(`Cast vote received - Room: ${roomCode}, Target: ${targetId}, Socket: ${socket.id}`);
    
    if (!room || room.gameState !== 'voting') {
      console.log(`Vote rejected - Room not found or not in voting state`);
      socket.emit('error', { message: 'Voting not available' });
      return;
    }
    
    if (room.castVote(socket.id, targetId)) {
      console.log(`Vote accepted - Emitting vote-cast event`);
      
      io.to(roomCode).emit('vote-cast', {
        targetId,
        votes: room.votes.get(targetId),
        totalVotesCast: room.totalVotesCast,
        votesRemaining: room.players.size - room.totalVotesCast
      });
      
      // Check if all votes are cast
      console.log(`Checking if voting complete: ${room.totalVotesCast} >= ${room.players.size}`);
      if (room.totalVotesCast >= room.players.size) {
        console.log(`All votes cast! Auto-revealing results`);
        
        // Automatically reveal results instead of waiting for host
        const results = room.getVoteResults();
        const imposter = Array.from(room.players.values()).find(p => p.isImposter);
        
        room.gameState = 'ended';
        io.to(roomCode).emit('game-ended', {
          ...results,
          imposterId: imposter.socketId,
          imposterName: imposter.name,
          gameData: room.gameData,
          players: room.getPlayerList()
        });
      }
    } else {
      console.log(`Vote was rejected by castVote method`);
    }
  });

  // Subtract vote
  socket.on('subtract-vote', (data) => {
    const { roomCode, targetId } = data;
    const room = rooms.get(roomCode);
    
    if (!room || room.gameState !== 'voting') {
      socket.emit('error', { message: 'Voting not available' });
      return;
    }
    
    if (room.subtractVote(targetId)) {
      io.to(roomCode).emit('vote-subtracted', {
        targetId,
        votes: room.votes.get(targetId),
        totalVotesCast: room.totalVotesCast,
        votesRemaining: room.players.size - room.totalVotesCast
      });
    }
  });

  // Reveal results
  socket.on('reveal-results', (data) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Not authorized or room not found' });
      return;
    }
    
    const results = room.getVoteResults();
    const imposter = Array.from(room.players.values()).find(p => p.isImposter);
    
    room.gameState = 'ended';
    io.to(roomCode).emit('game-ended', {
      ...results,
      imposterName: imposter.name,
      gameData: room.gameData,
      players: room.getPlayerList()
    });
  });

  // Play again
  socket.on('play-again', (data) => {
    const { roomCode, gameData } = data;
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Not authorized or room not found' });
      return;
    }
    
    // Reset room state
    room.gameState = 'waiting';
    room.currentPlayerReveal = 0;
    room.votes = new Map();
    room.totalVotesCast = 0;
    room.imposterId = null;
    
    // Reset player states
    room.players.forEach(player => {
      player.isImposter = false;
      player.hasRevealed = false;
      player.isReady = false;
      player.hasVoted = false;
      room.votes.set(player.id, 0);
    });
    
    if (room.startGame(gameData)) {
      io.to(roomCode).emit('game-restarted', {
        gameType: room.gameType,
        totalPlayers: room.players.size
      });
    }
  });

  // End game (host only)
  socket.on('end-game', (data) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);
    
    if (!room || room.hostId !== socket.id) {
      socket.emit('error', { message: 'Not authorized or room not found' });
      return;
    }
    
    console.log(`Host ending game in room ${roomCode}`);
    
    // Notify all players that the game has been ended by the host
    io.to(roomCode).emit('game-ended-by-host', {
      message: 'The host has ended the game'
    });
    
    // Clean up the room
    rooms.delete(roomCode);
    console.log(`Room ${roomCode} deleted - game ended by host`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove player from any room
    for (const [roomCode, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        room.removePlayer(socket.id);
        
        // If host disconnected, delete room
        if (room.hostId === socket.id) {
          io.to(roomCode).emit('host-disconnected');
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted - host disconnected`);
        } else {
          // Notify remaining players
          io.to(roomCode).emit('player-left', {
            players: room.getPlayerList(),
            leftPlayer: player
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Game deployed! Server is ready for connections.`);
});