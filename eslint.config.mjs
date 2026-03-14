import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.extends('eslint:recommended'),
  {
    files: ['**/*.js'],
    ignores: ['coverage/**', 'node_modules/**'],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.commonjs,
        ...globals.jest,
        Buffer: 'readonly',
        URL: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
      },

      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },

    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];
