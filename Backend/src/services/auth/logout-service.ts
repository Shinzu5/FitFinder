import { UserRepository } from "@/repositories/user.repository";
import { TokenRepository } from "@/repositories/token.repository";
import { verifyAccessToken, verifyRefreshToken } from "@/lib/jwt";

/** POST /api/auth/logout — clears the legacy column and revokes every Token row. */
export async function LogoutService(input: {
  userId?: string;
  authorizationHeader?: string;
  refreshToken?: string;
}) {
  const userRepository = new UserRepository();
  const tokenRepository = new TokenRepository();

  try {
    let userId = input.userId;

    if (!userId && input.authorizationHeader?.startsWith("Bearer ")) {
      const payload = verifyAccessToken(input.authorizationHeader.split(" ")[1]);
      userId = payload?.sub;
    }

    if (!userId && input.refreshToken) {
      const payload = verifyRefreshToken(input.refreshToken);
      userId = payload?.sub;
    }

    if (userId) {
      await userRepository.setRefreshToken(userId, null);
      await tokenRepository.revokeAllRefreshTokens(userId);
    }

    return { statusCode: 200, message: "Logged out successfully", data: null };
  } catch (error) {
    console.error("LogoutService error:", error);
    return { statusCode: 200, message: "Logged out successfully", data: null };
  }
}
