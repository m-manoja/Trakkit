export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

if (!API_BASE_URL) {
  console.error(
    "❌ VITE_API_BASE_URL is not set. " +
      "Make sure it's defined in web_frontend/.env and restart the dev server."
  );
}
