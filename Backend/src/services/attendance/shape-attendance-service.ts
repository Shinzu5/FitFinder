export function ShapeAttendanceService(row: {
  id: string;
  gymId: string;
  userId: string | null;
  memberName: string;
  type: string;
  paymentAmount: number;
  checkedInAt: Date;
  checkedOutAt: Date | null;
  checkedInById: string | null;
}) {
  return {
    id: row.id,
    gymId: row.gymId,
    userId: row.userId,
    memberName: row.memberName,
    type: row.type,
    paymentAmount: row.paymentAmount,
    checkedInAt: row.checkedInAt.toISOString(),
    checkedOutAt: row.checkedOutAt ? row.checkedOutAt.toISOString() : null,
    checkedInById: row.checkedInById,
    isCheckedIn: !row.checkedOutAt,
  };
}
