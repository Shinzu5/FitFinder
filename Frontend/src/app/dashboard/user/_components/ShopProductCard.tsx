"use client";

import type { ShopProduct } from "@/stores/owner-shop-store";

interface ShopProductCardProps {
  product: ShopProduct;
}

export function ShopProductCard({ product }: ShopProductCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
      <div className="aspect-square overflow-hidden bg-[#131315]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
        />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-sm font-medium text-white">{product.name}</h3>
        <p className="flex items-center gap-1 text-base font-bold text-[#FACC15]">
          <span className="text-sm">₱</span>
          {product.price.toLocaleString()}
        </p>
      </div>
    </article>
  );
}
