const { createPendingOwnerRequest } = require("../services/ownerRequestService");

exports.create = async (req, res, next) => {
  try {
    const restaurantId = req.body.restaurantId ? req.body.restaurantId.trim() : "";
    const contactDetails = req.body.contactDetails ? req.body.contactDetails.trim() : "";
    const message = req.body.message ? req.body.message.trim() : "";

    const createdRequest = await createPendingOwnerRequest({
      userId: req.currentUser._id,
      restaurantId,
      contactDetails,
      message,
    });

    if (createdRequest.error) {
      const params = new URLSearchParams();
      if (restaurantId) {
        params.set("restaurantId", restaurantId);
      }
      params.set("error", createdRequest.error);
      params.set("contactDetails", contactDetails);
      params.set("message", message);
      return res.redirect(`/admin-support?${params.toString()}`);
    }

    return res.redirect(`/admin-support?restaurantId=${createdRequest.restaurant.restaurantId}&success=owner-request`);
  } catch (error) {
    return next(error);
  }
};
