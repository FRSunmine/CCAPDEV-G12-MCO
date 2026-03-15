const { Schema, model } = require("mongoose");

const userSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  role: { type: String, enum: ["user", "owner", "admin"], default: "user" },
  handle: {
    type: String,
    trim: true,
    default: function defaultHandle() {
      return `@${this.username}`;
    },
  },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  bio: { type: String, default: "Food lover near DLSU." },
  profilePic: { type: String, default: "/img/default_profile.png" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model("User", userSchema);
