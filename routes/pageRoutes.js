const router = require("express").Router();

const pageController = require("../controllers/pageController");
const requireAuth = require("../middleware/requireAuth");

router.get("/", pageController.getWelcomePage);
router.get("/welcome", pageController.getWelcomePage);
router.get("/login", pageController.getLoginPage);
router.get("/register", pageController.getRegisterPage);
router.get("/profile", requireAuth, (req, res) => {
  res.redirect(`/profile/${req.currentUser.username}`);
});
router.get("/profile/:username", pageController.getProfilePage);

module.exports = router;
