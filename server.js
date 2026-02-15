// npm install express

const express = require("express");
const exphbs = require('express-handlebars')
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

const restaurantListPath = path.join(__dirname, "public", "processes", "restaurant_list.json");
const restaurantList = JSON.parse(fs.readFileSync(restaurantListPath, "utf8"));

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


  //const reviewsData = JSON.parse(fs.readFileSync(reviewsFile, "utf8"));

  res.render("review-template", {
    layout: "main",
    restaurant,
    reviews: reviewsData,
    hasReviews: reviewsData.length > 0
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