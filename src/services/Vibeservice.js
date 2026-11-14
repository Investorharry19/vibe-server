const Vibe = require("../models/Vibe");
const { getIO } = require("../socket");

const DEFAULT_RADIUS_KM = 5;
const MAX_RADIUS_KM = 50;

async function createVibe({
  hostId,
  title,
  intent,
  coordinates,
  maxPeople,
  durationMinutes,
}) {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const vibe = await Vibe.create({
    hostId,
    title,
    intent,
    location: { type: "Point", coordinates },
    maxPeople,
    participants: [hostId],
    expiresAt,
  });

  getIO().emit("vibe_created", {
    vibeId: vibe._id,
    title: vibe.title,
    intent: vibe.intent,
    coordinates,
    expiresAt: vibe.expiresAt,
  });

  return vibe;
}

async function getNearbyVibes({
  lat,
  lng,
  radiusKm = DEFAULT_RADIUS_KM,
  intent,
}) {
  const radius = Math.min(radiusKm, MAX_RADIUS_KM);

  const query = {
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radius * 1000,
      },
    },
    expiresAt: { $gt: new Date() },
  };

  if (intent) query.intent = intent;

  return Vibe.find(query)
    .select("-requests")
    .populate("hostId", "name rating photo")
    .populate("participants", "name photo")
    .limit(50);
}

// Vibes I'm hosting — includes full request data so host can approve/reject
async function getMyVibes(hostId) {
  return Vibe.find({ hostId, expiresAt: { $gt: new Date() } })
    .populate("hostId", "name rating photo")
    .populate("participants", "name photo")
    .populate("requests.userId", "name photo")
    .sort({ createdAt: -1 });
}

// Vibes where I've sent a join request
async function getRequestedVibes(userId) {
  return Vibe.find({
    "requests.userId": userId,
    expiresAt: { $gt: new Date() },
  })
    .populate("hostId", "name rating photo")
    .populate("participants", "name photo")
    .sort({ createdAt: -1 });
}

async function getVibeById(vibeId) {
  return Vibe.findById(vibeId)
    .populate("hostId", "name rating photo")
    .populate("participants", "name photo");
}

async function deleteVibe(vibeId, userId) {
  const vibe = await Vibe.findById(vibeId);
  if (!vibe) {
    const err = new Error("Vibe not found");
    err.status = 404;
    throw err;
  }
  if (!vibe.hostId.equals(userId)) {
    const err = new Error("Only the host can delete this vibe");
    err.status = 403;
    throw err;
  }
  await vibe.deleteOne();
  getIO().to(`vibe:${vibeId}`).emit("vibe_expired", { vibeId });
}

module.exports = {
  createVibe,
  getNearbyVibes,
  getMyVibes,
  getRequestedVibes,
  getVibeById,
  deleteVibe,
};
