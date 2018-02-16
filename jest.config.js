const fs = require("fs");
const path = require("path");

module.exports = {
  collectCoverageFrom: ["packages/*/src/**/*.js", "!**/*.ts.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["html", "lcov", "text"],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 85,
      lines: 85
    }
  },
  globals: {
    usingJSDOM: true,
    usingJest: true
  },
  setupFiles: [
    "<rootDir>/scripts/test/requestAnimationFrame.js"
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^mangojuice-core(.*)": "<rootDir>/packages/mangojuice-core/src$1",
    "^mangojuice-lazy": "<rootDir>/packages/mangojuice-lazy/src",
    "^mangojuice-preact": "<rootDir>/packages/mangojuice-preact/src",
    "^mangojuice-inferno": "<rootDir>/packages/mangojuice-inferno/src",
    "^mangojuice-react-core/tests": "<rootDir>/packages/mangojuice-react-core/__tests__/tests.js",
    "^mangojuice-react-core": "<rootDir>/packages/mangojuice-react-core/src",
    "^mangojuice-react": "<rootDir>/packages/mangojuice-react/src",
    "^mangojuice-test": "<rootDir>/packages/mangojuice-test/src"
  },
  rootDir: __dirname,
  testMatch: [
    "<rootDir>/packages/*/**/__tests__/**/*spec.js?(x)",
    "<rootDir>/packages/*/**/__tests__/**/*spec.ts?(x)",
    "<rootDir>/packages/*/**/__tests__/**/*spec.browser.js?(x)",
    "<rootDir>/packages/*/**/__tests__/**/*spec.browser.ts?(x)"
  ],
  transformIgnorePatterns: ["<rootDir>/node_modules/(?!lodash-es)"]
};
