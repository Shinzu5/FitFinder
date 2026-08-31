"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const verifySchema = z.object({
  code: z.string().length(6, "Verification code must be exactly 6 digits"),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const { verifyEmail, resendVerification, loading, error, success } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  async function onSubmit(values: VerifyFormValues) {
    if (!email) {
      setFormError("Email is missing. Please try logging in or registering again.");
      return;
    }
    
    setFormError(null);
    const ok = await verifyEmail(email, values.code);
    if (ok) {
      router.push("/login");
    }
  }

  async function handleResend() {
    if (!email) {
      setFormError("Email is missing. Please try logging in or registering again.");
      return;
    }
    await resendVerification(email);
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle={`We sent a 6-digit code to ${email || "your email"}.`}
      footerText="Verified?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            placeholder="123456"
            maxLength={6}
            className="text-center text-xl tracking-widest"
            {...register("code")}
          />
          {errors.code ? (
            <p className="text-sm text-red-300">{errors.code.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Verifying..." : "Verify Code"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="mt-2 w-full text-sm text-zinc-400 hover:text-white disabled:opacity-50"
        >
          Didn't receive a code? Resend
        </button>
      </form>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Loading...
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
