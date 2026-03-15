const OwnerRequest = require("../models/OwnerRequest");
const Restaurant = require("../models/Restaurant");
const User = require("../models/User");
const { syncUserOwnershipRole } = require("../services/ownerRequestService");

function redirectWithMessage(res, type, message) {
  return res.redirect(`/admin?${type}=${encodeURIComponent(message)}`);
}

async function applyRestaurantAssignment({
  adminId,
  restaurant,
  userId,
  approvedRequestId = null,
}) {
  const reviewedAt = new Date();

  restaurant.owner = userId;
  await restaurant.save();
  await syncUserOwnershipRole(userId);

  if (approvedRequestId) {
    await OwnerRequest.findByIdAndUpdate(approvedRequestId, {
      status: "approved",
      reviewedBy: adminId,
      reviewedAt,
    });
  }

  await OwnerRequest.updateMany(
    {
      restaurant: restaurant._id,
      status: "pending",
      ...(approvedRequestId ? { _id: { $ne: approvedRequestId } } : {}),
      user: { $ne: userId },
    },
    {
      $set: {
        status: "rejected",
        reviewedBy: adminId,
        reviewedAt,
      },
    }
  );

  await OwnerRequest.updateMany(
    {
      restaurant: restaurant._id,
      status: "pending",
      user: userId,
      ...(approvedRequestId ? { _id: { $ne: approvedRequestId } } : {}),
    },
    {
      $set: {
        status: "approved",
        reviewedBy: adminId,
        reviewedAt,
      },
    }
  );
}

exports.getDashboard = async (req, res, next) => {
  try {
    const [users, restaurants, ownerRequests] = await Promise.all([
      User.find({}).sort({ createdAt: -1 }).lean(),
      Restaurant.find({})
        .populate("owner")
        .sort({ name: 1 })
        .lean(),
      OwnerRequest.find({})
        .populate("user")
        .populate("restaurant")
        .populate("reviewedBy")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const ownedRestaurantsByUser = new Map();
    const pendingRequestsByUser = new Map();

    restaurants.forEach((restaurant) => {
      if (!restaurant.owner) {
        return;
      }

      const key = String(restaurant.owner._id);
      const current = ownedRestaurantsByUser.get(key) || [];
      current.push(restaurant);
      ownedRestaurantsByUser.set(key, current);
    });

    ownerRequests.forEach((request) => {
      if (request.status !== "pending") {
        return;
      }

      const key = String(request.user._id);
      pendingRequestsByUser.set(key, (pendingRequestsByUser.get(key) || 0) + 1);
    });

    const mappedUsers = users.map((user) => ({
      ...user,
      ownedRestaurants: ownedRestaurantsByUser.get(String(user._id)) || [],
      pendingRequestCount: pendingRequestsByUser.get(String(user._id)) || 0,
      profilePath: `/profile/${user.username}`,
    }));

    const mappedOwnerRequests = ownerRequests.map((request) => ({
      ...request,
      restaurantPath: `/restaurants/${request.restaurant.restaurantId}`,
      profilePath: `/profile/${request.user.username}`,
    }));

    return res.render("admin-dashboard", {
      title: "Admin Dashboard",
      users: mappedUsers,
      ownerRequests: mappedOwnerRequests,
      restaurants,
      unownedRestaurants: restaurants.filter((restaurant) => !restaurant.owner),
      eligibleUsers: users.filter((user) => user.role !== "admin"),
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null,
    });
  } catch (error) {
    return next(error);
  }
};

exports.approveOwnerRequest = async (req, res, next) => {
  try {
    const ownerRequest = await OwnerRequest.findById(req.params.requestId)
      .populate("user")
      .populate("restaurant");

    if (!ownerRequest || ownerRequest.status !== "pending") {
      return redirectWithMessage(res, "error", "That owner request is no longer pending.");
    }

    const restaurant = await Restaurant.findById(ownerRequest.restaurant._id);
    if (!restaurant) {
      return redirectWithMessage(res, "error", "The selected restaurant could not be found.");
    }

    if (restaurant.owner && String(restaurant.owner) !== String(ownerRequest.user._id)) {
      return redirectWithMessage(res, "error", "That restaurant already has a different owner assigned.");
    }

    await applyRestaurantAssignment({
      adminId: req.currentUser._id,
      restaurant,
      userId: ownerRequest.user._id,
      approvedRequestId: ownerRequest._id,
    });

    return redirectWithMessage(
      res,
      "success",
      `${ownerRequest.user.username} is now assigned as owner of ${ownerRequest.restaurant.name}.`
    );
  } catch (error) {
    return next(error);
  }
};

exports.rejectOwnerRequest = async (req, res, next) => {
  try {
    const ownerRequest = await OwnerRequest.findById(req.params.requestId)
      .populate("user")
      .populate("restaurant");

    if (!ownerRequest || ownerRequest.status !== "pending") {
      return redirectWithMessage(res, "error", "That owner request is no longer pending.");
    }

    ownerRequest.status = "rejected";
    ownerRequest.reviewedBy = req.currentUser._id;
    ownerRequest.reviewedAt = new Date();
    await ownerRequest.save();

    return redirectWithMessage(
      res,
      "success",
      `Rejected the owner request for ${ownerRequest.user.username}.`
    );
  } catch (error) {
    return next(error);
  }
};

exports.assignOwner = async (req, res, next) => {
  try {
    const userId = req.body.userId ? req.body.userId.trim() : "";
    const restaurantId = req.body.restaurantId ? req.body.restaurantId.trim() : "";

    const [user, restaurant] = await Promise.all([
      User.findById(userId),
      Restaurant.findOne({ restaurantId }),
    ]);

    if (!user || user.role === "admin") {
      return redirectWithMessage(res, "error", "Choose a valid non-admin user.");
    }

    if (!restaurant) {
      return redirectWithMessage(res, "error", "Choose a valid restaurant.");
    }

    if (restaurant.owner && String(restaurant.owner) !== String(user._id)) {
      return redirectWithMessage(res, "error", "That restaurant already has an owner assigned.");
    }

    await applyRestaurantAssignment({
      adminId: req.currentUser._id,
      restaurant,
      userId: user._id,
    });

    return redirectWithMessage(
      res,
      "success",
      `${user.username} is now assigned as owner of ${restaurant.name}.`
    );
  } catch (error) {
    return next(error);
  }
};

exports.removeOwner = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ restaurantId: req.params.restaurantId });

    if (!restaurant || !restaurant.owner) {
      return redirectWithMessage(res, "error", "That restaurant does not have an owner assigned.");
    }

    const previousOwnerId = restaurant.owner;
    restaurant.owner = null;
    await restaurant.save();
    await syncUserOwnershipRole(previousOwnerId);

    return redirectWithMessage(res, "success", `Removed the owner assignment for ${restaurant.name}.`);
  } catch (error) {
    return next(error);
  }
};
