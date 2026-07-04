const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY_DAYS = 30;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado');
  return secret;
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    getSecret(),
    { expiresIn: ACCESS_EXPIRY }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRY_DAYS);
  return d;
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshExpiry,
};
