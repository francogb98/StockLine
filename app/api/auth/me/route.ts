import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedSession } from "@/lib/api-auth";

// GET - Obtener el usuario autenticado actualmente
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthenticatedSession();
    if ("response" in auth) {
      return auth.response;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.auth.user.id },
      include: {
        store: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Retornar usuario sin passwordHash
    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo usuario actual:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 },
    );
  }
}
