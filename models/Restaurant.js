const { Schema, model } = require("mongoose");

const restaurantSchema = new Schema({
  restaurantId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
  cuisineTypes: [{ type: String, required: true }],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  priceRange: { type: String, required: true },
  previewDescription: { type: String, required: true },
  imageSrc: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
});

module.exports = model("Restaurant", restaurantSchema);
