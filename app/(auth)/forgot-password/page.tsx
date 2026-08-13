"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store-context";
import { ForgotPasswordScreen } from "@/components/auth/forgot-password-screen";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user, isSessionLoading } = useAuth();

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

  return <ForgotPasswordScreen />;
}
