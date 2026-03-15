const User = require("../models/User");
const Review = require("../models/Review");
const Restaurant = require("../models/Restaurant");
const OwnerRequest = require("../models/OwnerRequest");
const { getOwnerRequestRestaurants } = require("../services/ownerRequestService");

exports.getWelcomePage = (req, res) => {
  res.render("welcome", { title: "Welcome" });
};

exports.getLoginPage = (req, res) => {
  if (req.currentUser) {
    if (req.currentUser.role === "admin") {
      return res.redirect("/admin");
    }

    return res.redirect(`/profile/${req.currentUser.username}`);
  }

  return res.render("login", {
    title: "Login",
    error: req.query.error || null,
  });
};

exports.getRegisterPage = async (req, res, next) => {
  try {
    if (req.currentUser) {
      if (req.currentUser.role === "admin") {
        return res.redirect("/admin");
      }

      return res.redirect(`/profile/${req.currentUser.username}`);
    }

    const selectedRestaurantId = req.query.restaurantId ? req.query.restaurantId.trim() : "";
    const restaurants = await getOwnerRequestRestaurants();

    return res.render("register", {
      title: "Register",
      error: req.query.error || null,
      restaurants,
      formData: {
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        bio: "",
        isOwnerRequest: req.query.ownerRequest === "1",
        ownerRestaurantId: selectedRestaurantId,
        ownerContactDetails: "",
        ownerRequestMessage: "",
      },
    });
  } catch (error) {
    return next(error);
  }
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
    const managedRestaurants = await Restaurant.find({ owner: profile._id })
      .sort({ name: 1 })
      .lean();

    const isOwnProfile = Boolean(req.currentUser) && String(req.currentUser._id) === String(profile._id);
    const ownerRequests = isOwnProfile
      ? await OwnerRequest.find({ user: profile._id })
        .populate("restaurant")
        .sort({ createdAt: -1 })
        .lean()
      : [];
    const mappedReviews = reviews.map((review) => ({
      ...review,
      canManage: isOwnProfile,
      restaurantPath: `/restaurants/${review.restaurant.restaurantId}`,
    }));
    const mappedManagedRestaurants = managedRestaurants.map((restaurant) => ({
      ...restaurant,
      restaurantPath: `/restaurants/${restaurant.restaurantId}`,
    }));
    const pendingOwnerRequests = ownerRequests
      .filter((request) => request.status === "pending")
      .map((request) => ({
        ...request,
        restaurantPath: `/restaurants/${request.restaurant.restaurantId}`,
      }));
    const rejectedOwnerRequests = ownerRequests
      .filter((request) => request.status === "rejected")
      .map((request) => ({
        ...request,
        restaurantPath: `/restaurants/${request.restaurant.restaurantId}`,
      }));

    return res.render("profile-template", {
      title: profile.username,
      profile,
      reviews: mappedReviews,
      reviewsCount: mappedReviews.length,
      managedRestaurants: mappedManagedRestaurants,
      managedRestaurantsCount: mappedManagedRestaurants.length,
      pendingOwnerRequests,
      rejectedOwnerRequests,
      isOwnProfile,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getContactPage = async (req, res, next) => {
  try {
    const selectedRestaurantId = req.query.restaurantId ? req.query.restaurantId.trim() : "";
    const restaurants = await getOwnerRequestRestaurants();

    return res.render("contact", {
      title: "Contact Admin",
      restaurants,
      selectedRestaurantId,
      formData: {
        restaurantId: selectedRestaurantId,
        contactDetails: "",
        message: "",
      },
      requestSubmitted: req.query.success === "owner-request",
      requestError: req.query.error || null,
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
