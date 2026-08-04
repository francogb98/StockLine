"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { ForgotPasswordScreen } from "@/components/auth/forgot-password-screen";

export default function ForgotPasswordPage() {
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

  return <ForgotPasswordScreen />;
}
