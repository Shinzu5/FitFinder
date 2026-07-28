import { Router } from "express";
import { purchaseSubscription, getMyPlan } from "../controllers/subscription.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/purchase", authenticate, purchaseSubscription);
router.get("/my-plan", authenticate, getMyPlan);

export default router;
