const User = require("../models/User");
const Review = require("../models/Review");

exports.getWelcomePage = (req, res) => {
  res.render("welcome", { title: "Welcome" });
};

exports.getLoginPage = (req, res) => {
  if (req.currentUser) {
    return res.redirect(`/profile/${req.currentUser.username}`);
  }

  return res.render("login", {
    title: "Login",
    error: req.query.error || null,
  });
};

exports.getRegisterPage = (req, res) => {
  if (req.currentUser) {
    return res.redirect(`/profile/${req.currentUser.username}`);
  }

  return res.render("register", {
    title: "Register",
    error: req.query.error || null,
  });
};

exports.getProfilePage = async (req, res, next) => {
  try {
    const profile = await User.findOne({ username: req.params.username }).lean();
    if (!profile) {
      return res.status(404).render("404", { title: "User Not Found" });
    }

    const reviews = await Review.find({ author: profile._id })
      .populate("restaurant")
      .sort({ createdAt: -1 })
      .lean();

    const isOwnProfile = Boolean(req.currentUser) && String(req.currentUser._id) === String(profile._id);
    const mappedReviews = reviews.map((review) => ({
      ...review,
      canManage: isOwnProfile,
      restaurantPath: `/restaurants/${review.restaurant.restaurantId}`,
    }));

    return res.render("profile-template", {
      title: profile.username,
      profile,
      reviews: mappedReviews,
      reviewsCount: mappedReviews.length,
      isOwnProfile,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getEditProfilePage = (req, res) => {
  return res.render("edit-profile", {
    title: "Edit Profile",
    formData: {
      firstName: req.currentUser.firstName || "",
      lastName: req.currentUser.lastName || "",
      username: req.currentUser.username || "",
      email: req.currentUser.email || "",
      bio: req.currentUser.bio || "",
      profilePic: req.currentUser.profilePic || "",
    },
    error: req.query.error || null,
  });
};
