"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/auth/constants";

interface VerificationCodeFormProps {
  email: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  resendLabel?: string;
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  footer?: ReactNode;
}

export function VerificationCodeForm({
  email,
  title,
  subtitle,
  submitLabel,
  resendLabel = "Resend Code",
  onSubmit,
  onResend,
  footer,
}: VerificationCodeFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const maskedEmail = useMemo(() => email, [email]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit verification code from your email.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(code.trim());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    setSuccess(null);
    setResending(true);

    try {
      await onResend();
      setSuccess("A new verification code has been sent.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode("");
    } catch (resendError) {
      const message =
        resendError instanceof Error ? resendError.message : "Unable to resend code.";
      const match = message.match(/wait (\d+) seconds/i);
      if (match) {
        setCooldown(Number(match[1]));
      }
      setError(message);
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
        <p className="mt-2 text-sm font-medium text-[#FFD700]">{maskedEmail}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="verificationCode">Verification Code</Label>
          <Input
            id="verificationCode"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-lg tracking-[0.35em]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#e6c200] disabled:opacity-70"
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitting ? "Verifying..." : submitLabel}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="w-full rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resending
            ? "Sending..."
            : cooldown > 0
              ? `${resendLabel} (${cooldown}s)`
              : resendLabel}
        </button>
      </form>

      {footer ? <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div> : null}
    </div>
  );
}
