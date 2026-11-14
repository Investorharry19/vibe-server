const router = require("express").Router();
const { body, query, param, validationResult } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const {
  createVibe,
  getNearbyVibes,
  getMyVibes,
  getRequestedVibes,
  getVibeById,
  deleteVibe,
} = require("../services/vibeService");
const {
  sendJoinRequest,
  respondToRequest,
} = require("../services/requestService");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

// ── Static routes first (must be before /:id) ────────────────────────────────

// POST /vibes
router.post(
  "/",
  authenticate,
  [
    body("title").trim().notEmpty().isLength({ max: 80 }),
    body("intent").isIn(["drinks", "party", "chill", "hookup"]),
    body("coordinates").isArray({ min: 2, max: 2 }),
    body("coordinates.*").isFloat(),
    body("maxPeople").isInt({ min: 2, max: 50 }),
    body("durationMinutes").isInt({ min: 30, max: 480 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const vibe = await createVibe({ hostId: req.user._id, ...req.body });
      res.status(201).json({ vibe });
    } catch (err) {
      next(err);
    }
  },
);

// GET /vibes/nearby
router.get(
  "/nearby",
  authenticate,
  [
    query("lat").isFloat({ min: -90, max: 90 }),
    query("lng").isFloat({ min: -180, max: 180 }),
    query("radius").optional().isFloat({ min: 0.1, max: 50 }),
    query("intent").optional().isIn(["drinks", "party", "chill", "hookup"]),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { lat, lng, radius, intent } = req.query;
      const vibes = await getNearbyVibes({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radiusKm: radius ? parseFloat(radius) : undefined,
        intent,
      });
      res.json({ vibes });
    } catch (err) {
      next(err);
    }
  },
);

// GET /vibes/mine
router.get("/mine", authenticate, async (req, res, next) => {
  try {
    const vibes = await getMyVibes(req.user._id);
    res.json({ vibes });
  } catch (err) {
    next(err);
  }
});

// GET /vibes/requested
router.get("/requested", authenticate, async (req, res, next) => {
  try {
    const vibes = await getRequestedVibes(req.user._id);
    res.json({ vibes });
  } catch (err) {
    next(err);
  }
});

// ── Param routes after all static routes ─────────────────────────────────────

// GET /vibes/:id
router.get(
  "/:id",
  authenticate,
  [param("id").isMongoId()],
  validate,
  async (req, res, next) => {
    try {
      const vibe = await getVibeById(req.params.id);
      if (!vibe) return res.status(404).json({ error: "Vibe not found" });
      res.json({ vibe });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /vibes/:id
router.delete(
  "/:id",
  authenticate,
  [param("id").isMongoId()],
  validate,
  async (req, res, next) => {
    try {
      await deleteVibe(req.params.id, req.user._id);
      res.json({ message: "Vibe deleted" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /vibes/:id/request
router.post(
  "/:id/request",
  authenticate,
  [param("id").isMongoId()],
  validate,
  async (req, res, next) => {
    try {
      await sendJoinRequest(req.params.id, req.user._id);
      res.status(201).json({ message: "Request sent" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /vibes/:id/approve
router.post(
  "/:id/approve",
  authenticate,
  [param("id").isMongoId(), body("userId").isMongoId()],
  validate,
  async (req, res, next) => {
    try {
      await respondToRequest(
        req.params.id,
        req.body.userId,
        req.user._id,
        "approved",
      );
      res.json({ message: "Request approved" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /vibes/:id/reject
router.post(
  "/:id/reject",
  authenticate,
  [param("id").isMongoId(), body("userId").isMongoId()],
  validate,
  async (req, res, next) => {
    try {
      await respondToRequest(
        req.params.id,
        req.body.userId,
        req.user._id,
        "rejected",
      );
      res.json({ message: "Request rejected" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
