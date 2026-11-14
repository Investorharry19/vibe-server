const router = require("express").Router();
const { body, param, validationResult } = require("express-validator");
const { authenticate } = require("../middleware/auth");
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
