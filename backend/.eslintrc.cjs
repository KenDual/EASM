module.exports = {
    env: { node: true, es2022: true },
    plugins: ['security'],
    extends: ['eslint:recommended', 'plugin:security/recommended-legacy'],
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
};
