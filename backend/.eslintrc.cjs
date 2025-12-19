module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  env: { node: true, es2022: true },
  settings: {
    "import/resolver": { typescript: true },
  },
  rules: {
    "import/order": ["warn", { "newlines-between": "always" }],
    "@typescript-eslint/consistent-type-imports": "warn",
  },
};