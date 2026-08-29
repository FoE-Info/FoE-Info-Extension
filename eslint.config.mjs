import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'build/**',
      'dist/**',
      'node_modules/**',
      'packages/**',
      'graphify-out/**',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jquery,
        ...globals.webextensions,
        EXT_NAME: 'readonly',
        DEV: 'readonly',
        chrome: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-undef': 'error',
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
];
