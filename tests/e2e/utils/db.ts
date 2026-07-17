import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../../lib/password-utils.server";
import {
  addDays,
  SUBSCRIPTION_TRIAL_DAYS,
} from "../../../lib/subscription-config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required to run E2E tests.");
}

export const prisma = new PrismaClient({
  datasources: {
    db: { url: testDatabaseUrl },
  },
});

export const E2E_SEED = {
  store: {
    id: "store-e2e",
    name: "E2E Store",
    address: "E2E Address",
    phone: "+54 11 0000-0000",
  },
  admin: {
    id: "user-admin-e2e",
    email: process.env.E2E_ADMIN_EMAIL || "admin@techmart.com",
    name: "Admin E2E",
    role: "admin",
    password: process.env.E2E_ADMIN_PASSWORD || "password123",
  },
  employee: {
    id: "user-employee-e2e",
    email: "empleado@techmart.com",
    name: "Empleado E2E",
    role: "employee",
    password: "password123",
  },
} as const;

export async function resetTestDatabase() {
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  await prisma.store.create({
    data: {
      id: E2E_SEED.store.id,
      name: E2E_SEED.store.name,
      address: E2E_SEED.store.address,
      phone: E2E_SEED.store.phone,
    },
  });

  const trialStart = new Date();
  const trialEnd = addDays(trialStart, SUBSCRIPTION_TRIAL_DAYS);

  await prisma.subscription.create({
    data: {
      storeId: E2E_SEED.store.id,
      status: "trial",
      plan: "monthly",
      currentPeriodStart: trialStart,
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
    },
  });

  const adminHash = await hashPassword(E2E_SEED.admin.password);
  const employeeHash = await hashPassword(E2E_SEED.employee.password);

  await prisma.user.createMany({
    data: [
      {
        id: E2E_SEED.admin.id,
        storeId: E2E_SEED.store.id,
        email: E2E_SEED.admin.email,
        name: E2E_SEED.admin.name,
        role: E2E_SEED.admin.role,
        passwordHash: adminHash,
      },
      {
        id: E2E_SEED.employee.id,
        storeId: E2E_SEED.store.id,
        email: E2E_SEED.employee.email,
        name: E2E_SEED.employee.name,
        role: E2E_SEED.employee.role,
        passwordHash: employeeHash,
      },
    ],
  });
}
