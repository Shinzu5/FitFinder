"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { useOwnerPlanTransactionsStore } from "@/stores/owner-plan-transactions-store";

export default function RegisterGymPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const promoteToOwner = useAuthStore((state) => state.promoteToOwner);
  const attachGymToLatestPurchase = useOwnerPlanTransactionsStore(
    (state) => state.attachGymToLatestPurchase,
  );
  const { paymentComplete, referenceNo, registerGym } = useCreateGymStore();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [description, setDescription] = useState("");
  const [websiteOrSlug, setWebsiteOrSlug] = useState("");
  const [coverPhotoName, setCoverPhotoName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentComplete) {
      router.replace("/dashboard/user/create-gym");
    }
  }, [paymentComplete, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !contactNumber.trim() || !description.trim()) {
      setError("Please fill in all required gym details.");
      return;
    }

    registerGym({
      name: name.trim(),
      address: address.trim(),
      contactNumber: contactNumber.trim(),
      description: description.trim(),
      websiteOrSlug: websiteOrSlug.trim(),
      coverPhotoName,
    });
    if (user && referenceNo) {
      attachGymToLatestPurchase({
        ownerId: user.id,
        referenceNo,
        gymName: name.trim(),
      });
    }
    promoteToOwner();
    router.push("/dashboard/owner");
  }

  if (!paymentComplete) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141414] p-6 sm:p-8"
      >
        <h1 className="text-2xl font-bold">Register Your Gym</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Payment successful! Now let&apos;s get your gym set up.
        </p>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gymName">Gym Name</Label>
            <Input
              id="gymName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Strong House Gym"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Cebu City"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. 0912 345 6789"
            />
          </div>

          <div className="space-y-2">
            <Label>Cover Photo Upload</Label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#0A0A0A] px-4 py-8 text-sm text-zinc-400 transition hover:border-[#FFD700]/40 hover:text-zinc-200">
              <Upload className="h-5 w-5" />
              {coverPhotoName ? coverPhotoName : "Upload Cover Photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setCoverPhotoName(file ? file.name : null);
                }}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes your gym special?"
              rows={4}
              className="flex w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#FFD700]/50 focus:ring-1 focus:ring-[#FFD700]/30"
            />
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="mb-3 text-sm font-semibold text-white">Online Presence</p>
            <div className="space-y-2">
              <Label htmlFor="slug">Website Link or Custom Slug (optional)</Label>
              <Input
                id="slug"
                value={websiteOrSlug}
                onChange={(e) => setWebsiteOrSlug(e.target.value)}
                placeholder="e.g. https://mygym.com or @mygym"
              />
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-[#FFD700] py-3 text-sm font-bold text-black transition hover:bg-[#e6c200]"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
