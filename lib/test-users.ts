/**
 * Test user emails that bypass subscription enforcement.
 * These are seed users created during database seeding.
 */
const TEST_USER_EMAILS = new Set([
  "admin@techmart.com",
  "empleado@techmart.com",
]);

export function isTestUserEmail(email: string): boolean {
  return TEST_USER_EMAILS.has(email.toLowerCase());
}
