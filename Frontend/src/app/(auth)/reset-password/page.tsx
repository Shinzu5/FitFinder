"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RESET_SESSION_KEY = "fitfinder-password-reset";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetSession {
  email: string;
  resetToken: string;
  createdAt: number;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword, loading, error, success } = useAuthStore();
  const [session, setSession] = useState<ResetSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(RESET_SESSION_KEY);
      if (!raw) {
        setSessionError("Reset session missing. Please verify your code again.");
        return;
      }
      const parsed = JSON.parse(raw) as ResetSession;
      if (!parsed?.email || !parsed?.resetToken) {
        setSessionError("Invalid reset session. Please verify your code again.");
        return;
      }
      setSession(parsed);
    } catch {
      setSessionError("Invalid reset session. Please verify your code again.");
    }
  }, []);

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!session) {
      setFormError("Reset session missing. Please verify your code again.");
      return;
    }

    setFormError(null);
    const ok = await resetPassword(
      session.email,
      session.resetToken,
      values.newPassword,
      values.confirmPassword,
    );

    if (!ok) return;

    sessionStorage.removeItem(RESET_SESSION_KEY);
    window.setTimeout(() => {
      router.replace("/login?reset=1");
    }, 1200);
  }

  if (sessionError) {
    return (
      <AuthShell
        title="Reset password"
        subtitle="Your reset session is invalid or expired"
        footerText="Need a new code?"
        footerLink="/forgot-password"
        footerLinkText="Forgot password"
      >
        <Alert variant="destructive">{sessionError}</Alert>
        <button
          type="button"
          onClick={() => router.push("/forgot-password")}
          className="mt-4 flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#e6c200]"
        >
          Start over
        </button>
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell
        title="Reset password"
        subtitle="Loading your secure session..."
        footerText="Remembered it?"
        footerLink="/login"
        footerLinkText="Back to login"
      >
        <div className="flex items-center justify-center py-8 text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading...
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create new password"
      subtitle="Choose a strong password for your account"
      footerText="Remembered it?"
      footerLink="/login"
      footerLinkText="Back to login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={session.email} readOnly className="opacity-80" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="pr-11"
              {...register("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-white"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.newPassword ? (
            <p className="text-sm text-red-300">{errors.newPassword.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              className="pr-11"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-white"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-red-300">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Saving..." : "Submit"}
        </button>
      </form>
    </AuthShell>
  );
}
