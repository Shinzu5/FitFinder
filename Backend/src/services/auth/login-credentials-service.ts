import { UserRepository } from "@/repositories/user.repository";
import { TokenRepository } from "@/repositories/token.repository";
import { comparePassword } from "@/utils/hash";
import { signAccessToken, signRefreshToken, ms } from "@/lib/jwt";
import { TokenExpiry } from "@/types/auth";

/** POST /api/auth/login — issues the token pair and persists BOTH session modes. */
export async function LoginCredentialsService(email: string, password: string) {
  const userRepository = new UserRepository();
  const tokenRepository = new TokenRepository();

  try {
    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    const plainPassword = typeof password === "string" ? password : "";

    if (!normalizedEmail || !plainPassword) {
      return { statusCode: 400, message: "Email and password are required." };
    }

    const user = await userRepository.findByEmail(normalizedEmail.toLowerCase());
    if (!user) {
      return { statusCode: 401, message: "Invalid email or password." };
    }

    const validPassword = await comparePassword(plainPassword, user.passwordHash);
    if (!validPassword) {
      return { statusCode: 401, message: "Invalid email or password." };
    }

    if (!user.emailVerified) {
      return { statusCode: 403, message: "Please verify your email before logging in." };
    }

    if (user.role === "CLERK" && !user.clerkGymId) {
      return { statusCode: 403, message: "Your account has been removed by the Gym Owner." };
    }

    const accessToken = signAccessToken(user.id, user.role, TokenExpiry.ACCESS_TOKEN_EXPIRES);
    const refreshToken = signRefreshToken(user.id, user.role, TokenExpiry.REFRESH_TOKEN_EXPIRES);

    // Dual-mode session: legacy `User.refreshToken` column + revocable Token row.
    await userRepository.setRefreshToken(user.id, refreshToken);
    await tokenRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + ms(7, "days")),
    });

    return {
      statusCode: 200,
      message: "Welcome back!",
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
      },
    };
  } catch (error) {
    console.error("LoginCredentialsService error:", error);
    return { statusCode: 500, message: "Login failed" };
  }
}
