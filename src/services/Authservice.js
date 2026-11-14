const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function googleAuth(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  let user = await User.findOne({ googleId: payload.sub });
  const isNew = !user;
  if (!user) {
    user = await User.create({
      googleId: payload.sub,
      name: payload.name,
      photo: payload.picture,
      isVerified: true,
    });
  }

  return { token: signToken(user._id), user, isNew };
}

module.exports = { googleAuth };