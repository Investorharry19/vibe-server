const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const { authenticate } = require("../middleware/auth");
const User = require("../models/user");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /report
router.post(
  "/report",
  authenticate,
  [body("targetUserId").isMongoId(), body("reason").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      // In a real system: write to a Reports collection and queue for admin review.
      // For MVP we log it and acknowledge.
      console.log(
        `[report] ${req.user._id} reported ${req.body.targetUserId}: ${req.body.reason}`,
      );
      res.json({ message: "Report received" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /block
router.post(
  "/block",
  authenticate,
  [body("targetUserId").isMongoId()],
  validate,
  async (req, res, next) => {
    try {
      const { targetUserId } = req.body;
      if (req.user._id.equals(targetUserId)) {
        return res.status(400).json({ error: "Cannot block yourself" });
      }

      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { blockedUsers: targetUserId },
      });

      res.json({ message: "User blocked" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
