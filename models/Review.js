const { Schema, model } = require("mongoose");

const reviewSchema = new Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  helpfulCount: { type: Number, default: 0 },
  votes: [{
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    direction: { type: String, enum: ["up", "down"], required: true }
  }],
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

reviewSchema.index({ restaurant: 1, createdAt: -1 });

module.exports = model("Review", reviewSchema);