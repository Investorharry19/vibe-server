const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const vibeSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    intent: {
      type: String,
      enum: ["drinks", "party", "chill", "hookup"],
      required: true,
    },
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    maxPeople: { type: Number, required: true, min: 2, max: 50 },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    requests: [requestSchema],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

vibeSchema.index({ location: "2dsphere" });
vibeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
vibeSchema.index({ hostId: 1 });

module.exports = mongoose.model("Vibe", vibeSchema);
