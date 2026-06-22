// Admin authentication is completely separate from user authentication.
// Admins are NOT rows in the users table - they log in with dedicated
// credentials stored in the admin_users table and receive their own scoped JWT.

export const ADMIN_SCOPE = 'admin';
