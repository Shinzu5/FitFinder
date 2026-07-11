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
      subtitle="Sign in to your account to continue"
      footerText="Don't have an account?"
      footerLink="/signup"
      footerLinkText="Sign up"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error || formError ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-zinc-300">Email address</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="name@example.com" 
            className="h-11 px-4 border-zinc-800/80 bg-[#121214] text-white placeholder-zinc-600 focus:border-[#FACC15] focus:ring-[#FACC15]/10 rounded-xl transition-all duration-200"
            {...register("email")} 
          />
          {errors.email ? <p className="text-xs text-red-400 mt-1">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-zinc-300">Password</Label>
          <div className="relative">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              className="h-11 pl-4 pr-10 border-zinc-800/80 bg-[#121214] text-white placeholder-zinc-600 focus:border-[#FACC15] focus:ring-[#FACC15]/10 rounded-xl transition-all duration-200"
              {...register("password")} 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword((prev) => !prev)} 
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
          {errors.password ? <p className="text-xs text-red-400 mt-1">{errors.password.message}</p> : null}
        </div>

        <div className="flex items-center justify-between text-xs font-semibold">
          <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
            <Checkbox 
              checked={rememberMe ?? false} 
              onChange={(e) => setValue("rememberMe", e.target.checked, { shouldDirty: true })}
              className="border-zinc-800 data-[state=checked]:bg-[#FACC15] data-[state=checked]:text-black rounded"
            />
            <span>Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-[#FACC15] hover:text-[#e6c200] transition">
            Forgot password?
          </Link>
        </div>

        <motion.button 
          whileTap={{ scale: 0.98 }} 
          whileHover={{ scale: 1.01 }} 
          type="submit" 
          disabled={loading} 
          className="flex w-full items-center justify-center rounded-xl bg-[#FACC15] px-4 py-3.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-70 mt-6 cursor-pointer tracking-wider"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "LOGGING IN..." : "LOGIN"}
        </motion.button>
      </form>
    </AuthShell>
  );
}
