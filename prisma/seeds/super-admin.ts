import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const normalized = part.trim().toLowerCase();
    if (normalized.length === 0) continue;
    seen.add(normalized);
  }
  return Array.from(seen);
}

async function main() {
  const emails = parseEmails(process.env.SUPER_ADMIN_EMAILS);
  if (emails.length === 0) {
    console.log("SUPER_ADMIN_EMAILS is empty — no-op.");
    process.exit(0);
  }

  const found = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, isSuperAdmin: true },
  });

  const matched = new Set(found.map((u) => u.email));
  const missingEmails = emails.filter((e) => !matched.has(e));

  const targets = found.filter((u) => !u.isSuperAdmin);
  if (targets.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: targets.map((u) => u.id) } },
      data: { isSuperAdmin: true },
    });
  }

  console.log(
    `seed:super-admin — found: ${found.length}, marked: ${targets.length}, missing: ${missingEmails.length}`,
  );
  if (missingEmails.length > 0) {
    console.log(`missing emails: ${missingEmails.join(", ")}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
