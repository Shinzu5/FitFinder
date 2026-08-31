"use client";

import { ClerkApprovalsPanel } from "../../clerk/_components/ClerkApprovalsPanel";

/** Reuses the existing Clerk Approvals UI — Owner can approve walk-in when no Clerk (or alongside). */
export default function OwnerApprovalsPage() {
  return <ClerkApprovalsPanel />;
}
