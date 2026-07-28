"use client";

import { useAdminStore } from "@/stores/admin-store";
import { useAdminGymApprovalsStore } from "@/stores/admin-gym-approvals-store";
import { GymApprovalCard } from "./GymApprovalCard";

export function GymApprovalsPanel() {
  const applications = useAdminGymApprovalsStore((state) => state.applications);
  const approveApplication = useAdminGymApprovalsStore((state) => state.approveApplication);
  const declineApplication = useAdminGymApprovalsStore((state) => state.declineApplication);
  const addActivity = useAdminStore((state) => state.addActivity);

  const pending = applications.filter((app) => app.status === "pending");
  const reviewed = applications.filter((app) => app.status !== "pending");

  function handleApprove(id: string) {
    const approved = approveApplication(id);
    if (!approved) return;
    addActivity(`${approved.gymName} approved`, "success");
  }

  function handleDecline(id: string) {
    const declined = declineApplication(id);
    if (!declined) return;
    addActivity(`${declined.gymName} application declined`, "warning");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">Pending Approvals</h2>

        {pending.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] px-6 py-14 text-center">
            <p className="text-sm text-zinc-500">No pending gym applications right now.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {pending.map((app) => (
              <GymApprovalCard
                key={app.id}
                application={app}
                onApprove={handleApprove}
                onReject={handleDecline}
              />
            ))}
          </div>
        )}
      </section>

      {reviewed.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
          <div className="border-b border-zinc-800/70 px-5 py-4">
            <h3 className="font-bold text-white">Recently Reviewed</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-4">Gym</th>
                  <th className="px-5 py-4">Owner</th>
                  <th className="px-5 py-4">Plan</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {reviewed.slice(0, 8).map((app) => (
                  <tr key={app.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-5 py-4 font-semibold text-white">{app.gymName}</td>
                    <td className="px-5 py-4 text-zinc-400">{app.ownerName}</td>
                    <td className="px-5 py-4 text-zinc-400">{app.planName}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          app.status === "approved"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-red-500/30 bg-red-500/10 text-red-400"
                        }`}
                      >
                        {app.status === "approved" ? "Approved" : "Declined"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
