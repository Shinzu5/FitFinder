import { EmitToAllAdminsService } from "@/services/realtime/emit-to-all-admins-service";

/** Notify all platform admins that the Users list changed (register / verify / remove / role). */
export async function EmitAdminUsersUpdatedService(): Promise<void> {
  await EmitToAllAdminsService("admin_users_updated");
}
