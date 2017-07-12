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
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^mangojuice-core": "<rootDir>/packages/mangojuice-core/src",
    "^mangojuice-data": "<rootDir>/packages/mangojuice-data/src",
    "^mangojuice-form": "<rootDir>/packages/mangojuice-form/src",
    "^mangojuice-intl": "<rootDir>/packages/mangojuice-intl/src",
    "^mangojuice-lazy": "<rootDir>/packages/mangojuice-lazy/src",
    "^mangojuice-react": "<rootDir>/packages/mangojuice-react/src",
    "^mangojuice-react-core": "<rootDir>/packages/mangojuice-react-core/src",
    "^mangojuice-router": "<rootDir>/packages/mangojuice-router/src",
    "^mangojuice-dom": "<rootDir>/packages/mangojuice-dom/src"
  },
  projects: [
    "<rootDir>/packages/mangojuice-core",
    "<rootDir>/packages/mangojuice-data",
    "<rootDir>/packages/mangojuice-form",
    "<rootDir>/packages/mangojuice-intl",
    "<rootDir>/packages/mangojuice-lazy",
    "<rootDir>/packages/mangojuice-react",
    "<rootDir>/packages/mangojuice-react-core",
    "<rootDir>/packages/mangojuice-router",
    "<rootDir>/packages/mangojuice-dom"
  ],
  rootDir: __dirname,
  testMatch: [
    "<rootDir>/packages/*/__tests__/**/*spec.js?(x)",
    "<rootDir>/packages/*/__tests__/**/*spec.ts?(x)",
    "<rootDir>/packages/*/__tests__/**/*spec.browser.js?(x)",
    "<rootDir>/packages/*/__tests__/**/*spec.browser.ts?(x)"
  ],
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/(?!lodash-es)"]
};
