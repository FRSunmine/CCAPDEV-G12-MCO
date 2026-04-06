const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { createPendingOwnerRequest, getOwnerRequestRestaurants, validateOwnerRequestSubmission } = require("../services/ownerRequestService");
const {
  validateAccountInput,
  validateEmail,
  validatePasswordResetInput,
} = require("../services/validationService");
const {
  buildPasswordResetUrl,
  findUserByPasswordResetToken,
  issuePasswordResetToken,
  shouldExposePasswordResetLinks,
} = require("../services/passwordResetService");

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
    success: null,
    formData: {
      identifier,
    },
  });
}

function renderForgotPasswordPage(res, { error = null, success = null, email = "", resetUrl = null }) {
  return res.status(error ? 400 : 200).render("auth/forgot-password", {
    title: "Forgot Password",
    error,
    success,
    resetUrl,
    formData: {
      email,
    },
  });
}

function renderResetPasswordPage(res, { token, error = null, isInvalidToken = false }) {
  return res.status(error ? 400 : 200).render("auth/reset-password", {
    title: "Reset Password",
    token,
    error,
    isInvalidToken,
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      return resolve();
    }

    return req.session.destroy((error) => {
      if (error) {
        return reject(error);
      }

      return resolve();
    });
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

exports.getForgotPasswordPage = (req, res) => {
  return renderForgotPasswordPage(res, {});
};

exports.requestPasswordReset = async (req, res, next) => {
  try {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
    const emailError = validateEmail(email);

    if (emailError) {
      return renderForgotPasswordPage(res, {
        error: emailError,
        email,
      });
    }

    const successMessage = "If an account with that email exists, a password reset link is now ready.";
    const user = await User.findOne({ email });
    let resetUrl = null;

    if (user) {
      const { rawToken, expiresAt } = await issuePasswordResetToken(user);
      resetUrl = buildPasswordResetUrl(req, rawToken);
      console.log(
        `[password-reset] ${user.email} -> ${resetUrl} (expires ${expiresAt.toISOString()})`
      );
    }

    return renderForgotPasswordPage(res, {
      success: successMessage,
      email,
      resetUrl: user && shouldExposePasswordResetLinks() ? resetUrl : null,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getResetPasswordPage = async (req, res, next) => {
  try {
    const token = req.params.token ? String(req.params.token).trim() : "";
    const user = await findUserByPasswordResetToken(token);

    if (!user) {
      return renderResetPasswordPage(res, {
        token,
        error: "This password reset link is invalid or has expired. Request a new one to continue.",
        isInvalidToken: true,
      });
    }

    return renderResetPasswordPage(res, {
      token,
      isInvalidToken: false,
    });
  } catch (error) {
    return next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token ? String(req.params.token).trim() : "";
    const user = await findUserByPasswordResetToken(token);

    if (!user) {
      return renderResetPasswordPage(res, {
        token,
        error: "This password reset link is invalid or has expired. Request a new one to continue.",
        isInvalidToken: true,
      });
    }

    const password = req.body.password || "";
    const confirmPassword = req.body.confirmPassword || "";
    const validationError = validatePasswordResetInput({ password, confirmPassword });

    if (validationError) {
      return renderResetPasswordPage(res, {
        token,
        error: validationError,
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    await destroySession(req);
    res.clearCookie("animo.sid");
    return res.redirect("/login?success=password-reset");
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
