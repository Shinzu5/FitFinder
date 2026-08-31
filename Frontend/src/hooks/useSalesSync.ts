"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useClerkStore } from "@/stores/clerk-store";
import { useOwnerSalesReportsStore } from "@/stores/owner-sales-reports-store";
import { getSocket } from "@/lib/socket";

/**
 * Owner/Clerk sales + reports refresh on Socket.IO `sales_updated` — no polling.
 * Owner also refreshes today's walk-in log (same APIs as Clerk).
 */
export function useSalesSync() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const fetchClerkTransactions = useClerkStore((state) => state.fetchTransactions);
  const fetchClerkDashboard = useClerkStore((state) => state.fetchDashboard);
  const fetchOwnerReports = useOwnerSalesReportsStore((state) => state.fetchReports);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (role !== "OWNER" && role !== "CLERK") return;

    const socket = getSocket(accessToken);

    function onSalesUpdated() {
      // Today's log + revenue (Owner and Clerk share walk-in payment APIs)
      void fetchClerkTransactions();
      void fetchClerkDashboard();
      if (role === "OWNER") {
        void fetchOwnerReports();
      }
    }

    socket.on("sales_updated", onSalesUpdated);
    return () => {
      socket.off("sales_updated", onSalesUpdated);
    };
  }, [
    accessToken,
    isAuthenticated,
    role,
    fetchClerkTransactions,
    fetchClerkDashboard,
    fetchOwnerReports,
  ]);
}
