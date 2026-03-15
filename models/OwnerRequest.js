const { Schema, model } = require("mongoose");

const ownerRequestSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  contactDetails: { type: String, required: true, trim: true },
  message: { type: String, trim: true, default: "" },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

ownerRequestSchema.index({ user: 1, restaurant: 1, status: 1 });

module.exports = model("OwnerRequest", ownerRequestSchema);
