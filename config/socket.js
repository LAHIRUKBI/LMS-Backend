const { Server } = require('socket.io');
const Student = require('../models/Student');

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

    // When the student joins
    socket.on("student_connected", async (studentId) => {
      if (studentId) {
        socket.studentId = studentId; // It is very important to assign an ID to the socket instance.
        try {
          await Student.findByIdAndUpdate(studentId, { isOnline: true });
          io.emit("student_online", { studentId, isOnline: true });
        } catch (err) {
          console.error("Error setting student online:", err);
        }
      }
    });

    // When the student logs out or closes the tab (disconnects)
    socket.on("student_logout", async (studentId) => {
      const idToOffline = studentId || socket.studentId;
      if (idToOffline) {
        try {
          await Student.findByIdAndUpdate(idToOffline, { isOnline: false });
          io.emit("student_online", { studentId: idToOffline, isOnline: false });
        } catch (err) {
          console.error("Error setting student offline:", err);
        }
      }
    });

    socket.on("disconnect", async () => {
      console.log("User Disconnected", socket.id);
      if (socket.studentId) {
        try {
          await Student.findByIdAndUpdate(socket.studentId, { isOnline: false });
          io.emit("student_online", { studentId: socket.studentId, isOnline: false });
        } catch (err) {
          console.error("Error setting student offline on disconnect:", err);
        }
      }
    });
  });

  app.set("io", io);
};

module.exports = setupSocket;