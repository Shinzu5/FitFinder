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
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
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

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (isAuthenticated && authRole) {
      router.replace(getDashboardPathForRole(authRole));
    }
  }, [isAuthenticated, authRole, router]);

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    const ok = await registerUser({
      fullName: `${values.firstName} ${values.lastName}`.trim(),
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
      title="Create an account"
      subtitle="Join the modern fitness platform"
      footerText="Already have an account?"
      footerLink="/login"
      footerLinkText="Sign in"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {(error || formError) ? <Alert variant="destructive">{formError ?? error}</Alert> : null}
        {success ? <Alert variant="success">{success}</Alert> : null}

        {/* First & Last Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium text-zinc-300">First name</Label>
            <Input 
              id="firstName" 
              placeholder="John" 
              className="h-11 px-4 border-zinc-800/80 bg-[#121214] text-white placeholder-zinc-600 focus:border-[#FACC15] focus:ring-[#FACC15]/10 rounded-xl transition-all duration-200"
              {...register("firstName")} 
            />
            {errors.firstName ? <p className="text-xs text-red-400 mt-1">{errors.firstName.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium text-zinc-300">Last name</Label>
            <Input 
              id="lastName" 
              placeholder="Doe" 
              className="h-11 px-4 border-zinc-800/80 bg-[#121214] text-white placeholder-zinc-600 focus:border-[#FACC15] focus:ring-[#FACC15]/10 rounded-xl transition-all duration-200"
              {...register("lastName")} 
            />
            {errors.lastName ? <p className="text-xs text-red-400 mt-1">{errors.lastName.message}</p> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerEmail" className="text-sm font-medium text-zinc-300">Email address</Label>
          <Input 
            id="registerEmail" 
            type="email" 
            placeholder="name@example.com" 
            className="h-11 px-4 border-zinc-800/80 bg-[#121214] text-white placeholder-zinc-600 focus:border-[#FACC15] focus:ring-[#FACC15]/10 rounded-xl transition-all duration-200"
            {...register("email")} 
          />
          {errors.email ? <p className="text-xs text-red-400 mt-1">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerPassword" className="text-sm font-medium text-zinc-300">Password</Label>
          <div className="relative">
            <Input 
              id="registerPassword" 
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">Confirm Password</Label>
          <div className="relative">
            <Input 
              id="confirmPassword" 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="••••••••" 
              className="h-11 pl-4 pr-10 border-zinc-800/80 bg-[#121214] text-white placeholder-zinc-600 focus:border-[#FACC15] focus:ring-[#FACC15]/10 rounded-xl transition-all duration-200"
              {...register("confirmPassword")} 
            />
            <button 
              type="button" 
              onClick={() => setShowConfirmPassword((prev) => !prev)} 
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
          {errors.confirmPassword ? <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p> : null}
        </div>

        <motion.button 
          whileTap={{ scale: 0.98 }} 
          whileHover={{ scale: 1.01 }} 
          type="submit" 
          disabled={loading} 
          className="flex w-full items-center justify-center rounded-xl bg-[#FACC15] px-4 py-3.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-70 mt-6 cursor-pointer tracking-wider"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating Account..." : "Create Account"}
        </motion.button>
      </form>
    </AuthShell>
  );
}
