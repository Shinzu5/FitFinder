"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { useCreateGymStore } from "@/stores/create-gym-store";
import { useOwnerPlanTransactionsStore } from "@/stores/owner-plan-transactions-store";
import { resolveMediaUrl, uploadImageFile } from "@/lib/media";

export default function RegisterGymPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
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
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!paymentComplete) {
      router.replace("/dashboard/user/create-gym");
    }
  }, [paymentComplete, router]);

  async function handleCoverSelect(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const uploaded = await uploadImageFile(file);
    setUploading(false);

    if (!uploaded) {
      setError("Cover photo upload failed. You can still submit without a photo.");
      return;
    }

    setCoverImageUrl(uploaded.url);
    setCoverPhotoName(uploaded.filename);
    setCoverPreview(resolveMediaUrl(uploaded.url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const missing: string[] = [];
    if (!name.trim()) missing.push("Gym Name");
    if (!address.trim()) missing.push("Address");
    if (!contactNumber.trim()) missing.push("Contact Number");
    if (!description.trim()) missing.push("Description");

    if (missing.length > 0) {
      setError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setError(null);
    setSubmitting(true);

    const normalizedWebsite = websiteOrSlug.trim();
    const websiteValue =
      !normalizedWebsite ||
      ["n/a", "na", "none", "-"].includes(normalizedWebsite.toLowerCase())
        ? ""
        : normalizedWebsite;

    const ok = await registerGym({
      name: name.trim(),
      address: address.trim(),
      contactNumber: contactNumber.trim(),
      description: description.trim(),
      websiteOrSlug: websiteValue,
      coverPhotoName,
      coverImageUrl: coverImageUrl || undefined,
    });

    if (!ok) {
      setSubmitting(false);
      setError("Could not save your gym. Please try again.");
      return;
    }

    if (user && referenceNo) {
      attachGymToLatestPurchase({
        ownerId: user.id,
        referenceNo,
        gymName: name.trim(),
      });
    }

    if (role !== "OWNER") {
      promoteToOwner();
    }

    // Mark owner gate ready immediately so layout skips "Checking access..."
    useCreateGymStore.setState({ hasOwnedGym: true });

    setSubmitting(false);
    // Gym is ACTIVE on create — optional Xendit setup (existing Payment Settings)
    router.replace("/dashboard/owner/payment-settings");
  }

  if (!paymentComplete) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141414] p-6 sm:p-8"
      >
        <h1 className="text-2xl font-bold">Register Your Gym</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Payment successful! Now let&apos;s get your gym set up.
        </p>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gymName">Gym Name *</Label>
            <Input
              id="gymName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Strong House Gym"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Cebu City"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number *</Label>
            <Input
              id="contact"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. 0912 345 6789"
            />
          </div>

          <div className="space-y-2">
            <Label>Cover Photo Upload (optional)</Label>
            {coverPreview ? (
              <div className="overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt="Cover preview" className="h-40 w-full object-cover" />
              </div>
            ) : null}
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-[#0A0A0A] px-4 py-8 text-sm text-zinc-400 transition hover:border-[#FFD700]/40 hover:text-zinc-200">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {uploading
                ? "Uploading..."
                : coverPhotoName
                  ? coverPhotoName
                  : "Upload Cover Photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void handleCoverSelect(e.target.files?.[0])}
              />
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
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
                placeholder="Leave blank if you don't have one"
              />
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting || uploading}
          className="mt-6 w-full rounded-xl bg-[#FFD700] py-3 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
