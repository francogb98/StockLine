import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";

export async function GET() {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        onboardingStep: true,
        draftOnboardingState: true,
      },
    });

    if (!user) {
      return errorResponse("Usuario no encontrado", 404);
    }

    return jsonResponse({
      currentStep: user.onboardingStep,
      draftOnboardingState: user.draftOnboardingState,
    });
  } catch (error) {
    console.error("GET /api/onboarding/state failed:", error);
    return errorResponse("Error obteniendo estado de onboarding", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const data = await req.json();
    const { currentStep, draftOnboardingState } = data;

    await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        onboardingStep: currentStep ?? 0,
        draftOnboardingState: draftOnboardingState ?? undefined,
      },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("PUT /api/onboarding/state failed:", error);
    return errorResponse("Error guardando estado de onboarding", 500);
  }
}
