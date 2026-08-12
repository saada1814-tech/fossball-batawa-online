# Foosball Online

## Run locally

1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:

   npm install
   npm start

4. Open http://localhost:3000 in your browser.
5. For a local online test, open the same URL in two browser windows.
6. On window 1 choose:
   Play Now -> Online Multiplayer -> Create Room
7. Copy the room code.
8. On window 2 choose:
   Play Now -> Online Multiplayer -> Join Room

## Deploy online

This project needs a Node.js host because Socket.IO requires a persistent server.

Typical deployment:
- Upload the entire project to a Node.js hosting service.
- Build command: npm install
- Start command: npm start
- Make sure the host supports WebSockets.
- The platform should provide PORT automatically; server.js already uses process.env.PORT.

After deployment, both players open the same public website URL.
Player 1 creates a room and Player 2 joins with the 6-character code.

## Modes

- Player 1 vs AI
- Player 1 vs Player 2 (local keyboard)
- Online Multiplayer (room code)

## Prototype networking model

Player 1 is the authoritative host for ball physics, score, and timer.
Player inputs are relayed through the Socket.IO server.
For a production competitive game, move authoritative physics/state validation fully to the server.
