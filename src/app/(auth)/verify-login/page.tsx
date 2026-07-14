"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AuthShell } from "@/components/features/auth/AuthShell";
import { VerificationCodeForm } from "@/components/features/auth/VerificationCodeForm";
import { LOGIN_CHALLENGE_STORAGE_KEY } from "@/lib/auth/auth-api";
import { getDashboardPathForRole, useAuthStore } from "@/stores/auth-store";

function VerifyLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const { verifyLogin, resendLoginCode, isAuthenticated, role } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && role) {
      router.replace(getDashboardPathForRole(role));
    }
  }, [isAuthenticated, role, router]);

  useEffect(() => {
    const token = sessionStorage.getItem(LOGIN_CHALLENGE_STORAGE_KEY);
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  if (!email) {
    return (
      <AuthShell
        title="Verify sign-in"
        subtitle="Your login session is missing an email address."
        footerText="Back to"
        footerLink="/login"
        footerLinkText="Sign in"
      >
        <p className="text-sm text-zinc-400">Please sign in again to receive a new code.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify sign-in"
      subtitle="Enter the 6-digit code we sent to your email."
      footerText="Wrong account?"
      footerLink="/login"
      footerLinkText="Sign in again"
    >
      <VerificationCodeForm
        email={email}
        title="Login Verification"
        subtitle="Enter the 6-digit code we sent to"
        submitLabel="Complete Sign In"
        onSubmit={async (code) => {
          const ok = await verifyLogin(code);
          if (ok) {
            const currentRole = useAuthStore.getState().role;
            router.replace(getDashboardPathForRole(currentRole));
          } else {
            throw new Error(useAuthStore.getState().error ?? "Verification failed.");
          }
        }}
        onResend={async () => {
          const ok = await resendLoginCode();
          if (!ok) {
            throw new Error(useAuthStore.getState().error ?? "Unable to resend code.");
          }
        }}
        footer={
          <>
            Need a new sign-in attempt?{" "}
            <Link href="/login" className="text-[#FFD700] hover:text-[#ffe44d]">
              Back to login
            </Link>
          </>
        }
      />
    </AuthShell>
  );
}

export default function VerifyLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
          Loading...
        </div>
      }
    >
      <VerifyLoginContent />
    </Suspense>
  );
}
