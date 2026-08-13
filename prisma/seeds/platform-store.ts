import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLATFORM_INTERNAL_STORE_ID = "store-platform-internal";
const PLATFORM_INTERNAL_STORE_NAME = "Platform Admin";

async function main() {
  const existing = await prisma.store.findUnique({
    where: { id: PLATFORM_INTERNAL_STORE_ID },
    select: { id: true },
  });

  if (existing) {
    console.log("seed:platform-store — already present, skipping.");
    return;
  }

  await prisma.store.create({
    data: {
      id: PLATFORM_INTERNAL_STORE_ID,
      name: PLATFORM_INTERNAL_STORE_NAME,
      address: "N/A — Platform Internal",
      phone: "N/A",
    },
  });

  console.log(
    `seed:platform-store — created store "${PLATFORM_INTERNAL_STORE_NAME}" with id ${PLATFORM_INTERNAL_STORE_ID}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
