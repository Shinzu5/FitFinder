"use client";

import { useEffect, useState } from "react";
import { useAttendanceStore } from "@/stores/attendance-store";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function AttendancePanel() {
  const {
    gymName,
    activeNow,
    members,
    open,
    loading,
    error,
    fetchAttendance,
    checkInMember,
    checkOut,
    checkInWalkIn,
  } = useAttendanceStore();

  const [walkInName, setWalkInName] = useState("");
  const [walkInPrice, setWalkInPrice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  async function handleCheckIn(userId: string) {
    setBusyId(userId);
    setFormError(null);
    const ok = await checkInMember(userId);
    if (!ok) setFormError(useAttendanceStore.getState().error);
    setBusyId(null);
  }

  async function handleCheckOut(attendanceId: string) {
    setBusyId(attendanceId);
    setFormError(null);
    const ok = await checkOut(attendanceId);
    if (!ok) setFormError(useAttendanceStore.getState().error);
    setBusyId(null);
  }

  async function handleWalkIn(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const amount = Number(walkInPrice);
    if (!walkInName.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError("Enter a valid payment/price.");
      return;
    }
    setSubmittingWalkIn(true);
    const ok = await checkInWalkIn(walkInName.trim(), amount);
    setSubmittingWalkIn(false);
    if (!ok) {
      setFormError(useAttendanceStore.getState().error);
      return;
    }
    setWalkInName("");
    setWalkInPrice("");
  }

  const walkInOpen = open.filter((a) => a.type === "WALK_IN");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Attendance</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manual check-in / check-out for {gymName || "your gym"}.
          </p>
        </div>
        <div className="rounded-2xl border border-[#FACC15]/30 bg-[#FACC15]/10 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#FACC15]/80">
            Active Now
          </p>
          <p className="text-3xl font-bold text-[#FACC15]">
            {loading ? "…" : activeNow}
          </p>
        </div>
      </div>

      {formError || error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {formError || error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
          <div className="border-b border-zinc-800/70 px-5 py-4">
            <h3 className="text-lg font-bold text-white">Registered Members</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Active members only. Check in once; check out before the next visit.
            </p>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {loading && members.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">Loading…</p>
            ) : members.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">
                No active members yet.
              </p>
            ) : (
              members.map((member) => (
                <article
                  key={member.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{member.fullName}</p>
                    <p className="text-xs text-zinc-500">
                      {member.plan}
                      {member.checkedIn ? " · Checked in" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {member.checkedIn && member.openAttendanceId ? (
                      <button
                        type="button"
                        disabled={busyId === member.openAttendanceId}
                        onClick={() => void handleCheckOut(member.openAttendanceId!)}
                        className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white disabled:opacity-50"
                      >
                        Check Out
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === member.id}
                        onClick={() => void handleCheckIn(member.id)}
                        className="rounded-xl bg-[#FACC15] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-50"
                      >
                        Check In
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          <form
            onSubmit={handleWalkIn}
            className="space-y-4 rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5"
          >
            <h3 className="text-lg font-bold text-white">Walk-in Visitor</h3>
            <p className="text-sm text-zinc-500">
              Record a visitor without an account, then check them out when they leave.
            </p>
            <div className="space-y-2">
              <label htmlFor="walkInName" className="text-sm font-medium text-zinc-400">
                Name
              </label>
              <input
                id="walkInName"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Visitor name"
                className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#FACC15]/40"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="walkInPrice" className="text-sm font-medium text-zinc-400">
                Payment / Price (₱)
              </label>
              <input
                id="walkInPrice"
                type="number"
                min={0}
                value={walkInPrice}
                onChange={(e) => setWalkInPrice(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-zinc-800 bg-[#131315] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-[#FACC15]/40"
              />
            </div>
            <button
              type="submit"
              disabled={submittingWalkIn}
              className="w-full rounded-xl bg-[#FACC15] py-3 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-60"
            >
              {submittingWalkIn ? "Saving…" : "Check In Walk-in"}
            </button>
          </form>

          <section className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-5">
            <h3 className="font-bold text-white">Checked In Now</h3>
            <div className="mt-4 space-y-3">
              {open.length === 0 ? (
                <p className="text-sm text-zinc-500">Nobody is checked in.</p>
              ) : (
                open.map((row) => (
                  <article
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-[#131315] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {row.memberName}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {row.type === "WALK_IN" ? "Walk-in" : "Member"} ·{" "}
                        {formatTime(row.checkedInAt)}
                        {row.type === "WALK_IN"
                          ? ` · ₱${Number(row.paymentAmount).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void handleCheckOut(row.id)}
                      className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-50"
                    >
                      Check Out
                    </button>
                  </article>
                ))
              )}
            </div>
            {walkInOpen.length > 0 ? (
              <p className="mt-4 text-xs text-zinc-600">
                Walk-in visitors can be checked out from this list.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
