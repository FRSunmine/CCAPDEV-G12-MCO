const router = require("express").Router();

const adminController = require("../controllers/adminController");
const requireAdmin = require("../middleware/requireAdmin");

router.get("/", requireAdmin, adminController.getDashboard);
router.post("/owner-requests/:requestId/approve", requireAdmin, adminController.approveOwnerRequest);
router.post("/owner-requests/:requestId/reject", requireAdmin, adminController.rejectOwnerRequest);
router.post("/ownership/assign", requireAdmin, adminController.assignOwner);
router.post("/ownership/:restaurantId/remove", requireAdmin, adminController.removeOwner);

module.exports = router;
