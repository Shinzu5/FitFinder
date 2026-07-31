"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { GymProfileView } from "../../_components/GymProfileView";
import { resolveGymProfile } from "../../_lib/gym-profile";

export default function UserGymProfilePage() {
  const params = useParams();
  const gymId = typeof params.gymId === "string" ? params.gymId : "";

  const user = useAuthStore((state) => state.user);

  const [realGym, setRealGym] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchGym = useCallback(async (showSpinner = false) => {
    if (!gymId) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    if (showSpinner) {
      setLoading(true);
      setNotFound(false);
    }
    try {
      const { data } = await api.get(`/gyms/${gymId}`);
      if (data.success && data.data) {
        setRealGym(data.data);
        setNotFound(false);
      } else {
        setRealGym(null);
        setNotFound(true);
      }
    } catch {
      setRealGym(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    void fetchGym(true);
    const onFocus = () => void fetchGym(false);
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void fetchGym(false), 15000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [fetchGym]);

  const profile = useMemo(
    () =>
      resolveGymProfile({
        gymId,
        realGym,
        ownerName: user?.fullName ?? "Gym Owner",
        ownerAvatarUrl: user?.avatarUrl,
      }),
    [gymId, realGym, user?.fullName, user?.avatarUrl],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FACC15] border-t-transparent" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141414] p-8 text-center">
          <p className="text-lg font-semibold text-white">Gym not found</p>
          <p className="mt-2 text-sm text-zinc-400">
            This gym may have been removed or is no longer available.
          </p>
          <Link
            href="/dashboard/user"
            className="mt-6 inline-flex rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-black hover:bg-[#e6c200]"
          >
            Back to gyms
          </Link>
        </div>
      </div>
    );
  }

  return <GymProfileView profile={profile} />;
}
