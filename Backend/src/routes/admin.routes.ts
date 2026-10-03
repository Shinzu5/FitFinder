import { Router } from "express";
import AdminController from "@/controllers/admin.controller";
import { authenticate } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/requireRole";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole("ADMIN"));

router.get("/dashboard", AdminController.getDashboard);
router.get("/gyms", AdminController.getAdminGyms);
router.get("/analytics", AdminController.getAnalytics);
router.get("/users", AdminController.getUsers);
router.get("/users/:id", AdminController.getUserDetail);
router.delete("/users/:id", AdminController.removeUser);
router.get("/transactions", AdminController.getTransactions);

export default router;
