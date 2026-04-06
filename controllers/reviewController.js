const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs/promises");

const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const { setFlash } = require("../services/flashService");
const { validateOwnerResponse, validateReviewInput } = require("../services/validationService");

async function refreshRestaurantStats(restaurantDbId) {
  let matchId = restaurantDbId;
  if (typeof matchId === "string" && mongoose.isValidObjectId(matchId)) {
    matchId = new mongoose.Types.ObjectId(matchId);
  }

  const [stats] = await Review.aggregate([
    { $match: { restaurant: matchId } },
    {
      $group: {
        _id: "$restaurant",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const rating = stats && typeof stats.averageRating === "number"
    ? Number(stats.averageRating.toFixed(1))
    : 0;
  const reviewCount = stats ? stats.reviewCount : 0;

  await Restaurant.findByIdAndUpdate(restaurantDbId, {
    rating,
    reviewCount,
  });
}

function getCurrentUserId(req) {
  if (req.currentUser && req.currentUser._id) {
    return String(req.currentUser._id);
  }

  if (req.session && req.session.userId) {
    return String(req.session.userId);
  }

  return null;
}

function buildRestaurantUrl(restaurantId, params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `/restaurants/${restaurantId}?${query}` : `/restaurants/${restaurantId}`;
}

function redirectToRestaurant(res, restaurantId, params = {}) {
  return res.redirect(buildRestaurantUrl(restaurantId, params));
}

function buildPathUrl(basePath, params = {}) {
  const url = new URL(basePath, "http://localhost");

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

function redirectToPath(res, basePath, params = {}) {
  return res.redirect(buildPathUrl(basePath, params));
}

function getReturnToPath(req, fallbackPath) {
  const returnTo = req.body.returnTo ? String(req.body.returnTo).trim() : "";

  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return fallbackPath;
  }

  return returnTo;
}

function normalizeAuthorId(currentUserId) {
  if (mongoose.isValidObjectId(currentUserId)) {
    return new mongoose.Types.ObjectId(currentUserId);
  }

  return currentUserId;
}

async function cleanupUploadedFiles(files) {
  if (!files) {
    return;
  }

  const uploadedFiles = [
    ...(Array.isArray(files.images) ? files.images : []),
    ...(Array.isArray(files.video) ? files.video : []),
  ];

  await Promise.allSettled(uploadedFiles.map((file) => fs.unlink(file.path)));
}

function attachUploadedMedia(reviewData, files) {
  const images = [];
  const videos = [];

  if (files) {
    if (Array.isArray(files.images) && files.images.length > 0) {
      files.images.slice(0, 3).forEach((file) => {
        images.push(path.join("reviews", "img", file.filename).replace(/\\/g, "/"));
      });
    }

    if (!images.length && Array.isArray(files.video) && files.video[0]) {
      const file = files.video[0];
      videos.push(path.join("reviews", "vid", file.filename).replace(/\\/g, "/"));
    }
  }

  if (images.length) {
    reviewData.images = images;
    reviewData.videos = [];
  } else if (videos.length) {
    reviewData.videos = videos;
    reviewData.images = [];
  }
}

exports.create = async (req, res, next) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.redirect("/login");
    }

    const restaurantId = req.body.restaurantId ? String(req.body.restaurantId).trim() : "";
    if (!restaurantId) {
      return res.status(400).render("pages/400", {
        title: "Bad Request",
        message: "A restaurant must be selected before creating a review.",
      });
    }

    const restaurant = await Restaurant.findOne({ restaurantId }).select("_id restaurantId").lean();
    if (!restaurant) {
      return res.status(404).render("pages/404", { title: "Restaurant Not Found" });
    }

    const validation = validateReviewInput({
      title: req.body.title ? String(req.body.title).trim() : "",
      body: req.body.body ? String(req.body.body).trim() : "",
      rating: Number(req.body.rating),
      isAnonymous: req.body.isAnonymous,
    });

    if (validation.error) {
      await cleanupUploadedFiles(req.files);
      setFlash(req, "restaurantPageFeedback", {
        restaurantId: restaurant.restaurantId,
        error: validation.error,
        formData: {
          title: req.body.title ? String(req.body.title).trim() : "",
          body: req.body.body ? String(req.body.body).trim() : "",
          rating: Number.isInteger(Number(req.body.rating)) ? Number(req.body.rating) : 5,
          isAnonymous: req.body.isAnonymous === "on",
        },
      });
      return redirectToRestaurant(res, restaurant.restaurantId, {
        feedbackType: "error",
        feedbackScope: "review",
      });
    }

    const hasImages = Array.isArray(req.files?.images) && req.files.images.length > 0;
    const hasVideo = Array.isArray(req.files?.video) && req.files.video.length > 0;
    if (hasImages && hasVideo) {
      await cleanupUploadedFiles(req.files);
      setFlash(req, "restaurantPageFeedback", {
        restaurantId: restaurant.restaurantId,
        error: "Attach either up to 3 images or 1 video per review, not both at the same time.",
        formData: {
          title: validation.value.title,
          body: validation.value.body,
          rating: validation.value.rating,
          isAnonymous: req.body.isAnonymous === "on",
        },
      });
      return redirectToRestaurant(res, restaurant.restaurantId, {
        feedbackType: "error",
        feedbackScope: "review",
      });
    }

    const reviewData = {
      ...validation.value,
      isAnonymous: req.body.isAnonymous === "on",
      author: normalizeAuthorId(currentUserId),
      restaurant: restaurant._id,
    };

    const existingReview = await Review.findOne({
      author: reviewData.author,
      restaurant: restaurant._id,
    }).lean();

    if (existingReview) {
      await cleanupUploadedFiles(req.files);
      setFlash(req, "restaurantPageFeedback", {
        restaurantId: restaurant.restaurantId,
        error: "You already reviewed this restaurant. Edit your existing review instead.",
        formData: {
          title: validation.value.title,
          body: validation.value.body,
          rating: validation.value.rating,
          isAnonymous: req.body.isAnonymous === "on",
        },
      });
      return redirectToRestaurant(res, restaurant.restaurantId, {
        feedbackType: "error",
        feedbackScope: "review",
      });
    }

    attachUploadedMedia(reviewData, req.files);

    await Review.create(reviewData);
    await refreshRestaurantStats(restaurant._id);

    return redirectToRestaurant(res, restaurant.restaurantId, {
      feedbackType: "success",
      feedback: "Your review was posted.",
      feedbackScope: "review",
    });
  } catch (error) {
    await cleanupUploadedFiles(req.files);

    if (error && error.code === 11000) {
      const restaurantId = req.body.restaurantId ? String(req.body.restaurantId).trim() : "";
      if (restaurantId) {
        setFlash(req, "restaurantPageFeedback", {
          restaurantId,
          error: "You already reviewed this restaurant. Edit your existing review instead.",
          formData: {
            title: req.body.title ? String(req.body.title).trim() : "",
            body: req.body.body ? String(req.body.body).trim() : "",
            rating: Number.isInteger(Number(req.body.rating)) ? Number(req.body.rating) : 5,
            isAnonymous: req.body.isAnonymous === "on",
          },
        });
        return redirectToRestaurant(res, restaurantId, {
          feedbackType: "error",
          feedbackScope: "review",
        });
      }
    }

    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.redirect("/login");
    }

    const review = await Review.findOne({
      _id: req.params.reviewId,
      author: currentUserId,
    }).populate("restaurant");

    if (!review) {
      return res.status(404).render("pages/404", { title: "Review Not Found" });
    }

    const validation = validateReviewInput({
      title: req.body.title ? req.body.title.trim() : "",
      body: req.body.body ? req.body.body.trim() : "",
      rating: Number(req.body.rating),
      isAnonymous: req.body.isAnonymous,
    });

    if (validation.error) {
      const returnToPath = getReturnToPath(req, `/restaurants/${review.restaurant.restaurantId}`);
      return redirectToPath(res, returnToPath, {
        feedbackType: "error",
        feedback: validation.error,
        openReviewId: review._id,
      });
    }

    review.title = validation.value.title;
    review.body = validation.value.body;
    review.rating = validation.value.rating;
    review.isAnonymous = req.body.isAnonymous === "on";
    review.updatedAt = new Date();

    await review.save();
    await refreshRestaurantStats(review.restaurant._id);

    const returnToPath = getReturnToPath(req, `/restaurants/${review.restaurant.restaurantId}`);
    return redirectToPath(res, returnToPath, {
      feedbackType: "success",
      feedback: "Your review was updated.",
      openReviewId: review._id,
    });
  } catch (error) {
    return next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      return res.redirect("/login");
    }

    const review = await Review.findOne({
      _id: req.params.reviewId,
      author: currentUserId,
    }).populate("restaurant");

    if (!review) {
      return res.status(404).render("pages/404", { title: "Review Not Found" });
    }

    const restaurantDbId = review.restaurant._id;
    const restaurantId = review.restaurant.restaurantId;

    await review.deleteOne();
    await refreshRestaurantStats(restaurantDbId);

    const returnToPath = getReturnToPath(req, `/restaurants/${restaurantId}`);
    return redirectToPath(res, returnToPath, {
      feedbackType: "success",
      feedback: "Your review was deleted.",
    });
  } catch (error) {
    return next(error);
  }
};

exports.vote = async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) {
      return res.redirect("/login");
    }

    const reviewId = req.params.reviewId;
    const direction = req.body.direction === "down" ? "down" : "up";

    const review = await Review.findById(reviewId).select("restaurant votes helpfulCount author").lean();
    if (!review || !review.restaurant) {
      return res.redirect("/");
    }

    const restaurant = await Restaurant.findById(review.restaurant).select("restaurantId").lean();
    if (!restaurant) {
      return res.redirect("/");
    }

    if (String(review.author) === userId) {
      return redirectToRestaurant(res, restaurant.restaurantId, {
        feedbackType: "error",
        feedback: "You cannot vote on your own review.",
        feedbackScope: "review",
      });
    }

    const updatedVotes = Array.isArray(review.votes) ? [...review.votes] : [];
    const existingVoteIndex = updatedVotes.findIndex((vote) => String(vote.user) === userId);
    let scoreDelta = 0;

    if (existingVoteIndex >= 0) {
      const previousDirection = updatedVotes[existingVoteIndex].direction;

      if (previousDirection === direction) {
        updatedVotes.splice(existingVoteIndex, 1);
        scoreDelta = direction === "up" ? -1 : 1;
      } else {
        updatedVotes[existingVoteIndex].direction = direction;
        scoreDelta = previousDirection === "up" && direction === "down" ? -2 : 2;
      }
    } else {
      updatedVotes.push({ user: userId, direction });
      scoreDelta = direction === "up" ? 1 : -1;
    }

    await Review.findByIdAndUpdate(reviewId, {
      votes: updatedVotes,
      helpfulCount: (review.helpfulCount || 0) + scoreDelta,
      updatedAt: new Date(),
    });

    return redirectToRestaurant(res, restaurant.restaurantId);
  } catch (error) {
    return next(error);
  }
};

exports.respond = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId).populate("restaurant");

    if (!review) {
      return res.status(404).render("pages/404", { title: "Review Not Found" });
    }

    const restaurant = await Restaurant.findById(review.restaurant._id).select("restaurantId owner");
    const isOwnerForRestaurant = Boolean(
      req.currentUser &&
      req.currentUser.role === "owner" &&
      restaurant &&
      restaurant.owner &&
      String(restaurant.owner) === String(req.currentUser._id)
    );

    if (!isOwnerForRestaurant) {
      return redirectToRestaurant(res, review.restaurant.restaurantId, {
        feedbackType: "error",
        feedback: "Only the assigned restaurant owner can publish a response here.",
        feedbackScope: "owner",
      });
    }

    const responseBody = req.body.responseBody ? req.body.responseBody.trim() : "";
    const responseError = validateOwnerResponse(responseBody);
    if (responseError) {
      return redirectToRestaurant(res, review.restaurant.restaurantId, {
        feedbackType: "error",
        feedback: responseError,
        feedbackScope: "owner",
        openReviewId: review._id,
      });
    }

    const timestamp = new Date();
    review.ownerResponse = {
      body: responseBody,
      respondedAt: review.ownerResponse && review.ownerResponse.respondedAt
        ? review.ownerResponse.respondedAt
        : timestamp,
      updatedAt: timestamp,
    };
    review.updatedAt = timestamp;

    await review.save();

    return redirectToRestaurant(res, review.restaurant.restaurantId, {
      feedbackType: "success",
      feedback: "Owner response published.",
      feedbackScope: "owner",
      openReviewId: review._id,
    });
  } catch (error) {
    return next(error);
  }
};

exports.removeResponse = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId).populate("restaurant");

    if (!review) {
      return res.status(404).render("pages/404", { title: "Review Not Found" });
    }

    const restaurant = await Restaurant.findById(review.restaurant._id).select("restaurantId owner");
    const isOwnerForRestaurant = Boolean(
      req.currentUser &&
      req.currentUser.role === "owner" &&
      restaurant &&
      restaurant.owner &&
      String(restaurant.owner) === String(req.currentUser._id)
    );

    if (!isOwnerForRestaurant) {
      return redirectToRestaurant(res, review.restaurant.restaurantId, {
        feedbackType: "error",
        feedback: "Only the assigned restaurant owner can remove a response here.",
        feedbackScope: "owner",
      });
    }

    review.ownerResponse = {
      body: "",
      respondedAt: null,
      updatedAt: null,
    };
    review.updatedAt = new Date();
    await review.save();

    return redirectToRestaurant(res, review.restaurant.restaurantId, {
      feedbackType: "success",
      feedback: "Owner response removed.",
      feedbackScope: "owner",
      openReviewId: review._id,
    });
  } catch (error) {
    return next(error);
  }
};
