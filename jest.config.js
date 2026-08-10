const baseConfig = require('./jest.config.base');

module.exports = {
    clearMocks: true,
    projects: ['<rootDir>/packages/*/jest.config.js'],
    // Recycle any worker whose heap exceeds this after finishing a test file.
    workerIdleMemoryLimit: '1.5GB',
    maxWorkers: '50%',
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
        '^.+/es/^.+$': 'babel-jest',
        '^.+\\.(ts|tsx)?$': 'ts-jest',
    },
    testRegex: '(/__tests__/.*|(\\.)(test|spec))\\.(js|jsx|tsx|ts)?$',
    transformIgnorePatterns: baseConfig.transformIgnorePatterns,
};
