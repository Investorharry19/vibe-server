const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const { googleAuth } = require("../services/authservice");
const { authenticate } = require("../middleware/auth");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

// POST /auth/google
router.post(
  "/google",
  [body("idToken").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const { token, user, isNew } = await googleAuth(req.body.idToken);
      res.json({ token, user, isNew });
    } catch (err) {
      next(err);
    }
  },
);

// GET /auth/me
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
