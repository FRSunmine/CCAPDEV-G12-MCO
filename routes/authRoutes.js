const router = require("express").Router();

const authController = require("../controllers/authController");

router.get("/forgot-password", authController.getForgotPasswordPage);
router.post("/forgot-password", authController.requestPasswordReset);
router.get("/reset-password/:token", authController.getResetPasswordPage);
router.post("/reset-password/:token", authController.resetPassword);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

module.exports = router;
