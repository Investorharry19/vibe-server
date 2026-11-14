const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    vibeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vibe",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
messageSchema.index({ vibeId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
