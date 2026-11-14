const mongoose = require("mongoose");
const Vibe = require("../models/vibe");
const { getIO } = require("../socket");

let pollInterval;

/**
 * Uses MongoDB change streams to detect TTL deletions.
 * Falls back to polling if change streams are unavailable (e.g. standalone instance).
 */
function startExpiryWatcher() {
  try {
    watchWithChangeStream();
  } catch {
    console.warn(
      "[expiry] change streams unavailable, falling back to polling",
    );
    startPolling();
  }
}

function watchWithChangeStream() {
  const pipeline = [{ $match: { operationType: "delete" } }];
  const changeStream = mongoose.connection
    .collection("vibes")
    .watch(pipeline, { fullDocument: "updateLookup" });

  changeStream.on("change", (change) => {
    const vibeId = change.documentKey._id.toString();
    console.log(`[expiry] vibe expired via change stream: ${vibeId}`);
    getIO().to(`vibe:${vibeId}`).emit("vibe_expired", { vibeId });
  });

  changeStream.on("error", (err) => {
    console.error("[expiry] change stream error:", err);
    changeStream.close();
    startPolling();
  });

  console.log("[expiry] change stream watcher started");
}

function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const expired = await Vibe.find({
        expiresAt: { $lte: new Date() },
      }).select("_id");
      for (const v of expired) {
        getIO().to(`vibe:${v._id}`).emit("vibe_expired", { vibeId: v._id });
        await v.deleteOne();
      }
    } catch (err) {
      console.error("[expiry] polling error:", err);
    }
  }, 30_000);

  console.log("[expiry] polling watcher started (30s interval)");
}

function stopExpiryWatcher() {
  if (pollInterval) clearInterval(pollInterval);
}

module.exports = { startExpiryWatcher, stopExpiryWatcher };
