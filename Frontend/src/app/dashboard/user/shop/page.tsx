"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMembershipStore } from "@/stores/membership-store";
import { useOwnerShopStore } from "@/stores/owner-shop-store";
import { ShopProductCard } from "../_components/ShopProductCard";

export default function ShopPage() {
  const router = useRouter();
  const joinedGymId = useMembershipStore((state) => state.joinedGymId);
  const fetchMembership = useMembershipStore((state) => state.fetchMembership);
  const products = useOwnerShopStore((state) => state.products);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await fetchMembership();
      setReady(true);
    })();
  }, [fetchMembership]);

  useEffect(() => {
    if (ready && !joinedGymId) {
      router.replace("/dashboard/user");
    }
  }, [ready, joinedGymId, router]);

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

      {products.length === 0 ? (
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
