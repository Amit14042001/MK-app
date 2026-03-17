/**
 * MK App — Jest Configuration
 */
module.exports = {
  testEnvironment:   'node',
  testTimeout:       30000,
  verbose:           true,
  forceExit:         true,
  detectOpenHandles: true,

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],

  // Coverage
  collectCoverage:           false, // set to true for CI
  coverageDirectory:         'coverage',
  coverageReporters:         ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'backend/src/**/*.js',
    '!backend/src/server.js',       // entry point
    '!backend/src/config/**',       // configs
    '!**/node_modules/**',
    '!**/migrations/**',
  ],
  coverageThresholds: {
    global: {
      branches:   60,
      functions:  65,
      lines:      65,
      statements: 65,
    },
  },

  // Setup
  globalSetup:    './tests/setup/globalSetup.js',
  globalTeardown: './tests/setup/globalTeardown.js',
  setupFilesAfterFramework: [],

  // Module mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Transform
  transform: {},

  // Environment variables for tests
  testEnvironmentOptions: {},
};
