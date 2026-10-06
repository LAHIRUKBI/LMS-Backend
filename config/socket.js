const { Server } = require('socket.io');
const Student = require('../models/Student');

// studentId -> active socket ids (Set)
const activeSockets = new Map();

const addSocket = (studentId, socketId) => {
  const key = String(studentId);
  if (!activeSockets.has(key)) activeSockets.set(key, new Set());
  activeSockets.get(key).add(socketId);
};

const removeSocket = (studentId, socketId) => {
  const key = String(studentId);
  const set = activeSockets.get(key);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) activeSockets.delete(key);
  }
};

const hasActiveSocket = (studentId) => {
  const set = activeSockets.get(String(studentId));
  return !!set && set.size > 0;
};

const setupSocket = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    },
    // For quick identification when a tab is closed (default: 25000 / 20000)
    pingInterval: 5000,
    pingTimeout: 5000
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
        socket.studentId = studentId;
        addSocket(studentId, socket.id);
        try {
          await Student.findByIdAndUpdate(studentId, { isOnline: true });
          io.emit("student_online", { studentId, isOnline: true });
        } catch (err) {
          console.error("Error setting student online:", err);
        }
      }
    });

    // When a heartbeat is received
    socket.on("student_heartbeat", async (studentId) => {
      if (studentId) {
        socket.studentId = studentId;
        addSocket(studentId, socket.id);
        try {
          await Student.findByIdAndUpdate(studentId, { isOnline: true });
        } catch (err) {
          console.error("Error updating heartbeat:", err);
        }
      }
    });

    // Upon logging out (just like before)
    socket.on("student_logout", async (studentId) => {
      const idToOffline = studentId || socket.studentId;
      if (idToOffline) {
        activeSockets.delete(String(idToOffline));
        socket.studentId = null;
        try {
          await Student.findByIdAndUpdate(idToOffline, { isOnline: false });
          io.emit("student_online", { studentId: idToOffline, isOnline: false });
        } catch (err) {
          console.error("Error setting student offline:", err);
        }
      }
    });

    // When the tab or browser is closed, or the internet connection is lost.
    socket.on("disconnect", () => {
      console.log("User Disconnected", socket.id);
      const studentId = socket.studentId;
      if (!studentId) return;

      removeSocket(studentId, socket.id);

      // If the connection is re-established via a refresh within 3 seconds, it will not be marked as offline.
      setTimeout(async () => {
        if (!hasActiveSocket(studentId)) {
          try {
            await Student.findByIdAndUpdate(studentId, { isOnline: false });
            io.emit("student_online", { studentId, isOnline: false });
          } catch (err) {
            console.error("Error setting student offline on disconnect:", err);
          }
        }
      }, 3000);
    });
  });

  app.set("io", io);
};

module.exports = setupSocket;