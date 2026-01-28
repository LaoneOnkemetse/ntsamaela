module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  extends: ["eslint:recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    // Disable project-wide type-aware linting for speed and to avoid config files issues
    project: undefined,
  },
  plugins: ["@typescript-eslint"],
  rules: {
    // Relax strictness so lint doesn't block commits while we stabilize the codebase
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-unused-vars": "off", // Turn off base rule as it conflicts with TypeScript rule
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts"],
      env: {
        jest: true,
        node: true,
      },
      parserOptions: {
        project: null, // Disable project for test files
      },
      rules: {
        "@typescript-eslint/no-unused-vars": "off",
        "no-undef": "off",
      },
    },
  ],
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    "*.config.js",
    "*.config.ts",
  ],
};
