import { Router } from "express";
import SubscriptionController from "@/controllers/subscription.controller";
import { authenticate } from "@/middlewares/auth";

const router = Router();

router.post("/purchase", authenticate, SubscriptionController.purchaseSubscription);
router.get("/my-plan", authenticate, SubscriptionController.getMyPlan);

export default router;
