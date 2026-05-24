import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/vercel.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node20",
  outDir: "api",
  outExtension: () => ({ js: ".cjs" }),
  bundle: true,
  splitting: false,
  clean: true,
  sourcemap: true,
});
