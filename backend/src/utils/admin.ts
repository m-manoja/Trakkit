// Admin authentication is completely separate from user authentication.
// Admins are NOT rows in the users table — they log in with dedicated
// credentials defined via environment variables and receive their own
// scoped JWT.

export const ADMIN_SCOPE = 'admin';

// Verifies the supplied credentials against ADMIN_USERNAME / ADMIN_PASSWORD.
// Returns false if either env var is unset so the portal stays locked by default.
export function verifyAdminCredentials(username?: string, password?: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  if (!username || !password) return false;
  return username === expectedUser && password === expectedPass;
}
