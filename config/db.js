const mongoose = require("mongoose");

module.exports = async function connectDB() {
  try {
    mongoose.connection.on("disconnected", () => {
      console.error("MongoDB disconnected. Make sure your MongoDB server is still running.");
    });

    mongoose.connection.on("error", (error) => {
      console.error("MongoDB runtime error:", error.message);
    });

    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/animo-eats", {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};
