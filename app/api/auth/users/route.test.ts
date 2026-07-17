import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GET as getUsers,
  POST as postUser,
  PUT as putUser,
  DELETE as deleteUser,
} from "@/app/api/auth/users/route";
import { prisma } from "@/lib/prisma";
import * as apiAuth from "@/lib/api-auth";
import * as passwordUtils from "@/lib/password-utils.server";

const tenantAdmin = {
  id: "admin-1",
  email: "admin@store.com",
  name: "Admin",
  role: "admin",
  storeId: "store-1",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API /api/auth/users", () => {
  it("GET returns only users from current tenant", async () => {
    vi.spyOn(apiAuth, "requireAdminSessionUser").mockResolvedValue({ user: tenantAdmin });
    vi.spyOn(prisma.user, "findMany").mockResolvedValue([] as any);

    const response = await getUsers();

    expect(response.status).toBe(200);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: "store-1" } }),
    );
  });

  it("POST rejects client storeId from another tenant", async () => {
    vi.spyOn(apiAuth, "requireAdminSessionUser").mockResolvedValue({ user: tenantAdmin });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue(null as any);
    vi.spyOn(prisma.store, "findUnique").mockResolvedValue({ id: "store-1" } as any);
    vi.spyOn(passwordUtils, "hashPassword").mockResolvedValue("hash");
    vi.spyOn(prisma.user, "create").mockResolvedValue({
      id: "user-2",
      email: "new@store.com",
      name: "New",
      role: "employee",
      createdAt: new Date(),
      storeId: "store-1",
    } as any);

    const response = await postUser(
      new Request("http://localhost/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New",
          email: "new@store.com",
          password: "Password123",
          storeId: "store-2",
        }),
      }) as any,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "storeId inválido" });
  });

  it("PUT blocks update for user from another tenant", async () => {
    vi.spyOn(apiAuth, "requireAdminSessionUser").mockResolvedValue({ user: tenantAdmin });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-other",
      storeId: "store-2",
    } as any);
    const updateSpy = vi.spyOn(prisma.user, "update");

    const response = await putUser(
      new Request("http://localhost/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "user-other", name: "X" }),
      }) as any,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "El usuario no existe" });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("DELETE blocks delete for user from another tenant", async () => {
    vi.spyOn(apiAuth, "requireAdminSessionUser").mockResolvedValue({ user: tenantAdmin });
    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: "user-other",
      storeId: "store-2",
      role: "employee",
    } as any);
    const deleteSpy = vi.spyOn(prisma.user, "delete");

    const response = await deleteUser(
      new Request("http://localhost/api/auth/users?id=user-other", {
        method: "DELETE",
      }) as any,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "El usuario no existe" });
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
