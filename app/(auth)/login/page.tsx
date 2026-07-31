"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { LoginScreen } from "@/components/auth/login-screen";

export default function LoginPage() {
  const router = useRouter();
  const { user, isSessionLoading } = useAuth();

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

  return <LoginScreen onLoginSuccess={() => router.push("/app")} />;
}
