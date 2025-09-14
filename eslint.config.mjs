import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [
  tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.ts'],
    plugins: { '@typescript-eslint': typescriptEslint },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    parserOptions: {
      project: './tsconfig.json',
    },
  },
  {
    files: ['webview-ui/**/*.ts'],
    plugins: { '@typescript-eslint': typescriptEslint },
    parserOptions: {
      project: './webview-ui/tsconfig.json',
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  eslintConfigPrettier,
];
