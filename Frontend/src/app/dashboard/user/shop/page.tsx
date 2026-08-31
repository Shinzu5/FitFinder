"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMembershipStore } from "@/stores/membership-store";
import { useMemberGymContentStore } from "@/stores/member-gym-content-store";
import { ShopProductCard } from "../_components/ShopProductCard";

export default function ShopPage() {
  const router = useRouter();
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const products = useMemberGymContentStore((state) => state.products);
  const loading = useMemberGymContentStore((state) => state.loadingShop);
  const error = useMemberGymContentStore((state) => state.shopError);
  const fetchShop = useMemberGymContentStore((state) => state.fetchShop);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await fetchMembership();
      setReady(true);
    })();
  }, [fetchMembership]);

  useEffect(() => {
    if (!ready) return;
    if (!joinedGymId) {
      router.replace("/dashboard/user/membership");
      return;
    }
    void fetchShop();
  }, [ready, joinedGymId, fetchShop, router]);

  if (!ready || !joinedGymId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold text-white">Gym Shop</h1>

      {loading && products.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-10 text-center">
          <p className="text-sm text-zinc-400">Loading products…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-10 text-center">
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/70 bg-[#0e0e10] p-10 text-center">
          <p className="text-sm text-zinc-400">
            No products available yet. Your gym owner will add items here soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ShopProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
