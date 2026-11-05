const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', '*.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Express 5 forwards rejected handler promises to the error middleware.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false } }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/unbound-method': 'off' },
  },
);
