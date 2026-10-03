import { EmitToAllAdminsService } from "@/services/realtime/emit-to-all-admins-service";

/** Notify all platform admins that Active Gyms / plan data changed. */
export async function EmitAdminGymsUpdatedService(): Promise<void> {
  await EmitToAllAdminsService("admin_gyms_updated");
}
