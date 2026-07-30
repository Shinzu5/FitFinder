"use client";

import { create } from "zustand";
import api from "@/lib/api";

export interface SalesReportListItem {
  id: string;
  date: string;
  clerkId: string;
  clerkName: string;
  totalTransactions: number;
  totalRevenue: number;
  closedAt: string;
  status: string;
}

export interface SalesReportReceiptTransaction {
  id: string;
  type: string;
  memberName: string;
  amount: number;
  method: string;
  notes: string;
  createdAt: string;
}

export interface SalesReportReceipt {
  id: string;
  gymId: string;
  gymName: string;
  gymAddress: string;
  date: string;
  clerkId: string;
  clerkName: string;
  totalTransactions: number;
  totalRevenue: number;
  closedAt: string;
  status: string;
  transactions: SalesReportReceiptTransaction[];
}

interface OwnerSalesReportsState {
  reports: SalesReportListItem[];
  receipt: SalesReportReceipt | null;
  loading: boolean;
  receiptLoading: boolean;
  error: string | null;
  search: string;
  dateFilter: string;
  setSearch: (value: string) => void;
  setDateFilter: (value: string) => void;
  fetchReports: (overrides?: { search?: string; dateFilter?: string }) => Promise<void>;
  fetchReceipt: (id: string) => Promise<SalesReportReceipt | null>;
  clearReceipt: () => void;
}

export const useOwnerSalesReportsStore = create<OwnerSalesReportsState>((set, get) => ({
  reports: [],
  receipt: null,
  loading: false,
  receiptLoading: false,
  error: null,
  search: "",
  dateFilter: "",

  setSearch: (value) => set({ search: value }),
  setDateFilter: (value) => set({ dateFilter: value }),

  fetchReports: async (overrides?: { search?: string; dateFilter?: string }) => {
    set({ loading: true, error: null });
    try {
      const search = overrides?.search ?? get().search;
      const dateFilter = overrides?.dateFilter ?? get().dateFilter;
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (dateFilter.trim()) params.date = dateFilter.trim();

      const { data } = await api.get("/owner/sales-reports", { params });
      if (!data.success) {
        set({ loading: false, error: data.message || "Failed to load reports." });
        return;
      }
      set({ reports: data.data || [], loading: false, error: null });
    } catch (error: any) {
      set({
        loading: false,
        error: error.response?.data?.message || "Failed to load reports.",
      });
    }
  },

  fetchReceipt: async (id) => {
    set({ receiptLoading: true, error: null });
    try {
      const { data } = await api.get(`/owner/sales-reports/${id}`);
      if (!data.success) {
        set({ receiptLoading: false, error: data.message || "Failed to load receipt." });
        return null;
      }
      set({ receipt: data.data, receiptLoading: false, error: null });
      return data.data as SalesReportReceipt;
    } catch (error: any) {
      set({
        receiptLoading: false,
        error: error.response?.data?.message || "Failed to load receipt.",
      });
      return null;
    }
  },

  clearReceipt: () => set({ receipt: null }),
}));
