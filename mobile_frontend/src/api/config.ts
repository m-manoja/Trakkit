// Expo inlines EXPO_PUBLIC_* env vars at build time
// A full restart of the Expo dev server (npx expo start) is required
// after changing .env values for them to take effect.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL as string;

if (!API_BASE_URL) {
  console.error(
    "❌ EXPO_PUBLIC_API_BASE_URL is not set. " +
    "Make sure it's defined in mobile_frontend/.env and restart the Expo dev server."
  );
}
