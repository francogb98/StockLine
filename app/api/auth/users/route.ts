import { NextRequest, NextResponse } from "next/server";
import { hashPassword, validatePassword } from "@/lib/password-utils.server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionUser } from "@/lib/api-auth";

// GET - Listar todos los usuarios (solo admin)
export async function GET() {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    // Obtener todos los usuarios (excluyendo passwordHash)
    const users = await prisma.user.findMany({
      where: { storeId: auth.user.storeId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        storeId: true,
        store: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener los usuarios" },
      { status: 500 },
    );
  }
}

// POST - Crear un nuevo usuario (solo admin)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json();
    const { name, email, password, storeId, role } = body;

    // Validaciones
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son requeridos" },
        { status: 400 },
      );
    }

    if (storeId && storeId !== auth.user.storeId) {
      return NextResponse.json({ error: "storeId inválido" }, { status: 400 });
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 409 },
      );
    }

    // Verificar que el store existe
    const store = await prisma.store.findUnique({
      where: { id: auth.user.storeId },
    });

    if (!store) {
      return NextResponse.json(
        { error: "La tienda no existe" },
        { status: 404 },
      );
    }

    // Validar rol
    const finalRole = role || "employee";
    if (finalRole !== "admin" && finalRole !== "employee") {
      return NextResponse.json(
        { error: "Rol inválido. Solo se permiten 'admin' o 'employee'" },
        { status: 400 },
      );
    }

    // Encriptar la contraseña
    const passwordHash = await hashPassword(password);

    // Crear el usuario
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        storeId: auth.user.storeId,
        role: finalRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        storeId: true,
      },
    });

    return NextResponse.json(
      { message: "Usuario creado exitosamente", user: newUser },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creando usuario:", error);
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 500 },
    );
  }
}

// PUT - Actualizar un usuario (solo admin)
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const body = await req.json();
    const { id, name, email, password, role } = body;

    // Validaciones
    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 });
    }

    // Buscar el usuario
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || existingUser.storeId !== auth.user.storeId) {
      return NextResponse.json(
        { error: "El usuario no existe" },
        { status: 404 },
      );
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) {
      // Verificar si el email ya está en uso por otro usuario
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "El email ya está en uso" },
          { status: 409 },
        );
      }
      updateData.email = email;
    }

    if (role) {
      if (role !== "admin" && role !== "employee") {
        return NextResponse.json(
          { error: "Rol inválido. Solo se permiten 'admin' o 'employee'" },
          { status: 400 },
        );
      }
      updateData.role = role;
    }

    if (password) {
      const passwordValidation = validatePassword(password);

      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { error: passwordValidation.error },
          { status: 400 },
        );
      }

      updateData.passwordHash = await hashPassword(password);
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        storeId: true,
      },
    });

    return NextResponse.json(
      { message: "Usuario actualizado exitosamente", user: updatedUser },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 },
    );
  }
}

// DELETE - Eliminar un usuario (solo admin)
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 });
    }

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || existingUser.storeId !== auth.user.storeId) {
      return NextResponse.json(
        { error: "El usuario no existe" },
        { status: 404 },
      );
    }

    // No permitir auto-eliminación
    if (id === auth.user.id) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propia cuenta" },
        { status: 400 },
      );
    }

    // No permitir eliminar el último admin
    if (existingUser.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin", storeId: auth.user.storeId },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "No se puede eliminar el último administrador" },
          { status: 400 },
        );
      }
    }

    // Eliminar el usuario
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Usuario eliminado exitosamente" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 },
    );
  }
}
