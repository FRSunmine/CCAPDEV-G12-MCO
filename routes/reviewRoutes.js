const router = require("express").Router();

const reviewController = require("../controllers/reviewController");
const requireAuth = require("../middleware/requireAuth");

router.post("/", requireAuth, reviewController.create);
router.post("/:reviewId/edit", requireAuth, reviewController.update);
router.post("/:reviewId/delete", requireAuth, reviewController.remove);

module.exports = router;
