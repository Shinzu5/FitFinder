import { Prisma } from "@prisma/client";
import prisma from "@/config/database";
import { upsertGymMembershipRowTx } from "@/repositories/membership.repository";
import type { UpsertGymMembershipRowInput } from "@/types/membership";

/**
 * ClerkTransaction + DailySalesReport CRUD and the daily-closing preview query.
 * 1:1 with clerk/owner controllers and attendance/approval services.
 */
export class ClerkRepository {
  // ─── ClerkTransaction: generic passthroughs ────────────────────────────────

  async findTransactions(
    args: Prisma.ClerkTransactionFindManyArgs,
  ) {
    return prisma.clerkTransaction.findMany(args);
  }

  async findTransaction(
    args: Prisma.ClerkTransactionFindFirstArgs,
  ) {
    return prisma.clerkTransaction.findFirst(args);
  }

  async aggregateTransactions(
    args: Prisma.ClerkTransactionAggregateArgs,
  ) {
    return prisma.clerkTransaction.aggregate(args);
  }

  async countTransactions(
    args: Prisma.ClerkTransactionCountArgs = {},
  ) {
    return prisma.clerkTransaction.count(args);
  }

  async createTransaction(
    args: Prisma.ClerkTransactionCreateArgs,
  ) {
    return prisma.clerkTransaction.create(args);
  }

  async updateTransaction(
    args: Prisma.ClerkTransactionUpdateArgs,
  ) {
    return prisma.clerkTransaction.update(args);
  }

  async updateTransactions(
    args: Prisma.ClerkTransactionUpdateManyArgs,
  ) {
    return prisma.clerkTransaction.updateMany(args);
  }

  async deleteTransaction(
    args: Prisma.ClerkTransactionDeleteArgs,
  ) {
    return prisma.clerkTransaction.delete(args);
  }

  async deleteTransactions(
    args: Prisma.ClerkTransactionDeleteManyArgs,
  ) {
    return prisma.clerkTransaction.deleteMany(args);
  }

  // ─── ClerkTransaction: named queries ────────────────────────────────────────

  /** Amounts recorded today (clerk dashboard revenue today). */
  async listTodayAmounts(gymId: string, startOfDay: Date) {
    return prisma.clerkTransaction.findMany({
      where: { gymId, createdAt: { gte: startOfDay } },
      select: { amount: true },
    });
  }

  /** Sum of this month's amounts (clerk dashboard monthly revenue). */
  async sumMonthAmount(gymId: string, startOfMonth: Date) {
    return prisma.clerkTransaction.aggregate({
      where: { gymId, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });
  }

  /** Amounts + timestamps for the 5-month revenue chart. */
  async listChartAmounts(gymId: string, chartStart: Date) {
    return prisma.clerkTransaction.findMany({
      where: { gymId, createdAt: { gte: chartStart } },
      select: { amount: true, createdAt: true },
    });
  }

  /** Open (not yet closed) today's-log transactions, newest first. */
  async listOpenToday(gymId: string, startOfDay: Date) {
    return prisma.clerkTransaction.findMany({
      where: {
        gymId,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Open transactions for closing preview / close, oldest first. */
  async listOpenTodayAscending(gymId: string, startOfDay: Date) {
    return prisma.clerkTransaction.findMany({
      where: {
        gymId,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Open (unclosed) payment by id within a gym (edit / delete guard). */
  async findOpenByIdAndGym(id: string, gymId: string) {
    return prisma.clerkTransaction.findFirst({
      where: { id, gymId, dailySalesReportId: null },
    });
  }

  /** Open payment id probe (delete guard). */
  async findOpenIdByIdAndGym(id: string, gymId: string) {
    return prisma.clerkTransaction.findFirst({
      where: { id, gymId, dailySalesReportId: null },
      select: { id: true },
    });
  }

  /** Idempotency probe: attendance mirror payment already logged. */
  async findByNotesMarker(gymId: string, marker: string) {
    return prisma.clerkTransaction.findFirst({
      where: { gymId, notes: { contains: marker } },
      select: { id: true },
    });
  }

  /** Idempotency probe: payment reference already recorded as a sale. */
  async findByPaymentRef(gymId: string, paymentRef: string) {
    return prisma.clerkTransaction.findFirst({
      where: { gymId, notes: { contains: paymentRef } },
      select: { id: true },
    });
  }

  async createTransactionRow(
    data: Prisma.ClerkTransactionCreateArgs["data"],
  ) {
    return prisma.clerkTransaction.create({ data });
  }

  async updateTransactionRow(
    id: string,
    data: Record<string, unknown>,
  ) {
    return prisma.clerkTransaction.update({ where: { id }, data });
  }

  async deleteTransactionById(id: string) {
    return prisma.clerkTransaction.delete({ where: { id } });
  }

  /** Attach closed transactions to their daily sales report. */
  async attachToReport(ids: string[], reportId: string) {
    return prisma.clerkTransaction.updateMany({
      where: { id: { in: ids } },
      data: { dailySalesReportId: reportId },
    });
  }

  /** Detach report links before a clerk account is purged. */
  async clearReportForClerk(clerkId: string) {
    return prisma.clerkTransaction.updateMany({
      where: { clerkId },
      data: { dailySalesReportId: null },
    });
  }

  async deleteByClerkId(clerkId: string) {
    return prisma.clerkTransaction.deleteMany({ where: { clerkId } });
  }

  async deleteByGymIds(gymIds: string[]) {
    return prisma.clerkTransaction.deleteMany({ where: { gymId: { in: gymIds } } });
  }

  // ─── DailySalesReport ───────────────────────────────────────────────────────

  async findReports(
    args: Prisma.DailySalesReportFindManyArgs,
  ) {
    return prisma.dailySalesReport.findMany(args);
  }

  async findReport(
    args: Prisma.DailySalesReportFindFirstArgs,
  ) {
    return prisma.dailySalesReport.findFirst(args);
  }

  async createReport(args: Prisma.DailySalesReportCreateArgs) {
    return prisma.dailySalesReport.create(args);
  }

  async deleteReports(
    args: Prisma.DailySalesReportDeleteManyArgs,
  ) {
    return prisma.dailySalesReport.deleteMany(args);
  }

  /** Closing preview / close-day summary: today's open transactions (ascending). */
  async listForClosing(gymId: string, startOfDay: Date) {
    return prisma.clerkTransaction.findMany({
      where: {
        gymId,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Sales reports for a gym with clerk info (owner sales-reports list). */
  async listByGymWithClerk(where: Prisma.DailySalesReportWhereInput) {
    return prisma.dailySalesReport.findMany({
      where,
      include: { clerk: { select: { id: true, fullName: true, email: true } } },
      orderBy: [{ closedAt: "desc" }],
    });
  }

  /** Report receipt with clerk + transactions (owner receipt view). */
  async findReceiptByIdAndGym(id: string, gymId: string) {
    return prisma.dailySalesReport.findFirst({
      where: { id, gymId },
      include: {
        clerk: { select: { id: true, fullName: true, email: true } },
        transactions: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async deleteReportsByClerkId(clerkId: string) {
    return prisma.dailySalesReport.deleteMany({ where: { clerkId } });
  }

  async deleteReportsByGymIds(gymIds: string[]) {
    return prisma.dailySalesReport.deleteMany({ where: { gymId: { in: gymIds } } });
  }

  // ─── Multi-write atomic units (former controller $transaction blocks) ──────

  /**
   * Register a walk-in member AND log the cash sale in ONE atomic unit
   * (was prisma.$transaction in clerk.controller registerMember).
   */
  async registerMemberAndSale(args: {
    membership: UpsertGymMembershipRowInput;
    transaction: Prisma.ClerkTransactionCreateArgs["data"];
  }) {
    return prisma.$transaction(async (tx) => {
      const row = await upsertGymMembershipRowTx(tx, args.membership);
      await tx.clerkTransaction.create({ data: args.transaction });
      return row;
    });
  }

  /**
   * Close the day: create the sales report AND attach every open transaction
   * to it in ONE atomic unit (was prisma.$transaction in clerk.controller
   * closeDailySales). Returns the report with clerk name + attached rows.
   */
  async closeDailySalesForGym(args: {
    gymId: string;
    clerkId: string;
    closedByRole: string;
    reportDate: Date;
    totalTransactions: number;
    totalRevenue: number;
    txnIds: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.dailySalesReport.create({
        data: {
          gymId: args.gymId,
          clerkId: args.clerkId,
          closedByRole: args.closedByRole,
          reportDate: args.reportDate,
          totalTransactions: args.totalTransactions,
          totalRevenue: args.totalRevenue,
        },
        include: {
          clerk: { select: { fullName: true } },
          transactions: { orderBy: { createdAt: "asc" } },
        },
      });

      await tx.clerkTransaction.updateMany({
        where: { id: { in: args.txnIds } },
        data: { dailySalesReportId: created.id },
      });

      return created;
    });
  }
}
