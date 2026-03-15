const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const User = require("../models/User");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

exports.getRestaurantListPage = async (req, res, next) => {
  try {
    const q = req.query.q ? req.query.q.trim() : "";
    const cuisine = req.query.cuisine ? req.query.cuisine.trim() : "";
    const rawPrices = req.query.price;
    const prices = Array.isArray(rawPrices) ? rawPrices : rawPrices ? [rawPrices] : [];
    const filter = {};

    if (q) {
      const safeQuery = escapeRegex(q);
      filter.$or = [
        { name: new RegExp(safeQuery, "i") },
        { location: new RegExp(safeQuery, "i") },
      ];
    }

    if (cuisine) {
      filter.cuisineTypes = cuisine;
    }

    if (prices.length) {
      filter.priceRange = { $in: prices };
    }

    // Query Mongo
    const restaurants = await Restaurant.find(filter).sort({ name: 1 }).lean();

    // Build mappedRestaurants here
    const mappedRestaurants = restaurants.map(r => ({
      ...r,
      restaurantPath: `/restaurants/${r.restaurantId}`,
      jsonData: JSON.stringify({
        restaurantId: r.restaurantId,
        name: r.name,
        location: r.location,
        priceRange: r.priceRange,
        rating: r.rating,
        previewDescription: r.previewDescription,
        imageSrc: r.imageSrc,
        coordinates: r.coordinates
      })
    }));

    const cuisines = (await Restaurant.distinct("cuisineTypes"))
      .sort((left, right) => left.localeCompare(right));

    return res.render("search", {
      title: "Search Restaurants",
      restaurants: mappedRestaurants,
      cuisines,
      filters: { q, cuisine, prices },
      hasResults: mappedRestaurants.length > 0,
    });
  } catch (error) {
    return next(error);
  }
};

// restaurantController.js — updated getRestaurantPage
exports.getRestaurantPage = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ restaurantId: req.params.restaurantId }).lean();
    if (!restaurant) {
      return res.status(404).render("404", { title: "Restaurant Not Found" });
    }
    const owner = restaurant.owner ? await User.findById(restaurant.owner).lean() : null;

    const reviews = await Review.find({ restaurant: restaurant._id })
      .populate("author")
      .sort({ createdAt: -1 })
      .lean();

    const currentUserId = req.currentUser ? String(req.currentUser._id) : null;
    const isAdminUser = Boolean(req.currentUser && req.currentUser.role === "admin");
    const isOwnerForRestaurant = Boolean(
      req.currentUser &&
      restaurant.owner &&
      String(restaurant.owner) === currentUserId
    );
    const mappedReviews = reviews.map((review) => ({
      ...review,
      canManage: currentUserId === String(review.author._id),
      authorProfilePath: `/profile/${review.author.username}`,
      userVote: currentUserId
        ? (review.votes || []).find((vote) => String(vote.user) === currentUserId)?.direction || null
        : null,
    })).map((review) => ({
      ...review,
      isHelpfulVoted: review.userVote === "up",
      isNotHelpfulVoted: review.userVote === "down",
    }));

    return res.render("review-template", {
      title: restaurant.name,
      restaurant,
      owner,
      reviews: mappedReviews,
      hasReviews: mappedReviews.length > 0,
      isOwnerForRestaurant,
      isAdminUser,
      hasOwner: Boolean(owner),
      canRequestOwnership: !restaurant.owner,
    });
  } catch (error) {
    return next(error);
  }
};
