"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { LoginScreen } from "@/components/auth/login-screen";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isSessionLoading, loginAsDemo } = useAuth();

  const resetSuccess = searchParams.get("reset") === "success";

  const destination = user?.isSuperAdmin ? "/super-admin" : "/app";

  useEffect(() => {
    if (!isSessionLoading && user) {
      router.push(destination);
    }
  }, [user, isSessionLoading, router, destination]);

  if (isSessionLoading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <LoginScreen
      onLoginSuccess={(loggedInUser) => {
        const dest = loggedInUser?.isSuperAdmin ? "/super-admin" : "/app";
        router.push(dest);
      }}
      onDemoLogin={async () => {
        await loginAsDemo();
        router.push("/app");
      }}
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
