import prisma from "../config/database";
import { getOwnerPlanById, resolveOwnerPlanFromMetadata } from "../config/ownerPlans";
import { buildRevenueChartSeries } from "../utils/adminRevenue";
import { daysRemainingUntil, storedDurationToDays } from "../utils/ownerPlan";

/** Platform revenue = SUCCEEDED owner-plan Xendit payments (never wiped on gym delete). */
export async function getSucceededOwnerPayments() {
  return prisma.xenditPayment.findMany({
    where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { paidAt: "desc" },
  });
}

export async function sumSucceededOwnerRevenue(from?: Date) {
  const agg = await prisma.xenditPayment.aggregate({
    where: {
      type: "SUBSCRIPTION",
      status: "SUCCEEDED",
      ...(from ? { paidAt: { gte: from } } : {}),
    },
    _sum: { amount: true },
  });
  return agg._sum.amount || 0;
}

export async function getOwnerRevenueChartSeries(now = new Date()) {
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const payments = await prisma.xenditPayment.findMany({
    where: {
      type: "SUBSCRIPTION",
      status: "SUCCEEDED",
      paidAt: { gte: yearAgo },
    },
    select: { paidAt: true, amount: true },
    orderBy: { paidAt: "asc" },
  });

  return buildRevenueChartSeries(
    payments
      .filter((p) => p.paidAt)
      .map((p) => ({ paidAt: p.paidAt as Date, price: p.amount })),
    now,
  );
}

export async function getOwnerRevenueStats(now = new Date()) {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [today, thisWeek, thisMonth, prevMonth, total] = await Promise.all([
    sumSucceededOwnerRevenue(startOfDay),
    sumSucceededOwnerRevenue(startOfWeek),
    sumSucceededOwnerRevenue(startOfMonth),
    prisma.xenditPayment.aggregate({
      where: {
        type: "SUBSCRIPTION",
        status: "SUCCEEDED",
        paidAt: { gte: prevMonthStart, lt: startOfMonth },
      },
      _sum: { amount: true },
    }),
    sumSucceededOwnerRevenue(),
  ]);

  return {
    today,
    thisWeek,
    thisMonth,
    prevMonth: prevMonth._sum.amount || 0,
    total,
  };
}

export function planInfoFromPaymentMetadata(metadata: unknown, amount: number) {
  const meta = (metadata || {}) as Record<string, unknown>;
  const catalog = resolveOwnerPlanFromMetadata(meta) || getOwnerPlanById(String(meta.planId || ""));
  const durationDays = catalog
    ? catalog.days
    : storedDurationToDays(Number(meta.days ?? meta.durationDays ?? meta.months) || 30);

  return {
    planId: catalog?.id || String(meta.planId || ""),
    planName: catalog?.name || String(meta.planName || "Plan"),
    /** Catalog price when known; otherwise the charged amount */
    catalogPrice: catalog?.price ?? amount,
    durationDays,
    chargedAmount: amount,
  };
}

export async function buildAdminTransactionRows(now = new Date()) {
  const payments = await getSucceededOwnerPayments();
  const refs = payments.map((p) => p.referenceId);
  const subs = refs.length
    ? await prisma.ownerSubscription.findMany({
        where: { referenceNo: { in: refs } },
        include: { gym: { select: { name: true } } },
      })
    : [];
  const subByRef = new Map(subs.map((s) => [s.referenceNo, s]));

  return payments.map((p) => {
    const info = planInfoFromPaymentMetadata(p.metadata, p.amount);
    const sub = subByRef.get(p.referenceId);
    return {
      id: p.id,
      gymName: sub?.gym?.name || "Pending setup",
      ownerId: p.userId,
      ownerName: p.user.fullName,
      ownerEmail: p.user.email,
      planId: info.planId,
      planName: info.planName,
      type: "Owner Plan" as const,
      amount: p.amount,
      method: "Xendit",
      referenceNo: p.referenceId,
      createdAt: (p.paidAt || p.createdAt).toISOString(),
      validUntil: sub?.validUntil?.toISOString() || null,
      daysLeft: sub ? daysRemainingUntil(sub.validUntil, now) : null,
      months: info.durationDays,
      durationDays: info.durationDays,
    };
  });
}
