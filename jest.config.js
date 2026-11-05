const transform = { '^.+\\.ts$': ['ts-jest', { transpilation: true }] };
const base = {
  testEnvironment: 'node',
  transform,
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
};

module.exports = {
  projects: [
    { ...base, displayName: 'unit', testMatch: ['<rootDir>/tests/unit/**/*.test.ts'] },
    { ...base, displayName: 'integration', testMatch: ['<rootDir>/tests/integration/**/*.test.ts'] },
  ],
};
