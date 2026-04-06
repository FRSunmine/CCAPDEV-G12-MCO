const User = require("../models/User");
const Review = require("../models/Review");
const Restaurant = require("../models/Restaurant");
const OwnerRequest = require("../models/OwnerRequest");
const { getOwnerRequestRestaurants } = require("../services/ownerRequestService");
const { getAboutPageData } = require("../services/aboutService");
const { summarizeProfileInsights } = require("../services/profileInsightsService");

exports.getWelcomePage = (req, res) => {
  res.render("pages/welcome", { title: "Welcome" });
};

exports.getLoginPage = (req, res) => {
  if (req.currentUser) {
    if (req.currentUser.role === "admin") {
      return res.redirect("/admin");
    }

    return res.redirect(`/profile/${req.currentUser.username}`);
  }

  return res.render("auth/login", {
    title: "Login",
    error: req.query.error || null,
    formData: {
      identifier: "",
    },
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

    return res.render("auth/register", {
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
      return res.status(404).render("pages/404", { title: "User Not Found" });
    }

    const reviews = await Review.find({ author: profile._id })
      .populate("restaurant")
      .sort({ createdAt: -1 })
      .lean();
    const managedRestaurants = await Restaurant.find({ owner: profile._id })
      .sort({ name: 1 })
      .lean();
    const openReviewId = req.query.openReviewId ? String(req.query.openReviewId) : "";

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
      isEdited: new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 1000,
      isManageOpen: String(review._id) === openReviewId,
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
    const reviewInsights = summarizeProfileInsights(reviews);

    return res.render("user/profile-template", {
      title: profile.username,
      profile,
      critiqueLevel: reviewInsights.critiqueLevel,
      helpfulScore: reviewInsights.helpfulScore,
      helpfulVotesReceived: reviewInsights.helpfulVotes,
      unhelpfulVotesReceived: reviewInsights.unhelpfulVotes,
      anonymousReviewsCount: reviewInsights.anonymousReviews,
      reviews: mappedReviews,
      reviewsCount: mappedReviews.length,
      managedRestaurants: mappedManagedRestaurants,
      managedRestaurantsCount: mappedManagedRestaurants.length,
      pendingOwnerRequests,
      rejectedOwnerRequests,
      isOwnProfile,
      feedbackType: req.query.feedbackType || null,
      feedbackMessage: req.query.feedback || null,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getContactPage = async (req, res, next) => {
  try {
    const selectedRestaurantId = req.query.restaurantId ? req.query.restaurantId.trim() : "";
    const restaurants = await getOwnerRequestRestaurants();

    return res.render("pages/contact", {
      title: "Contact Admin",
      restaurants,
      selectedRestaurantId,
      formData: {
        restaurantId: selectedRestaurantId,
        contactDetails: req.query.contactDetails || "",
        message: req.query.message || "",
      },
      requestSubmitted: req.query.success === "owner-request",
      requestError: req.query.error || null,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getEditProfilePage = (req, res) => {
  return res.render("user/edit-profile", {
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

exports.getAboutPage = (req, res) => {
  const aboutPageData = getAboutPageData();

  return res.render("pages/about", {
    title: "About",
    dependencies: aboutPageData.packages,
    externalLibraries: aboutPageData.libraries,
  });
};
