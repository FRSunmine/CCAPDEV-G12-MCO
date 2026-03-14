const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");

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

    const restaurants = await Restaurant.find(filter).sort({ name: 1 }).lean();
    const cuisines = (await Restaurant.distinct("cuisineTypes")).sort((left, right) => left.localeCompare(right));
    const mappedRestaurants = restaurants.map((restaurant) => ({
      ...restaurant,
      restaurantPath: `/restaurants/${restaurant.restaurantId}`,
    }));

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

exports.getRestaurantPage = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ restaurantId: req.params.restaurantId }).lean();
    if (!restaurant) {
      return res.status(404).render("404", { title: "Restaurant Not Found" });
    }

    const reviews = await Review.find({ restaurant: restaurant._id })
      .populate("author")
      .sort({ createdAt: -1 })
      .lean();

    const currentUserId = req.currentUser ? String(req.currentUser._id) : null;
    const mappedReviews = reviews.map((review) => ({
      ...review,
      canManage: currentUserId === String(review.author._id),
      authorProfilePath: `/profile/${review.author.username}`,
    }));

    return res.render("review-template", {
      title: restaurant.name,
      restaurant,
      reviews: mappedReviews,
      hasReviews: mappedReviews.length > 0,
    });
  } catch (error) {
    return next(error);
  }
};
