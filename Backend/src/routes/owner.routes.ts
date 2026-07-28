import { Router } from "express";
import {
  getMyGym,
  getMembers, removeMember,
  getMembershipPlans, createMembershipPlan, updateMembershipPlan, deleteMembershipPlan,
  getCoaches, createCoach, removeCoach,
  getEquipment, createEquipment, toggleEquipment, removeEquipment,
  getExercises, createExercise, removeExercise,
  getShopProducts, createShopProduct, removeShopProduct,
  getStaff, addStaff, removeStaff,
  getMessages, sendMessage,
} from "../controllers/owner.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// All owner routes require OWNER role
router.use(authenticate, requireRole("OWNER"));

// My Gym
router.get("/my-gym", getMyGym);

// Members
router.get("/members", getMembers);
router.delete("/members/:id", removeMember);

// Membership Plans
router.get("/membership-plans", getMembershipPlans);
router.post("/membership-plans", createMembershipPlan);
router.put("/membership-plans/:id", updateMembershipPlan);
router.delete("/membership-plans/:id", deleteMembershipPlan);

// Coaches
router.get("/coaches", getCoaches);
router.post("/coaches", createCoach);
router.delete("/coaches/:id", removeCoach);

// Equipment
router.get("/equipment", getEquipment);
router.post("/equipment", createEquipment);
router.put("/equipment/:id/toggle", toggleEquipment);
router.delete("/equipment/:id", removeEquipment);

// Exercises
router.get("/exercises", getExercises);
router.post("/exercises", createExercise);
router.delete("/exercises/:id", removeExercise);

// Shop
router.get("/shop", getShopProducts);
router.post("/shop", createShopProduct);
router.delete("/shop/:id", removeShopProduct);

// Staff
router.get("/staff", getStaff);
router.post("/staff", addStaff);
router.delete("/staff/:id", removeStaff);

// Messages
router.get("/messages", getMessages);
router.post("/messages", sendMessage);

export default router;
