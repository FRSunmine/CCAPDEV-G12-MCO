const NAME_REGEX = /^[A-Za-z][A-Za-z\s'.-]{1,39}$/;
const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PUBLIC_ASSET_PATH_REGEX = /^\/(?:img|reviews)\/[A-Za-z0-9/_\-.]+$/;

function validateName(label, value) {
  if (!value) {
    return `${label} is required.`;
  }

  if (!NAME_REGEX.test(value)) {
    return `${label} must be 2-40 characters and use letters, spaces, apostrophes, periods, or hyphens only.`;
  }

  return null;
}

function validateUsername(value) {
  if (!value) {
    return "Username is required.";
  }

  if (!USERNAME_REGEX.test(value)) {
    return "Username must be 3-20 characters and use letters, numbers, or underscores only.";
  }

  return null;
}

function validateEmail(value) {
  if (!value) {
    return "Email is required.";
  }

  if (value.length > 120 || !EMAIL_REGEX.test(value)) {
    return "Enter a valid email address.";
  }

  return null;
}

function validatePassword(value) {
  if (!value) {
    return "Password is required.";
  }

  if (value.length < 8 || value.length > 72) {
    return "Password must be 8-72 characters long.";
  }

  return null;
}

function validatePasswordResetInput({ password, confirmPassword }) {
  const passwordError = validatePassword(password);
  if (passwordError) {
    return passwordError;
  }

  if (!confirmPassword) {
    return "Please confirm your new password.";
  }

  if (password !== confirmPassword) {
    return "Password confirmation does not match.";
  }

  return null;
}

function validateBio(value) {
  if ((value || "").length > 280) {
    return "Bio must be 280 characters or fewer.";
  }

  return null;
}

function validateProfilePicPath(value) {
  if (!value) {
    return null;
  }

  if (!PUBLIC_ASSET_PATH_REGEX.test(value)) {
    return "Profile picture must use a local public path such as /img/... or /reviews/....";
  }

  return null;
}

function validateAccountInput({ firstName, lastName, username, email, password, bio = "", profilePic = "" }) {
  return (
    validateName("First name", firstName) ||
    validateName("Last name", lastName) ||
    validateUsername(username) ||
    validateEmail(email) ||
    (typeof password === "string" && password.length > 0 ? validatePassword(password) : null) ||
    validateBio(bio) ||
    validateProfilePicPath(profilePic)
  );
}

function validateOwnerRequestDetails({ contactDetails, message }) {
  if (!contactDetails) {
    return "Please provide contact details for the owner request.";
  }

  if (contactDetails.length > 120) {
    return "Owner contact details must be 120 characters or fewer.";
  }

  if ((message || "").length > 400) {
    return "Owner request notes must be 400 characters or fewer.";
  }

  return null;
}

function validateSearchFilters({ q, minRating }) {
  if ((q || "").length > 80) {
    return "Search terms must be 80 characters or fewer.";
  }

  if (minRating && (!Number.isInteger(Number(minRating)) || Number(minRating) < 1 || Number(minRating) > 5)) {
    return "Minimum rating must be between 1 and 5.";
  }

  return null;
}

function validateReviewInput({ title, body, rating }) {
  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    return { error: "Choose a rating from 1 to 5.", value: null };
  }

  if ((title || "").length > 80) {
    return { error: "Review title must be 80 characters or fewer.", value: null };
  }

  if ((body || "").length > 1000) {
    return { error: "Review text must be 1000 characters or fewer.", value: null };
  }

  const normalizedTitle = title && title.trim() ? title.trim() : `Rated ${Number(rating)}/5`;
  const normalizedBody = body ? body.trim() : "";

  return {
    error: null,
    value: {
      title: normalizedTitle,
      body: normalizedBody,
      rating: Number(rating),
    },
  };
}

function validateOwnerResponse(value) {
  if (!value) {
    return "Owner response cannot be empty.";
  }

  if (value.length > 600) {
    return "Owner response must be 600 characters or fewer.";
  }

  return null;
}

function summarizeReviewVotes(reviews) {
  return reviews.reduce((summary, review) => {
    const helpfulVotesReceived = summary.helpfulVotesReceived + (
      Array.isArray(review.votes) ? review.votes.filter((vote) => vote.direction === "up").length : 0
    );
    const unhelpfulVotesReceived = summary.unhelpfulVotesReceived + (
      Array.isArray(review.votes) ? review.votes.filter((vote) => vote.direction === "down").length : 0
    );

    return {
      helpfulScore: summary.helpfulScore + (review.helpfulCount || 0),
      helpfulVotesReceived,
      unhelpfulVotesReceived,
    };
  }, {
    helpfulScore: 0,
    helpfulVotesReceived: 0,
    unhelpfulVotesReceived: 0,
  });
}

function getCritiqueLevel({ reviewCount, helpfulScore }) {
  if (reviewCount >= 8 || helpfulScore >= 25) {
    return "Top Food Critic";
  }

  if (reviewCount >= 5 || helpfulScore >= 15) {
    return "Trusted Reviewer";
  }

  if (reviewCount >= 2 || helpfulScore >= 5) {
    return "Campus Regular";
  }

  return "Curious Taster";
}

module.exports = {
  getCritiqueLevel,
  summarizeReviewVotes,
  validateAccountInput,
  validateEmail,
  validateOwnerRequestDetails,
  validateOwnerResponse,
  validatePassword,
  validatePasswordResetInput,
  validateReviewInput,
  validateSearchFilters,
};
