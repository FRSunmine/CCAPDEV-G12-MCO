const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createPendingOwnerRequest, getOwnerRequestRestaurants, validateOwnerRequestSubmission } = require("../services/ownerRequestService");
const { validateAccountInput } = require("../services/validationService");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function renderRegisterPage(res, { error, formData }) {
  const restaurants = await getOwnerRequestRestaurants();

  return res.status(400).render("auth/register", {
    title: "Register",
    error,
    restaurants,
    formData,
  });
}

function createSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        return reject(error);
      }

      req.session.userId = userId.toString();
      return resolve();
    });
  });
}

function renderLoginPage(res, { error, identifier = "" }) {
  return res.status(400).render("auth/login", {
    title: "Login",
    error,
    formData: {
      identifier,
    },
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

    const accountValidationError = validateAccountInput({
      firstName,
      lastName,
      username,
      email,
      password,
      bio,
    });

    if (accountValidationError) {
      return renderRegisterPage(res, {
        error: accountValidationError,
        formData,
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username: new RegExp(`^${escapeRegex(username)}$`, "i") }],
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
        message: ownerRequestMessage,
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

    await createSession(req, user._id);
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
      return renderLoginPage(res, {
        error: "Please enter both your username/email and password.",
        identifier,
      });
    }

    const normalizedIdentifier = identifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { username: new RegExp(`^${escapeRegex(identifier)}$`, "i") },
      ],
    });
    if (!user) {
      return renderLoginPage(res, {
        error: "Invalid credentials.",
        identifier,
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return renderLoginPage(res, {
        error: "Invalid credentials.",
        identifier,
      });
    }

    await createSession(req, user._id);
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

    res.clearCookie("animo.sid");
    return res.redirect("/login");
  });
};
