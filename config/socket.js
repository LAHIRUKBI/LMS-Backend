const { Server } = require('socket.io');

const setupSocket = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("join_user_room", (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    socket.on("join_admin_room", () => {
      socket.join("admin_room");
      console.log("An Admin joined the admin_room");
    });

    socket.on("disconnect", () => {
      console.log("User Disconnected", socket.id);
    });
  });

  // Routes වලට (ticketRoutes.js) Socket.io instance එක ලබා දීම
  app.set("io", io);
};

module.exports = setupSocket;