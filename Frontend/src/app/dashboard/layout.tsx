"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Brain,
  CreditCard,
  Dumbbell,
  Home,
  Lock,
  MessageSquare,
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useMembershipStore } from "@/stores/membership-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { useWalkInApprovalSync } from "@/hooks/useWalkInApprovalSync";
import { useOwnerRepurchaseSync } from "@/hooks/useOwnerRepurchaseSync";
import { useAccountDeletedSync } from "@/hooks/useAccountDeletedSync";
import { useDirectMessageSocket } from "@/hooks/useDirectMessageSocket";
import { useNotificationsSocket } from "@/hooks/useNotificationsSocket";
import { useMembersListSync } from "@/hooks/useMembersListSync";
import { useMemberGymContentSync } from "@/hooks/useMemberGymContentSync";
import { useSalesSync } from "@/hooks/useSalesSync";
import { useAttendanceSync } from "@/hooks/useAttendanceSync";
import { UserProfileMenu } from "@/app/dashboard/user/_components/UserProfileMenu";
import { useWalkInApprovalsStore } from "@/stores/walk-in-approvals-store";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { gymIdFromUserPath } from "@/lib/gym-access";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard/user", icon: Home, unlockRequired: false },
  // Membership stays reachable while Pending — other features need ACTIVE membership
  { label: "My Membership", href: "/dashboard/user/membership", icon: CreditCard, unlockRequired: false },
  { label: "Exercises", href: "/dashboard/user/exercises", icon: Dumbbell, unlockRequired: true },
  { label: "Equipment", href: "/dashboard/user/equipment", icon: Wrench, unlockRequired: true },
  { label: "Shop", href: "/dashboard/user/shop", icon: ShoppingBag, unlockRequired: true },
  { label: "Messages", href: "/dashboard/user/messages", icon: MessageSquare, unlockRequired: true },
  { label: "AI Assistant", href: "/dashboard/user/ai", icon: Brain, unlockRequired: true },
] as const;

const CREATE_GYM_PREFIX = "/dashboard/user/create-gym";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, logout, isAuthenticated, hasHydrated, syncSessionFromServer } =
    useAuthStore();
  const fetchOwnedGymStatus = useCreateGymStore((state) => state.fetchOwnedGymStatus);
  const [ready, setReady] = useState(false);
  const gatedRoleRef = useRef<string | null>(null);
  const sessionSyncedRef = useRef(false);

  useDirectMessageSocket();
  useNotificationsSocket();
  useOwnerRepurchaseSync();
  useMembersListSync();
  useMemberGymContentSync();
  useSalesSync();
  useAttendanceSync();

  // Reconcile persisted localStorage role with Neon after hydrate / login
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      sessionSyncedRef.current = false;
      return;
    }
    if (sessionSyncedRef.current) return;
    sessionSyncedRef.current = true;
    void syncSessionFromServer();
  }, [hasHydrated, isAuthenticated, syncSessionFromServer]);
  useAccountDeletedSync();

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      useAuthStore.getState().setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;

    async function enforceAccess() {
      if (!isAuthenticated || !role) {
        gatedRoleRef.current = null;
        setReady(false);
        router.replace("/login");
        return;
      }

      const isCreateGymPath = pathname.startsWith(CREATE_GYM_PREFIX);
      const rolePath = `/dashboard/${role.toLowerCase()}`;
      const alreadyGated = gatedRoleRef.current === role;

      // Fast path: same role already allowed — only correct path, no full-screen reload
      if (alreadyGated) {
        if (role === "OWNER") {
          const owned = useCreateGymStore.getState().hasOwnedGym === true;
          if (isCreateGymPath && owned) {
            router.replace("/dashboard/owner/payment-settings");
            return;
          }
          // Paid owner still registering a gym — stay on create-gym, no loading flash
          if (isCreateGymPath && !owned) {
            return;
          }
          if (!pathname.startsWith(rolePath)) {
            router.replace(rolePath);
          }
          return;
        }

        if (isCreateGymPath && role !== "USER") {
          router.replace(rolePath);
          return;
        }

        if (!pathname.startsWith(rolePath) && !(role === "USER" && isCreateGymPath)) {
          router.replace(rolePath);
        }
        return;
      }

      if (role === "OWNER") {
        const createGym = useCreateGymStore.getState();
        const cached = createGym.hasOwnedGym;

        // Instant unlock when gym already registered — never flash "Checking access..."
        if (cached === true) {
          gatedRoleRef.current = "OWNER";
          if (isCreateGymPath) {
            router.replace("/dashboard/owner/payment-settings");
          } else if (!pathname.startsWith(rolePath)) {
            router.replace(rolePath);
          }
          setReady(true);
          return;
        }

        // Paid but gym not created yet — keep create-gym flow ready (no stuck loader)
        if (createGym.paymentComplete && (isCreateGymPath || cached === false)) {
          gatedRoleRef.current = "OWNER";
          if (!isCreateGymPath) {
            router.replace(`${CREATE_GYM_PREFIX}/register`);
          }
          setReady(true);
          return;
        }

        if (!alreadyGated) setReady(false);

        const hasGym = await fetchOwnedGymStatus();
        if (cancelled) return;

        if (!hasGym) {
          const createGym = useCreateGymStore.getState();
          useAuthStore.getState().demoteToUser();
          gatedRoleRef.current = "USER";
          setReady(true);

          // Paid + no gym yet → register. Plan wiped (gym deleted) → plan payment.
          if (createGym.paymentComplete) {
            if (!pathname.startsWith(CREATE_GYM_PREFIX)) {
              router.replace(`${CREATE_GYM_PREFIX}/register`);
            }
            return;
          }

          if (!pathname.startsWith(CREATE_GYM_PREFIX)) {
            router.replace(CREATE_GYM_PREFIX);
            return;
          }
          if (pathname.startsWith(`${CREATE_GYM_PREFIX}/plans`)) {
            router.replace(CREATE_GYM_PREFIX);
          }
          return;
        }

        gatedRoleRef.current = "OWNER";
        setReady(true);
        if (isCreateGymPath) {
          router.replace("/dashboard/owner/payment-settings");
          return;
        }
        if (!pathname.startsWith(rolePath)) {
          router.replace(rolePath);
        }
        return;
      }

      if (!alreadyGated) setReady(false);

      if (isCreateGymPath && role !== "USER") {
        router.replace(rolePath);
        return;
      }

      if (!pathname.startsWith(rolePath) && !(role === "USER" && isCreateGymPath)) {
        router.replace(rolePath);
        return;
      }

      if (!cancelled) {
        gatedRoleRef.current = role;
        setReady(true);
      }
    }

    void enforceAccess();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isAuthenticated, pathname, role, router, fetchOwnedGymStatus]);

  // Rare ownership check — not every 2s (that caused Neon 500s + tab lag)
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || role !== "OWNER") return;

    let cancelled = false;

    async function kickIfGymGone() {
      const hasGym = await fetchOwnedGymStatus();
      if (cancelled || hasGym) return;

      const createGym = useCreateGymStore.getState();
      // Active plan + no gym = still onboarding (register). No plan = must pay again.
      if (createGym.paymentComplete) {
        gatedRoleRef.current = "USER";
        useAuthStore.getState().demoteToUser();
        if (!pathname.startsWith(CREATE_GYM_PREFIX)) {
          router.replace(`${CREATE_GYM_PREFIX}/register`);
        }
        return;
      }

      gatedRoleRef.current = null;
      createGym.resetFlow();
      useAuthStore.getState().demoteToUser();
      router.replace(CREATE_GYM_PREFIX);
    }

    const onFocus = () => void kickIfGymGone();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void kickIfGymGone(), 60000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [hasHydrated, isAuthenticated, pathname, role, router, fetchOwnedGymStatus]);

  // Clerks: never rewrite role to Gymer. Hard removal uses ACCOUNT_DELETED / socket logout.
  // Soft dashboard 404/5xx/network blips must not change the Neon role in localStorage.

  if (!hasHydrated || !ready || !user || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-10 animate-pulse rounded-2xl bg-white/10" />
          <p className="text-center text-sm text-zinc-500">Checking access...</p>
        </div>
      </div>
    );
  }

  if (pathname.startsWith(CREATE_GYM_PREFIX)) {
    return <>{children}</>;
  }

  if (role === "USER") {
    return <UserShell pathname={pathname}>{children}</UserShell>;
  }

  if (role === "OWNER" || role === "CLERK" || role === "ADMIN") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="font-semibold text-[#FFD700]">FitFinder · {role}</p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

/** USER shell: always sync membership (cashless + walk-in) so unlock is reactive. */
function UserShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const enrolledGymIds = useMembershipStore((state) => state.enrolledGymIds);
  useWalkInApprovalSync();

  // Join/payment for a gym without LIVE membership at THAT gym → bare shell
  // (multi-gym: Gym A active must not unlock the Gym B join/waiting chrome)
  const pathGymId = gymIdFromUserPath(pathname);
  const liveAtPathGym = pathGymId ? enrolledGymIds.includes(pathGymId) : false;
  const isGymFlowPage =
    pathname.startsWith("/dashboard/user/gym/") && !liveAtPathGym;
  if (isGymFlowPage) {
    return <div className="min-h-screen bg-black text-white">{children}</div>;
  }

  return <UserDashboardFrame pathname={pathname}>{children}</UserDashboardFrame>;
}

function UserDashboardFrame({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const unlocked = Boolean(joinedGymId);
  const walkInRequests = useWalkInApprovalsStore((state) => state.requests);
  const user = useAuthStore((state) => state.user);

  const pendingForSelectedOrFirst = Boolean(
    user?.id &&
      walkInRequests.some(
        (req) =>
          req.userId === user.id &&
          !req.consumedAt &&
          (req.status === "pending" || req.status === "approved") &&
          // Pending for a gym that is not the live selected gym (or no live gym yet)
          (!joinedGymId || req.gymId !== joinedGymId),
      ),
  );

  // First-gym (or only) pending: no LIVE membership → lock Home + features; Membership only
  const pendingLockdown = !unlocked && pendingForSelectedOrFirst;

  useEffect(() => {
    if (pendingLockdown && pathname === "/dashboard/user") {
      router.replace("/dashboard/user/membership");
    }
  }, [pendingLockdown, pathname, router]);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0A0A0A] px-4 py-5">
        <Link
          href={pendingLockdown ? "/dashboard/user/membership" : "/dashboard/user"}
          className="mb-8 flex items-center gap-2.5 px-2"
        >
          <Image
            src="/LOGO.png"
            alt="Fit Finder"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md object-contain"
          />
          <span className="text-sm font-bold tracking-wider">
            <span className="text-white">FIT</span>
            <span className="text-[#FFD700]"> FINDER</span>
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Gymer
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const locked =
              item.href === "/dashboard/user"
                ? pendingLockdown
                : item.unlockRequired && !unlocked;
            const active = pathname === item.href;
            const Icon = item.icon;

            if (locked) {
              return (
                <div
                  key={item.label}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-600"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "border-l-2 border-[#FACC15] bg-[#FACC15]/10 font-medium text-[#FACC15]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-white/10 px-6 py-3">
          <div className="flex items-center gap-3">
            {!unlocked || pendingForSelectedOrFirst ? (
              <div className="hidden max-w-md items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 sm:flex">
                <span className="text-[#FFD700]">⚠</span>
                {pendingForSelectedOrFirst
                  ? "Waiting for Owner/Clerk Approval"
                  : "Dashboard locked — join a gym and complete payment to unlock"}
              </div>
            ) : null}
            <NotificationBell buttonClassName="rounded-full border border-white/10 p-2 text-zinc-300" />
            <UserProfileMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
