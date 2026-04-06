const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const User = require("../models/User");

function decodeDisplayText(value) {
  if (!value || typeof value !== "string") {
    return value;
  }

  if (!/[Ãâç]/.test(value)) {
    return value;
  }

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch (error) {
    return value;
  }
}

function normalizePriceRangeValue(value) {
  const normalized = decodeDisplayText(String(value || "")).trim();

  if (!normalized) {
    return "";
  }

  if (normalized.includes("PPP") || normalized.includes("PHP PHP PHP") || normalized.includes("₱₱₱")) {
    return "PPP";
  }

  if (normalized.includes("PP") || normalized.includes("PHP PHP") || normalized.includes("₱₱")) {
    return "PP";
  }

  if (normalized.includes("P") || normalized.includes("PHP") || normalized.includes("₱")) {
    return "P";
  }

  return normalized.toUpperCase();
}

function formatPriceRangeLabel(value) {
  const labels = {
    P: "PHP",
    PP: "PHP PHP",
    PPP: "PHP PHP PHP",
  };

  const normalized = normalizePriceRangeValue(value);
  return labels[normalized] || decodeDisplayText(value);
}

function truncateReviewBody(review) {
  const source = decodeDisplayText(review.body || "").trim();

  if (!source) {
    return "This user left a rating without a written review.";
  }

  return source.length > 140 ? `${source.slice(0, 137)}...` : source;
}

function mapRestaurant(restaurant) {
  return {
    ...restaurant,
    name: decodeDisplayText(restaurant.name),
    location: decodeDisplayText(restaurant.location),
    previewDescription: decodeDisplayText(restaurant.previewDescription),
    cuisineTypes: (restaurant.cuisineTypes || []).map((entry) => decodeDisplayText(entry)),
    priceRange: normalizePriceRangeValue(restaurant.priceRange),
    displayPriceRange: formatPriceRangeLabel(restaurant.priceRange),
  };
}

function buildAuthorPresentation(review, currentUserId) {
  const isOwnReview = currentUserId === String(review.author._id);
  const hideIdentity = Boolean(review.isAnonymous) && !isOwnReview;

  return {
    authorDisplayName: hideIdentity ? "Anonymous" : review.author.username,
    authorDisplayPath: hideIdentity ? null : `/profile/${review.author.username}`,
    authorDisplayPic: hideIdentity ? "/img/default_profile.png" : review.author.profilePic,
  };
}

function mapRestaurantReview(review, currentUserId, openReviewId = "") {
  const authorPresentation = buildAuthorPresentation(review, currentUserId);
  const updatedAt = review.updatedAt ? new Date(review.updatedAt).getTime() : 0;
  const createdAt = review.createdAt ? new Date(review.createdAt).getTime() : 0;
  const userVote = currentUserId
    ? (review.votes || []).find((vote) => String(vote.user) === currentUserId)?.direction || null
    : null;

  return {
    ...review,
    ...authorPresentation,
    canManage: currentUserId === String(review.author._id),
    canVote: Boolean(currentUserId) && currentUserId !== String(review.author._id),
    hasImages: Array.isArray(review.images) && review.images.length > 0,
    hasVideos: Array.isArray(review.videos) && review.videos.length > 0,
    isManageOpen: String(review._id) === String(openReviewId || ""),
    voteScore: review.helpfulCount || 0,
    isUpvoted: userVote === "up",
    isDownvoted: userVote === "down",
    wasEdited: updatedAt > createdAt + 1000,
    displayBody: decodeDisplayText(review.body || ""),
    displayTitle: decodeDisplayText(review.title || "Rating only"),
    reviewExcerpt: truncateReviewBody(review),
  };
}

async function getTopReviewSummaries(restaurantIds, currentUserId) {
  if (!restaurantIds.length) {
    return new Map();
  }

  const reviews = await Review.find({ restaurant: { $in: restaurantIds } })
    .populate("author")
    .sort({ helpfulCount: -1, createdAt: -1 })
    .lean();

  const topReviewByRestaurant = new Map();

  reviews.forEach((review) => {
    const restaurantKey = String(review.restaurant);

    if (topReviewByRestaurant.has(restaurantKey)) {
      return;
    }

    const mappedReview = mapRestaurantReview(review, currentUserId);
    topReviewByRestaurant.set(restaurantKey, {
      excerpt: mappedReview.reviewExcerpt,
      authorName: mappedReview.authorDisplayName,
      voteScore: mappedReview.voteScore,
      title: mappedReview.displayTitle,
    });
  });

  return topReviewByRestaurant;
}

async function getMatchingReviewSummaries(query, currentUserId, allowedRestaurantIds = []) {
  if (!query) {
    return [];
  }

  const keywordRegex = new RegExp(query, "i");
  const filter = {
    $or: [
      { title: keywordRegex },
      { body: keywordRegex },
    ],
  };

  if (allowedRestaurantIds.length) {
    filter.restaurant = { $in: allowedRestaurantIds };
  }

  const reviews = await Review.find(filter)
    .populate("author")
    .populate("restaurant")
    .sort({ helpfulCount: -1, createdAt: -1 })
    .limit(6)
    .lean();

  return reviews.map((review) => {
    const mappedReview = mapRestaurantReview(review, currentUserId);
    return {
      _id: review._id,
      title: mappedReview.displayTitle,
      snippet: mappedReview.reviewExcerpt,
      rating: review.rating,
      authorName: mappedReview.authorDisplayName,
      authorProfilePath: mappedReview.authorDisplayPath,
      restaurant: {
        name: decodeDisplayText(review.restaurant.name),
      },
      restaurantPath: `/restaurants/${review.restaurant.restaurantId}`,
    };
  });
}

async function buildRestaurantPageData({
  restaurantId,
  currentUser,
  openReviewId = "",
  reviewFormData = {},
  reviewFormError = null,
  reviewFormSuccess = null,
  ownerResponseError = null,
  ownerResponseSuccess = null,
}) {
  const restaurantDoc = await Restaurant.findOne({ restaurantId }).lean();

  if (!restaurantDoc) {
    return null;
  }

  const restaurant = mapRestaurant(restaurantDoc);
  const owner = restaurant.owner ? await User.findById(restaurant.owner).lean() : null;
  const reviews = await Review.find({ restaurant: restaurant._id })
    .populate("author")
    .sort({ helpfulCount: -1, createdAt: -1 })
    .lean();

  const currentUserId = currentUser ? String(currentUser._id) : null;
  const mappedReviews = reviews.map((review) => mapRestaurantReview(review, currentUserId, openReviewId));
  const currentUserReview = mappedReviews.find((review) => review.canManage) || null;
  const feedbackMessage = reviewFormError || ownerResponseError || reviewFormSuccess || ownerResponseSuccess;
  const feedbackType = reviewFormError || ownerResponseError ? "error" : feedbackMessage ? "success" : null;

  return {
    title: restaurant.name,
    restaurant,
    owner,
    reviews: mappedReviews,
    hasReviews: mappedReviews.length > 0,
    currentUserHasReview: mappedReviews.some((review) => review.canManage),
    isOwnerForRestaurant: Boolean(
      currentUser &&
      currentUser.role === "owner" &&
      restaurant.owner &&
      String(restaurant.owner) === currentUserId
    ),
    isAdminUser: Boolean(currentUser && currentUser.role === "admin"),
    hasOwner: Boolean(owner),
    canRequestOwnership: !restaurant.owner,
    currentUserReviewId: currentUserReview ? currentUserReview._id : null,
    feedbackMessage,
    feedbackType,
    reviewFormData: {
      title: reviewFormData.title || "",
      body: reviewFormData.body || "",
      rating: Number.isInteger(reviewFormData.rating) ? reviewFormData.rating : 5,
      isAnonymous: Boolean(reviewFormData.isAnonymous),
    },
    reviewFormError,
    reviewFormSuccess,
    ownerResponseError,
    ownerResponseSuccess,
  };
}

module.exports = {
  buildRestaurantPageData,
  decodeDisplayText,
  formatPriceRangeLabel,
  getMatchingReviewSummaries,
  getTopReviewSummaries,
  mapRestaurant,
  normalizePriceRangeValue,
  truncateReviewBody,
};
