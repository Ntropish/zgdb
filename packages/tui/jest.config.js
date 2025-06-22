/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  // This pattern tells Jest to NOT ignore yaml and its dependencies for transformation.
  transformIgnorePatterns: [
    "/node_modules/(?!yaml|yaml-unist-parser|yallist|@babel)",
  ],
  // exclude dist directory
  testPathIgnorePatterns: ["/dist/", "\\.test-d\\.ts$"],
  moduleNameMapper: {
    "^@tsmk/(.*)$": "<rootDir>/../$1/src",
  },
  roots: ["<rootDir>/src"],
};
