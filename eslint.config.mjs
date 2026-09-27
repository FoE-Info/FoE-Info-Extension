import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import noHardcodedText from './tools/eslint-rules/no-hardcoded-text.js';
import noUnescapedHtmlInterpolation from './tools/eslint-rules/no-unescaped-html-interpolation.js';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/.worktrees/**',
      '**/worktrees/**',
      'metadata-store/**',
      'package-lock.json',
      '.vscode/**',
      '.idea/**',
      // Git-excluded directories the linter must not traverse:
      '.agent/**',
    ],
  },
  js.configs.recommended,
  {
    files: [
      'src/js/ui/**/*.js',
      'src/js/msg/**/*.js',
      'src/js/protocol/**/*.js',
    ],
    plugins: { i18nGuard: { rules: { 'no-hardcoded-text': noHardcodedText } } },
    rules: { 'i18nGuard/no-hardcoded-text': 'error' },
  },
  {
    files: ['src/js/ui/**/*.js'],
    plugins: {
      encodingGuard: {
        rules: {
          'no-unescaped-html-interpolation': noUnescapedHtmlInterpolation,
        },
      },
    },
    rules: { 'encodingGuard/no-unescaped-html-interpolation': 'error' },
  },
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
        chrome: 'readonly',
        browser: 'readonly',
        $: 'readonly',
        jQuery: 'readonly',
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
      'no-prototype-builtins': 'warn',
      'no-redeclare': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-assignment': 'warn',
      'no-constant-condition': 'warn',
    },
  },
];
