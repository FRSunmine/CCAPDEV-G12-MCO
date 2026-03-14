const router = require("express").Router();

const restaurantController = require("../controllers/restaurantController");

router.get("/", restaurantController.getRestaurantListPage);
router.get("/:restaurantId", restaurantController.getRestaurantPage);

module.exports = router;
