const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String },
    name: { type: String, required: true, trim: true },
    photo: { type: String },
    isVerified: { type: Boolean, default: false },
    rating: { type: Number, default: 5.0, min: 1, max: 5 },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.index({ googleId: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);
