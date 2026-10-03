import { Router } from "express";
import OwnerController from "@/controllers/owner.controller";
import { authenticate } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/requireRole";

const router = Router();

// All owner routes require OWNER role (Admin cannot access sales reports)
router.use(authenticate, requireRole("OWNER"));

router.get("/my-gym", OwnerController.getMyGym);

router.get("/payment-settings", OwnerController.getPaymentSettings);
router.put("/payment-settings", OwnerController.updatePaymentSettings);

router.get("/members", OwnerController.getMembers);
router.delete("/members/:id", OwnerController.removeMember);

router.get("/membership-plans", OwnerController.getMembershipPlans);
router.post("/membership-plans", OwnerController.createMembershipPlan);
router.put("/membership-plans/:id", OwnerController.updateMembershipPlan);
router.delete("/membership-plans/:id", OwnerController.deleteMembershipPlan);

router.get("/coaches", OwnerController.getCoaches);
router.post("/coaches", OwnerController.createCoach);
router.put("/coaches/:id", OwnerController.updateCoach);
router.delete("/coaches/:id", OwnerController.removeCoach);

router.get("/equipment", OwnerController.getEquipment);
router.post("/equipment", OwnerController.createEquipment);
router.put("/equipment/:id", OwnerController.updateEquipment);
router.put("/equipment/:id/toggle", OwnerController.toggleEquipment);
router.delete("/equipment/:id", OwnerController.removeEquipment);

router.get("/exercises", OwnerController.getExercises);
router.post("/exercises", OwnerController.createExercise);
router.put("/exercises/:id", OwnerController.updateExercise);
router.delete("/exercises/:id", OwnerController.removeExercise);

router.get("/shop", OwnerController.getShopProducts);
router.post("/shop", OwnerController.createShopProduct);
router.put("/shop/:id", OwnerController.updateShopProduct);
router.delete("/shop/:id", OwnerController.removeShopProduct);

router.get("/staff", OwnerController.getStaff);
router.post("/staff", OwnerController.addStaff);
router.delete("/staff/:id", OwnerController.removeStaff);

router.get("/messages", OwnerController.getMessages);
router.post("/messages", OwnerController.sendMessage);

router.get("/sales-reports", OwnerController.getSalesReports);
router.get("/sales-reports/:id", OwnerController.getSalesReportReceipt);

export default router;
