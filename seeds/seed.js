const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const connectDB = require("../config/db");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const OwnerRequest = require("../models/OwnerRequest");

function readJson(...segments) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", ...segments), "utf8"));
}

function resolveProfilePic(profilePicPath) {
  if (!profilePicPath) {
    return "/img/default_profile.png";
  }

  const normalized = profilePicPath.replace(/^(\.\.\/)+/, "/");
  const absolutePath = path.join(__dirname, "..", "public", normalized.replace(/^\//, ""));
  return fs.existsSync(absolutePath) ? normalized : "/img/default_profile.png";
}

(async () => {
  await connectDB();
  await Promise.all([OwnerRequest.deleteMany({}), Review.deleteMany({}), Restaurant.deleteMany({}), User.deleteMany({})]);

  const rawUsers = readJson("public", "data", "users", "users.json").users;
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = await User.insertMany(
    rawUsers.map((user) => ({
      firstName: user.username,
      lastName: "User",
      role: "user",
      username: user.username,
      handle: user.handle || `@${user.username}`,
      email: user.email.toLowerCase(),
      password: passwordHash,
      bio: user.bio || "Food lover near DLSU.",
      profilePic: resolveProfilePic(user.profilePic),
      createdAt: new Date(user.accountCreated),
    }))
  );
  const ownerUsers = await User.insertMany([
    {
      firstName: "Campus",
      lastName: "Owner",
      username: "campusfoodowner",
      role: "owner",
      handle: "@campusfoodowner",
      email: "campusfoodowner@example.com",
      password: passwordHash,
      bio: "Handles restaurant owner replies across the campus strip.",
      createdAt: new Date("2026-03-01T08:00:00.000Z"),
    },
  ]);
  const adminUsers = await User.insertMany([
    {
      firstName: "Animo",
      lastName: "Admin",
      username: "animoadmin",
      role: "admin",
      handle: "@animoadmin",
      email: "animoadmin@example.com",
      password: passwordHash,
      bio: "Admin account for reviewing owner requests and assignments.",
      createdAt: new Date("2026-03-02T08:00:00.000Z"),
    },
  ]);

  const usersByUsername = new Map(users.map((user) => [user.username, user]));
  const rawRestaurants = readJson("public", "processes", "restaurant_list.json");
  const primaryOwner = ownerUsers[0];
  const primaryAdmin = adminUsers[0];

  const restaurants = await Restaurant.insertMany(
    rawRestaurants.map((restaurant) => ({
      restaurantId: restaurant.id,
      name: restaurant.name,
      location: restaurant.location,
      owner: ["rest0001", "rest0004", "rest0007"].includes(restaurant.id) ? primaryOwner._id : null,
      cuisineTypes: restaurant.cuisine_type,
      rating: restaurant.rating,
      reviewCount: 0,
      priceRange: restaurant.price_range,
      previewDescription: restaurant.preview_description,
      imageSrc: restaurant.image_src,
      coordinates: restaurant.coordinates,
    }))
  );

  const restaurantsById = new Map(restaurants.map((restaurant) => [restaurant.restaurantId, restaurant]));
  const reviewFiles = fs
    .readdirSync(path.join(__dirname, "..", "public", "data"))
    .filter((file) => file.endsWith("_reviews.json"));

  const reviewDocs = [];

  for (const file of reviewFiles) {
    const restaurant = restaurantsById.get(file.replace("_reviews.json", ""));
    const rawReviews = readJson("public", "data", file);

    for (const review of rawReviews) {
      const author = usersByUsername.get(review.user);
      if (!restaurant || !author) {
        continue;
      }

      const votes = [];
      let helpfulCount = review.howHelpfulCount || 0;
      let isAnonymous = false;
      let ownerResponse = {
        body: "",
        respondedAt: null,
        updatedAt: null,
      };

      if (restaurant.restaurantId === "rest0001" && review.reviewID === "rev00001") {
        votes.push(
          { user: usersByUsername.get("Tyler")._id, direction: "up" },
          { user: usersByUsername.get("NotoMaki")._id, direction: "up" },
          { user: usersByUsername.get("Artrytease")._id, direction: "up" }
        );
        helpfulCount = 3;
        isAnonymous = true;
        ownerResponse = {
          body: "Thanks for the feedback. We are glad the Jack Daniels flavor stood out.",
          respondedAt: new Date("2026-02-14T09:30:00.000Z"),
          updatedAt: new Date("2026-02-14T09:30:00.000Z"),
        };
      }

      if (restaurant.restaurantId === "rest0001" && review.reviewID === "rev00002") {
        votes.push(
          { user: usersByUsername.get("Tyler")._id, direction: "down" }
        );
        helpfulCount = -1;
        ownerResponse = {
          body: "Thanks for pointing this out. We are reviewing our serving sizes and pricing balance.",
          respondedAt: new Date("2026-02-15T08:00:00.000Z"),
          updatedAt: new Date("2026-02-15T08:00:00.000Z"),
        };
      }

      if (restaurant.restaurantId === "rest0001" && review.reviewID === "rev00003") {
        ownerResponse = {
          body: "We appreciate the honest note. We are coordinating with the branch team to improve peak-hour service speed.",
          respondedAt: new Date("2026-02-15T09:00:00.000Z"),
          updatedAt: new Date("2026-02-15T09:00:00.000Z"),
        };
      }

      if (restaurant.restaurantId === "rest0003" && review.reviewID === "rev00001") {
        votes.push(
          { user: usersByUsername.get("AniMonstah123")._id, direction: "up" },
          { user: usersByUsername.get("Tyler")._id, direction: "up" }
        );
        helpfulCount = 2;
      }

      if (restaurant.restaurantId === "rest0004" && review.reviewID === "rev00001") {
        votes.push(
          { user: usersByUsername.get("AniMonstah123")._id, direction: "up" }
        );
        helpfulCount = 1;
        ownerResponse = {
          body: "Appreciate the visit. We are working on keeping sweetness levels consistent.",
          respondedAt: new Date("2026-02-15T10:15:00.000Z"),
          updatedAt: new Date("2026-02-15T10:15:00.000Z"),
        };
      }

      if (restaurant.restaurantId === "rest0006" && review.reviewID === "rev00001") {
        votes.push(
          { user: usersByUsername.get("AniMonstah123")._id, direction: "down" },
          { user: usersByUsername.get("Tyler")._id, direction: "down" }
        );
        helpfulCount = -2;
      }

      reviewDocs.push({
        title: review.reviewTitle,
        body: review.reviewMessage,
        rating: review.rating,
        helpfulCount,
        votes,
        isAnonymous,
        ownerResponse,
        author: author._id,
        restaurant: restaurant._id,
        createdAt: new Date(review.createdAt),
        updatedAt: new Date(review.createdAt),
      });
    }
  }

  reviewDocs.push({
    title: "Rated 4/5",
    body: "",
    rating: 4,
    helpfulCount: 1,
    votes: [
      { user: usersByUsername.get("Tyler")._id, direction: "up" },
    ],
    isAnonymous: true,
    ownerResponse: {
      body: "Thanks for dropping by El Poco Cantina. We appreciate the quick rating and hope to see you again soon.",
      respondedAt: new Date("2026-02-16T12:30:00.000Z"),
      updatedAt: new Date("2026-02-16T12:30:00.000Z"),
    },
    author: usersByUsername.get("AniMonstah123")._id,
    restaurant: restaurantsById.get("rest0007")._id,
    createdAt: new Date("2026-02-16T12:00:00.000Z"),
    updatedAt: new Date("2026-02-16T12:00:00.000Z"),
  });

  await Review.insertMany(reviewDocs);

  for (const restaurant of restaurants) {
    const matchingReviews = reviewDocs.filter((review) => String(review.restaurant) === String(restaurant._id));
    if (!matchingReviews.length) {
      continue;
    }

    const totalRating = matchingReviews.reduce((sum, review) => sum + review.rating, 0);
    await Restaurant.findByIdAndUpdate(restaurant._id, {
      rating: Number((totalRating / matchingReviews.length).toFixed(1)),
      reviewCount: matchingReviews.length,
    });
  }

  const restaurantsByRestaurantId = new Map(restaurants.map((restaurant) => [restaurant.restaurantId, restaurant]));
  await OwnerRequest.insertMany([
    {
      user: primaryOwner._id,
      restaurant: restaurantsByRestaurantId.get("rest0001")._id,
      contactDetails: "campusfoodowner@example.com / 09170000001",
      message: "Ready to reply to customer feedback for 24 Chicken.",
      status: "approved",
      reviewedBy: primaryAdmin._id,
      reviewedAt: new Date("2026-03-03T09:00:00.000Z"),
      createdAt: new Date("2026-03-02T09:00:00.000Z"),
      updatedAt: new Date("2026-03-03T09:00:00.000Z"),
    },
    {
      user: primaryOwner._id,
      restaurant: restaurantsByRestaurantId.get("rest0004")._id,
      contactDetails: "campusfoodowner@example.com / 09170000001",
      message: "Also handling responses for Royaltea.",
      status: "approved",
      reviewedBy: primaryAdmin._id,
      reviewedAt: new Date("2026-03-04T11:30:00.000Z"),
      createdAt: new Date("2026-03-03T11:30:00.000Z"),
      updatedAt: new Date("2026-03-04T11:30:00.000Z"),
    },
    {
      user: usersByUsername.get("Tyler")._id,
      restaurant: restaurantsByRestaurantId.get("rest0002")._id,
      contactDetails: "tyler-owner@example.com / 09171234567",
      message: "Submitted business contact details for Prelude.",
      status: "pending",
      createdAt: new Date("2026-03-08T10:00:00.000Z"),
      updatedAt: new Date("2026-03-08T10:00:00.000Z"),
    },
    {
      user: usersByUsername.get("NotoMaki")._id,
      restaurant: restaurantsByRestaurantId.get("rest0003")._id,
      contactDetails: "notomaki-owner@example.com / 09179876543",
      message: "Would like admin approval to manage Tinuhog.",
      status: "pending",
      createdAt: new Date("2026-03-09T08:15:00.000Z"),
      updatedAt: new Date("2026-03-09T08:15:00.000Z"),
    },
    {
      user: usersByUsername.get("Artrytease")._id,
      restaurant: restaurantsByRestaurantId.get("rest0006")._id,
      contactDetails: "artrytease@example.com / 09178888888",
      message: "Initial request lacked enough supporting contact details.",
      status: "rejected",
      reviewedBy: primaryAdmin._id,
      reviewedAt: new Date("2026-03-07T16:45:00.000Z"),
      createdAt: new Date("2026-03-06T16:45:00.000Z"),
      updatedAt: new Date("2026-03-07T16:45:00.000Z"),
    },
  ]);

  console.log(`Seeded ${users.length + ownerUsers.length + adminUsers.length} users, ${restaurants.length} restaurants, ${reviewDocs.length} reviews.`);
  console.log("Sample login email: animonstah123@example.com");
  console.log("Sample login password: password123");
  console.log("Sample owner login email: campusfoodowner@example.com");
  console.log("Sample owner login username: campusfoodowner");
  console.log("Owner password: password123");
  console.log("Sample admin login email: animoadmin@example.com");
  console.log("Sample admin login username: animoadmin");
  console.log("Admin password: password123");
  process.exit(0);
})();
