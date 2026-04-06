const { Schema, model } = require("mongoose");

const usernamePattern = /^[A-Za-z0-9_]{3,20}$/;

const userSchema = new Schema({
  firstName: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  lastName: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: usernamePattern,
  },
  role: { type: String, enum: ["user", "owner", "admin"], default: "user" },
  handle: {
    type: String,
    trim: true,
    default: function defaultHandle() {
      return `@${this.username}`;
    },
  },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  password: { type: String, required: true },
  bio: { type: String, default: "Food lover near DLSU.", maxlength: 280 },
  profilePic: { type: String, default: "/img/default_profile.png", trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model("User", userSchema);
