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
      // The offline metadata store is a peer directory, but
      // build-metadata-graph.mjs also accepts an in-root copy; either
      // layout must stay unlinted.
      'metadata-store/**',
      'package-lock.json',
      '.vscode/**',
      '.idea/**',
      // Installed Python environment is not authored source:
      '.venv/**',
    ],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ['src/**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.chrome,
        ...globals.webextensions,
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
        ...globals.jquery,
        // Build-time compile flags injected by webpack.DefinePlugin:
        DEV: 'readonly',
        BETA: 'readonly',
        WEBSTORE: 'readonly',
        EXT_NAME: 'readonly',
        DEBUG_BUILD: 'readonly',
        FORCE_FIXTURES: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-var': 'warn',
      'no-console': 'off',
      'no-prototype-builtins': 'error',
      'no-redeclare': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-assignment': 'error',
      'no-constant-condition': ['warn', { checkLoops: false }],
    },
  },
];
