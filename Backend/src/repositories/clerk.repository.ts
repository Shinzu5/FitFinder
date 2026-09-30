import { Prisma } from "@prisma/client";
import prisma from "../config/database";

export type Tx = typeof prisma | Prisma.TransactionClient;

/**
 * ClerkTransaction + DailySalesReport CRUD and the daily-closing preview query.
 * 1:1 with clerk/owner controllers and attendance/approval services.
 */
export class ClerkRepository {
  // ─── ClerkTransaction: generic passthroughs ────────────────────────────────

  async findTransactions(
    args: Prisma.ClerkTransactionFindManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.findMany(args);
  }

  async findTransaction(
    args: Prisma.ClerkTransactionFindFirstArgs,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.findFirst(args);
  }

  async aggregateTransactions(
    args: Prisma.ClerkTransactionAggregateArgs,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.aggregate(args);
  }

  async countTransactions(
    args: Prisma.ClerkTransactionCountArgs = {},
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.count(args);
  }

  async createTransaction(
    args: Prisma.ClerkTransactionCreateArgs,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.create(args);
  }

  async updateTransaction(
    args: Prisma.ClerkTransactionUpdateArgs,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.update(args);
  }

  async updateTransactions(
    args: Prisma.ClerkTransactionUpdateManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.updateMany(args);
  }

  async deleteTransaction(
    args: Prisma.ClerkTransactionDeleteArgs,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.delete(args);
  }

  async deleteTransactions(
    args: Prisma.ClerkTransactionDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.deleteMany(args);
  }

  // ─── ClerkTransaction: named queries ────────────────────────────────────────

  /** Amounts recorded today (clerk dashboard revenue today). */
  async listTodayAmounts(gymId: string, startOfDay: Date, tx: Tx = prisma) {
    return tx.clerkTransaction.findMany({
      where: { gymId, createdAt: { gte: startOfDay } },
      select: { amount: true },
    });
  }

  /** Sum of this month's amounts (clerk dashboard monthly revenue). */
  async sumMonthAmount(gymId: string, startOfMonth: Date, tx: Tx = prisma) {
    return tx.clerkTransaction.aggregate({
      where: { gymId, createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });
  }

  /** Amounts + timestamps for the 5-month revenue chart. */
  async listChartAmounts(gymId: string, chartStart: Date, tx: Tx = prisma) {
    return tx.clerkTransaction.findMany({
      where: { gymId, createdAt: { gte: chartStart } },
      select: { amount: true, createdAt: true },
    });
  }

  /** Open (not yet closed) today's-log transactions, newest first. */
  async listOpenToday(gymId: string, startOfDay: Date, tx: Tx = prisma) {
    return tx.clerkTransaction.findMany({
      where: {
        gymId,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Open transactions for closing preview / close, oldest first. */
  async listOpenTodayAscending(gymId: string, startOfDay: Date, tx: Tx = prisma) {
    return tx.clerkTransaction.findMany({
      where: {
        gymId,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Open (unclosed) payment by id within a gym (edit / delete guard). */
  async findOpenByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.clerkTransaction.findFirst({
      where: { id, gymId, dailySalesReportId: null },
    });
  }

  /** Idempotency probe: attendance mirror payment already logged. */
  async findByNotesMarker(gymId: string, marker: string, tx: Tx = prisma) {
    return tx.clerkTransaction.findFirst({
      where: { gymId, notes: { contains: marker } },
      select: { id: true },
    });
  }

  /** Idempotency probe: payment reference already recorded as a sale. */
  async findByPaymentRef(gymId: string, paymentRef: string, tx: Tx = prisma) {
    return tx.clerkTransaction.findFirst({
      where: { gymId, notes: { contains: paymentRef } },
      select: { id: true },
    });
  }

  async createTransactionRow(
    data: Prisma.ClerkTransactionCreateArgs["data"],
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.create({ data });
  }

  async updateTransactionRow(
    id: string,
    data: Record<string, unknown>,
    tx: Tx = prisma,
  ) {
    return tx.clerkTransaction.update({ where: { id }, data });
  }

  async deleteTransactionById(id: string, tx: Tx = prisma) {
    return tx.clerkTransaction.delete({ where: { id } });
  }

  /** Attach closed transactions to their daily sales report. */
  async attachToReport(ids: string[], reportId: string, tx: Tx = prisma) {
    return tx.clerkTransaction.updateMany({
      where: { id: { in: ids } },
      data: { dailySalesReportId: reportId },
    });
  }

  /** Detach report links before a clerk account is purged. */
  async clearReportForClerk(clerkId: string, tx: Tx = prisma) {
    return tx.clerkTransaction.updateMany({
      where: { clerkId },
      data: { dailySalesReportId: null },
    });
  }

  async deleteByClerkId(clerkId: string, tx: Tx = prisma) {
    return tx.clerkTransaction.deleteMany({ where: { clerkId } });
  }

  async deleteByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.clerkTransaction.deleteMany({ where: { gymId: { in: gymIds } } });
  }

  // ─── DailySalesReport ───────────────────────────────────────────────────────

  async findReports(
    args: Prisma.DailySalesReportFindManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.dailySalesReport.findMany(args);
  }

  async findReport(
    args: Prisma.DailySalesReportFindFirstArgs,
    tx: Tx = prisma,
  ) {
    return tx.dailySalesReport.findFirst(args);
  }

  async createReport(args: Prisma.DailySalesReportCreateArgs, tx: Tx = prisma) {
    return tx.dailySalesReport.create(args);
  }

  async deleteReports(
    args: Prisma.DailySalesReportDeleteManyArgs,
    tx: Tx = prisma,
  ) {
    return tx.dailySalesReport.deleteMany(args);
  }

  /** Closing preview / close-day summary: today's open transactions (ascending). */
  async listForClosing(gymId: string, startOfDay: Date, tx: Tx = prisma) {
    return tx.clerkTransaction.findMany({
      where: {
        gymId,
        createdAt: { gte: startOfDay },
        dailySalesReportId: null,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Sales reports for a gym with clerk info (owner sales-reports list). */
  async listByGymWithClerk(where: Prisma.DailySalesReportWhereInput, tx: Tx = prisma) {
    return tx.dailySalesReport.findMany({
      where,
      include: { clerk: { select: { id: true, fullName: true, email: true } } },
      orderBy: [{ closedAt: "desc" }],
    });
  }

  /** Report receipt with clerk + transactions (owner receipt view). */
  async findReceiptByIdAndGym(id: string, gymId: string, tx: Tx = prisma) {
    return tx.dailySalesReport.findFirst({
      where: { id, gymId },
      include: {
        clerk: { select: { id: true, fullName: true, email: true } },
        transactions: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async deleteReportsByClerkId(clerkId: string, tx: Tx = prisma) {
    return tx.dailySalesReport.deleteMany({ where: { clerkId } });
  }

  async deleteReportsByGymIds(gymIds: string[], tx: Tx = prisma) {
    return tx.dailySalesReport.deleteMany({ where: { gymId: { in: gymIds } } });
  }
}
