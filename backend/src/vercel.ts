const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "JWT_SECRET",
] as const;

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables.`
  );
}

import app from "./app.js";

export default app;
