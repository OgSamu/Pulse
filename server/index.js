const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://192.168.1.107:3000",
      "http://localhost:19006",
    ],
    credentials: true,
    methods: ["GET", "POST"],
  },
  allowEIO3: true,
});

const port = 3003;

// This will store the users and their speeds for each room.
const roomData = {};

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join_room", (room) => {
    socket.join(room);
    // When a user joins, send back all the current users and their speeds in that room.
    if (roomData[room]) {
      socket.emit("users_in_room", roomData[room]);
    }
  });

  socket.on("send_speed_data", ({ speedData, room }) => {
    if (!roomData[room]) {
      roomData[room] = [];
    }

    // Check if the user already exists in the data for this room.
    const userIndex = roomData[room].findIndex(
      (user) => user.name === speedData.name
    );
    if (userIndex !== -1) {
      roomData[room][userIndex] = speedData; // Update speed if user exists.
    } else {
      roomData[room].push(speedData); // Add new user if not exists.
    }

    // Broadcast this user's speed to all other users in the room.
    socket.broadcast.to(room).emit("receive_speed_data", { speedData });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // If needed, you can implement logic here to remove a user from the roomData when they disconnect.
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
