const { Schema, model } = require("mongoose");

const voteSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  direction: { type: String, enum: ["up", "down"], required: true }
}, { _id: false });

const reviewSchema = new Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  helpfulCount: { type: Number, default: 0 },
  votes: { type: [voteSchema], default: [] },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },

  // new optional media fields
  images: { type: [String], default: [] }, // store relative paths like "reviews/img/abc.jpg"
  videos: { type: [String], default: [] }, // store relative paths like "reviews/vid/xyz.mp4"

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

reviewSchema.index({ restaurant: 1, createdAt: -1 });

module.exports = model("Review", reviewSchema);
