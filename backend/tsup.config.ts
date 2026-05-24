import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/vercel.ts" },
  format: ["cjs"],
  platform: "node",
  target: "node20",
  outDir: "api",
  outExtension: () => ({ js: ".js" }),
  bundle: true,
  splitting: false,
  clean: false,
  sourcemap: true,
});
