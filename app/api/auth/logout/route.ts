import { NextResponse } from "next/server";
import { invalidateCurrentSession } from "@/lib/auth-session";

export async function POST() {
  try {
    await invalidateCurrentSession();
    return NextResponse.json({ message: "Logout exitoso" }, { status: 200 });
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    return NextResponse.json(
      { error: "Error al cerrar sesión" },
      { status: 500 },
    );
  }
}
