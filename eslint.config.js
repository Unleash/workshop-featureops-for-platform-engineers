// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.terraform/**'],
  },

  // Base JS + strict, type-checked TypeScript everywhere.
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Server-side packages run on Node.
  {
    files: [
      'src/gift-store/checkout/**/*.ts',
      'src/payment-providers/**/*.ts',
      'src/gift-store/commerce/**/*.ts',
      'support/infrastructure/unleash-provisioner/**/*.ts',
    ],
    languageOptions: { globals: globals.node },
  },

  // The browser app: React + hooks rules, browser globals.
  {
    files: ['src/gift-store/storefront/**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  },

  // Config / tooling files are plain JS and shouldn't be type-checked.
  {
    files: ['**/*.config.{js,ts}', '**/*.cjs', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
);
