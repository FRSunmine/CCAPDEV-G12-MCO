const router = require("express").Router();

const pageController = require("../controllers/pageController");
const ownerRequestController = require("../controllers/ownerRequestController");
const profileController = require("../controllers/profileController");
const requireAuth = require("../middleware/requireAuth");

router.get("/", pageController.getWelcomePage);
router.get("/welcome", pageController.getWelcomePage);
router.get("/login", pageController.getLoginPage);
router.get("/register", pageController.getRegisterPage);
router.get("/about", pageController.getAboutPage);
router.get("/contact", pageController.getContactPage);
router.get("/admin-support", pageController.getContactPage);
router.post("/admin-support/owner-request", requireAuth, ownerRequestController.create);
router.get("/edit-profile", requireAuth, pageController.getEditProfilePage);
router.post("/edit-profile", requireAuth, profileController.updateProfile);
router.get("/profile", requireAuth, (req, res) => {
  res.redirect(`/profile/${req.currentUser.username}`);
});
router.get("/profile/:username", pageController.getProfilePage);

module.exports = router;
