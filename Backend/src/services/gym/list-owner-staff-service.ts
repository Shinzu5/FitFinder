import { UserRepository } from "@/repositories/user.repository";

const userRepository = new UserRepository();

/** GET /api/owner/staff — this gym's clerk accounts. */
export async function ListOwnerStaffService(gymId: string) {
  return userRepository.findStaffByGym(gymId);
}
