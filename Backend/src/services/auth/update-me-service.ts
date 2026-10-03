import { UserRepository } from "@/repositories/user.repository";

/** PUT /api/auth/me (auth) — partial profile update. */
export async function UpdateMeService(userId: string, fullName?: string, avatarUrl?: string) {
  const userRepository = new UserRepository();

  try {
    const data: Record<string, unknown> = {};
    if (fullName) data.fullName = fullName;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const user = await userRepository.updateProfile(userId, data);

    return { statusCode: 200, message: "Profile updated", data: { user } };
  } catch (error) {
    console.error("UpdateMeService error:", error);
    return { statusCode: 500, message: "Failed to update profile" };
  }
}
