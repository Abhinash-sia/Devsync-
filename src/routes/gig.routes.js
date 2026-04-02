import { Router } from "express";
import {
  createGig,
  getActiveGigs,
  toggleLikeGig,
  deleteGig,
} from "../controllers/gig.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getActiveGigs).post(createGig);
router.route("/:gigId/like").patch(toggleLikeGig);
router.route("/:gigId").delete(deleteGig);

export default router;