// npm install express

const express = require("express");
const exphbs = require("express-handlebars");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const hbs = exphbs.create({
  extname: "hbs",
  helpers: {
    formatDate: function (dateString) {
      const date = new Date(dateString);
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      return date.toLocaleString("en-US", options);
    }
  }
});

// Configure Handlebars
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Serve everything inside /public
app.use(express.static(path.join(__dirname, "public")));

// Load restaurant list
const restaurantListPath = path.join(__dirname, "public", "processes", "restaurant_list.json");
const restaurantList = JSON.parse(fs.readFileSync(restaurantListPath, "utf8"));

// Load users database once
const users = require(path.join(__dirname, "public", "data", "users", "users.json")).users;

// Helper to resolve profile picture safely
function resolveProfilePic(profilePicPath) {
  const normalizedPath = path.join(__dirname, "public", profilePicPath.replace(/^(\.\.\/)+/, ""));
  // Check if file exists
  if (fs.existsSync(normalizedPath)) {
    return profilePicPath.replace(/^(\.\.\/)+/, "/");
  } else {
    return "/img/default_profile.png";
  }
}


// Dynamic route for reviews
app.get("/pages/restaurants/:id", (req, res) => {
  const restaurantId = req.params.id;
  const restaurant = restaurantList.find(r => r.id === restaurantId);

  if (!restaurant) {
    return res.status(404).send("Restaurant not found");
  }

  const reviewsFile = path.join(__dirname, "public", "data", `${restaurantId}_reviews.json`);
  let reviewsData = [];

  if (fs.existsSync(reviewsFile)) {
    reviewsData = JSON.parse(fs.readFileSync(reviewsFile, "utf8"));
  }

  const enrichedReviews = reviewsData.map(r => {
    const user = users.find(u => u.username === r.user);
    return {
      ...r,
      profilePic: user ? resolveProfilePic(user.profilePic) : "/img/default_profile.png"
    };
  });

  res.render("review-template", {
    layout: "main",
    restaurant,
    reviews: enrichedReviews,
    hasReviews: enrichedReviews.length > 0
  });
});

// ADDED PROFILE ROUTE 
app.get("/pages/profile/:username", (req, res) => {
  const username = req.params.username;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(404).send("User not found");

  const profile = { ...user, profilePic: resolveProfilePic(user.profilePic || "") };

  const dataDir = path.join(__dirname, "public", "data");
  const files = fs.readdirSync(dataDir);
  const userReviews = [];

  files.forEach(fname => {
    const m = fname.match(/^(rest\d+)_reviews\.json$/);
    if (!m) return;
    const restaurantId = m[1];
    const reviews = JSON.parse(fs.readFileSync(path.join(dataDir, fname), "utf8"));
    reviews.forEach(r => {
      if (r.user === username || r.userID === user.userID) {
        const restaurant = restaurantList.find(rt => rt.id === restaurantId);
        userReviews.push({
          ...r,
          restaurant: restaurant ? {
            id: restaurant.id,
            name: restaurant.name,
            image_src: restaurant.image_src,
            reviews_url: restaurant.reviews_url
          } : null
        });
      }
    });
  });

  res.render("profile-template", {
    layout: "main",
    profile,
    reviews: userReviews,
    reviewsCount: userReviews.length
  });
});

// Endpoint for JSON data
app.get("/restaurants", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "processes", "restaurant_list.json"));
});

// Default route → serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});