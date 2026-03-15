const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const mongoose = require("mongoose");

async function refreshRestaurantStats(restaurantDbId) {
  const [stats] = await Review.aggregate([
    { $match: { restaurant: restaurantDbId } },
    {
      $group: {
        _id: "$restaurant",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  await Restaurant.findByIdAndUpdate(restaurantDbId, {
    rating: stats ? Number(stats.averageRating.toFixed(1)) : 0,
    reviewCount: stats ? stats.reviewCount : 0,
  });
}

exports.create = async (req, res, next) => {
  try {
    const restaurantId = req.body.restaurantId ? req.body.restaurantId.trim() : "";
    const title = req.body.title ? req.body.title.trim() : "";
    const body = req.body.body ? req.body.body.trim() : "";
    const rating = Number(req.body.rating);

    const restaurant = await Restaurant.findOne({ restaurantId });
    if (!restaurant) {
      return res.status(404).render("404", { title: "Restaurant Not Found" });
    }

    if (!title || !body || Number.isNaN(rating)) {
      return res.redirect(`/restaurants/${restaurant.restaurantId}`);
    }

    await Review.create({
      title,
      body,
      rating,
      author: req.session.userId,
      restaurant: restaurant._id,
    });

    await refreshRestaurantStats(restaurant._id);
    return res.redirect(`/restaurants/${restaurant.restaurantId}`);
  } catch (error) {
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      _id: req.params.reviewId,
      author: req.session.userId,
    }).populate("restaurant");

    if (!review) {
      return res.status(404).render("404", { title: "Review Not Found" });
    }

    const title = req.body.title ? req.body.title.trim() : "";
    const body = req.body.body ? req.body.body.trim() : "";
    const rating = Number(req.body.rating);

    if (!title || !body || Number.isNaN(rating)) {
      return res.redirect(`/profile/${req.currentUser.username}`);
    }

    review.title = title;
    review.body = body;
    review.rating = rating;
    review.updatedAt = new Date();

    await review.save();
    await refreshRestaurantStats(review.restaurant._id);

    return res.redirect(`/profile/${req.currentUser.username}`);
  } catch (error) {
    return next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      _id: req.params.reviewId,
      author: req.session.userId,
    }).populate("restaurant");

    if (!review) {
      return res.status(404).render("404", { title: "Review Not Found" });
    }

    const restaurantDbId = review.restaurant._id;

    await review.deleteOne();
    await refreshRestaurantStats(restaurantDbId);

    return res.redirect(`/profile/${req.currentUser.username}`);
  } catch (error) {
    return next(error);
  }
};


exports.vote = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const reviewId = req.params.reviewId;
    const direction = req.body.direction === "down" ? "down" : "up";

    req.session.votedReviews = req.session.votedReviews || {};
    const prev = req.session.votedReviews[reviewId];

    if (prev === direction) {
      const review = await Review.findById(reviewId).select("restaurant").populate("restaurant");
      if (!review) return res.status(404).render("404", { title: "Review Not Found" });
      return res.redirect(`/restaurants/${review.restaurant.restaurantId}`);
    }

    let inc = 0;
    if (!prev) {
      inc = direction === "up" ? 1 : -1;
    } else if (prev === "down" && direction === "up") {
      inc = 2;
    } else if (prev === "up" && direction === "down") {
      inc = -2;
    }
    if (inc !== 0) {
      const pipeline = [
        {
          $set: {
            helpfulCount: {
              $max: [
                0,
                { $add: ["$helpfulCount", inc] }
              ]
            }
          }
        }
      ];
      await Review.findOneAndUpdate({ _id: reviewId }, pipeline);
    }
    req.session.votedReviews[reviewId] = direction;

    const review = await Review.findById(reviewId).select("restaurant").populate("restaurant");
    if (!review) return res.status(404).render("404", { title: "Review Not Found" });
    return res.redirect(`/restaurants/${review.restaurant.restaurantId}`);
  } catch (error) {
    return next(error);
  }
}