require("dotenv").config();

const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const connectDB = require("./config/db");
const loadCurrentUser = require("./middleware/loadCurrentUser");
const adminRoutes = require("./routes/adminRoutes");
const pageRoutes = require("./routes/pageRoutes");
const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/animo-eats";
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? null : "animo-eats-dev-secret");

if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set before starting the app in production.");
}

app.disable("x-powered-by");

const hbs = exphbs.create({
  extname: "hbs",
  defaultLayout: "main",
  helpers: {
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
    gt(left, right) {
      return left > right;
    },
  },
});

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.disable("x-powered-by");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  session({
    name: "animo.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      collectionName: "sessions",
      mongoOptions: {
        serverSelectionTimeoutMS: 5000,
      },
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
    },
  })
);
app.use(loadCurrentUser);
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.get("/index.html", (req, res) => {
  res.redirect("/");
});
app.use("/archived_pages", (req, res) => {
  res.status(404).render("pages/404", { title: "Page Not Found" });
});
app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.get("/pages/contact", (req, res) => {
  res.redirect("/contact");
});

app.use("/admin", adminRoutes);
app.use("/", pageRoutes);
app.use("/auth", authRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/reviews", reviewRoutes);

app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Page Not Found" });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === "MongoServerSelectionError") {
    return res.status(503).render("pages/503", {
      title: "Database Unavailable",
      errorMessage: "MongoDB is not reachable right now. Check your MONGODB_URI and database server.",
    });
  }

  if (err.name === "MulterError" || err.message === "Unsupported file type") {
    return res.status(400).render("pages/400", {
      title: "Invalid Upload",
      errorMessage: "Upload up to 3 images or 1 video. Unsupported file types and oversized files are blocked.",
    });
  }

  return res.status(500).render("pages/500", { title: "Server Error" });
});

async function startServer() {
  await connectDB();
  return app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
};
