"use client";

import { Suspense } from "react";
import { RegisterScreen } from "@/components/auth/register-screen";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterScreen />
    </Suspense>
  );
}
