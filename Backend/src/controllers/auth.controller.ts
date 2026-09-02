import { Request, Response } from "express";
import prisma from "../config/database";
import {
  hashPassword,
  comparePassword,
  generateVerificationCode,
  hashToken,
  tokensMatch,
  generateResetSessionToken,
} from "../utils/hash";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyAccessToken } from "../utils/jwt";
import { sendSuccess, sendError, sendCreated } from "../utils/apiResponse";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service";
import { emitAdminUsersUpdated } from "../services/realtime.service";
import { AuthRequest } from "../middleware/auth";
import { env } from "../config/env";

function resetExpiryDate(): Date {
  return new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);
}

async function clearResetState(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      resetToken: null,
      resetExpires: null,
      resetVerified: false,
      resetAttempts: 0,
    },
  });
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { fullName, email, password, role } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing && existing.emailVerified) {
      sendError(res, "An account with that email already exists.", 409);
      return;
    }

    // Only allow USER or OWNER registration
    const allowedRoles = ["USER", "OWNER"];
    const userRole = allowedRoles.includes(role) ? role : "USER";

    const passwordHash = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // If a previous registration attempt created the user but never got
    // verified (e.g. the verification email failed to send), reuse that
    // record instead of permanently blocking this email with a 409.
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            fullName,
            passwordHash,
            role: userRole,
            verificationCode,
            verificationExpires,
          },
        })
      : await prisma.user.create({
          data: {
            fullName,
            email: normalizedEmail,
            passwordHash,
            role: userRole,
            verificationCode,
            verificationExpires,
          },
        });

    // Send verification email — don't fail the whole registration if this
    // errors out; the account was already created/updated successfully and
    // the user can request a new code via "resend verification".
    try {
      await sendVerificationEmail(user.email, user.fullName, verificationCode);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    sendCreated(
      res,
      {
        userId: user.id,
        email: user.email,
        requiresVerification: true,
      },
      "Account created. Please check your email for the verification code."
    );
  } catch (error) {
    console.error("Register error:", error);
    sendError(res, "Registration failed", 500);
  }
}

// POST /api/auth/verify-email
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    if (user.emailVerified) {
      sendSuccess(res, null, "Email is already verified");
      return;
    }

    if (
      !user.verificationCode ||
      !user.verificationExpires ||
      user.verificationCode !== code
    ) {
      sendError(res, "Invalid verification code");
      return;
    }

    if (new Date() > user.verificationExpires) {
      sendError(res, "Verification code has expired. Please request a new one.");
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpires: null,
      },
    });

    // Status flips to Active on Admin Users — push live update
    void emitAdminUsersUpdated();

    sendSuccess(res, null, "Email verified successfully");
  } catch (error) {
    console.error("Verify email error:", error);
    sendError(res, "Verification failed", 500);
  }
}

// POST /api/auth/resend-verification
export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      sendSuccess(res, null, "If the email exists, a new code has been sent.");
      return;
    }

    if (user.emailVerified) {
      sendSuccess(res, null, "Email is already verified");
      return;
    }

    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode, verificationExpires },
    });

    await sendVerificationEmail(user.email, user.fullName, verificationCode);

    sendSuccess(
      res,
      null,
      "A new verification code has been sent to your email."
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    sendError(res, "Failed to resend verification", 500);
  }
}

// POST /api/auth/login
/** Authenticates email/password, returns access token + sets refresh cookie, includes user role. */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      sendError(res, "Email and password are required.", 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    const validPassword = await comparePassword(password, user.passwordHash);
    if (!validPassword) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    if (!user.emailVerified) {
      sendError(res, "Please verify your email before logging in.", 403);
      return;
    }

    // Soft-removed clerks (no gym) cannot sign in until an Owner recreates them
    if (user.role === "CLERK" && !user.clerkGymId) {
      sendError(res, "Your account has been removed by the Gym Owner.", 403);
      return;
    }

    const tokenPayload = { userId: user.id, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendSuccess(res, {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
    }, "Welcome back!");
  } catch (error) {
    console.error("Login error:", error);
    sendError(res, "Login failed", 500);
  }
}

// POST /api/auth/refresh
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      sendError(res, "Refresh token required", 401);
      return;
    }

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Your account has been removed. Please sign in again.",
        code: "ACCOUNT_DELETED",
      });
      return;
    }

    if (user.role === "CLERK" && !user.clerkGymId) {
      res.status(401).json({
        success: false,
        message: "Your account has been removed by the Gym Owner.",
        code: "ACCOUNT_DELETED",
      });
      return;
    }

    if (user.refreshToken !== token) {
      sendError(res, "Invalid refresh token", 401);
      return;
    }

    const tokenPayload = { userId: user.id, role: user.role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendSuccess(
      res,
      {
        accessToken: newAccessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      },
      "Token refreshed",
    );
  } catch (error) {
    sendError(res, "Invalid refresh token", 401);
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return the same success message (do not reveal whether the email exists).
    const genericMessage =
      "If an account exists for this email, a verification code has been sent.";

    if (!user) {
      sendSuccess(res, { email: normalizedEmail }, genericMessage);
      return;
    }

    const resetCode = generateVerificationCode();
    const resetExpires = resetExpiryDate();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashToken(resetCode),
        resetExpires,
        resetVerified: false,
        resetAttempts: 0,
      },
    });

    try {
      await sendPasswordResetEmail(user.email, user.fullName, resetCode);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
    }

    sendSuccess(
      res,
      { email: user.email },
      genericMessage
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    sendError(res, "Failed to process request", 500);
  }
}

// POST /api/auth/verify-reset-code
export async function verifyResetCode(req: Request, res: Response): Promise<void> {
  try {
    const { email, code } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();
    const submittedCode = String(code).trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.resetToken || !user.resetExpires || user.resetVerified) {
      sendError(res, "Invalid or expired verification code.", 400);
      return;
    }

    if (user.resetAttempts >= env.PASSWORD_RESET_MAX_ATTEMPTS) {
      sendError(
        res,
        "Too many failed attempts. Please request a new verification code.",
        429,
      );
      return;
    }

    if (new Date() > user.resetExpires) {
      await clearResetState(user.id);
      sendError(res, "Verification code has expired. Please request a new one.", 400);
      return;
    }

    if (!tokensMatch(submittedCode, user.resetToken)) {
      const attempts = user.resetAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { resetAttempts: attempts },
      });

      const remaining = env.PASSWORD_RESET_MAX_ATTEMPTS - attempts;
      if (remaining <= 0) {
        await clearResetState(user.id);
        sendError(
          res,
          "Too many failed attempts. Please request a new verification code.",
          429,
        );
        return;
      }

      sendError(
        res,
        `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        400,
      );
      return;
    }

    // OTP valid — exchange it for a one-time reset session token
    const sessionToken = generateResetSessionToken();
    const sessionExpires = resetExpiryDate();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashToken(sessionToken),
        resetExpires: sessionExpires,
        resetVerified: true,
        resetAttempts: 0,
      },
    });

    sendSuccess(
      res,
      {
        email: user.email,
        resetToken: sessionToken,
        expiresInMinutes: env.PASSWORD_RESET_EXPIRES_MINUTES,
      },
      "Code verified. You can now set a new password.",
    );
  } catch (error) {
    console.error("Verify reset code error:", error);
    sendError(res, "Verification failed", 500);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, resetToken, newPassword } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();
    const token = String(resetToken || "").trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      !user.resetToken ||
      !user.resetExpires ||
      !user.resetVerified ||
      !token
    ) {
      sendError(res, "Invalid or expired reset session. Please start again.", 400);
      return;
    }

    if (new Date() > user.resetExpires) {
      await clearResetState(user.id);
      sendError(res, "Reset session has expired. Please request a new verification code.", 400);
      return;
    }

    if (!tokensMatch(token, user.resetToken)) {
      sendError(res, "Invalid or already-used reset session. Please start again.", 400);
      return;
    }

    const passwordHash = await hashPassword(newPassword);

    // Invalidate OTP/session immediately and force re-login (clear refresh token)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetExpires: null,
        resetVerified: false,
        resetAttempts: 0,
        refreshToken: null,
      },
    });

    sendSuccess(res, null, "Password reset successfully. You can now log in with your new password.");
  } catch (error) {
    console.error("Reset password error:", error);
    sendError(res, "Failed to reset password", 500);
  }
}

// PUT /api/auth/change-password
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const validPassword = await comparePassword(currentPassword, user.passwordHash);
    if (!validPassword) {
      sendError(res, "Current password is incorrect");
      return;
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    sendSuccess(res, null, "Password updated successfully");
  } catch (error) {
    console.error("Change password error:", error);
    sendError(res, "Failed to change password", 500);
  }
}

// GET /api/auth/me
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    sendSuccess(res, { user });
  } catch (error) {
    console.error("Get me error:", error);
    sendError(res, "Failed to get profile", 500);
  }
}

// PUT /api/auth/me
export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fullName, avatarUrl } = req.body;

    const data: any = {};
    if (fullName) data.fullName = fullName;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });

    sendSuccess(res, { user }, "Profile updated");
  } catch (error) {
    console.error("Update me error:", error);
    sendError(res, "Failed to update profile", 500);
  }
}

// POST /api/auth/logout
export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Prefer authenticated userId; fall back to refresh-cookie lookup so logout
    // still works when the access token is expired.
    let userId = req.userId;

    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const payload = verifyAccessToken(authHeader.split(" ")[1]);
          userId = payload.userId;
        } catch {
          // expired/invalid access token — try refresh cookie below
        }
      }
    }

    if (!userId && req.cookies?.refreshToken) {
      try {
        const payload = verifyRefreshToken(req.cookies.refreshToken);
        userId = payload.userId;
      } catch {
        // ignore invalid refresh cookie
      }
    }

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    sendSuccess(res, null, "Logged out successfully");
  } catch (error) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    sendSuccess(res, null, "Logged out");
  }
}
