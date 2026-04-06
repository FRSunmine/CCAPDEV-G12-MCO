// routes/reviewRoutes.js
const router = require("express").Router();

const reviewController = require("../controllers/reviewController");
const requireAuth = require("../middleware/requireAuth");
const upload = require("../middleware/uploadReviewMedia"); // multer instance

// Create review: require auth, accept optional media, then call unified create handler
router.post(
  "/",
  requireAuth,
  upload.fields([{ name: "images", maxCount: 3 }, { name: "video", maxCount: 1 }]),
  reviewController.create
);

router.post("/:reviewId/vote", requireAuth, reviewController.vote);
router.post("/:reviewId/respond", requireAuth, reviewController.respond);
router.post("/:reviewId/response/delete", requireAuth, reviewController.removeResponse);
router.post("/:reviewId/edit", requireAuth, reviewController.update);
router.post("/:reviewId/delete", requireAuth, reviewController.remove);

module.exports = router;
