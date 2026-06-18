export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: [],
  coverageThreshold: {
    global: { lines: 70, statements: 70 }
  },
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/']
};
