const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");

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
    const review = await Review.findById(req.params.reviewId).populate("restaurant");

    if (!review) {
      return res.status(404).render("404", { title: "Review Not Found" });
    }

    const direction = req.body.direction === "down" ? -1 : 1;
    review.helpfulCount = Math.max(0, review.helpfulCount + direction);
    review.updatedAt = new Date();

    await review.save();

    return res.redirect(`/restaurants/${review.restaurant.restaurantId}`);
  } catch (error) {
    return next(error);
  }
};
