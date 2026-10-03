import { UserRepository } from "@/repositories/user.repository";
import { comparePassword, hashPassword } from "@/utils/hash";

/** PUT /api/auth/change-password (auth) — swaps the password in place. */
export async function ChangePasswordService(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const userRepository = new UserRepository();

  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      return { statusCode: 404, message: "User not found" };
    }

    const validPassword = await comparePassword(currentPassword, user.passwordHash);
    if (!validPassword) {
      return { statusCode: 400, message: "Current password is incorrect" };
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updateById(user.id, { passwordHash });

    return { statusCode: 200, message: "Password updated successfully", data: null };
  } catch (error) {
    console.error("ChangePasswordService error:", error);
    return { statusCode: 500, message: "Failed to change password" };
  }
}
