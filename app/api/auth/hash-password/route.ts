import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { requireAdminSessionUser } from "@/lib/api-auth";

/**
 * API endpoint to hash passwords
 * This is a server-side function only and should not be called from the client
 * POST /api/auth/hash-password
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 },
      );
    }

    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    return NextResponse.json({
      success: true,
      hashedPassword,
    });
  } catch (error) {
    console.error("Error hashing password:", error);
    return NextResponse.json(
      { error: "Failed to hash password" },
      { status: 500 },
    );
  }
}
