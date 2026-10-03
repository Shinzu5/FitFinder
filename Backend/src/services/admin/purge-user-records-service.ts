import { AdminRepository } from "@/repositories/admin.repository";

const adminRepository = new AdminRepository();

/**
 * Permanently delete a user and every record tied to them
 * (one atomic unit owned by the repository).
 */
export async function PurgeUserRecordsService(userId: string): Promise<void> {
  await adminRepository.purgeUserRecords(userId);
}
