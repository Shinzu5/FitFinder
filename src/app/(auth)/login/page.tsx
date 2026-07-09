"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDashboardPathForRole } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, success, isAuthenticated, role } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });
  const rememberMe = watch("rememberMe");

  useEffect(() => {
    if (isAuthenticated && role) {
      router.replace(getDashboardPathForRole(role));
    }
  }, [isAuthenticated, role, router]);

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    const ok = await login({ email: values.email, password: values.password, rememberMe: values.rememberMe ?? false });
    if (ok && role) {
      router.replace(getDashboardPathForRole(role));
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your fitness workspace with a secure, polished experience."
      footerText="New here?"
      footerLink="/signup"
      footerLinkText="Create an account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@fitfinder.com" {...register("email")} />
          {errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter password" {...register("password")} />
            {errors.password ? <p className="text-sm text-red-300">{errors.password.message}</p> : null}
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-zinc-400">
            <Checkbox checked={rememberMe ?? false} onChange={() => setValue("rememberMe", !(rememberMe ?? false), { shouldDirty: true })} />
            <span>Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-[#FACC15] hover:text-[#fde68a]">
            Forgot password?
          </Link>
        </div>

        <motion.button whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }} type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-2xl bg-[#FACC15] px-4 py-3 font-semibold text-black transition hover:bg-[#EAB308] disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Signing in..." : "Sign In"}
        </motion.button>
      </form>
    </AuthShell>
  );
}
