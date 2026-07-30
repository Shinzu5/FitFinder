"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordJustReset = searchParams.get("reset") === "1";

  const {
    login,
    clearSession,
    loading,
    error,
    success,
    isAuthenticated,
    role,
    user,
    hasHydrated,
    setHasHydrated,
  } = useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetNotice] = useState(
    passwordJustReset
      ? "Password updated successfully. Please sign in with your new password."
      : null,
  );
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
    const finish = () => setHasHydrated(true);

    if (useAuthStore.persist.hasHydrated()) {
      finish();
    }

    const unsub = useAuthStore.persist.onFinishHydration(finish);
    const timer = window.setTimeout(finish, 800);
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, [setHasHydrated]);

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    const email = values.email.trim();
    const password = values.password;

    if (!email || !password) {
      setFormError("Email and password are required.");
      return;
    }

    if (isAuthenticated) {
      clearSession();
    }

    const ok = await login({
      email,
      password,
      rememberMe: values.rememberMe ?? false,
    });
    if (!ok) return;

    const currentRole = useAuthStore.getState().role;
    router.replace(getDashboardPathForRole(currentRole));
  }

  function handleSwitchAccount() {
    clearSession();
    setSwitchingAccount(true);
    setFormError(null);
  }

  if (!hasHydrated) {
    return (
      <AuthShell
        title="Welcome back"
        subtitle="Loading..."
        footerText="Don't have an account?"
        footerLink="/signup"
        footerLinkText="Sign up"
      >
        <div className="flex items-center justify-center py-10 text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading...
        </div>
      </AuthShell>
    );
  }

  if (isAuthenticated && role && !switchingAccount) {
    return (
      <AuthShell
        title="Welcome back"
        subtitle="You already have an active session"
        footerText="Don't have an account?"
        footerLink="/signup"
        footerLinkText="Sign up"
      >
        <div className="space-y-4">
          <Alert variant="success">
            Signed in as {user?.email ?? "current user"} ({role})
          </Alert>
          <button
            type="button"
            onClick={() => router.replace(getDashboardPathForRole(role))}
            className="flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#e6c200]"
          >
            Continue to dashboard
          </button>
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="flex w-full items-center justify-center rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
          >
            Sign in with a different account
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account to continue"
      footerText="Don't have an account?"
      footerLink="/signup"
      footerLinkText="Sign up"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}
        {resetNotice ? <Alert variant="success">{resetNotice}</Alert> : null}

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
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-11"
              {...register("password")}
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
          {errors.password ? (
            <p className="text-sm text-red-300">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="flex items-center text-sm">
          <label className="flex items-center gap-2 text-zinc-400">
            <Checkbox
              checked={rememberMe ?? false}
              onChange={() => setValue("rememberMe", !(rememberMe ?? false), { shouldDirty: true })}
            />
            <span>Remember me</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold uppercase tracking-wide text-black transition hover:bg-[#e6c200] disabled:opacity-70"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Signing in..." : "LOGIN"}
        </button>

        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-[#FFD700] hover:text-[#ffe44d]">
            Forgot Password?
          </Link>
        </p>

        <p className="text-center text-xs text-zinc-500">
          Test accounts password: <span className="text-zinc-300">12345</span>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
