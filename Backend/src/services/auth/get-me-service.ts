import { UserRepository } from "@/repositories/user.repository";

/** GET /api/auth/me (auth) — current session profile. */
export async function GetMeService(userId: string) {
  const userRepository = new UserRepository();

  try {
    const user = await userRepository.getMe(userId);

    if (!user) {
      return { statusCode: 404, message: "User not found" };
    }

    return { statusCode: 200, message: "Success", data: { user } };
  } catch (error) {
    console.error("GetMeService error:", error);
    return { statusCode: 500, message: "Failed to get profile" };
  }
}
