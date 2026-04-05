const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createPendingOwnerRequest, getOwnerRequestRestaurants, validateOwnerRequestSubmission } = require("../services/ownerRequestService");

async function renderRegisterPage(res, { error, formData }) {
  const restaurants = await getOwnerRequestRestaurants();

  return res.status(400).render("auth/register", {
    title: "Register",
    error,
    restaurants,
    formData,
  });
}

exports.register = async (req, res, next) => {
  try {
    const firstName = req.body.firstName ? req.body.firstName.trim() : "";
    const lastName = req.body.lastName ? req.body.lastName.trim() : "";
    const username = req.body.username ? req.body.username.trim() : "";
    const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password || "";
    const bio = req.body.bio ? req.body.bio.trim() : "";
    const isOwnerRequest = req.body.isOwnerRequest === "on";
    const ownerRestaurantId = req.body.ownerRestaurantId ? req.body.ownerRestaurantId.trim() : "";
    const ownerContactDetails = req.body.ownerContactDetails ? req.body.ownerContactDetails.trim() : "";
    const ownerRequestMessage = req.body.ownerRequestMessage ? req.body.ownerRequestMessage.trim() : "";
    const formData = {
      firstName,
      lastName,
      username,
      email,
      bio,
      isOwnerRequest,
      ownerRestaurantId,
      ownerContactDetails,
      ownerRequestMessage,
    };

    if (!firstName || !lastName || !username || !email || !password) {
      return renderRegisterPage(res, {
        error: "Please fill in all required fields.",
        formData,
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return renderRegisterPage(res, {
        error: "Email or username already exists.",
        formData,
      });
    }

    if (isOwnerRequest) {
      const validation = await validateOwnerRequestSubmission({
        restaurantId: ownerRestaurantId,
        contactDetails: ownerContactDetails,
      });

      if (validation.error) {
        return renderRegisterPage(res, {
          error: validation.error,
          formData,
        });
      }
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

    if (isOwnerRequest) {
      const createdRequest = await createPendingOwnerRequest({
        userId: user._id,
        restaurantId: ownerRestaurantId,
        contactDetails: ownerContactDetails,
        message: ownerRequestMessage,
      });

      if (createdRequest.error) {
        return renderRegisterPage(res, {
          error: createdRequest.error,
          formData,
        });
      }
    }

    req.session.userId = user._id.toString();
    return res.redirect(`/profile/${user.username}`);
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const identifier = req.body.identifier
      ? req.body.identifier.trim()
      : req.body.email
        ? req.body.email.trim()
        : "";
    const password = req.body.password || "";

    if (!identifier || !password) {
      return res.status(400).render("auth/login", {
        title: "Login",
        error: "Please enter both your username/email and password.",
      });
    }

    const normalizedIdentifier = identifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: identifier },
      ],
    });
    if (!user) {
      return res.status(400).render("auth/login", {
        title: "Login",
        error: "Invalid credentials.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).render("auth/login", {
        title: "Login",
        error: "Invalid credentials.",
      });
    }

    req.session.userId = user._id.toString();
    return res.redirect(user.role === "admin" ? "/admin" : `/profile/${user.username}`);
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
