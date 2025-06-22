/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  // exclude dist directory
  testPathIgnorePatterns: ["/dist/", "\\.test-d\\.ts$"],
  moduleNameMapper: {
    "^@tsmk/(.*)$": "<rootDir>/../$1/src",
  },
  roots: ["<rootDir>/src"],
};
