import { prisma } from "../lib/prisma";

async function main() {
  const couponCode = "LAUNCH50";

  const existing = await prisma.coupon.findUnique({
    where: { code: couponCode },
  });

  if (existing) {
    console.log(`Coupon ${couponCode} already exists (id=${existing.id})`);
    return;
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: couponCode,
      description: "Oferta de lanzamiento — 50% OFF primeros 3 meses",
      discountType: "PERCENTAGE",
      discountValue: 50,
      durationDays: 90,
      maxRedemptions: null,
      applicablePlans: ["monthly"],
      startsAt: new Date(),
      expiresAt: null,
      isActive: true,
      createdByUserId: "system",
    },
  });

  console.log(`Coupon ${couponCode} created (id=${coupon.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
