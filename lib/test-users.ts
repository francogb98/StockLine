/**
 * Test user emails that bypass subscription enforcement.
 * These are seed users created during database seeding.
 * Only active in non-production environments.
 */
const TEST_USER_EMAILS = new Set([
  "admin@techmart.com",
  "empleado@techmart.com",
]);

export function isTestUserEmail(email: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return TEST_USER_EMAILS.has(email.toLowerCase());
}
