"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error, success } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setFormError(null);
    await forgotPassword(values.email);
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we will send a secure recovery link to your inbox."
      footerText="Remembered it?"
      footerLink="/login"
      footerLinkText="Back to login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="resetEmail">Email</Label>
          <Input id="resetEmail" type="email" placeholder="you@fitfinder.com" {...register("email")} />
          {errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}
        </div>

        <motion.button whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }} type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-2xl bg-[#FACC15] px-4 py-3 font-semibold text-black transition hover:bg-[#EAB308] disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Sending link..." : "Send Reset Link"}
        </motion.button>
      </form>
    </AuthShell>
  );
}
