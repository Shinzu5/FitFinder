import { UserRepository } from "@/repositories/user.repository";
import { emitToUser } from "@/socket";

const userRepository = new UserRepository();

export async function EmitToAllAdminsService(event: string, payload: unknown = {}): Promise<void> {
  const admins = await userRepository.findAdminIds();
  for (const admin of admins) {
    emitToUser(admin.id, event, payload);
  }
}
