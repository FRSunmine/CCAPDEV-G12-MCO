const { Schema, model } = require("mongoose");

const voteSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  direction: { type: String, enum: ["up", "down"], required: true },
}, { _id: false });

const reviewSchema = new Schema({
  title: { type: String, trim: true, default: "", maxlength: 80 },
  body: { type: String, trim: true, default: "", maxlength: 1000 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  helpfulCount: { type: Number, default: 0 },
  votes: { type: [voteSchema], default: [] },
  isAnonymous: { type: Boolean, default: false },
  ownerResponse: {
    body: { type: String, trim: true, default: "", maxlength: 600 },
    respondedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
  },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  images: { type: [String], default: [] },
  videos: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

reviewSchema.index({ restaurant: 1, createdAt: -1 });
reviewSchema.index({ restaurant: 1, author: 1 }, { unique: true });

module.exports = model("Review", reviewSchema);
