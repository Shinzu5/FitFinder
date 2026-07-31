import { Router } from "express";
import {
  getMyGym,
  getMembers, removeMember,
  getMembershipPlans, createMembershipPlan, updateMembershipPlan, deleteMembershipPlan,
  getCoaches, createCoach, updateCoach, removeCoach,
  getEquipment, createEquipment, updateEquipment, toggleEquipment, removeEquipment,
  getExercises, createExercise, updateExercise, removeExercise,
  getShopProducts, createShopProduct, removeShopProduct,
  getStaff, addStaff, removeStaff,
  getMessages, sendMessage,
  getSalesReports, getSalesReportReceipt,
  getPaymentSettings, updatePaymentSettings,
} from "../controllers/owner.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// All owner routes require OWNER role (Admin cannot access sales reports)
router.use(authenticate, requireRole("OWNER"));

router.get("/my-gym", getMyGym);

router.get("/payment-settings", getPaymentSettings);
router.put("/payment-settings", updatePaymentSettings);

router.get("/members", getMembers);
router.delete("/members/:id", removeMember);

router.get("/membership-plans", getMembershipPlans);
router.post("/membership-plans", createMembershipPlan);
router.put("/membership-plans/:id", updateMembershipPlan);
router.delete("/membership-plans/:id", deleteMembershipPlan);

router.get("/coaches", getCoaches);
router.post("/coaches", createCoach);
router.put("/coaches/:id", updateCoach);
router.delete("/coaches/:id", removeCoach);

router.get("/equipment", getEquipment);
router.post("/equipment", createEquipment);
router.put("/equipment/:id", updateEquipment);
router.put("/equipment/:id/toggle", toggleEquipment);
router.delete("/equipment/:id", removeEquipment);

router.get("/exercises", getExercises);
router.post("/exercises", createExercise);
router.put("/exercises/:id", updateExercise);
router.delete("/exercises/:id", removeExercise);

router.get("/shop", getShopProducts);
router.post("/shop", createShopProduct);
router.delete("/shop/:id", removeShopProduct);

router.get("/staff", getStaff);
router.post("/staff", addStaff);
router.delete("/staff/:id", removeStaff);

router.get("/messages", getMessages);
router.post("/messages", sendMessage);

router.get("/sales-reports", getSalesReports);
router.get("/sales-reports/:id", getSalesReportReceipt);

export default router;
