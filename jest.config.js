/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  // Point to the new integration test location
  testMatch: ["**/tests/**/*.test.ts"],
  // We still need to transform dependencies that use modern JS
  transformIgnorePatterns: [
    "/node_modules/(?!prolly-gunna|uuidv7|@noble/curves)",
  ],
};
