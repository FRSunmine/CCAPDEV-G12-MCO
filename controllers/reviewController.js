// reviewController.js (replace the corresponding functions with these)

const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const mongoose = require("mongoose");
const path = require("path");

// Defensive refresh of restaurant stats
async function refreshRestaurantStats(restaurantDbId) {
  // safe conversion to ObjectId for aggregation match
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

// Helper: canonical current user id (prefer req.currentUser, fallback to session)
function getCurrentUserId(req) {
  if (req.currentUser && req.currentUser._id) return String(req.currentUser._id);
  if (req.session && req.session.userId) return String(req.session.userId);
  return null;
}

// Unified create handler (handles optional images/video, validates restaurantId)
exports.create = async (req, res, next) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) return res.redirect("/login");

    const restaurantId = req.body.restaurantId ? String(req.body.restaurantId).trim() : "";
    const title = req.body.title ? String(req.body.title).trim() : "";
    const body = req.body.body ? String(req.body.body).trim() : "";
    const rating = Number(req.body.rating);

    if (!restaurantId) {
      return res.status(400).render("400", { title: "Bad Request", message: "Missing restaurantId" });
    }

    const restaurant = await Restaurant.findOne({ restaurantId }).select("_id restaurantId").lean();
    if (!restaurant) {
      return res.status(404).render("404", { title: "Restaurant Not Found" });
    }

    // Validate required fields
    if (!title || !body || Number.isNaN(rating)) {
      return res.redirect(`/restaurants/${restaurant.restaurantId}`);
    }

    let authorId = currentUserId;
    if (typeof authorId === "string") {
      if (mongoose.isValidObjectId(authorId)) {
        authorId = new mongoose.Types.ObjectId(authorId);
      } else {
        // leave as string (unlikely) or handle as error
        // optional: return res.status(400).render("400", { title: "Bad Request", message: "Invalid user id" });
      }
    }

    const reviewData = {
      title,
      body,
      rating,
      author: authorId,
      restaurant: restaurant._id
    };


    // Handle uploaded files (images preferred over video)
    const images = [];
    const videos = [];
    if (req.files) {
      if (Array.isArray(req.files.images) && req.files.images.length > 0) {
        req.files.images.slice(0, 3).forEach(f => {
          images.push(path.join("reviews", "img", f.filename).replace(/\\/g, "/"));
        });
      }
      if ((!images.length) && Array.isArray(req.files.video) && req.files.video[0]) {
        const f = req.files.video[0];
        videos.push(path.join("reviews", "vid", f.filename).replace(/\\/g, "/"));
      }
    }
    if (images.length) reviewData.images = images;
    else if (videos.length) reviewData.videos = videos;

    // Create review
    const created = await Review.create(reviewData);

    // Refresh restaurant stats (async but await to keep counts consistent)
    await refreshRestaurantStats(restaurant._id);

    // Safe redirect using the restaurantId we looked up earlier
    return res.redirect(`/restaurants/${restaurant.restaurantId}`);
  } catch (error) {
    return next(error);
  }
};

// Update handler (unchanged logic but use canonical user id)
exports.update = async (req, res, next) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) return res.redirect("/login");

    const review = await Review.findOne({
      _id: req.params.reviewId,
      author: currentUserId,
    }).populate("restaurant");

    if (!review) {
      return res.status(404).render("404", { title: "Review Not Found" });
    }

    const title = req.body.title ? req.body.title.trim() : "";
    const body = req.body.body ? req.body.body.trim() : "";
    const rating = Number(req.body.rating);

    if (!title || !body || Number.isNaN(rating)) {
      return res.redirect(`/profile/${req.currentUser ? req.currentUser.username : ""}`);
    }

    review.title = title;
    review.body = body;
    review.rating = rating;
    review.updatedAt = new Date();

    await review.save();
    await refreshRestaurantStats(review.restaurant._id);

    return res.redirect(`/profile/${req.currentUser ? req.currentUser.username : ""}`);
  } catch (error) {
    return next(error);
  }
};

// Remove handler (unchanged logic but canonical user id)
exports.remove = async (req, res, next) => {
  try {
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) return res.redirect("/login");

    const review = await Review.findOne({
      _id: req.params.reviewId,
      author: currentUserId,
    }).populate("restaurant");

    if (!review) {
      return res.status(404).render("404", { title: "Review Not Found" });
    }

    const restaurantDbId = review.restaurant._id;

    await review.deleteOne();
    await refreshRestaurantStats(restaurantDbId);

    return res.redirect(`/profile/${req.currentUser ? req.currentUser.username : ""}`);
  } catch (error) {
    return next(error);
  }
};

// Vote handler with toggle-off and safe redirect
exports.vote = async (req, res, next) => {
  try {
    const userId = getCurrentUserId(req);
    if (!userId) return res.redirect("/login");

    const reviewId = req.params.reviewId;
    const direction = req.body.direction === "down" ? "down" : "up";

    // ensure session map exists (optional UI convenience)
    req.session.votedReviews = req.session.votedReviews || {};
    const prev = req.session.votedReviews[reviewId]; // "up" | "down" | undefined

    // Determine inc and newUserVote (toggle behavior)
    let inc = 0;
    let newUserVote = null;

    if (prev === direction) {
      // toggle off
      inc = direction === "up" ? -1 : 1;
      newUserVote = null;
      delete req.session.votedReviews[reviewId];
    } else if (!prev) {
      // first time
      inc = direction === "up" ? 1 : -1;
      newUserVote = direction;
      req.session.votedReviews[reviewId] = direction;
    } else {
      // switching
      if (prev === "down" && direction === "up") inc = 2;
      else if (prev === "up" && direction === "down") inc = -2;
      newUserVote = direction;
      req.session.votedReviews[reviewId] = direction;
    }

    // Apply DB update (clamp to >= 0)
    if (inc !== 0) {
      const pipeline = [
        {
          $set: {
            helpfulCount: {
              $max: [0, { $add: ["$helpfulCount", inc] }]
            }
          }
        }
      ];
      await Review.findOneAndUpdate({ _id: reviewId }, pipeline);
    }

    // Fetch review to get restaurantId for redirect safely
    const review = await Review.findById(reviewId).select("restaurant").lean();
    if (!review || !review.restaurant) {
      // fallback: redirect to home if we can't determine restaurant
      return res.redirect("/");
    }

    // If restaurant is an ObjectId, fetch its restaurantId field
    let redirectRestaurantId = null;
    if (typeof review.restaurant === "object" && review.restaurant.restaurantId) {
      redirectRestaurantId = review.restaurant.restaurantId;
    } else {
      // fetch restaurant doc
      const rest = await Restaurant.findById(review.restaurant).select("restaurantId").lean();
      redirectRestaurantId = rest ? rest.restaurantId : null;
    }

    if (!redirectRestaurantId) return res.redirect("/");

    return res.redirect(`/restaurants/${redirectRestaurantId}`);
  } catch (error) {
    return next(error);
  }
};

exports.respond = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.reviewId).populate("restaurant");

    if (!review) {
      return res.status(404).render("404", { title: "Review Not Found" });
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
      return res.redirect(`/restaurants/${review.restaurant.restaurantId}`);
    }

    const responseBody = req.body.responseBody ? req.body.responseBody.trim() : "";
    if (!responseBody) {
      return res.redirect(`/restaurants/${review.restaurant.restaurantId}`);
    }

    const timestamp = new Date();
    review.ownerResponse = {
      body: responseBody,
      respondedAt: review.ownerResponse && review.ownerResponse.respondedAt ? review.ownerResponse.respondedAt : timestamp,
      updatedAt: timestamp,
    };
    review.updatedAt = timestamp;

    await review.save();

    return res.redirect(`/restaurants/${review.restaurant.restaurantId}`);
  } catch (error) {
    return next(error);
  }
};
