import { Request, Response } from "express";
import { ENV } from "@/config/env";
import { ms } from "@/lib/jwt";
import { AuthenticatedRequest } from "@/types/common";
import {
  ChangePasswordService,
  ForgetPasswordService,
  GetMeService,
  LoginCredentialsService,
  LogoutService,
  RefreshTokenService,
  ResendEmailVerificationService,
  ResetPasswordService,
  SignupUserService,
  UpdateMeService,
  VerifyEmailService,
  VerifyResetCodeService,
} from "@/services/auth";

/** Every auth service resolves to this envelope. */
type AuthResult = {
  statusCode: number;
  message: string;
  data?: unknown;
  errors?: unknown;
};

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none" | "lax";
  path: string;
};

export class AuthController {
  private getCookieOptions = (): CookieOptions => {
    const isProduction = ENV.NODE_ENV === "production";
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    };
  };

  private setAuthCookies = (res: Response, tokens: { accessToken: string; refreshToken: string }) => {
    const options = this.getCookieOptions();

    res.cookie("accessToken", tokens.accessToken, {
      ...options,
      maxAge: ms(15, "minutes"),
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      ...options,
      maxAge: ms(7, "days"),
    });
  };

  private respond = (res: Response, result: AuthResult) => {
    const body: { success: boolean; message: string; data?: unknown; errors?: unknown } = {
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
    };

    if (result.errors !== undefined) {
      body.errors = result.errors;
    }

    return res.status(result.statusCode).json(body);
  };

  /** Sets cookies when a 200 result carries a token pair. */
  private respondWithTokens = (res: Response, result: AuthResult) => {
    if (result.statusCode === 200 && result.data && typeof result.data === "object") {
      const data = result.data as { accessToken?: string; refreshToken?: string };
      if (data.accessToken && data.refreshToken) {
        this.setAuthCookies(res, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      }
    }

    return this.respond(res, result);
  };

  // ─── Public routes ─────────────────────────────────────────────────────────

  public register = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await SignupUserService(body.fullName, body.email, body.password, body.role);
    return this.respond(res, result);
  };

  public verifyEmail = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await VerifyEmailService(body.email, body.code);
    return this.respond(res, result);
  };

  public resendVerification = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await ResendEmailVerificationService(body.email);
    return this.respond(res, result);
  };

  public login = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await LoginCredentialsService(body.email, body.password);
    return this.respondWithTokens(res, result);
  };

  public refreshToken = async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
    const result = await RefreshTokenService(token);
    return this.respondWithTokens(res, result);
  };

  public forgotPassword = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await ForgetPasswordService(body.email);
    return this.respond(res, result);
  };

  public verifyResetCode = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await VerifyResetCodeService(body.email, body.code);
    return this.respond(res, result);
  };

  public resetPassword = async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const result = await ResetPasswordService(body.email, body.resetToken, body.newPassword);
    return this.respond(res, result);
  };

  // ─── Authenticated routes ──────────────────────────────────────────────────

  public changePassword = async (req: Request, res: Response) => {
    const authReq: AuthenticatedRequest = req;
    const userId = authReq.user?.sub ?? "";
    const body = req.body ?? {};
    const result = await ChangePasswordService(userId, body.currentPassword, body.newPassword);
    return this.respond(res, result);
  };

  public getMe = async (req: Request, res: Response) => {
    const authReq: AuthenticatedRequest = req;
    const userId = authReq.user?.sub ?? "";
    const result = await GetMeService(userId);
    return this.respond(res, result);
  };

  public updateMe = async (req: Request, res: Response) => {
    const authReq: AuthenticatedRequest = req;
    const userId = authReq.user?.sub ?? "";
    const body = req.body ?? {};
    const result = await UpdateMeService(userId, body.fullName, body.avatarUrl);
    return this.respond(res, result);
  };

  public logout = async (req: Request, res: Response) => {
    const options = this.getCookieOptions();
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);

    const authReq: AuthenticatedRequest = req;
    const result = await LogoutService({
      userId: authReq.user?.sub,
      authorizationHeader: req.headers.authorization,
      refreshToken: req.cookies?.refreshToken,
    });

    return this.respond(res, result);
  };
}

export default new AuthController();
