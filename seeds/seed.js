const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const connectDB = require("../config/db");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");

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
  await Promise.all([Review.deleteMany({}), Restaurant.deleteMany({}), User.deleteMany({})]);

  const rawUsers = readJson("public", "data", "users", "users.json").users;
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = await User.insertMany(
    rawUsers.map((user) => ({
      firstName: user.username,
      lastName: "User",
      username: user.username,
      handle: user.handle || `@${user.username}`,
      email: user.email.toLowerCase(),
      password: passwordHash,
      bio: user.bio || "Food lover near DLSU.",
      profilePic: resolveProfilePic(user.profilePic),
      createdAt: new Date(user.accountCreated),
    }))
  );

  const usersByUsername = new Map(users.map((user) => [user.username, user]));
  const rawRestaurants = readJson("public", "processes", "restaurant_list.json");

  const restaurants = await Restaurant.insertMany(
    rawRestaurants.map((restaurant) => ({
      restaurantId: restaurant.id,
      name: restaurant.name,
      location: restaurant.location,
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

      reviewDocs.push({
        title: review.reviewTitle,
        body: review.reviewMessage,
        rating: review.rating,
        helpfulCount: review.howHelpfulCount || 0,
        author: author._id,
        restaurant: restaurant._id,
        createdAt: new Date(review.createdAt),
        updatedAt: new Date(review.createdAt),
      });
    }
  }

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

  console.log(`Seeded ${users.length} users, ${restaurants.length} restaurants, ${reviewDocs.length} reviews.`);
  console.log("Sample login email: animonstah123@example.com");
  console.log("Sample login password: password123");
  process.exit(0);
})();
