import { ForceLightMode } from "@/components/force-light-mode";
import { BrandLogo } from "@/components/brand-logo";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordScreen } from "@/components/auth/reset-password-screen";

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <div style={{ colorScheme: "light" }} className="bg-white text-slate-900">
      <ForceLightMode />
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <BrandLogo className="w-32 sm:w-36 h-auto mx-auto mb-6" />
          <AuthCard>
            <ResetPasswordScreen token={token} />
          </AuthCard>
        </div>
      </main>
    </div>
  );
}
