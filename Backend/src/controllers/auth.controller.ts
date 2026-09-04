import { Request, Response } from "express";
import { AuthService } from "../services/auth/auth.service";
import { AuthRequest } from "../middleware/auth";
import { env } from "../config/env";

export class AuthController {
  private readonly authService = new AuthService();

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    const isProduction = env.NODE_ENV === "production";

    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.register(req.body ?? {});
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.verifyEmail(req.body ?? {});
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  resendVerification = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.resendVerification(req.body ?? {});
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body ?? {});

    if (result.statusCode === 200 && result.data && typeof result.data === "object") {
      const data = result.data as { accessToken?: string; refreshToken?: string };
      if (data.accessToken && data.refreshToken) {
        this.setAuthCookies(res, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }
    }

    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
    const result = await this.authService.refreshToken({ refreshToken: token });

    if (result.statusCode === 200 && result.data && typeof result.data === "object") {
      const data = result.data as { accessToken?: string; refreshToken?: string };
      if (data.accessToken && data.refreshToken) {
        this.setAuthCookies(res, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }
    }

    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.forgotPassword(req.body ?? {});
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  verifyResetCode = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.verifyResetCode(req.body ?? {});
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const result = await this.authService.resetPassword(req.body ?? {});
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await this.authService.changePassword({
      userId: req.userId ?? "",
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
    });
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await this.authService.getMe(req.userId ?? "");
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await this.authService.updateMe({
      userId: req.userId ?? "",
      fullName: req.body?.fullName,
      avatarUrl: req.body?.avatarUrl,
    });
    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };

  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await this.authService.logout({
      userId: req.userId,
      authorizationHeader: req.headers.authorization,
      refreshToken: req.cookies?.refreshToken,
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.status(result.statusCode).json({
      success: result.statusCode >= 200 && result.statusCode < 300,
      message: result.message,
      data: result.data,
      errors: result.errors,
    });
  };
}
