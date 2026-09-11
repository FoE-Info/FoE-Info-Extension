import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/graphify-out/**',
      '**/.worktrees/**',
      '**/worktrees/**',
      'metadata-store/**',
      'package-lock.json',
      '.vscode/**',
      '.idea/**',
    ],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
        ...globals.jquery,
        chrome: 'readonly',
        browser: 'readonly',
        $: 'readonly',
        jQuery: 'readonly',
        DEV: 'readonly',
        WEBSTORE: 'readonly',
        EXT_NAME: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      'no-prototype-builtins': 'warn',
      'no-redeclare': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-assignment': 'warn',
      'no-constant-condition': 'warn',
    },
  },
];
