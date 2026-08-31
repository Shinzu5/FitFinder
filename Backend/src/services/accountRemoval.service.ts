import { UserRole, type Prisma } from "@prisma/client";
import prisma from "../config/database";
import { getIO, userRoom } from "../socket";
import { emitAccountDeleted, emitAdminUsersUpdated } from "./realtime.service";

export type RemovalResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

type TxClient = Prisma.TransactionClient;

/** Shared cleanup used by single-user delete and gym cascade delete. */
export async function purgeUserRecords(tx: TxClient, userId: string): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: {
      refreshToken: null,
      clerkGymId: null,
    },
  });

  await tx.clerkTransaction.updateMany({
    where: { clerkId: userId },
    data: { dailySalesReportId: null },
  });
  await tx.clerkTransaction.deleteMany({ where: { clerkId: userId } });
  await tx.dailySalesReport.deleteMany({ where: { clerkId: userId } });

  await tx.directConversationHide.deleteMany({ where: { userId } });
  await tx.directMessage.deleteMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
  });
  await tx.message.deleteMany({ where: { senderId: userId } });
  await tx.walkInApproval.deleteMany({ where: { userId } });
  await tx.gymMembership.deleteMany({ where: { userId } });
  await tx.xenditPayment.deleteMany({ where: { userId } });

  await tx.user.delete({ where: { id: userId } });
}

export function kickUserSession(
  userId: string,
  message = "Your account has been removed. Please sign in again.",
): void {
  emitAccountDeleted(userId, message);
  try {
    getIO().in(userRoom(userId)).disconnectSockets(true);
  } catch {
    // Socket server may not be ready in tests
  }
}

/**
 * Permanently remove a platform user and revoke live sessions.
 */
export async function permanentlyDeleteUser(
  userId: string,
  options: {
    message: string;
    /** If set, only these roles may be deleted by this call. */
    allowRoles?: UserRole[];
  },
): Promise<RemovalResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { ok: false, status: 404, message: "User not found" };
  }

  if (user.role === "ADMIN") {
    return { ok: false, status: 403, message: "Cannot remove admin users" };
  }

  if (options.allowRoles && !options.allowRoles.includes(user.role)) {
    return { ok: false, status: 400, message: "User cannot be removed with this action" };
  }

  kickUserSession(userId, options.message);

  try {
    await prisma.$transaction(async (tx) => {
      await purgeUserRecords(tx, userId);
    });
  } catch (error) {
    console.error("permanentlyDeleteUser failed:", error);
    return {
      ok: false,
      status: 500,
      message:
        user.role === "CLERK"
          ? "Failed to delete clerk account. Related gym records could not be cleaned up."
          : "Failed to remove user",
    };
  }

  void emitAdminUsersUpdated();
  return { ok: true };
}
