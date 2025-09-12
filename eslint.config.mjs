import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

const commonRules = {
  '@typescript-eslint/naming-convention': [
    'warn',
    {
      selector: 'import',
      format: ['camelCase', 'PascalCase'],
    },
  ],
  curly: 'warn',
  eqeqeq: 'warn',
  'no-throw-literal': 'warn',
  semi: 'warn',
};

export default [
  {
    files: ['src/**/*.ts'],
    plugins: { '@typescript-eslint': typescriptEslint },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: commonRules,
  },
  {
    files: ['webview-ui/**/*.ts'],
    plugins: { '@typescript-eslint': typescriptEslint },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: commonRules,
  },
  eslintConfigPrettier,
];
