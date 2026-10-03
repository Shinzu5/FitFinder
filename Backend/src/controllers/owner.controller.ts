import { Response } from "express";
import { sendSuccess, sendError, sendCreated } from "@/utils/apiResponse";
import { AuthRequest } from "@/types/common";
import {
  AddOwnerStaffService,
  GetOwnerGymService,
  GetOwnerMyGymLightService,
  GetOwnerMyGymService,
  ListOwnerStaffService,
  RemoveOwnerStaffService,
  UpdateOwnerPaymentSettingsService,
} from "@/services/gym";
import {
  CreateMembershipPlanService,
  DeleteMembershipPlanService,
  ListGymMembersService,
  ListOwnerMembershipPlansService,
  RemoveOwnerMemberService,
  UpdateMembershipPlanService,
} from "@/services/membership";
import {
  CreateCoachService,
  CreateEquipmentService,
  CreateExerciseService,
  CreateShopProductService,
  ListOwnerCoachesService,
  ListOwnerEquipmentService,
  ListOwnerExercisesService,
  ListOwnerShopService,
  RemoveCoachService,
  RemoveEquipmentService,
  RemoveExerciseService,
  RemoveShopProductService,
  ToggleEquipmentService,
  UpdateCoachService,
  UpdateEquipmentService,
  UpdateExerciseService,
  UpdateShopProductService,
} from "@/services/catalog";
import { ListOwnerConversationsService, SendOwnerMessageService } from "@/services/messaging";
import { GetOwnerSalesReportReceiptService, ListOwnerSalesReportsService } from "@/services/clerk";

function toFrontendTxnType(type: string): string {
  return type.toLowerCase().replace(/_/g, "-");
}

function isValidXenditKey(key: string): boolean {
  return key.startsWith("xnd_production_") || key.startsWith("xnd_development_");
}

function maskApiKey(key: string): string {
  if (key.length <= 16) return "••••••••";
  return `${key.slice(0, 12)}${"•".repeat(Math.min(key.length - 16, 20))}${key.slice(-4)}`;
}

export class OwnerController {
  // GET /api/owner/my-gym
  // ?light=1 — tiny payload for ownership checks (avoids lag / pool pressure)
  public getMyGym = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const light =
        req.query.light === "1" ||
        req.query.light === "true" ||
        String(req.query.fields || "") === "status";

      if (light) {
        const gym = await GetOwnerMyGymLightService(req.userId!);
        sendSuccess(res, gym);
        return;
      }

      const gym = await GetOwnerMyGymService(req.userId!);

      if (!gym) {
        sendSuccess(res, null, "No gym registered");
        return;
      }

      const { xenditApiKey: _key, ...safeGym } = gym;
      sendSuccess(res, {
        ...safeGym,
        cashlessEnabled:
          Boolean(gym.xenditEnabled) &&
          Boolean(
            (gym.xenditApiKey || "").startsWith("xnd_production_") ||
              (gym.xenditApiKey || "").startsWith("xnd_development_"),
          ),
        hasXenditApiKey: Boolean((gym.xenditApiKey || "").trim()),
        memberCount: gym._count.gymMemberships,
      });
    } catch (error) {
      console.error("Get my gym error:", error);
      sendError(res, "Failed to fetch gym", 500);
    }
  };

  // ─── Members ──────────────────────────────────────────────────────────────────

  // GET /api/owner/members
  public getMembers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      // Pre-gym onboarding (plan paid, gym not created yet) is an empty list, not an error.
      // Prevents 404 console spam on /create-gym/done via global useMembersListSync.
      if (!gym) { sendSuccess(res, [], "No gym yet"); return; }

      const members = await ListGymMembersService(gym.id);
      sendSuccess(res, members);
    } catch (error) {
      console.error("Get members error:", error);
      sendError(res, "Failed to fetch members", 500);
    }
  };

  // DELETE /api/owner/members/:id
  public removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await RemoveOwnerMemberService({
        gymId: gym.id,
        membershipId: String(req.params.id),
      });

      if (result.kind === "not-found") {
        sendError(res, "Member not found", 404);
        return;
      }

      sendSuccess(res, null, "Member removed");
    } catch (error) {
      console.error("Remove member error:", error);
      sendError(res, "Failed to remove member", 500);
    }
  };

  // ─── Membership Plans ─────────────────────────────────────────────────────────

  // GET /api/owner/membership-plans
  public getMembershipPlans = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const plans = await ListOwnerMembershipPlansService(gym.id);

      const result = plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        durationDays: p.durationDays,
        activeSubscribers: p._count.gymMemberships,
      }));

      sendSuccess(res, result);
    } catch (error) {
      console.error("Get plans error:", error);
      sendError(res, "Failed to fetch plans", 500);
    }
  };

  // POST /api/owner/membership-plans
  public createMembershipPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const plan = await CreateMembershipPlanService({
        gymId: gym.id,
        name: req.body.name,
        price: req.body.price,
        durationDays: req.body.durationDays,
      });

      sendCreated(res, plan, "Plan created");
    } catch (error) {
      console.error("Create plan error:", error);
      sendError(res, "Failed to create plan", 500);
    }
  };

  // PUT /api/owner/membership-plans/:id
  public updateMembershipPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await UpdateMembershipPlanService({
        gymId: gym.id,
        planId: String(req.params.id),
        body: req.body,
      });

      if (result.kind === "not-found") {
        sendError(res, "Plan not found", 404);
        return;
      }

      sendSuccess(res, result.plan, "Plan updated");
    } catch (error) {
      console.error("Update plan error:", error);
      sendError(res, "Failed to update plan", 500);
    }
  };

  // DELETE /api/owner/membership-plans/:id
  // Soft-delete: hide from new purchases; existing paid members keep access until expiresAt.
  public deleteMembershipPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await DeleteMembershipPlanService({
        gymId: gym.id,
        planId: String(req.params.id),
      });

      if (result.kind === "not-found") {
        sendError(res, "Plan not found", 404);
        return;
      }

      sendSuccess(res, null, "Plan deleted");
    } catch (error) {
      console.error("Delete plan error:", error);
      sendError(res, "Failed to delete plan", 500);
    }
  };

  // ─── Coaches ──────────────────────────────────────────────────────────────────

  // GET /api/owner/coaches
  public getCoaches = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const coaches = await ListOwnerCoachesService(gym.id);
      sendSuccess(res, coaches);
    } catch (error) {
      console.error("Get coaches error:", error);
      sendError(res, "Failed to fetch coaches", 500);
    }
  };

  // POST /api/owner/coaches
  public createCoach = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const coach = await CreateCoachService({ gymId: gym.id, body: req.body });

      sendCreated(res, coach, "Coach added");
    } catch (error) {
      console.error("Create coach error:", error);
      sendError(res, "Failed to add coach", 500);
    }
  };

  // PUT /api/owner/coaches/:id
  public updateCoach = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await UpdateCoachService({
        gymId: gym.id,
        coachId: String(req.params.id),
        body: req.body,
      });

      if (result.kind === "not-found") {
        sendError(res, "Coach not found", 404);
        return;
      }

      sendSuccess(res, result.coach, "Coach updated");
    } catch (error) {
      console.error("Update coach error:", error);
      sendError(res, "Failed to update coach", 500);
    }
  };

  // DELETE /api/owner/coaches/:id
  public removeCoach = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await RemoveCoachService({
        gymId: gym.id,
        coachId: String(req.params.id),
      });

      if (result.kind === "not-found") {
        sendError(res, "Coach not found", 404);
        return;
      }

      sendSuccess(res, null, "Coach removed");
    } catch (error) {
      console.error("Remove coach error:", error);
      sendError(res, "Failed to remove coach", 500);
    }
  };

  // ─── Equipment ────────────────────────────────────────────────────────────────

  // GET /api/owner/equipment
  public getEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const equipment = await ListOwnerEquipmentService(gym.id);
      sendSuccess(res, equipment);
    } catch (error) {
      console.error("Get equipment error:", error);
      sendError(res, "Failed to fetch equipment", 500);
    }
  };

  // POST /api/owner/equipment
  public createEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const item = await CreateEquipmentService({ gymId: gym.id, body: req.body });

      sendCreated(res, item, "Equipment added");
    } catch (error) {
      console.error("Create equipment error:", error);
      sendError(res, "Failed to add equipment", 500);
    }
  };

  // PUT /api/owner/equipment/:id — update name/quantity/status
  public updateEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await UpdateEquipmentService({
        gymId: gym.id,
        equipmentId: String(req.params.id),
        body: req.body,
      });

      if (result.kind === "not-found") {
        sendError(res, "Equipment not found", 404);
        return;
      }

      sendSuccess(res, result.updated, "Equipment updated");
    } catch (error) {
      console.error("Update equipment error:", error);
      sendError(res, "Failed to update equipment", 500);
    }
  };

  // PUT /api/owner/equipment/:id/toggle — cycle Available → In Use → Under Maintenance
  public toggleEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await ToggleEquipmentService({
        gymId: gym.id,
        equipmentId: String(req.params.id),
      });

      if (result.kind === "not-found") {
        sendError(res, "Equipment not found", 404);
        return;
      }

      sendSuccess(res, result.updated, "Equipment status updated");
    } catch (error) {
      console.error("Toggle equipment error:", error);
      sendError(res, "Failed to toggle equipment", 500);
    }
  };

  // DELETE /api/owner/equipment/:id
  public removeEquipment = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await RemoveEquipmentService({
        gymId: gym.id,
        equipmentId: String(req.params.id),
      });

      if (result.kind === "not-found") {
        sendError(res, "Equipment not found", 404);
        return;
      }

      sendSuccess(res, null, "Equipment removed");
    } catch (error) {
      console.error("Remove equipment error:", error);
      sendError(res, "Failed to remove equipment", 500);
    }
  };

  // ─── Exercises ────────────────────────────────────────────────────────────────

  // GET /api/owner/exercises
  public getExercises = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const exercises = await ListOwnerExercisesService(gym.id);
      sendSuccess(res, exercises);
    } catch (error) {
      console.error("Get exercises error:", error);
      sendError(res, "Failed to fetch exercises", 500);
    }
  };

  // POST /api/owner/exercises
  public createExercise = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const exercise = await CreateExerciseService({ gymId: gym.id, body: req.body });

      sendCreated(res, exercise, "Exercise added");
    } catch (error) {
      console.error("Create exercise error:", error);
      sendError(res, "Failed to add exercise", 500);
    }
  };

  // PUT /api/owner/exercises/:id
  public updateExercise = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await UpdateExerciseService({
        gymId: gym.id,
        exerciseId: String(req.params.id),
        body: req.body,
      });

      if (result.kind === "not-found") {
        sendError(res, "Exercise not found", 404);
        return;
      }

      sendSuccess(res, result.exercise, "Exercise updated");
    } catch (error) {
      console.error("Update exercise error:", error);
      sendError(res, "Failed to update exercise", 500);
    }
  };

  // DELETE /api/owner/exercises/:id
  public removeExercise = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await RemoveExerciseService({
        gymId: gym.id,
        exerciseId: String(req.params.id),
      });

      if (result.kind === "not-found") {
        sendError(res, "Exercise not found", 404);
        return;
      }

      sendSuccess(res, null, "Exercise removed");
    } catch (error) {
      console.error("Remove exercise error:", error);
      sendError(res, "Failed to remove exercise", 500);
    }
  };

  // ─── Shop Products ────────────────────────────────────────────────────────────

  // GET /api/owner/shop
  public getShopProducts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const products = await ListOwnerShopService(gym.id);
      sendSuccess(res, products);
    } catch (error) {
      console.error("Get shop products error:", error);
      sendError(res, "Failed to fetch products", 500);
    }
  };

  // POST /api/owner/shop
  public createShopProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const product = await CreateShopProductService({ gymId: gym.id, body: req.body });

      sendCreated(res, product, "Product added");
    } catch (error) {
      console.error("Create product error:", error);
      sendError(res, "Failed to add product", 500);
    }
  };

  // PUT /api/owner/shop/:id — update name/price/image for live Gymer sync
  public updateShopProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await UpdateShopProductService({
        gymId: gym.id,
        productId: String(req.params.id),
        body: req.body,
      });

      if (result.kind === "not-found") {
        sendError(res, "Product not found", 404);
        return;
      }

      sendSuccess(res, result.product, "Product updated");
    } catch (error) {
      console.error("Update product error:", error);
      sendError(res, "Failed to update product", 500);
    }
  };

  // DELETE /api/owner/shop/:id
  public removeShopProduct = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const result = await RemoveShopProductService({
        gymId: gym.id,
        productId: String(req.params.id),
      });

      if (result.kind === "not-found") {
        sendError(res, "Product not found", 404);
        return;
      }

      sendSuccess(res, null, "Product removed");
    } catch (error) {
      console.error("Remove product error:", error);
      sendError(res, "Failed to remove product", 500);
    }
  };

  // ─── Staff (Clerks) ──────────────────────────────────────────────────────────

  // GET /api/owner/staff
  public getStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      // Pre-gym onboarding (plan paid, gym not created yet) is an empty list, not an error.
      if (!gym) { sendSuccess(res, [], "No gym yet"); return; }

      const clerks = await ListOwnerStaffService(gym.id);

      sendSuccess(res, clerks);
    } catch (error) {
      console.error("Get staff error:", error);
      sendError(res, "Failed to fetch staff", 500);
    }
  };

  // POST /api/owner/staff
  // Creates a brand-new CLERK account with the email/password the owner enters,
  // so the clerk can log in immediately with those credentials.
  public addStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const { fullName, email, password } = req.body;

      if (!fullName?.trim() || !email?.trim() || !password) {
        sendError(res, "Full name, email, and password are required");
        return;
      }

      if (password.length < 6) {
        sendError(res, "Password must be at least 6 characters");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      const result = await AddOwnerStaffService({
        gymId: gym.id,
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
      });

      if (result.kind === "exists") {
        sendError(res, "An account with that email already exists.", 409);
        return;
      }

      sendCreated(
        res,
        { id: result.clerk.id, fullName: result.clerk.fullName, email: result.clerk.email },
        "Clerk account created",
      );
    } catch (error) {
      console.error("Add staff error:", error);
      sendError(res, "Failed to add staff", 500);
    }
  };

  // DELETE /api/owner/staff/:id — permanently remove this gym's clerk + revoke session
  public removeStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) {
        sendError(res, "No gym found", 404);
        return;
      }

      const result = await RemoveOwnerStaffService({
        gymId: gym.id,
        clerkId: String(req.params.id),
      });

      if (result.kind === "not-found") {
        sendError(res, "Clerk not found in your gym", 404);
        return;
      }

      if (result.kind === "error") {
        sendError(res, result.message, result.status);
        return;
      }

      sendSuccess(res, null, "Clerk account permanently removed");
    } catch (error) {
      console.error("Remove staff error:", error);
      sendError(res, "Failed to remove staff", 500);
    }
  };

  // ─── Messages ─────────────────────────────────────────────────────────────────

  // GET /api/owner/messages
  public getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const conversations = await ListOwnerConversationsService(gym.id);

      sendSuccess(res, conversations);
    } catch (error) {
      console.error("Get messages error:", error);
      sendError(res, "Failed to fetch messages", 500);
    }
  };

  // POST /api/owner/messages
  public sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { conversationId, text } = req.body;

      const message = await SendOwnerMessageService({
        senderId: req.userId!,
        conversationId,
        text,
      });

      sendCreated(res, message, "Message sent");
    } catch (error) {
      console.error("Send message error:", error);
      sendError(res, "Failed to send message", 500);
    }
  };

  // GET /api/owner/sales-reports
  public getSalesReports = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const reports = await ListOwnerSalesReportsService({
        gymId: gym.id,
        search: req.query.search,
        date: req.query.date,
      });

      sendSuccess(
        res,
        reports.map((report) => {
          const closedByRole =
            String(report.closedByRole || "CLERK").toUpperCase() === "OWNER" ? "OWNER" : "CLERK";
          return {
            id: report.id,
            date: report.reportDate,
            clerkId: report.clerkId,
            clerkName: report.clerk.fullName,
            closedByRole,
            closedByLabel: closedByRole === "OWNER" ? "Closed by Owner" : "Closed by Clerk",
            referenceNo: `DSR-${report.id.slice(0, 8).toUpperCase()}`,
            totalTransactions: report.totalTransactions,
            totalRevenue: report.totalRevenue,
            closedAt: report.closedAt,
            status: "Closed",
          };
        }),
      );
    } catch (error) {
      console.error("Get sales reports error:", error);
      sendError(res, "Failed to fetch sales reports", 500);
    }
  };

  // GET /api/owner/sales-reports/:id
  public getSalesReportReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) { sendError(res, "No gym found", 404); return; }

      const report = await GetOwnerSalesReportReceiptService({
        gymId: gym.id,
        reportId: String(req.params.id),
      });

      if (!report) {
        sendError(res, "Report not found", 404);
        return;
      }

      const closedByRole =
        String(report.closedByRole || "CLERK").toUpperCase() === "OWNER" ? "OWNER" : "CLERK";

      sendSuccess(res, {
        id: report.id,
        gymId: gym.id,
        gymName: gym.name,
        gymAddress: gym.address,
        date: report.reportDate,
        clerkId: report.clerkId,
        clerkName: report.clerk.fullName,
        closedByRole,
        closedByLabel: closedByRole === "OWNER" ? "Closed by Owner" : "Closed by Clerk",
        referenceNo: `DSR-${report.id.slice(0, 8).toUpperCase()}`,
        totalTransactions: report.totalTransactions,
        totalRevenue: report.totalRevenue,
        closedAt: report.closedAt,
        status: "Closed",
        transactions: report.transactions.map((txn) => ({
          id: txn.id,
          type: toFrontendTxnType(txn.type),
          memberName: txn.memberName,
          amount: txn.amount,
          method: txn.method === "CASH" ? "Cash" : "Cashless",
          notes: txn.notes,
          createdAt: txn.createdAt,
        })),
      });
    } catch (error) {
      console.error("Get sales report receipt error:", error);
      sendError(res, "Failed to fetch receipt", 500);
    }
  };

  // GET /api/owner/payment-settings — optional Xendit (walk-in always available)
  public getPaymentSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) {
        sendError(res, "No gym found", 404);
        return;
      }

      const key = (gym.xenditApiKey || "").trim();
      const hasApiKey = isValidXenditKey(key);

      sendSuccess(res, {
        hasApiKey,
        maskedApiKey: hasApiKey ? maskApiKey(key) : null,
        xenditEnabled: hasApiKey ? gym.xenditEnabled : false,
        cashlessEnabled: hasApiKey && gym.xenditEnabled,
        walkInAlwaysEnabled: true,
      });
    } catch (error) {
      console.error("Get payment settings error:", error);
      sendError(res, "Failed to fetch payment settings", 500);
    }
  };

  // PUT /api/owner/payment-settings
  public updatePaymentSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const gym = await GetOwnerGymService(req.userId!);
      if (!gym) {
        sendError(res, "No gym found", 404);
        return;
      }

      const result = await UpdateOwnerPaymentSettingsService({
        gymId: gym.id,
        currentKey: gym.xenditApiKey,
        body: req.body,
      });

      if (result.kind === "error") {
        sendError(res, result.message);
        return;
      }

      const updated = result.updated;
      const key = (updated.xenditApiKey || "").trim();
      const hasApiKey = isValidXenditKey(key);

      sendSuccess(
        res,
        {
          hasApiKey,
          maskedApiKey: hasApiKey ? maskApiKey(key) : null,
          xenditEnabled: hasApiKey ? updated.xenditEnabled : false,
          cashlessEnabled: hasApiKey && updated.xenditEnabled,
          walkInAlwaysEnabled: true,
        },
        "Payment settings updated",
      );
    } catch (error) {
      console.error("Update payment settings error:", error);
      sendError(res, "Failed to update payment settings", 500);
    }
  };
}

export default new OwnerController();
