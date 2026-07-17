import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating existing users with password hashes...");

  // Get all users with empty passwordHash
  const users = await prisma.user.findMany({
    where: {
      passwordHash: "",
    },
  });

  console.log(`Found ${users.length} users with empty passwordHash`);

  // Update each user with a valid bcrypt hash
  for (const user of users) {
    // Create a simple hash for demo purposes
    // In production, you should ask users to reset their passwords
    const defaultPassword = "password123";
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log(
      `Updated user: ${user.email} with hash for password: ${defaultPassword}`,
    );
  }

  console.log("All users updated successfully!");
}

main()
  .catch((e) => {
    console.error("Error updating users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
