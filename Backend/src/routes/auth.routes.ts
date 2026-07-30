import { Router } from "express";
import {
  register, verifyEmail, resendVerification,
  login, refreshToken, forgotPassword, verifyResetCode, resetPassword,
  changePassword, getMe, updateMe, logout,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role: z.enum(["USER", "OWNER"]).optional().default("USER"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const verifyResetCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    resetToken: z.string().min(32, "Invalid reset session"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post("/register", validate(registerSchema), register);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/resend-verification", validate(forgotPasswordSchema), resendVerification);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-reset-code", validate(verifyResetCodeSchema), verifyResetCode);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.put("/change-password", authenticate, validate(changePasswordSchema), changePassword);
router.get("/me", authenticate, getMe);
router.put("/me", authenticate, updateMe);
router.post("/logout", logout);

export default router;
