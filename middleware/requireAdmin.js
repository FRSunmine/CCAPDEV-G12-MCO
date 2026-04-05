module.exports = (req, res, next) => {
  if (!req.currentUser) {
    return res.redirect("/login?error=Please%20log%20in%20as%20an%20admin.");
  }

  if (req.currentUser.role !== "admin") {
    return res.status(403).render("pages/403", {
      title: "Access Denied",
      errorMessage: "Only admin accounts can access that page.",
    });
  }

  return next();
};
