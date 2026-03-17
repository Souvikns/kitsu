const { createDefaultPreset } = require("ts-jest");

const preset = createDefaultPreset({
  tsconfig: "./tsconfig.jest.json",
});

/** @type {import("jest").Config} */
module.exports = {
  ...preset,
  testEnvironment: "node",
  moduleNameMapper: {
    "^kitsu/(.*)$": "<rootDir>/app/$1",
  },
};
