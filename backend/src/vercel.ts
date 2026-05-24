import type { VercelRequest, VercelResponse } from "@vercel/node";
import app from "./app.js";

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
  "JWT_SECRET",
] as const;

export default function handler(req: VercelRequest, res: VercelResponse) {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    return res.status(500).json({
      error: `Missing required environment variables: ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables.`,
    });
  }
  return app(req, res);
}
