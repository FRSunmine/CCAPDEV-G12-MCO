const { Schema, model } = require("mongoose");

const reviewSchema = new Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  helpfulCount: { type: Number, default: 0 },
  ownerResponse: {
    body: { type: String, trim: true, default: "" },
    respondedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
  },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

reviewSchema.index({ restaurant: 1, createdAt: -1 });

module.exports = model("Review", reviewSchema);
