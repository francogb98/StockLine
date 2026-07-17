import { prisma } from "./utils/db";

async function globalTeardown() {
  await prisma.$disconnect();
}

export default globalTeardown;
