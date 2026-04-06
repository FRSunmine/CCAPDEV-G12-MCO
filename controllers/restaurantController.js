const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const { validateSearchFilters } = require("../services/validationService");
const { consumeFlash } = require("../services/flashService");
const {
  buildRestaurantPageData,
  decodeDisplayText,
  formatPriceRangeLabel,
  getMatchingReviewSummaries,
  getTopReviewSummaries,
  mapRestaurant,
  normalizePriceRangeValue,
} = require("../services/restaurantViewService");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPriceRangeAliases(priceRange) {
  const aliases = {
    P: ["P", "â‚±", "₱"],
    PP: ["PP", "â‚±â‚±", "₱₱"],
    PPP: ["PPP", "â‚±â‚±â‚±", "₱₱₱"],
  };

  return aliases[priceRange] || [priceRange];
}

exports.getRestaurantListPage = async (req, res, next) => {
  try {
    const q = req.query.q ? req.query.q.trim() : "";
    const cuisine = req.query.cuisine ? req.query.cuisine.trim() : "";
    const minRating = req.query.minRating ? req.query.minRating.trim() : "";
    const rawPrices = req.query.price;
    const prices = (Array.isArray(rawPrices) ? rawPrices : rawPrices ? [rawPrices] : [])
      .map((price) => normalizePriceRangeValue(price))
      .filter(Boolean);
    const validationError = validateSearchFilters({ q, minRating });

    const [cuisineOptions, priceRangeValues] = await Promise.all([
      Restaurant.distinct("cuisineTypes"),
      Restaurant.distinct("priceRange"),
    ]);
    const cuisines = cuisineOptions
      .map((value) => decodeDisplayText(value))
      .sort((left, right) => left.localeCompare(right));
    const priceRanges = [...new Set(priceRangeValues.map((value) => normalizePriceRangeValue(value)).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({
        value,
        label: formatPriceRangeLabel(value),
      }));

    if (validationError) {
      return res.status(400).render("resto/search", {
        title: "Search Restaurants",
        restaurants: [],
        cuisines,
        priceRanges,
        filters: { q, cuisine, prices, minRating },
        hasResults: false,
        resultCount: 0,
        errorMessage: validationError,
      });
    }

    const filter = {};

    if (q) {
      const safeQuery = escapeRegex(q);
      const keywordRegex = new RegExp(safeQuery, "i");
      const reviewRestaurantIds = await Review.distinct("restaurant", {
        $or: [
          { title: keywordRegex },
          { body: keywordRegex },
        ],
      });

      filter.$or = [
        { name: keywordRegex },
        { location: keywordRegex },
        { previewDescription: keywordRegex },
        ...(reviewRestaurantIds.length ? [{ _id: { $in: reviewRestaurantIds } }] : []),
      ];
    }

    if (cuisine) {
      filter.cuisineTypes = cuisine;
    }

    if (prices.length) {
      filter.priceRange = { $in: prices.flatMap((price) => getPriceRangeAliases(price)) };
    }

    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    const restaurants = await Restaurant.find(filter).sort({ rating: -1, name: 1 }).lean();
    const mappedRestaurantDocs = restaurants.map((restaurant) => mapRestaurant(restaurant));
    const topReviewByRestaurant = await getTopReviewSummaries(
      mappedRestaurantDocs.map((restaurant) => restaurant._id),
      req.currentUser ? String(req.currentUser._id) : null
    );

    const mappedRestaurants = mappedRestaurantDocs.map((restaurant) => {
      const topReview = topReviewByRestaurant.get(String(restaurant._id)) || null;
      const cardPayload = {
        restaurantId: restaurant.restaurantId,
        name: restaurant.name,
        location: restaurant.location,
        priceRange: restaurant.displayPriceRange,
        rating: restaurant.rating,
        previewDescription: restaurant.previewDescription,
        imageSrc: restaurant.imageSrc,
        coordinates: restaurant.coordinates,
        topReview,
      };

      return {
        ...restaurant,
        restaurantPath: `/restaurants/${restaurant.restaurantId}`,
        topReview,
        jsonData: JSON.stringify(cardPayload),
      };
    });
    const mappedMatchingReviews = q
      ? await getMatchingReviewSummaries(
        escapeRegex(q),
        req.currentUser ? String(req.currentUser._id) : null,
        mappedRestaurantDocs.map((restaurant) => restaurant._id)
      )
      : [];

    return res.render("resto/search", {
      title: "Search Restaurants",
      restaurants: mappedRestaurants,
      matchingReviews: mappedMatchingReviews,
      cuisines,
      priceRanges,
      filters: { q, cuisine, prices, minRating },
      hasResults: mappedRestaurants.length > 0,
      hasMatchingReviews: mappedMatchingReviews.length > 0,
      resultCount: mappedRestaurants.length,
      errorMessage: null,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getRestaurantPage = async (req, res, next) => {
  try {
    const feedbackType = req.query.feedbackType || null;
    const feedbackMessage = req.query.feedback || null;
    const feedbackScope = req.query.feedbackScope || "review";
    const flashedReviewFeedback = consumeFlash(req, "restaurantPageFeedback");
    const pageData = await buildRestaurantPageData({
      restaurantId: req.params.restaurantId,
      currentUser: req.currentUser,
      openReviewId: req.query.openReviewId || "",
      reviewFormData: flashedReviewFeedback ? flashedReviewFeedback.formData : {},
      reviewFormSuccess: feedbackScope === "review" && feedbackType === "success" ? feedbackMessage : null,
      reviewFormError: flashedReviewFeedback
        ? flashedReviewFeedback.error
        : feedbackScope === "review" && feedbackType === "error"
          ? feedbackMessage
          : null,
      ownerResponseSuccess: feedbackScope === "owner" && feedbackType === "success" ? feedbackMessage : null,
      ownerResponseError: feedbackScope === "owner" && feedbackType === "error" ? feedbackMessage : null,
    });

    if (!pageData) {
      return res.status(404).render("pages/404", { title: "Restaurant Not Found" });
    }

    return res.render("resto/review-template", pageData);
  } catch (error) {
    return next(error);
  }
};
