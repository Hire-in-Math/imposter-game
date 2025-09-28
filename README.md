# 🎮 Multi-Device Imposter Games

A real-time multiplayer game platform featuring two exciting imposter games that players can join from their own devices using join codes.

## 🎯 Games Included

### 1. **Imposter Category Game**
- One player gets only the category, others get a specific item
- Players give clues about their item/category
- Vote to find the imposter who only knows the category

### 2. **Hidden Question Game**
- Most players get question A, the imposter gets question B
- Players answer their questions
- Vote to find who had the different question

## 🚀 Features

- **Multi-Device Support**: Each player uses their own phone/device
- **Room-Based System**: Host creates a room, others join with a 6-letter code
- **Real-Time Sync**: All game states sync across all devices instantly
- **Mobile Responsive**: Optimized for phones and tablets
- **Modern Design**: Beautiful glassmorphism UI with smooth animations

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (version 14 or higher)
- A web browser

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Access the Game**
   - Open your browser to `http://localhost:3000`
   - The host creates a room and shares the join code
   - Other players visit the same URL and enter the join code

## 🎮 How to Play

### For the Host:
1. Choose your game type (Category or Question)
2. Click "Host Game" and enter your name
3. Get your room code and share it with friends
4. Wait for at least 4 players to join
5. Click "Start Game" to begin
6. Control the game flow (start voting, reveal results, play again)

### For Players:
1. Visit the game URL
2. Click "Join Game" 
3. Enter the 6-letter room code and your name
4. Wait for the host to start the game
5. Get your role/question on your device
6. Participate and vote when prompted

## 🔧 Technical Details

- **Backend**: Node.js with Express and Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Real-time Communication**: WebSocket connections via Socket.IO
- **State Management**: Server-side room and game state management
- **Responsive Design**: Mobile-first CSS with media queries

## 🎨 Game Categories

The Category Game includes 47+ different categories with 5+ items each:
- Superhero Movies, Fast Food Chains, Social Media Apps
- Fruits, Colors, Pizza Toppings, Ice Cream Flavors
- Sports, Animals, Countries, Video Games
- And many more!

## 🌐 Network Play

- **Local Network**: All devices must be on the same Wi-Fi network
- **Internet Play**: Deploy to a cloud service (Heroku, Railway, etc.) for internet play
- **Port**: Default runs on port 3000

## 📱 Mobile Experience

- Touch-friendly buttons optimized for mobile devices
- Responsive layout adapts to any screen size
- Easy-to-read text and intuitive navigation
- Copy-to-clipboard for easy code sharing

Enjoy playing! 🎉