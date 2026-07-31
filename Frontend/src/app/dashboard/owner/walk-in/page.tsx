"use client";

import { WalkInPaymentPanel } from "../../clerk/_components/WalkInPaymentPanel";

/** Reuses the existing Clerk Walk-in Payment UI (Done / complete → activate membership). */
export default function OwnerWalkInPage() {
  return <WalkInPaymentPanel />;
}
