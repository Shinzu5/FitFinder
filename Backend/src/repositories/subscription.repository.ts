import { Prisma } from "@prisma/client";
import prisma from "@/config/database";
import { addOwnerPlanDays, computeOwnerPlanValidUntil } from "@/utils/ownerPlan";

/**
 * OwnerSubscription + XenditPayment queries backing the owner-plan lifecycle:
 * ensure (idempotent create), dedupe, backfill, sync, heal and gym linking —
 * plus the payment lookups used by payment.controller / admin revenue.
 * 1:1 with ownerSubscription.service.ts, subscription.controller.ts,
 * payment.controller.ts and adminRevenue.service.ts.
 */
export class SubscriptionRepository {
  // ─── OwnerSubscription: generic passthroughs ───────────────────────────────

  async findSubscriptions(
    args: Prisma.OwnerSubscriptionFindManyArgs,
  ) {
    return prisma.ownerSubscription.findMany(args);
  }

  async findSubscription(
    args: Prisma.OwnerSubscriptionFindFirstArgs,
  ) {
    return prisma.ownerSubscription.findFirst(args);
  }

  async findSubscriptionById(
    args: Prisma.OwnerSubscriptionFindUniqueArgs,
  ) {
    return prisma.ownerSubscription.findUnique(args);
  }

  async countSubscriptions(
    args: Prisma.OwnerSubscriptionCountArgs = {},
  ) {
    return prisma.ownerSubscription.count(args);
  }

  async createSubscription(
    args: Prisma.OwnerSubscriptionCreateArgs,
  ) {
    return prisma.ownerSubscription.create(args);
  }

  async updateSubscription(
    args: Prisma.OwnerSubscriptionUpdateArgs,
  ) {
    return prisma.ownerSubscription.update(args);
  }

  async updateSubscriptions(
    args: Prisma.OwnerSubscriptionUpdateManyArgs,
  ) {
    return prisma.ownerSubscription.updateMany(args);
  }

  async deleteSubscription(
    args: Prisma.OwnerSubscriptionDeleteArgs,
  ) {
    return prisma.ownerSubscription.delete(args);
  }

  // ─── ensure / dedupe / backfill / sync / heal / link ───────────────────────

  /** Idempotent lookup: exactly one row per referenceNo. */
  async findByReferenceNo(referenceNo: string) {
    return prisma.ownerSubscription.findUnique({ where: { referenceNo } });
  }

  /** Latest subscription for a referenceNo (status poll / payment activation). */
  async findLatestByReferenceNo(referenceNo: string) {
    return prisma.ownerSubscription.findFirst({
      where: { referenceNo },
      orderBy: { paidAt: "desc" },
    });
  }

  async createOwnerSubscription(
    data: Prisma.OwnerSubscriptionCreateArgs["data"],
  ) {
    return prisma.ownerSubscription.create({ data });
  }

  /**
   * Idempotent ensure unit for a successful payment (was prisma.$transaction
   * in ensure-owner-subscription-from-payment): re-check the referenceNo to
   * close the race window, resolve the owner's newest gym, create the row and
   * promote the payer to OWNER — one atomic round of queries.
   */
  async createSubscriptionIfAbsent(args: {
    ownerId: string;
    referenceNo: string;
    planId: string;
    planName: string;
    price: number;
    durationDays: number;
    paidAt: Date;
    stack: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      // Re-check inside transaction to close the race window
      const raced = await tx.ownerSubscription.findUnique({
        where: { referenceNo: args.referenceNo },
      });
      if (raced) return { row: raced, created: false as const };

      let validUntil: Date;
      if (args.stack) {
        const latestActive = await tx.ownerSubscription.findFirst({
          where: {
            ownerId: args.ownerId,
            validUntil: { gt: new Date() },
          },
          orderBy: { validUntil: "desc" },
        });
        validUntil = computeOwnerPlanValidUntil(
          args.durationDays,
          latestActive?.validUntil,
        );
      } else {
        validUntil = addOwnerPlanDays(args.paidAt, args.durationDays);
      }

      const gym = await tx.gym.findFirst({
        where: { ownerId: args.ownerId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      const row = await tx.ownerSubscription.create({
        data: {
          ownerId: args.ownerId,
          gymId: gym?.id ?? null,
          planId: args.planId,
          planName: args.planName,
          price: args.price,
          // Store duration in days (column name `months` kept for schema compatibility)
          months: args.durationDays,
          referenceNo: args.referenceNo,
          method: "Xendit",
          paidAt: args.paidAt,
          validUntil,
        },
      });

      await tx.user.update({
        where: { id: args.ownerId },
        data: { role: "OWNER" },
      });

      return { row, created: true as const };
    });
  }

  /** Newest still-valid subscription for an owner (stacked validUntil calc). */
  async findLiveByOwner(ownerId: string) {
    return prisma.ownerSubscription.findFirst({
      where: { ownerId, validUntil: { gt: new Date() } },
      orderBy: { validUntil: "desc" },
    });
  }

  /** All rows sharing a referenceNo, earliest first (dedupe keeps the first). */
  async listByReferenceNo(referenceNo: string) {
    return prisma.ownerSubscription.findMany({
      where: { referenceNo },
      orderBy: { paidAt: "asc" },
    });
  }

  /** Reference numbers appearing more than once (legacy race leftovers). */
  async findDuplicateReferenceNos() {
    return prisma.$queryRaw<Array<{ referenceNo: string; cnt: bigint }>>`
      SELECT "referenceNo", COUNT(*)::bigint AS cnt
      FROM owner_subscriptions
      GROUP BY "referenceNo"
      HAVING COUNT(*) > 1
    `;
  }

  async deleteSubscriptionById(id: string) {
    return prisma.ownerSubscription.delete({ where: { id } });
  }

  /** Rows scanned by the duration heal job (paidAt + months + validUntil). */
  async listForDurationHeal() {
    return prisma.ownerSubscription.findMany({
      select: { id: true, paidAt: true, months: true, validUntil: true },
    });
  }

  async updateValidUntil(id: string, validUntil: Date) {
    return prisma.ownerSubscription.update({
      where: { id },
      data: { validUntil },
    });
  }

  /** Subscriptions not yet linked to a gym. */
  async listUnlinked() {
    return prisma.ownerSubscription.findMany({
      where: { gymId: null },
      select: { id: true, ownerId: true },
    });
  }

  async linkGymById(
    subscriptionId: string,
    ownerId: string,
    gymId: string,
  ) {
    return prisma.ownerSubscription.updateMany({
      where: { id: subscriptionId, ownerId },
      data: { gymId },
    });
  }

  async updateGymById(id: string, gymId: string) {
    return prisma.ownerSubscription.update({ where: { id }, data: { gymId } });
  }

  /** Owner's most recent purchase (link on gym create). */
  async findLatestByOwner(ownerId: string) {
    return prisma.ownerSubscription.findFirst({
      where: { ownerId },
      orderBy: { paidAt: "desc" },
    });
  }

  /** Latest purchase per owner for a set of owners (admin lists). */
  async listByOwnerIds(ownerIds: string[]) {
    return prisma.ownerSubscription.findMany({
      where: { ownerId: { in: ownerIds } },
      orderBy: { paidAt: "desc" },
    });
  }

  /** Subscriptions ordered by paidAt desc (dashboard status maps). */
  async listAllByPaidAtDesc() {
    return prisma.ownerSubscription.findMany({
      orderBy: { paidAt: "desc" },
      select: { ownerId: true, validUntil: true },
    });
  }

  /** Every subscription ordered by validUntil desc (owner plan countdown jobs). */
  async listAllByValidUntilDesc() {
    return prisma.ownerSubscription.findMany({
      orderBy: { validUntil: "desc" },
      select: {
        id: true,
        ownerId: true,
        gymId: true,
        planName: true,
        validUntil: true,
      },
    });
  }

  /** Subscriptions for these payment references, with gym name (revenue rows). */
  async listByReferenceNos(referenceNos: string[]) {
    return prisma.ownerSubscription.findMany({
      where: { referenceNo: { in: referenceNos } },
      include: { gym: { select: { name: true } } },
    });
  }

  /** Owner's subscription with gym (my-plan). */
  async findLatestByOwnerWithGym(ownerId: string) {
    return prisma.ownerSubscription.findFirst({
      where: { ownerId },
      orderBy: { paidAt: "desc" },
      include: { gym: { select: { id: true, name: true } } },
    });
  }

  /** Expire every subscription of an owner when their gym is deleted. */
  async expireAllByOwner(ownerId: string, validUntil: Date) {
    return prisma.ownerSubscription.updateMany({
      where: { ownerId },
      data: { gymId: null, validUntil },
    });
  }

  // ─── XenditPayment: generic passthroughs ────────────────────────────────────

  async findPayments(args: Prisma.XenditPaymentFindManyArgs) {
    return prisma.xenditPayment.findMany(args);
  }

  async findPayment(args: Prisma.XenditPaymentFindFirstArgs) {
    return prisma.xenditPayment.findFirst(args);
  }

  async aggregatePayments(
    args: Prisma.XenditPaymentAggregateArgs,
  ) {
    return prisma.xenditPayment.aggregate(args);
  }

  async createPayment(args: Prisma.XenditPaymentCreateArgs) {
    return prisma.xenditPayment.create(args);
  }

  async updatePayment(args: Prisma.XenditPaymentUpdateArgs) {
    return prisma.xenditPayment.update(args);
  }

  async deletePayments(
    args: Prisma.XenditPaymentDeleteManyArgs,
  ) {
    return prisma.xenditPayment.deleteMany(args);
  }

  // ─── XenditPayment: named queries ───────────────────────────────────────────

  async createXenditPayment(
    data: Prisma.XenditPaymentCreateArgs["data"],
  ) {
    return prisma.xenditPayment.create({ data });
  }

  /** Status poll lookup: id, Xendit id or referenceId. */
  async findByIdOrXenditIdOrReference(id: string) {
    return prisma.xenditPayment.findFirst({
      where: { OR: [{ id }, { xenditPaymentId: id }, { referenceId: id }] },
    });
  }

  /** Webhook lookup: Xendit payment id or reference id. */
  async findByXenditIdOrReference(
    xenditPaymentId: string,
    referenceId: string,
  ) {
    return prisma.xenditPayment.findFirst({
      where: { OR: [{ xenditPaymentId }, { referenceId }] },
    });
  }

  async updateStatusById(
    id: string,
    data: Record<string, unknown>,
  ) {
    return prisma.xenditPayment.update({ where: { id }, data });
  }

  /** SUCCEEDED owner-plan payments, oldest first (backfill). */
  async listSucceededSubscriptionsAsc() {
    return prisma.xenditPayment.findMany({
      where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
      orderBy: { paidAt: "asc" },
    });
  }

  /** SUCCEEDED owner-plan payments, newest first (sync latest per owner). */
  async listSucceededSubscriptionsDesc() {
    return prisma.xenditPayment.findMany({
      where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
      orderBy: { paidAt: "desc" },
    });
  }

  /** SUCCEEDED owner-plan payments with payer info (admin revenue table). */
  async listSucceededWithUser() {
    return prisma.xenditPayment.findMany({
      where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { paidAt: "desc" },
    });
  }

  /** Revenue chart points since a date (oldest first). */
  async listSucceededSince(from: Date) {
    return prisma.xenditPayment.findMany({
      where: {
        type: "SUBSCRIPTION",
        status: "SUCCEEDED",
        paidAt: { gte: from },
      },
      select: { paidAt: true, amount: true },
      orderBy: { paidAt: "asc" },
    });
  }

  /** Total SUCCEEDED owner-plan revenue. */
  async sumSucceededRevenue() {
    const agg = await prisma.xenditPayment.aggregate({
      where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
      _sum: { amount: true },
    });
    return agg._sum.amount || 0;
  }

  /** SUCCEEDED owner-plan revenue since a date (today / week / month). */
  async sumSucceededRevenueSince(from: Date) {
    const agg = await prisma.xenditPayment.aggregate({
      where: {
        type: "SUBSCRIPTION",
        status: "SUCCEEDED",
        paidAt: { gte: from },
      },
      _sum: { amount: true },
    });
    return agg._sum.amount || 0;
  }

  /** SUCCEEDED owner-plan revenue between two dates (previous month). */
  async sumSucceededRevenueBetween(from: Date, to: Date) {
    const agg = await prisma.xenditPayment.aggregate({
      where: {
        type: "SUBSCRIPTION",
        status: "SUCCEEDED",
        paidAt: { gte: from, lt: to },
      },
      _sum: { amount: true },
    });
    return agg._sum.amount || 0;
  }

  /** Owners with a pending owner-plan payment (no subscription row yet). */
  async listPendingSubscriptionOwners(ownerIds: string[]) {
    return prisma.xenditPayment.findMany({
      where: {
        userId: { in: ownerIds },
        status: "PENDING",
        type: "SUBSCRIPTION",
      },
      select: { userId: true },
      distinct: ["userId"],
    });
  }

  async deletePaymentsByUser(userId: string) {
    return prisma.xenditPayment.deleteMany({ where: { userId } });
  }
}
