"use client";

import { useState } from "react";
import { Banknote, Plus, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ShopProduct, useOwnerShopStore } from "@/stores/owner-shop-store";

const MIN_CARD_ZOOM = 0.6;
const MAX_CARD_ZOOM = 1.5;
const CARD_ZOOM_STEP = 0.1;
const BASE_CARD_WIDTH = 160;

function ProductCard({
  product,
  onDelete,
  zoom,
}: {
  product: ShopProduct;
  onDelete: () => void;
  zoom: number;
}) {
  const padding = Math.round(12 * zoom);
  const titleSize = zoom < 0.85 ? "text-sm" : "text-base";
  const priceSize = zoom < 0.85 ? "text-base" : "text-lg";

  return (
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-[#141414]">
      <div className="relative aspect-square overflow-hidden bg-[#0A0A0A]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-2 top-2 rounded-lg border border-white/10 bg-black/70 p-1.5 text-zinc-300 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
          aria-label={`Delete ${product.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div style={{ padding }}>
        <h3 className={`font-medium text-white ${titleSize}`}>{product.name}</h3>
        <p className={`mt-1.5 flex items-center gap-1.5 font-bold text-[#FFD700] ${priceSize}`}>
          <Banknote className="h-3.5 w-3.5 shrink-0" />
          {product.price.toLocaleString()}
        </p>
      </div>
    </article>
  );
}

export function ShopPanel() {
  const products = useOwnerShopStore((state) => state.products);
  const addProduct = useOwnerShopStore((state) => state.addProduct);
  const removeProduct = useOwnerShopStore((state) => state.removeProduct);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardZoom, setCardZoom] = useState(0.85);

  const cardMinWidth = Math.round(BASE_CARD_WIDTH * cardZoom);
  const zoomPercent = Math.round(cardZoom * 100);

  function zoomOut() {
    setCardZoom((current) => Math.max(MIN_CARD_ZOOM, Number((current - CARD_ZOOM_STEP).toFixed(1))));
  }

  function zoomIn() {
    setCardZoom((current) => Math.min(MAX_CARD_ZOOM, Number((current + CARD_ZOOM_STEP).toFixed(1))));
  }

  function resetForm() {
    setName("");
    setPrice("");
    setImageUrl(null);
    setImageName(null);
    setError(null);
  }

  function handlePhotoUpload(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setImageUrl(result);
      setImageName(file.name);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const parsedPrice = Number(price);

    if (!trimmedName) {
      setError("Please enter a product name.");
      return;
    }
    if (!imageUrl) {
      setError("Please upload a product photo.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    addProduct({
      name: trimmedName,
      price: parsedPrice,
      imageUrl,
      imageName,
    });
    resetForm();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Shop Products</h2>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#141414] p-1">
            <button
              type="button"
              onClick={zoomOut}
              disabled={cardZoom <= MIN_CARD_ZOOM}
              className="rounded-md p-2 text-zinc-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom out product cards"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-xs font-medium text-zinc-400">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={cardZoom >= MAX_CARD_ZOOM}
              className="rounded-md p-2 text-zinc-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Zoom in product cards"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
            No products yet. Add your first product using the form on the right.
          </p>
        ) : (
          <div
            className="grid gap-3 transition-[grid-template-columns] duration-200"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardMinWidth}px, 1fr))` }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                zoom={cardZoom}
                onDelete={() => removeProduct(product.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#141414] p-5">
        <h2 className="mb-5 text-lg font-semibold text-white">Add Product</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label>Product Photo</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#0A0A0A] px-4 py-8 text-sm text-zinc-400 transition hover:border-[#FFD700]/40 hover:text-zinc-200">
              <Upload className="h-5 w-5" />
              {imageName ? imageName : "Upload Photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
              />
            </label>
            {imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Product preview"
                  className="aspect-square w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName">Name</Label>
            <Input
              id="productName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Whey Protein Isolate"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="productPrice">Price (₱)</Label>
            <Input
              id="productPrice"
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="2500"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFD700] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </form>
      </section>
    </div>
  );
}
