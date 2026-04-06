const crypto = require("crypto");

const User = require("../models/User");

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function shouldExposePasswordResetLinks() {
  return process.env.PASSWORD_RESET_EXPOSE_LINKS === "true";
}

function buildPasswordResetUrl(req, token) {
  const forwardedProtoHeader = req.get("x-forwarded-proto");
  const protocol = forwardedProtoHeader
    ? forwardedProtoHeader.split(",")[0].trim()
    : req.protocol;

  return `${protocol}://${req.get("host")}/auth/reset-password/${token}`;
}

async function issuePasswordResetToken(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = expiresAt;
  await user.save();

  return {
    rawToken,
    expiresAt,
  };
}

async function findUserByPasswordResetToken(token) {
  if (!token) {
    return null;
  }

  return User.findOne({
    passwordResetTokenHash: hashPasswordResetToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  });
}

async function clearPasswordResetToken(user) {
  if (!user) {
    return;
  }

  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();
}

module.exports = {
  buildPasswordResetUrl,
  clearPasswordResetToken,
  findUserByPasswordResetToken,
  issuePasswordResetToken,
  shouldExposePasswordResetLinks,
};
