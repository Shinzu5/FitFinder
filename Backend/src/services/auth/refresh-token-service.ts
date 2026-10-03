import { UserRepository } from "@/repositories/user.repository";
import { TokenRepository } from "@/repositories/token.repository";
import { signAccessToken, signRefreshToken, verifyRefreshToken, ms } from "@/lib/jwt";
import { TokenExpiry } from "@/types/auth";

/** POST /api/auth/refresh — rotates the token pair (legacy column + Token row). */
export async function RefreshTokenService(refreshToken?: string) {
  const userRepository = new UserRepository();
  const tokenRepository = new TokenRepository();

  try {
    const token = typeof refreshToken === "string" ? refreshToken : "";
    if (!token) {
      return { statusCode: 401, message: "Refresh token required" };
    }

    // 1. Verify JWT signature + type
    const payload = verifyRefreshToken(token);
    if (!payload) {
      return { statusCode: 401, message: "Invalid refresh token" };
    }

    // 2. Account still present?
    const user = await userRepository.findById(payload.sub);
    if (!user) {
      return {
        statusCode: 401,
        message: "Your account has been removed. Please sign in again.",
        errors: { code: "ACCOUNT_DELETED" },
      };
    }

    if (user.role === "CLERK" && !user.clerkGymId) {
      return {
        statusCode: 401,
        message: "Your account has been removed by the Gym Owner.",
        errors: { code: "ACCOUNT_DELETED" },
      };
    }

    // 3. Legacy session column must match (logout / reset clears it).
    if (user.refreshToken !== token) {
      return { statusCode: 401, message: "Invalid refresh token" };
    }

    // 4. Rotation: consume the old Token row (best effort) and issue a new pair.
    const activeToken = await tokenRepository.findActiveRefreshToken(token);
    if (activeToken) {
      await tokenRepository.consumeToken(activeToken.id);
    }

    const newAccessToken = signAccessToken(user.id, user.role, TokenExpiry.ACCESS_TOKEN_EXPIRES);
    const newRefreshToken = signRefreshToken(user.id, user.role, TokenExpiry.REFRESH_TOKEN_EXPIRES);

    await userRepository.setRefreshToken(user.id, newRefreshToken);
    await tokenRepository.createRefreshToken({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + ms(7, "days")),
    });

    return {
      statusCode: 200,
      message: "Token refreshed",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
      },
    };
  } catch (error) {
    console.error("RefreshTokenService error:", error);
    return { statusCode: 401, message: "Invalid refresh token" };
  }
}
