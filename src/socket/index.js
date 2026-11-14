const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Vibe = require("../models/Vibe");
const Message = require("../models/Message");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_ORIGIN || "*", credentials: true },
  });

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Missing token"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).select("_id name isBanned");
      if (!user || user.isBanned) return next(new Error("Unauthorized"));

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.user._id}`);

    // ── join_room ──────────────────────────────────────────────────────────────
    socket.on("join_room", async ({ vibeId }) => {
      try {
        const vibe = await Vibe.findById(vibeId).select(
          "participants expiresAt",
        );
        if (!vibe || vibe.expiresAt < new Date()) {
          return socket.emit("error", { message: "Vibe not found or expired" });
        }

        socket.join(`vibe:${vibeId}`);
        socket.currentVibeId = vibeId;

        // Send recent message history (last 50)
        const history = await Message.find({ vibeId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("senderId", "name")
          .lean();

        socket.emit("message_history", history.reverse());
      } catch (err) {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ── leave_room ─────────────────────────────────────────────────────────────
    socket.on("leave_room", ({ vibeId }) => {
      socket.leave(`vibe:${vibeId}`);
    });

    // ── send_message ───────────────────────────────────────────────────────────
    socket.on("send_message", async ({ vibeId, message }) => {
      try {
        if (
          !message ||
          typeof message !== "string" ||
          message.trim().length === 0
        )
          return;
        if (message.length > 500)
          return socket.emit("error", { message: "Message too long" });

        const vibe = await Vibe.findById(vibeId).select(
          "participants expiresAt",
        );
        if (!vibe || vibe.expiresAt < new Date()) {
          return socket.emit("error", { message: "Vibe expired" });
        }

        const isParticipant = vibe.participants.some((p) =>
          p.equals(socket.user._id),
        );
        if (!isParticipant) {
          return socket.emit("error", { message: "Not a participant" });
        }

        const msg = await Message.create({
          vibeId,
          senderId: socket.user._id,
          message: message.trim(),
          expiresAt: vibe.expiresAt,
        });

        const payload = {
          _id: msg._id,
          vibeId,
          senderId: { _id: socket.user._id, name: socket.user.name },
          message: msg.message,
          createdAt: msg.createdAt,
        };

        io.to(`vibe:${vibeId}`).emit("receive_message", payload);
      } catch (err) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ── disconnect ─────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[socket] disconnected: ${socket.user._id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { initSocket, getIO };
