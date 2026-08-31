"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESEND_COOLDOWN_SECONDS = 60;
const RESET_SESSION_KEY = "fitfinder-password-reset";

const verifySchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Verification code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

function VerifyResetCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  const { verifyResetCode, forgotPassword, loading, error, success } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    if (!email) return;
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(values: VerifyFormValues) {
    if (!email) {
      setFormError("Email is missing. Please start from Forgot Password.");
      return;
    }

    setFormError(null);
    const resetToken = await verifyResetCode(email, values.code);
    if (!resetToken) return;

    sessionStorage.setItem(
      RESET_SESSION_KEY,
      JSON.stringify({
        email,
        resetToken,
        createdAt: Date.now(),
      }),
    );

    router.push("/reset-password");
  }

  async function handleResend() {
    if (!email || cooldown > 0 || loading) return;
    setFormError(null);
    const ok = await forgotPassword(email);
    if (ok) {
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }

  if (!email) {
    return (
      <AuthShell
        title="Verify code"
        subtitle="Email is required to continue"
        footerText="Need to start over?"
        footerLink="/forgot-password"
        footerLinkText="Forgot password"
      >
        <Alert variant="destructive">
          Missing email. Please request a new verification code.
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Enter verification code"
      subtitle="We sent a 6-digit code to your email"
      footerText="Wrong email?"
      footerLink="/forgot-password"
      footerLinkText="Try again"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} readOnly className="opacity-80" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            className="text-center text-xl tracking-widest"
            {...register("code")}
          />
          {errors.code ? <p className="text-sm text-red-300">{errors.code.message}</p> : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={loading || cooldown > 0}
          className="mt-1 w-full text-sm text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend Code"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function VerifyResetCodePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Loading...
        </div>
      }
    >
      <VerifyResetCodeForm />
    </Suspense>
  );
}
