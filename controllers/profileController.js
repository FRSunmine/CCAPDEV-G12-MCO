const User = require("../models/User");

exports.updateProfile = async (req, res, next) => {
  try {
    const firstName = req.body.firstName ? req.body.firstName.trim() : "";
    const lastName = req.body.lastName ? req.body.lastName.trim() : "";
    const username = req.body.username ? req.body.username.trim() : "";
    const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
    const bio = req.body.bio ? req.body.bio.trim() : "";
    const profilePic = req.body.profilePic ? req.body.profilePic.trim() : "";

    if (!firstName || !lastName || !username || !email) {
      return res.status(400).render("user/edit-profile", {
        title: "Edit Profile",
        error: "Please fill in all required fields.",
        formData: { firstName, lastName, username, email, bio, profilePic },
      });
    }

    const existingUser = await User.findOne({
      _id: { $ne: req.session.userId },
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).render("user/edit-profile", {
        title: "Edit Profile",
        error: "That username or email is already being used.",
        formData: { firstName, lastName, username, email, bio, profilePic },
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.redirect("/login?error=Please%20log%20in%20again.");
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.username = username;
    user.handle = `@${username}`;
    user.email = email;
    user.bio = bio || "Food lover near DLSU.";
    user.profilePic = profilePic || "/img/default_profile.png";

    await user.save();

    return res.redirect(`/profile/${user.username}`);
  } catch (error) {
    return next(error);
  }
};
