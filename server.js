const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const session = require("express-session");

const connectDB = require("./config/db");
const loadCurrentUser = require("./middleware/loadCurrentUser");
const adminRoutes = require("./routes/adminRoutes");
const pageRoutes = require("./routes/pageRoutes");
const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const hbs = exphbs.create({
  extname: "hbs",
  defaultLayout: "main",
  helpers: {
    eq: (a, b) => a === b,
    includes: (arr, val) => Array.isArray(arr) && arr.includes(val),
    json: (context) => JSON.stringify(context),

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    },
    eq(left, right) {
      return left === right;
    },
    includes(list, value) {
      return Array.isArray(list) && list.includes(value);
    },
  },
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "animo-eats-dev-secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(loadCurrentUser);
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.get("/pages/contact", (req, res) => {
  res.render("contact", { layout: "main", title: "Contact" });
});

app.use("/admin", adminRoutes);
app.use("/", pageRoutes);
app.use("/auth", authRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/reviews", reviewRoutes);

app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === "MongoServerSelectionError") {
    return res.status(503).render("503", {
      title: "Database Unavailable",
      errorMessage: "MongoDB is not reachable right now. Start MongoDB and reload the page.",
    });
  }

  return res.status(500).render("500", { title: "Server Error" });
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
