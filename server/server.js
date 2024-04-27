const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { ACTIONS } = require("./actions");

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const userSocketMap = {};

io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, (data) => {
    userSocketMap[socket.id] = { socketId: socket.id, username: data.username };

    socket.join(data.roomId);

    const clients = Array.from(
      io.sockets.adapter.rooms.get(data.roomId) || []
    ).map((socketId) => {
      return userSocketMap[socketId];
    });

    clients.forEach((client) => {
      io.to(client.socketId).emit(ACTIONS.JOINED, {
        clients,
        username: data.username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ code, roomId }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ code, socketId }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = Array.from(socket.rooms);

    rooms.forEach((room) => {
      socket.to(room).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id]?.username,
      });
    });

    delete userSocketMap[socket.id];

    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} `);
});
