import { ClerkRepository } from "@/repositories/clerk.repository";

const clerkRepository = new ClerkRepository();

/**
 * Mirror attendance check-in into Walk-in Payments → Today's Log (ClerkTransaction).
 * Idempotent via notes marker `Attendance {id}` — no schema change, no duplicates.
 */
export async function EnsureAttendancePaymentLogService(opts: {
  gymId: string;
  actorId: string;
  attendanceId: string;
  memberName: string;
  kind: "MEMBER" | "WALK_IN";
  amount: number;
  checkedInAt: Date;
}): Promise<boolean> {
  const marker = `Attendance ${opts.attendanceId}`;
  const existing = await clerkRepository.findByNotesMarker(opts.gymId, marker);
  if (existing) return false;

  const amount = Math.max(0, Number(opts.amount) || 0);
  const kindLabel = opts.kind === "MEMBER" ? "Member" : "Walk-in";
  const checkInTime = opts.checkedInAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  // Today's Log title = notes; encode Member/Walk-in, time, status for existing UI
  const notes = `${kindLabel} check-in · ${checkInTime} · Checked in · ${marker}`;

  await clerkRepository.createTransactionRow({
    gymId: opts.gymId,
    clerkId: opts.actorId,
    type: opts.kind === "MEMBER" ? "SESSION" : "DAY_PASS",
    memberName: opts.memberName,
    amount,
    method: "CASH",
    notes,
  });
  return true;
}
