"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { LoginScreen } from "@/components/auth/login-screen";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isSessionLoading } = useAuth();

  const resetSuccess = searchParams.get("reset") === "success";

  useEffect(() => {
    if (!isSessionLoading && user) {
      router.push("/app");
    }
  }, [user, isSessionLoading, router]);

  if (isSessionLoading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <LoginScreen
      onLoginSuccess={() => router.push("/app")}
      resetSuccess={resetSuccess}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
