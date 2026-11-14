const Vibe = require("../models/vibe");
const { getIO } = require("../socket");

async function sendJoinRequest(vibeId, userId) {
  const vibe = await Vibe.findById(vibeId);
  if (!vibe) {
    const e = new Error("Vibe not found");
    e.status = 404;
    throw e;
  }
  if (vibe.expiresAt < new Date()) {
    const e = new Error("Vibe has expired");
    e.status = 410;
    throw e;
  }
  if (vibe.hostId.equals(userId)) {
    const e = new Error("Cannot join your own vibe");
    e.status = 400;
    throw e;
  }
  if (vibe.participants.length >= vibe.maxPeople) {
    const e = new Error("Vibe is full");
    e.status = 409;
    throw e;
  }

  const existing = vibe.requests.find(
    (r) => r.userId.equals(userId) && r.status === "pending",
  );
  if (existing) {
    const e = new Error("Request already pending");
    e.status = 409;
    throw e;
  }

  vibe.requests.push({ userId });
  await vibe.save();

  getIO().to(`vibe:${vibeId}`).emit("request_received", {
    vibeId,
    userId: userId.toString(),
  });

  return vibe;
}

async function respondToRequest(vibeId, requestUserId, hostId, action) {
  const vibe = await Vibe.findById(vibeId);
  if (!vibe) {
    const e = new Error("Vibe not found");
    e.status = 404;
    throw e;
  }
  if (!vibe.hostId.equals(hostId)) {
    const e = new Error("Only the host can respond");
    e.status = 403;
    throw e;
  }
  if (vibe.expiresAt < new Date()) {
    const e = new Error("Vibe has expired");
    e.status = 410;
    throw e;
  }

  const request = vibe.requests.find(
    (r) => r.userId.toString() === requestUserId && r.status === "pending",
  );
  if (!request) {
    const e = new Error("Request not found");
    e.status = 404;
    throw e;
  }

  request.status = action; // 'approved' | 'rejected'

  if (action === "approved") {
    if (vibe.participants.length >= vibe.maxPeople) {
      const e = new Error("Vibe is now full");
      e.status = 409;
      throw e;
    }
    vibe.participants.push(requestUserId);
  }

  await vibe.save();

  const event = action === "approved" ? "request_approved" : "request_rejected";
  getIO().to(`vibe:${vibeId}`).emit(event, { vibeId, userId: requestUserId });

  return vibe;
}

module.exports = { sendJoinRequest, respondToRequest };
