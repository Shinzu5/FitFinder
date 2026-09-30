import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

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
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.findMany(args);
  }

  async findSubscription(
    args: Prisma.OwnerSubscriptionFindFirstArgs,
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.findFirst(args);
  }

  async findSubscriptionById(
    args: Prisma.OwnerSubscriptionFindUniqueArgs,
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.findUnique(args);
  }

  async countSubscriptions(
    args: Prisma.OwnerSubscriptionCountArgs = {},
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.count(args);
  }

  async createSubscription(
    args: Prisma.OwnerSubscriptionCreateArgs,
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.create(args);
  }

  async updateSubscription(
    args: Prisma.OwnerSubscriptionUpdateArgs,
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.update(args);
  }

  async updateSubscriptions(
    args: Prisma.OwnerSubscriptionUpdateManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.updateMany(args);
  }

  async deleteSubscription(
    args: Prisma.OwnerSubscriptionDeleteArgs,
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.delete(args);
  }

  // ─── ensure / dedupe / backfill / sync / heal / link ───────────────────────

  /** Idempotent lookup: exactly one row per referenceNo. */
  async findByReferenceNo(referenceNo: string, tx: Tx = prisma) {
    return tx.ownerSubscription.findUnique({ where: { referenceNo } });
  }

  /** Latest subscription for a referenceNo (status poll / payment activation). */
  async findLatestByReferenceNo(referenceNo: string, tx: Tx = prisma) {
    return tx.ownerSubscription.findFirst({
      where: { referenceNo },
      orderBy: { paidAt: "desc" },
    });
  }

  async createOwnerSubscription(
    data: Prisma.OwnerSubscriptionCreateArgs["data"],
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.create({ data });
  }

  /** Newest still-valid subscription for an owner (stacked validUntil calc). */
  async findLiveByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.ownerSubscription.findFirst({
      where: { ownerId, validUntil: { gt: new Date() } },
      orderBy: { validUntil: "desc" },
    });
  }

  /** All rows sharing a referenceNo, earliest first (dedupe keeps the first). */
  async listByReferenceNo(referenceNo: string, tx: Tx = prisma) {
    return tx.ownerSubscription.findMany({
      where: { referenceNo },
      orderBy: { paidAt: "asc" },
    });
  }

  /** Reference numbers appearing more than once (legacy race leftovers). */
  async findDuplicateReferenceNos(tx: Tx = prisma) {
    return tx.$queryRaw<Array<{ referenceNo: string; cnt: bigint }>>`
      SELECT "referenceNo", COUNT(*)::bigint AS cnt
      FROM owner_subscriptions
      GROUP BY "referenceNo"
      HAVING COUNT(*) > 1
    `;
  }

  async deleteSubscriptionById(id: string, tx: Tx = prisma) {
    return tx.ownerSubscription.delete({ where: { id } });
  }

  /** Rows scanned by the duration heal job (paidAt + months + validUntil). */
  async listForDurationHeal(tx: Tx = prisma) {
    return tx.ownerSubscription.findMany({
      select: { id: true, paidAt: true, months: true, validUntil: true },
    });
  }

  async updateValidUntil(id: string, validUntil: Date, tx: Tx = prisma) {
    return tx.ownerSubscription.update({
      where: { id },
      data: { validUntil },
    });
  }

  /** Subscriptions not yet linked to a gym. */
  async listUnlinked(tx: Tx = prisma) {
    return tx.ownerSubscription.findMany({
      where: { gymId: null },
      select: { id: true, ownerId: true },
    });
  }

  async linkGymById(
    subscriptionId: string,
    ownerId: string,
    gymId: string,
    tx: Tx = prisma,
  ) {
    return tx.ownerSubscription.updateMany({
      where: { id: subscriptionId, ownerId },
      data: { gymId },
    });
  }

  async updateGymById(id: string, gymId: string, tx: Tx = prisma) {
    return tx.ownerSubscription.update({ where: { id }, data: { gymId } });
  }

  /** Owner's most recent purchase (link on gym create). */
  async findLatestByOwner(ownerId: string, tx: Tx = prisma) {
    return tx.ownerSubscription.findFirst({
      where: { ownerId },
      orderBy: { paidAt: "desc" },
    });
  }

  /** Latest purchase per owner for a set of owners (admin lists). */
  async listByOwnerIds(ownerIds: string[], tx: Tx = prisma) {
    return tx.ownerSubscription.findMany({
      where: { ownerId: { in: ownerIds } },
      orderBy: { paidAt: "desc" },
    });
  }

  /** Subscriptions ordered by paidAt desc (dashboard status maps). */
  async listAllByPaidAtDesc(tx: Tx = prisma) {
    return tx.ownerSubscription.findMany({
      orderBy: { paidAt: "desc" },
      select: { ownerId: true, validUntil: true },
    });
  }

  /** Subscriptions for these payment references, with gym name (revenue rows). */
  async listByReferenceNos(referenceNos: string[], tx: Tx = prisma) {
    return tx.ownerSubscription.findMany({
      where: { referenceNo: { in: referenceNos } },
      include: { gym: { select: { name: true } } },
    });
  }

  /** Owner's subscription with gym (my-plan). */
  async findLatestByOwnerWithGym(ownerId: string, tx: Tx = prisma) {
    return tx.ownerSubscription.findFirst({
      where: { ownerId },
      orderBy: { paidAt: "desc" },
      include: { gym: { select: { id: true, name: true } } },
    });
  }

  /** Expire every subscription of an owner when their gym is deleted. */
  async expireAllByOwner(ownerId: string, validUntil: Date, tx: Tx = prisma) {
    return tx.ownerSubscription.updateMany({
      where: { ownerId },
      data: { gymId: null, validUntil },
    });
  }

  // ─── XenditPayment: generic passthroughs ────────────────────────────────────

  async findPayments(args: Prisma.XenditPaymentFindManyArgs, tx: Tx = prisma) {
    return tx.xenditPayment.findMany(args);
  }

  async findPayment(args: Prisma.XenditPaymentFindFirstArgs, tx: Tx = prisma) {
    return tx.xenditPayment.findFirst(args);
  }

  async aggregatePayments(
    args: Prisma.XenditPaymentAggregateArgs,
    tx: Tx = prisma,
  ) {
    return tx.xenditPayment.aggregate(args);
  }

  async createPayment(args: Prisma.XenditPaymentCreateArgs, tx: Tx = prisma) {
    return tx.xenditPayment.create(args);
  }

  async updatePayment(args: Prisma.XenditPaymentUpdateArgs, tx: Tx = prisma) {
    return tx.xenditPayment.update(args);
  }

  async deletePayments(
    args: Prisma.XenditPaymentDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.xenditPayment.deleteMany(args);
  }

  // ─── XenditPayment: named queries ───────────────────────────────────────────

  async createXenditPayment(
    data: Prisma.XenditPaymentCreateArgs["data"],
    tx: Tx = prisma,
  ) {
    return tx.xenditPayment.create({ data });
  }

  /** Status poll lookup: id, Xendit id or referenceId. */
  async findByIdOrXenditIdOrReference(id: string, tx: Tx = prisma) {
    return tx.xenditPayment.findFirst({
      where: { OR: [{ id }, { xenditPaymentId: id }, { referenceId: id }] },
    });
  }

  /** Webhook lookup: Xendit payment id or reference id. */
  async findByXenditIdOrReference(
    xenditPaymentId: string,
    referenceId: string,
    tx: Tx = prisma,
  ) {
    return tx.xenditPayment.findFirst({
      where: { OR: [{ xenditPaymentId }, { referenceId }] },
    });
  }

  async updateStatusById(
    id: string,
    data: Record<string, unknown>,
    tx: Tx = prisma,
  ) {
    return tx.xenditPayment.update({ where: { id }, data });
  }

  /** SUCCEEDED owner-plan payments, oldest first (backfill). */
  async listSucceededSubscriptionsAsc(tx: Tx = prisma) {
    return tx.xenditPayment.findMany({
      where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
      orderBy: { paidAt: "asc" },
    });
  }

  /** SUCCEEDED owner-plan payments, newest first (sync latest per owner). */
  async listSucceededSubscriptionsDesc(tx: Tx = prisma) {
    return tx.xenditPayment.findMany({
      where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
      orderBy: { paidAt: "desc" },
    });
  }

  /** SUCCEEDED owner-plan payments with payer info (admin revenue table). */
  async listSucceededWithUser(tx: Tx = prisma) {
    return tx.xenditPayment.findMany({
      where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { paidAt: "desc" },
    });
  }

  /** Revenue chart points since a date (oldest first). */
  async listSucceededSince(from: Date, tx: Tx = prisma) {
    return tx.xenditPayment.findMany({
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
  async sumSucceededRevenue(tx: Tx = prisma) {
    const agg = await tx.xenditPayment.aggregate({
      where: { type: "SUBSCRIPTION", status: "SUCCEEDED" },
      _sum: { amount: true },
    });
    return agg._sum.amount || 0;
  }

  /** SUCCEEDED owner-plan revenue since a date (today / week / month). */
  async sumSucceededRevenueSince(from: Date, tx: Tx = prisma) {
    const agg = await tx.xenditPayment.aggregate({
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
  async sumSucceededRevenueBetween(from: Date, to: Date, tx: Tx = prisma) {
    const agg = await tx.xenditPayment.aggregate({
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
  async listPendingSubscriptionOwners(ownerIds: string[], tx: Tx = prisma) {
    return tx.xenditPayment.findMany({
      where: {
        userId: { in: ownerIds },
        status: "PENDING",
        type: "SUBSCRIPTION",
      },
      select: { userId: true },
      distinct: ["userId"],
    });
  }

  async deletePaymentsByUser(userId: string, tx: Tx = prisma) {
    return tx.xenditPayment.deleteMany({ where: { userId } });
  }
}
