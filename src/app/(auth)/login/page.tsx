"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuthStore, getDashboardPathForRole } from "@/stores/auth-store";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, success, isAuthenticated, role } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormValues>({
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
    const ok = await login({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe ?? false,
    });
    if (ok) {
      const currentRole = useAuthStore.getState().role;
      if (currentRole) {
        router.replace(getDashboardPathForRole(currentRole));
      }
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      footerText="Don't have an account?"
      footerLink="/signup"
      footerLinkText="Sign up"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-red-300">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-zinc-400">
            <Checkbox
              checked={rememberMe ?? false}
              onChange={() =>
                setValue("rememberMe", !(rememberMe ?? false), { shouldDirty: true })
              }
            />
            <span>Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-[#FFD700] transition hover:text-[#ffe44d]">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Signing in..." : "LOGIN"}
        </button>
      </form>
    </AuthShell>
  );
}
