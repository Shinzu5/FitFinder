import { Router } from "express";
import rateLimit from "express-rate-limit";
import authController from "@/controllers/auth.controller";
import { authenticate } from "@/middlewares/auth";
import { validate } from "@/middlewares/validate";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyResetCodeSchema,
} from "@/schema/auth";

const router = Router();

/** Brute-force protection for credential / OTP routes only — not /refresh or /me. */
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later." },
});

router.post("/register", authAttemptLimiter, validate(registerSchema), authController.register);
router.post("/verify-email", authAttemptLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post("/resend-verification", authAttemptLimiter, validate(forgotPasswordSchema), authController.resendVerification);
router.post("/login", authAttemptLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authController.refreshToken);
router.post("/forgot-password", authAttemptLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/verify-reset-code", authAttemptLimiter, validate(verifyResetCodeSchema), authController.verifyResetCode);
router.post("/reset-password", authAttemptLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.put("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);
router.get("/me", authenticate, authController.getMe);
router.put("/me", authenticate, authController.updateMe);
router.post("/logout", authController.logout);

export default router;
