const bcrypt = require("bcryptjs");
const User = require("../models/User");

exports.register = async (req, res, next) => {
  try {
    const firstName = req.body.firstName ? req.body.firstName.trim() : "";
    const lastName = req.body.lastName ? req.body.lastName.trim() : "";
    const username = req.body.username ? req.body.username.trim() : "";
    const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password || "";
    const bio = req.body.bio ? req.body.bio.trim() : "";

    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Please fill in all required fields.",
        formData: { firstName, lastName, username, email, bio },
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).render("register", {
        title: "Register",
        error: "Email or username already exists.",
        formData: { firstName, lastName, username, email, bio },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      username,
      handle: `@${username}`,
      email,
      password: passwordHash,
      bio: bio || undefined,
    });

    req.session.userId = user._id.toString();
    return res.redirect(`/profile/${user.username}`);
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).render("login", {
        title: "Login",
        error: "Please enter both email and password.",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render("login", {
        title: "Login",
        error: "Invalid credentials.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).render("login", {
        title: "Login",
        error: "Invalid credentials.",
      });
    }

    req.session.userId = user._id.toString();
    return res.redirect(`/profile/${user.username}`);
  } catch (error) {
    return next(error);
  }
};

exports.logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    return res.redirect("/login");
  });
};
