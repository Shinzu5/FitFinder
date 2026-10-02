import { Router } from "express";
import { getMyPlan } from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/auth-middleware";

const router = Router();

router.get("/my-plan", authenticate, getMyPlan);

export default router;
