const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createUniqueCode() {
  let code;
  do code = roomCode();
  while (rooms.has(code));
  return code;
}

function emitRoomState(code) {
  const room = rooms.get(code);
  if (!room) return;

  io.to(code).emit("room-state", {
    code,
    playerCount: room.players.length,
    ready: room.players.length === 2
  });
}

io.on("connection", (socket) => {
  socket.on("create-room", (callback) => {
    const code = createUniqueCode();

    rooms.set(code, {
      players: [socket.id],
      host: socket.id
    });

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerNumber = 1;

    callback?.({ ok: true, code, playerNumber: 1 });
    emitRoomState(code);
  });

  socket.on("join-room", (rawCode, callback) => {
    const code = String(rawCode || "").trim().toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      callback?.({ ok: false, error: "Room not found." });
      return;
    }

    if (room.players.length >= 2) {
      callback?.({ ok: false, error: "Room is already full." });
      return;
    }

    room.players.push(socket.id);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerNumber = 2;

    callback?.({ ok: true, code, playerNumber: 2 });
    emitRoomState(code);

    io.to(code).emit("match-start", {
      code,
      message: "Both players connected."
    });
  });

  socket.on("player-input", (payload) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;

    socket.to(code).emit("opponent-input", {
      playerNumber: socket.data.playerNumber,
      ...payload
    });
  });

  socket.on("ball-state", (payload) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;

    // Player 1 acts as the simple authority for ball/score synchronization.
    if (socket.data.playerNumber === 1) {
      socket.to(code).emit("ball-state", payload);
    }
  });

  socket.on("restart-match", () => {
    const code = socket.data.roomCode;
    if (code && rooms.has(code)) io.to(code).emit("restart-match");
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;

    const room = rooms.get(code);
    if (!room) return;

    room.players = room.players.filter((id) => id !== socket.id);

    if (room.players.length === 0) {
      rooms.delete(code);
      return;
    }

    // Remaining player becomes player 1 / host.
    room.host = room.players[0];
    const remaining = io.sockets.sockets.get(room.players[0]);

    if (remaining) {
      remaining.data.playerNumber = 1;
      remaining.emit("became-host");
    }

    io.to(code).emit("opponent-left");
    emitRoomState(code);
  });
});

server.listen(PORT, () => {
  console.log(`Foosball server running on port ${PORT}`);
});
