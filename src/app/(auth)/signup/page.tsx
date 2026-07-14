"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAuthStore, getDashboardPathForRole } from "@/stores/auth-store";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(["USER", "OWNER"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function parseSignupRole(value: string | null): "USER" | "OWNER" {
  return value === "OWNER" ? "OWNER" : "USER";
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser, loading, error, success, isAuthenticated, role: authRole } =
    useAuthStore();
  const [formError, setFormError] = useState<string | null>(null);
  const initialRole = parseSignupRole(searchParams.get("role"));

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: initialRole,
    },
  });

  useEffect(() => {
    setValue("role", initialRole);
  }, [initialRole, setValue]);

  useEffect(() => {
    if (isAuthenticated && authRole) {
      router.replace(getDashboardPathForRole(authRole));
    }
  }, [isAuthenticated, authRole, router]);

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    const result = await registerUser({
      fullName: `${values.firstName} ${values.lastName}`.trim(),
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      role: values.role,
    });
    if (result.ok) {
      router.replace(`/verify-email?email=${encodeURIComponent(result.email)}`);
    }
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle="Join the modern fitness platform"
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <input type="hidden" {...register("role")} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              placeholder="John"
              autoComplete="given-name"
              {...register("firstName")}
            />
            {errors.firstName ? (
              <p className="text-sm text-red-300">{errors.firstName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              autoComplete="family-name"
              {...register("lastName")}
            />
            {errors.lastName ? (
              <p className="text-sm text-red-300">{errors.lastName.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerEmail">Email address</Label>
          <Input
            id="registerEmail"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerPassword">Password</Label>
          <Input
            id="registerPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-red-300">{errors.password.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-red-300">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#FFD700] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Loading...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
