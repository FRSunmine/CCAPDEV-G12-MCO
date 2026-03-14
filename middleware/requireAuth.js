module.exports = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login?error=Please%20log%20in%20first.");
  }

  return next();
};
