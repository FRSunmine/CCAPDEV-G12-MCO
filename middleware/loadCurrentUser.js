const User = require("../models/User");

module.exports = async (req, res, next) => {
  res.locals.currentUser = null;
  req.currentUser = null;

  if (!req.session.userId) {
    return next();
  }

  try {
    const user = await User.findById(req.session.userId).lean();
    if (!user) {
      req.session.userId = null;
      return next();
    }

    req.currentUser = user;
    res.locals.currentUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
