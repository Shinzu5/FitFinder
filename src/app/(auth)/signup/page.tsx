"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDashboardPathForRole } from "@/stores/auth-store";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, loading, error, success, isAuthenticated, role: authRole } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (isAuthenticated && authRole) {
      router.replace(getDashboardPathForRole(authRole));
    }
  }, [isAuthenticated, authRole, router]);

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    const ok = await registerUser({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
      role: "USER",
    });
    if (ok) {
      router.replace("/login");
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join FitFinder as a member or a gym owner and manage your experience from one modern dashboard."
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {(error || formError) ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" placeholder="Jordan Blake" {...register("fullName")} />
          {errors.fullName ? <p className="text-sm text-red-300">{errors.fullName.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerEmail">Email</Label>
          <Input id="registerEmail" type="email" placeholder="you@fitfinder.com" {...register("email")} />
          {errors.email ? <p className="text-sm text-red-300">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerPassword">Password</Label>
          <div className="relative">
            <Input id="registerPassword" type={showPassword ? "text" : "password"} placeholder="Create a password" {...register("password")} />
            {errors.password ? <p className="text-sm text-red-300">{errors.password.message}</p> : null}
            <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter your password" {...register("confirmPassword")} />
            {errors.confirmPassword ? <p className="text-sm text-red-300">{errors.confirmPassword.message}</p> : null}
            <button type="button" onClick={() => setShowConfirmPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <motion.button whileTap={{ scale: 0.98 }} whileHover={{ scale: 1.01 }} type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-2xl bg-[#FACC15] px-4 py-3 font-semibold text-black transition hover:bg-[#EAB308] disabled:cursor-not-allowed disabled:opacity-70">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating account..." : "Create account"}
        </motion.button>
      </form>
    </AuthShell>
  );
}
