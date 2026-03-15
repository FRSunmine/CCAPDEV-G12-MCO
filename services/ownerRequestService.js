const OwnerRequest = require("../models/OwnerRequest");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");

async function getOwnerRequestRestaurants() {
  const restaurants = await Restaurant.find({})
    .sort({ name: 1 })
    .lean();

  return restaurants.map((restaurant) => ({
    ...restaurant,
    isOwned: Boolean(restaurant.owner),
  }));
}

async function validateOwnerRequestSubmission({ restaurantId, contactDetails }) {
  const normalizedRestaurantId = restaurantId ? restaurantId.trim() : "";
  const normalizedContactDetails = contactDetails ? contactDetails.trim() : "";

  if (!normalizedRestaurantId) {
    return { error: "Please choose a restaurant." };
  }

  if (!normalizedContactDetails) {
    return { error: "Please provide contact details for the owner request." };
  }

  const restaurant = await Restaurant.findOne({ restaurantId: normalizedRestaurantId });
  if (!restaurant) {
    return { error: "Choose a valid restaurant." };
  }

  if (restaurant.owner) {
    return {
      error: "This restaurant already has an owner account.",
      restaurant,
    };
  }

  return {
    restaurant,
    contactDetails: normalizedContactDetails,
  };
}

async function createPendingOwnerRequest({ userId, restaurantId, contactDetails, message = "" }) {
  const validation = await validateOwnerRequestSubmission({ restaurantId, contactDetails });
  if (validation.error) {
    return validation;
  }

  const existingPendingRequest = await OwnerRequest.findOne({
    user: userId,
    restaurant: validation.restaurant._id,
    status: "pending",
  });

  if (existingPendingRequest) {
    return {
      error: "You already have a pending owner request for this restaurant.",
      restaurant: validation.restaurant,
    };
  }

  const request = await OwnerRequest.create({
    user: userId,
    restaurant: validation.restaurant._id,
    contactDetails: validation.contactDetails,
    message: message ? message.trim() : "",
  });

  return {
    request,
    restaurant: validation.restaurant,
  };
}

async function syncUserOwnershipRole(userId) {
  const user = await User.findById(userId);
  if (!user || user.role === "admin") {
    return user;
  }

  const ownedRestaurantCount = await Restaurant.countDocuments({ owner: user._id });

  if (ownedRestaurantCount > 0 && user.role !== "owner") {
    user.role = "owner";
    await user.save();
  }

  if (ownedRestaurantCount === 0 && user.role === "owner") {
    user.role = "user";
    await user.save();
  }

  return user;
}

module.exports = {
  createPendingOwnerRequest,
  getOwnerRequestRestaurants,
  syncUserOwnershipRole,
  validateOwnerRequestSubmission,
};
